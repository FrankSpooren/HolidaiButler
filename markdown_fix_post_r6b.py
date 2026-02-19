#!/usr/bin/env python3
"""Scan and fix markdown leakage in POI enriched_detail_description fields."""
import pymysql
import json
import re
from datetime import datetime

# Connect
conn = pymysql.connect(
    host='jotx.your-database.de',
    user='pxoziy_1',
    password='j8,DrtshJSm$',
    database='pxoziy_db1',
    charset='utf8mb4'
)
cursor = conn.cursor(pymysql.cursors.DictCursor)

# STEP 1: Count markdown links per destination and language
print("=" * 60)
print("MARKDOWN LEAKAGE SCAN — ALL ACTIVE POIs")
print("=" * 60)

fields = [
    ('enriched_detail_description', 'EN'),
    ('enriched_detail_description_nl', 'NL'),
    ('enriched_detail_description_de', 'DE'),
    ('enriched_detail_description_es', 'ES'),
]

# Markdown link pattern: [text](http...)
like_pattern = '%](http%'

for dest_id, dest_name in [(1, 'Calpe'), (2, 'Texel')]:
    print(f"\n--- {dest_name} (destination_id={dest_id}) ---")
    for field, lang in fields:
        cursor.execute(f"""
            SELECT COUNT(*) as cnt FROM POI
            WHERE is_active = 1 AND destination_id = %s
            AND {field} LIKE %s
        """, (dest_id, like_pattern))
        row = cursor.fetchone()
        print(f"  {lang} ({field}): {row['cnt']} POIs with markdown links")

# Total unique POIs affected
cursor.execute("""
    SELECT COUNT(*) as cnt FROM POI
    WHERE is_active = 1
    AND (enriched_detail_description LIKE %s
         OR enriched_detail_description_nl LIKE %s
         OR enriched_detail_description_de LIKE %s
         OR enriched_detail_description_es LIKE %s)
""", (like_pattern, like_pattern, like_pattern, like_pattern))
total = cursor.fetchone()['cnt']
print(f"\nTOTAAL unieke POIs met markdown links: {total}")

# Per destination
for dest_id, dest_name in [(1, 'Calpe'), (2, 'Texel')]:
    cursor.execute("""
        SELECT COUNT(*) as cnt FROM POI
        WHERE is_active = 1 AND destination_id = %s
        AND (enriched_detail_description LIKE %s
             OR enriched_detail_description_nl LIKE %s
             OR enriched_detail_description_de LIKE %s
             OR enriched_detail_description_es LIKE %s)
    """, (dest_id, like_pattern, like_pattern, like_pattern, like_pattern))
    row = cursor.fetchone()
    print(f"  {dest_name}: {row['cnt']} POIs")

# STEP 2: Check for other markdown patterns
print("\n" + "=" * 60)
print("OTHER MARKDOWN PATTERNS")
print("=" * 60)

other_patterns = [
    ('**bold**', '%**%'),
    ('## headers', '%## %'),
]

for pattern_name, like_pat in other_patterns:
    for dest_id, dest_name in [(1, 'Calpe'), (2, 'Texel')]:
        cursor.execute(f"""
            SELECT COUNT(*) as cnt FROM POI
            WHERE is_active = 1 AND destination_id = %s
            AND (enriched_detail_description LIKE %s
                 OR enriched_detail_description_nl LIKE %s
                 OR enriched_detail_description_de LIKE %s
                 OR enriched_detail_description_es LIKE %s)
        """, (dest_id, like_pat, like_pat, like_pat, like_pat))
        row = cursor.fetchone()
        print(f"  {pattern_name} in {dest_name}: {row['cnt']} POIs")

# STEP 3: Get all affected POI IDs for the fix
print("\n" + "=" * 60)
print("FETCHING ALL AFFECTED POIs FOR FIX...")
print("=" * 60)

cursor.execute("""
    SELECT id, name, destination_id,
        enriched_detail_description,
        enriched_detail_description_nl,
        enriched_detail_description_de,
        enriched_detail_description_es
    FROM POI
    WHERE is_active = 1
    AND (enriched_detail_description LIKE %s
         OR enriched_detail_description_nl LIKE %s
         OR enriched_detail_description_de LIKE %s
         OR enriched_detail_description_es LIKE %s)
    ORDER BY destination_id, id
""", (like_pattern, like_pattern, like_pattern, like_pattern))

affected_pois = cursor.fetchall()
print(f"Fetched {len(affected_pois)} POIs for processing")

# Regex: [text](http...) -> text
md_link_re = re.compile(r'\[([^\]]+)\]\(https?://[^\)]+\)')

# STEP 4: BACKUP first
backup = []
for poi in affected_pois:
    backup.append({
        'id': poi['id'],
        'name': poi['name'],
        'destination_id': poi['destination_id'],
        'enriched_detail_description': poi['enriched_detail_description'],
        'enriched_detail_description_nl': poi['enriched_detail_description_nl'],
        'enriched_detail_description_de': poi['enriched_detail_description_de'],
        'enriched_detail_description_es': poi['enriched_detail_description_es'],
    })

with open('/root/markdown_fix_backup_20260219.json', 'w') as f:
    json.dump(backup, f, ensure_ascii=False, indent=2)
print(f"Backup saved: /root/markdown_fix_backup_20260219.json ({len(backup)} POIs)")

# STEP 5: FIX all markdown links
fix_count = 0
field_fix_counts = {'en': 0, 'nl': 0, 'de': 0, 'es': 0}
fix_log = []

for poi in affected_pois:
    poi_fixed = False
    field_map = {
        'en': ('enriched_detail_description', poi['enriched_detail_description']),
        'nl': ('enriched_detail_description_nl', poi['enriched_detail_description_nl']),
        'de': ('enriched_detail_description_de', poi['enriched_detail_description_de']),
        'es': ('enriched_detail_description_es', poi['enriched_detail_description_es']),
    }

    updates = {}
    for lang, (col, text) in field_map.items():
        if text and md_link_re.search(text):
            # Find all matches for logging
            matches = md_link_re.findall(text)
            new_text = md_link_re.sub(r'\1', text)
            updates[col] = new_text
            field_fix_counts[lang] += 1
            poi_fixed = True
            fix_log.append({
                'poi_id': poi['id'],
                'name': poi['name'],
                'destination_id': poi['destination_id'],
                'lang': lang,
                'matches_removed': matches,
                'field': col
            })

    if updates:
        fix_count += 1
        set_clause = ', '.join(f"{col} = %s" for col in updates.keys())
        values = list(updates.values()) + [poi['id']]
        cursor.execute(f"UPDATE POI SET {set_clause} WHERE id = %s", values)

conn.commit()

print(f"\nFIXED {fix_count} POIs:")
print(f"  EN fields: {field_fix_counts['en']}")
print(f"  NL fields: {field_fix_counts['nl']}")
print(f"  DE fields: {field_fix_counts['de']}")
print(f"  ES fields: {field_fix_counts['es']}")
print(f"  Total field updates: {sum(field_fix_counts.values())}")

# STEP 6: Log to audit trail
audit_count = 0
for entry in fix_log:
    try:
        cursor.execute("""
            INSERT INTO poi_content_history
            (poi_id, field_name, old_value, new_value, change_source, change_reason, changed_by, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
        """, (
            entry['poi_id'],
            entry['field'],
            None,
            None,
            'markdown_fix_post_r6b',
            f"Removed {len(entry['matches_removed'])} markdown link(s): {', '.join(entry['matches_removed'][:3])}",
            'system'
        ))
        audit_count += 1
    except Exception as e:
        print(f"  Warning: audit trail entry failed for POI {entry['poi_id']}: {e}")

conn.commit()
print(f"\nAudit trail: {audit_count} entries in poi_content_history")

# STEP 7: VERIFY — recount
print("\n" + "=" * 60)
print("VERIFICATION — Remaining markdown links after fix")
print("=" * 60)

cursor.execute("""
    SELECT COUNT(*) as cnt FROM POI
    WHERE is_active = 1
    AND (enriched_detail_description LIKE %s
         OR enriched_detail_description_nl LIKE %s
         OR enriched_detail_description_de LIKE %s
         OR enriched_detail_description_es LIKE %s)
""", (like_pattern, like_pattern, like_pattern, like_pattern))
remaining = cursor.fetchone()['cnt']
print(f"Remaining POIs with markdown links: {remaining}")

# Save fix log
with open('/root/markdown_fix_log_20260219.json', 'w') as f:
    json.dump({
        'timestamp': datetime.now().isoformat(),
        'total_pois_fixed': fix_count,
        'field_fix_counts': field_fix_counts,
        'total_field_updates': sum(field_fix_counts.values()),
        'audit_trail_entries': audit_count,
        'remaining_after_fix': remaining,
        'fixes': fix_log
    }, f, ensure_ascii=False, indent=2)
print("Fix log saved: /root/markdown_fix_log_20260219.json")

# STEP 8: Summary report
print("\n" + "=" * 60)
print("RAPPORT: MARKDOWN FIX POST-R6b")
print("=" * 60)
print(f"| Metric                          | Waarde |")
print(f"|---------------------------------|--------|")
print(f"| POI 2279 gefixed                | {'YES' if 2279 in [p['id'] for p in affected_pois] else 'NO (not affected)'} |")
print(f"| Totaal POIs met markdown (voor) | {total} |")
print(f"| POIs gefixed                    | {fix_count} |")
print(f"| EN velden gefixed               | {field_fix_counts['en']} |")
print(f"| NL velden gefixed               | {field_fix_counts['nl']} |")
print(f"| DE velden gefixed               | {field_fix_counts['de']} |")
print(f"| ES velden gefixed               | {field_fix_counts['es']} |")
print(f"| Totaal veldupdates              | {sum(field_fix_counts.values())} |")
print(f"| Audit trail entries             | {audit_count} |")
print(f"| Resterend na fix                | {remaining} |")

cursor.close()
conn.close()
print("\nDone.")
