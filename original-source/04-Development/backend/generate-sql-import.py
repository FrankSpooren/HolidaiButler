"""
Generate SQL script for phpMyAdmin import
Combines enrichment data + opening hours into UPDATE statements
"""
import json
import sys

ENRICHMENT_JSON = r'C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\HolidaiButler-Platform-Project\04-Development\backend\poi-enrichment-data.json'
HOURS_JSON = r'C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\HolidaiButler-Platform-Project\04-Development\backend\poi-opening-hours.json'
SQL_OUTPUT = r'C:\Users\frank\OneDrive\Documenten\AI 2025\HolidAIbutler\HolidaiButler-Platform-Project\04-Development\backend\POI_ENRICHMENT_IMPORT.sql'

def escape_sql(value):
    """Escape SQL string values"""
    if value is None:
        return 'NULL'
    if isinstance(value, (int, float)):
        return str(value)
    # Escape single quotes and backslashes
    escaped = str(value).replace('\\', '\\\\').replace("'", "\\'")
    return f"'{escaped}'"

def generate_sql():
    """Generate SQL UPDATE statements"""
    print("Loading enrichment data...")
    with open(ENRICHMENT_JSON, 'r', encoding='utf-8') as f:
        enrichment_data = json.load(f)
    print(f"  Loaded {len(enrichment_data)} POI records")

    print("Loading opening hours...")
    with open(HOURS_JSON, 'r', encoding='utf-8') as f:
        hours_data = json.load(f)
    print(f"  Loaded {len(hours_data)} opening hours")

    print("\nGenerating SQL UPDATE statements...")

    sql_statements = []
    sql_statements.append("-- =====================================================")
    sql_statements.append("-- POI Database Enrichment Script")
    sql_statements.append("-- Generated: 2025-11-07")
    sql_statements.append("-- =====================================================")
    sql_statements.append("-- Purpose: Enrich POI table with:")
    sql_statements.append("--   - Ratings (google_totalscore)")
    sql_statements.append("--   - Review counts (google_reviewscount)")
    sql_statements.append("--   - Image URLs (google_imageurl)")
    sql_statements.append("--   - Opening hours (valid JSON format)")
    sql_statements.append("--")
    sql_statements.append("-- Instructions:")
    sql_statements.append("--   1. Login to Hetzner phpMyAdmin")
    sql_statements.append("--   2. Select database: pxoziy_db1")
    sql_statements.append("--   3. Go to SQL tab")
    sql_statements.append("--   4. Paste this entire script")
    sql_statements.append("--   5. Click 'Go' to execute")
    sql_statements.append("-- =====================================================\n")

    sql_statements.append("USE pxoziy_db1;\n")
    sql_statements.append("-- Start transaction for atomicity")
    sql_statements.append("START TRANSACTION;\n")

    count_with_hours = 0
    count_without_hours = 0

    for placeid, data in enrichment_data.items():
        # Build UPDATE statement
        updates = []

        # Rating
        if data.get('rating') is not None:
            updates.append(f"rating = {escape_sql(data['rating'])}")

        # Review count
        if data.get('reviewCount') is not None:
            updates.append(f"review_count = {escape_sql(data['reviewCount'])}")

        # Image URL
        if data.get('imageUrl'):
            updates.append(f"thumbnail_url = {escape_sql(data['imageUrl'])}")

        # Opening hours (if available)
        if placeid in hours_data:
            hours_json = json.dumps(hours_data[placeid], ensure_ascii=False)
            updates.append(f"opening_hours = {escape_sql(hours_json)}")
            count_with_hours += 1
        else:
            count_without_hours += 1

        if updates:
            sql = f"UPDATE POI SET {', '.join(updates)} WHERE google_placeid = {escape_sql(placeid)};"
            sql_statements.append(sql)

    sql_statements.append("\n-- Commit transaction")
    sql_statements.append("COMMIT;\n")

    # Statistics
    sql_statements.append("-- =====================================================")
    sql_statements.append("-- Statistics:")
    sql_statements.append(f"--   Total POIs updated: {len(enrichment_data)}")
    sql_statements.append(f"--   With opening hours: {count_with_hours}")
    sql_statements.append(f"--   Without opening hours: {count_without_hours}")
    sql_statements.append("-- =====================================================")

    # Write SQL file
    print(f"\nWriting SQL to {SQL_OUTPUT}...")
    with open(SQL_OUTPUT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_statements))

    print("\nSQL script generated successfully!")
    print(f"  Total UPDATE statements: {len(enrichment_data)}")
    print(f"  POIs with opening hours: {count_with_hours}")
    print(f"  POIs without opening hours: {count_without_hours}")
    print(f"\nFile location: {SQL_OUTPUT}")
    print("\nReady for import via phpMyAdmin!")

if __name__ == '__main__':
    try:
        generate_sql()
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
