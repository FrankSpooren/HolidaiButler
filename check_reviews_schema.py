#!/usr/bin/env python3
"""
check_reviews_schema.py
-----------------------
Inspect the production `reviews` table schema, row counts, sample data,
and compare actual columns against what Review.js expects.
"""

import sys
import json

try:
    import pymysql
except ImportError:
    print("ERROR: pymysql not installed. Run: pip3 install pymysql")
    sys.exit(1)

DB_CONFIG = {
    "host": "jotx.your-database.de",
    "user": "pxoziy_1",
    "password": "j8,DrtshJSm$",
    "database": "pxoziy_db1",
    "charset": "utf8mb4",
    "connect_timeout": 15,
}

# Columns the Sequelize Review.js model expects
MODEL_EXPECTED_COLUMNS = [
    "id", "poi_id", "user_name", "travel_party_type", "rating",
    "review_text", "sentiment", "helpful_count", "visit_date",
    "created_at", "updated_at",
]

SEPARATOR = "=" * 70


def run():
    print(SEPARATOR)
    print("  HolidaiButler — reviews table schema check")
    print(SEPARATOR)

    conn = pymysql.connect(**DB_CONFIG)
    cur = conn.cursor()

    # ── a) DESCRIBE reviews ──────────────────────────────────────────────
    print("\n[a] DESCRIBE reviews\n")
    try:
        cur.execute("DESCRIBE reviews")
        rows = cur.fetchall()
        actual_columns = []
        print(f"{'Field':<30} {'Type':<35} {'Null':<6} {'Key':<6} {'Default':<20} {'Extra'}")
        print("-" * 120)
        for r in rows:
            field, typ, null, key, default, extra = r
            actual_columns.append(field)
            print(f"{field:<30} {typ:<35} {null:<6} {key:<6} {str(default):<20} {extra}")
        print(f"\nTotal columns: {len(actual_columns)}")
    except pymysql.err.ProgrammingError as e:
        print(f"ERROR: {e}")
        print("The 'reviews' table may not exist.")
        conn.close()
        sys.exit(1)

    # ── b) Total count ───────────────────────────────────────────────────
    print(f"\n{SEPARATOR}")
    print("[b] Total reviews count\n")
    cur.execute("SELECT COUNT(*) FROM reviews")
    total = cur.fetchone()[0]
    print(f"  Total rows: {total}")

    # ── c) Texel reviews (destination_id = 2) ────────────────────────────
    print(f"\n{SEPARATOR}")
    print("[c] Texel reviews (destination_id = 2)\n")
    cur.execute("""
        SELECT COUNT(*)
        FROM reviews r
        JOIN POI p ON r.poi_id = p.id
        WHERE p.destination_id = 2
    """)
    texel = cur.fetchone()[0]
    print(f"  Texel reviews: {texel}")

    # ── d) Calpe reviews (destination_id = 1) ────────────────────────────
    print(f"\n{SEPARATOR}")
    print("[d] Calpe reviews (destination_id = 1)\n")
    cur.execute("""
        SELECT COUNT(*)
        FROM reviews r
        JOIN POI p ON r.poi_id = p.id
        WHERE p.destination_id = 1
    """)
    calpe = cur.fetchone()[0]
    print(f"  Calpe reviews: {calpe}")

    # ── e) Sample data (LIMIT 5) ────────────────────────────────────────
    print(f"\n{SEPARATOR}")
    print("[e] Sample data (LIMIT 5)\n")
    cur.execute("SELECT * FROM reviews LIMIT 5")
    sample_rows = cur.fetchall()
    col_names = [desc[0] for desc in cur.description]
    for i, row in enumerate(sample_rows, 1):
        print(f"  --- Row {i} ---")
        for cn, val in zip(col_names, row):
            display = str(val)
            if len(display) > 200:
                display = display[:200] + "..."
            print(f"    {cn}: {display}")
        print()

    # ── f) Distinct sources ──────────────────────────────────────────────
    print(f"{SEPARATOR}")
    print("[f] Distinct review sources (LIMIT 20)\n")
    # Check if 'source' column exists first
    if "source" in actual_columns:
        cur.execute("SELECT DISTINCT source FROM reviews LIMIT 20")
        sources = cur.fetchall()
        for s in sources:
            print(f"  - {s[0]}")
        if not sources:
            print("  (no rows)")
    else:
        print("  NOTE: 'source' column does NOT exist in the reviews table.")
        print(f"  Actual columns: {actual_columns}")

    # ── g) Model vs DB comparison ────────────────────────────────────────
    print(f"\n{SEPARATOR}")
    print("[g] Review.js model expectations vs actual DB columns\n")

    actual_set = set(actual_columns)
    model_set = set(MODEL_EXPECTED_COLUMNS)

    in_model_not_db = sorted(model_set - actual_set)
    in_db_not_model = sorted(actual_set - model_set)
    matching = sorted(model_set & actual_set)

    print(f"  Matching columns ({len(matching)}):")
    for c in matching:
        print(f"    [OK]  {c}")

    if in_model_not_db:
        print(f"\n  In Review.js but NOT in DB ({len(in_model_not_db)}):")
        for c in in_model_not_db:
            print(f"    [MISSING IN DB]  {c}")
    else:
        print("\n  All model columns exist in DB.")

    if in_db_not_model:
        print(f"\n  In DB but NOT in Review.js ({len(in_db_not_model)}):")
        for c in in_db_not_model:
            print(f"    [EXTRA IN DB]  {c}")
    else:
        print("\n  No extra DB columns beyond what model expects.")

    # ── Summary ──────────────────────────────────────────────────────────
    print(f"\n{SEPARATOR}")
    print("SUMMARY")
    print(SEPARATOR)
    print(f"  Total reviews:      {total}")
    print(f"  Texel reviews:      {texel}")
    print(f"  Calpe reviews:      {calpe}")
    print(f"  Orphan reviews:     {total - texel - calpe}")
    print(f"  DB columns:         {len(actual_columns)}")
    print(f"  Model columns:      {len(MODEL_EXPECTED_COLUMNS)}")
    print(f"  Missing in DB:      {len(in_model_not_db)}")
    print(f"  Extra in DB:        {len(in_db_not_model)}")
    print(SEPARATOR)

    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    run()
