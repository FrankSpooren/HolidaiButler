#!/usr/bin/env python3
"""Inventarisatie POIs zonder enriched_detail_description content."""
import pymysql
import json
from datetime import datetime

conn = pymysql.connect(
    host='jotx.your-database.de',
    user='pxoziy_1',
    password='j8,DrtshJSm$',
    database='pxoziy_db1',
    charset='utf8mb4'
)
cursor = conn.cursor(pymysql.cursors.DictCursor)

print("=" * 60)
print("INVENTARISATIE POIs ZONDER ENRICHED CONTENT")
print("=" * 60)

# STAP 1: Identify all POIs without content
cursor.execute("""
    SELECT
        p.id,
        p.name,
        p.category,
        p.subcategory,
        p.rating,
        p.review_count,
        p.website,
        p.destination_id,
        p.is_active,
        p.status,
        CASE WHEN p.is_excluded_from_enrichment = 1 THEN 'EXCLUDED' ELSE 'NOT EXCLUDED' END as exclusion_status,
        CASE WHEN p.enriched_highlights IS NOT NULL AND p.enriched_highlights != '' THEN 'YES' ELSE 'NO' END as has_highlights,
        CASE WHEN p.description IS NOT NULL AND p.description != '' THEN 'YES' ELSE 'NO' END as has_google_description,
        CASE WHEN p.enriched_tile_description IS NOT NULL AND p.enriched_tile_description != '' THEN 'YES' ELSE 'NO' END as has_tile,
        LENGTH(p.description) as google_desc_length,
        p.created_at,
        p.last_updated
    FROM POI p
    WHERE p.destination_id = 2
      AND (p.is_active = 1 OR p.is_active IS NULL)
      AND (p.enriched_detail_description IS NULL OR p.enriched_detail_description = '')
    ORDER BY p.review_count DESC, p.rating DESC
""")
texel_pois = cursor.fetchall()

# Also check Calpe
cursor.execute("""
    SELECT
        p.id,
        p.name,
        p.category,
        p.subcategory,
        p.rating,
        p.review_count,
        p.website,
        p.destination_id,
        p.is_active,
        p.status,
        CASE WHEN p.is_excluded_from_enrichment = 1 THEN 'EXCLUDED' ELSE 'NOT EXCLUDED' END as exclusion_status,
        CASE WHEN p.enriched_highlights IS NOT NULL AND p.enriched_highlights != '' THEN 'YES' ELSE 'NO' END as has_highlights,
        CASE WHEN p.description IS NOT NULL AND p.description != '' THEN 'YES' ELSE 'NO' END as has_google_description,
        CASE WHEN p.enriched_tile_description IS NOT NULL AND p.enriched_tile_description != '' THEN 'YES' ELSE 'NO' END as has_tile,
        LENGTH(p.description) as google_desc_length,
        p.created_at,
        p.last_updated
    FROM POI p
    WHERE p.destination_id = 1
      AND (p.is_active = 1 OR p.is_active IS NULL)
      AND (p.enriched_detail_description IS NULL OR p.enriched_detail_description = '')
    ORDER BY p.review_count DESC, p.rating DESC
""")
calpe_pois = cursor.fetchall()

all_pois = texel_pois + calpe_pois
print(f"\nTexel POIs zonder enriched content: {len(texel_pois)}")
print(f"Calpe POIs zonder enriched content: {len(calpe_pois)}")
print(f"Totaal: {len(all_pois)}")

# STAP 2: Categorise per oorzaak
for dest_id, dest_name, pois in [(2, 'Texel', texel_pois), (1, 'Calpe', calpe_pois)]:
    print(f"\n{'=' * 60}")
    print(f"ANALYSE: {dest_name} ({len(pois)} POIs zonder content)")
    print(f"{'=' * 60}")

    # Groep A: Bewust excluded
    excluded = [p for p in pois if p['exclusion_status'] == 'EXCLUDED']

    # Groep B: Geen brondata
    no_source = [p for p in pois
                 if p['exclusion_status'] == 'NOT EXCLUDED'
                 and p['has_highlights'] == 'NO'
                 and p['has_google_description'] == 'NO'
                 and (p['website'] is None or p['website'] == '')]

    # Groep C: Heeft WEL brondata maar toch geen content
    has_data = [p for p in pois
                if p['exclusion_status'] == 'NOT EXCLUDED'
                and (p['has_highlights'] == 'YES'
                     or p['has_google_description'] == 'YES'
                     or (p['website'] is not None and p['website'] != ''))]

    # Groep D: Recent toegevoegd (na 6 feb 2026)
    recent = []
    for p in pois:
        if p['created_at']:
            created = p['created_at']
            if hasattr(created, 'date'):
                if created.date() > datetime(2026, 2, 6).date():
                    recent.append(p)

    total = len(pois)
    print(f"\nVerdeling per oorzaak:")
    print(f"| Groep | Omschrijving           | Aantal | % van totaal |")
    print(f"|-------|------------------------|--------|--------------|")
    print(f"| A     | Bewust excluded        | {len(excluded):6d} | {len(excluded)/total*100 if total else 0:5.1f}%       |")
    print(f"| B     | Geen brondata          | {len(no_source):6d} | {len(no_source)/total*100 if total else 0:5.1f}%       |")
    print(f"| C     | Brondata, geen content | {len(has_data):6d} | {len(has_data)/total*100 if total else 0:5.1f}%       |")
    print(f"| D     | Recent toegevoegd      | {len(recent):6d} | {len(recent)/total*100 if total else 0:5.1f}%       |")
    print(f"| Note: Groepen B+C+A = totaal, D overlapt")

    # Verdeling per categorie
    cat_counts = {}
    for p in pois:
        cat = p['category'] or 'NULL/Empty'
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    print(f"\nVerdeling per categorie:")
    print(f"| Categorie            | Aantal |")
    print(f"|----------------------|--------|")
    for cat, cnt in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"| {cat:20s} | {cnt:6d} |")

    # Top 10 highest rated
    top10 = sorted(pois, key=lambda p: (-(p['review_count'] or 0), -(p['rating'] or 0)))[:10]
    print(f"\nTop 10 hoogst gewaardeerde POIs zonder content:")
    print(f"| POI ID | Naam                          | Categorie         | Rating | Reviews | Oorzaak |")
    print(f"|--------|-------------------------------|-------------------|--------|---------|---------|")
    for p in top10:
        # Determine cause
        if p['exclusion_status'] == 'EXCLUDED':
            cause = 'A (excluded)'
        elif p['has_highlights'] == 'NO' and p['has_google_description'] == 'NO' and (p['website'] is None or p['website'] == ''):
            cause = 'B (no data)'
        else:
            cause = 'C (has data)'
        print(f"| {p['id']:6d} | {(p['name'] or '')[:29]:29s} | {(p['category'] or '')[:17]:17s} | {p['rating'] or 0:5.1f}  | {p['review_count'] or 0:7d} | {cause} |")

# STAP 3: Check context — total active POIs for reference
for dest_id, dest_name in [(2, 'Texel'), (1, 'Calpe')]:
    cursor.execute("SELECT COUNT(*) as cnt FROM POI WHERE destination_id = %s AND (is_active = 1 OR is_active IS NULL)", (dest_id,))
    total_active = cursor.fetchone()['cnt']
    cursor.execute("SELECT COUNT(*) as cnt FROM POI WHERE destination_id = %s AND (is_active = 1 OR is_active IS NULL) AND enriched_detail_description IS NOT NULL AND enriched_detail_description != ''", (dest_id,))
    with_content = cursor.fetchone()['cnt']
    print(f"\n{dest_name}: {with_content}/{total_active} actief met content ({with_content/total_active*100:.1f}%)")

# Save full report as JSON
report = {
    'timestamp': datetime.now().isoformat(),
    'texel': {
        'total_without_content': len(texel_pois),
        'pois': [{
            'id': p['id'],
            'name': p['name'],
            'category': p['category'],
            'subcategory': p['subcategory'],
            'rating': float(p['rating']) if p['rating'] else None,
            'review_count': p['review_count'],
            'website': p['website'],
            'exclusion_status': p['exclusion_status'],
            'has_highlights': p['has_highlights'],
            'has_google_description': p['has_google_description'],
            'has_tile': p['has_tile'],
            'created_at': p['created_at'].isoformat() if p['created_at'] else None,
        } for p in texel_pois]
    },
    'calpe': {
        'total_without_content': len(calpe_pois),
        'pois': [{
            'id': p['id'],
            'name': p['name'],
            'category': p['category'],
            'subcategory': p['subcategory'],
            'rating': float(p['rating']) if p['rating'] else None,
            'review_count': p['review_count'],
            'website': p['website'],
            'exclusion_status': p['exclusion_status'],
            'has_highlights': p['has_highlights'],
            'has_google_description': p['has_google_description'],
            'has_tile': p['has_tile'],
            'created_at': p['created_at'].isoformat() if p['created_at'] else None,
        } for p in calpe_pois]
    }
}

with open('/root/inventarisatie_pois_zonder_content.json', 'w') as f:
    json.dump(report, f, ensure_ascii=False, indent=2, default=str)
print(f"\nRapport opgeslagen: /root/inventarisatie_pois_zonder_content.json")

# AANBEVELING
print(f"\n{'=' * 60}")
print(f"AANBEVELING PER GROEP")
print(f"{'=' * 60}")
print(f"- Groep A (excluded): Laat staan — bewuste beslissing")
print(f"- Groep B (geen data): Accepteer als 'geen content mogelijk' of handmatig verrijken voor Tier 1-2")
print(f"- Groep C (brondata aanwezig): ACTIE — deze hadden WEL content moeten krijgen,")
print(f"  alsnog door content pipeline halen")
print(f"- Groep D (recent): ACTIE — meenemen in volgende content batch")

cursor.close()
conn.close()
print("\nDone.")
