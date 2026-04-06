#!/usr/bin/env python3
"""
Populate imageurls.keywords_verified from Apify/Google metadata (Option B).
Combines: categoryName + subcategory + reviewsTags + atmosphere + enriched_highlights
Source of truth: poi_apify_raw.raw_json + POI table
"""
import json, subprocess, sys

def db_query(sql):
    r = subprocess.run(
        ["mysql", "--no-defaults", "-upxoziy_1", "-pj8,DrtshJSm$",
         "-hjotx.your-database.de", "pxoziy_db1", "-N",
         "--default-character-set=utf8mb4", "-e", sql],
        capture_output=True
    )
    return r.stdout.decode("utf-8", errors="replace").strip().split("\n")

def db_exec(sql):
    subprocess.run(
        ["mysql", "--no-defaults", "-upxoziy_1", "-pj8,DrtshJSm$",
         "-hjotx.your-database.de", "pxoziy_db1",
         "--default-character-set=utf8mb4", "-e", sql],
        capture_output=True
    )

# 1. Get all unique POI IDs that have images
print("Loading POIs with images...", flush=True)
rows = db_query("SELECT DISTINCT poi_id FROM imageurls")
poi_ids = [r.strip() for r in rows if r.strip().isdigit()]
print(f"  {len(poi_ids)} POIs with images", flush=True)

# 2. For each POI, build keywords from Apify + POI table
updated = 0
no_apify = 0
batch_sql = []

for idx, pid in enumerate(poi_ids):
    # Get POI base data
    poi_rows = db_query(
        f'SELECT category, subcategory, enriched_highlights '
        f'FROM POI WHERE id = {pid} LIMIT 1'
    )
    if not poi_rows or not poi_rows[0].strip():
        continue

    parts = poi_rows[0].split("\t")
    category = parts[0] if len(parts) > 0 and parts[0] != "NULL" else ""
    subcategory = parts[1] if len(parts) > 1 and parts[1] != "NULL" else ""
    highlights_raw = parts[2] if len(parts) > 2 and parts[2] != "NULL" else ""

    # Get Apify metadata
    apify_rows = db_query(
        f'SELECT '
        f'JSON_UNQUOTE(JSON_EXTRACT(raw_json, "$.categoryName")), '
        f'JSON_EXTRACT(raw_json, "$.reviewsTags"), '
        f'JSON_EXTRACT(raw_json, "$.additionalInfo.Atmosphere"), '
        f'JSON_UNQUOTE(JSON_EXTRACT(raw_json, "$.address")) '
        f'FROM poi_apify_raw WHERE poi_id = {pid} ORDER BY scraped_at DESC LIMIT 1'
    )

    keywords = []

    # categoryName (Google's specific category)
    if apify_rows and apify_rows[0].strip():
        ap = apify_rows[0].split("\t")
        cat_name = ap[0] if len(ap) > 0 and ap[0] not in ("NULL", "null", "") else ""
        if cat_name:
            keywords.append(cat_name)

        # reviewsTags (top 5 by count)
        if len(ap) > 1 and ap[1] not in ("NULL", "null", ""):
            try:
                tags = json.loads(ap[1])
                for t in tags[:5]:
                    if isinstance(t, dict) and t.get("title"):
                        keywords.append(t["title"])
            except:
                pass

        # Atmosphere
        if len(ap) > 2 and ap[2] not in ("NULL", "null", ""):
            try:
                atm = json.loads(ap[2])
                if isinstance(atm, list):
                    for a in atm:
                        if isinstance(a, dict):
                            keywords.extend([k for k, v in a.items() if v])
                elif isinstance(atm, dict):
                    keywords.extend([k for k, v in atm.items() if v])
            except:
                pass
    else:
        no_apify += 1

    # DB category + subcategory
    if subcategory:
        keywords.append(subcategory)
    if category and category not in keywords:
        keywords.append(category)

    # Enriched highlights (first 3)
    if highlights_raw:
        try:
            hl = json.loads(highlights_raw)
            if isinstance(hl, list):
                keywords.extend(hl[:3])
        except:
            pass

    # Deduplicate and clean
    seen = set()
    clean = []
    for k in keywords:
        k = k.strip()
        if k and k.lower() not in seen and len(k) > 1:
            seen.add(k.lower())
            clean.append(k)

    if clean:
        kw_str = ", ".join(clean[:12])  # Max 12 keywords
        safe_kw = kw_str.replace("\\", "\\\\").replace("'", "\\'")
        db_exec(
            f"UPDATE imageurls SET keywords_verified = '{safe_kw}' WHERE poi_id = {pid}"
        )
        updated += 1

    if (idx + 1) % 200 == 0:
        print(f"  {idx+1}/{len(poi_ids)} POIs processed ({updated} updated)...", flush=True)

print(f"\nDone: {updated} POIs updated, {no_apify} without Apify data")

# Verify
verify = db_query("SELECT COUNT(*) FROM imageurls WHERE keywords_verified IS NOT NULL")
print(f"Images with keywords_verified: {verify[0].strip()}")
sample = db_query(
    "SELECT poi_id, SUBSTRING(keywords_verified, 1, 80) "
    "FROM imageurls WHERE keywords_verified IS NOT NULL ORDER BY RAND() LIMIT 5"
)
print("\nSample:")
for s in sample:
    if s.strip():
        print(f"  {s}")
