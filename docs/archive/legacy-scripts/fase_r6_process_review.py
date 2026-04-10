#!/usr/bin/env python3
"""
Fase R6 STAP A.4: Verwerking van Frank's beoordeeld Excel-bestand
HolidaiButler Content Repair Pipeline

Verwerkt GOED / AANPASSEN / AFKEUREN beoordelingen:
- GOED: promoveer staging content naar POI tabel
- AANPASSEN: gebruik Frank's tekst, promoveer naar POI tabel
- AFKEUREN: markeer als rejected (gaat naar Stap B)

Usage:
    python3 fase_r6_process_review.py --dry-run     # Preview
    python3 fase_r6_process_review.py --execute      # Apply
"""

import argparse
import json
import sys
from datetime import datetime

import mysql.connector

# === DATABASE CONFIG ===
DB_CONFIG = {
    'host': 'jotx.your-database.de',
    'user': 'pxoziy_1',
    'password': 'j8,DrtshJSm$',
    'database': 'pxoziy_db1',
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci',
}

# === KFC FIX: POI 736 changed from AANPASSEN to GOED (no text provided) ===
KFC_FIX_POI_ID = 736


def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


def load_review_data(json_path):
    """Load and validate review data from JSON file."""
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    log(f"Loaded {len(data)} reviews from {json_path}")

    # Apply KFC fix: POI 736 AANPASSEN → GOED
    for row in data:
        if row['poi_id'] == KFC_FIX_POI_ID:
            old_beoordeling = row['beoordeling']
            row['beoordeling'] = 'GOED'
            row['aangepaste_tekst'] = None
            log(f"  KFC FIX: POI {KFC_FIX_POI_ID} ({row['naam']}): {old_beoordeling} → GOED")
            break

    # Normalize beoordeling values (handle case variations)
    for row in data:
        if row.get('beoordeling'):
            row['beoordeling'] = row['beoordeling'].upper().strip()
            # Handle "GOED" variations
            if row['beoordeling'] in ('GOED', 'GOOD'):
                row['beoordeling'] = 'GOED'

    # Validate
    beoordelingen = {}
    for row in data:
        b = row.get('beoordeling', 'LEEG')
        beoordelingen[b] = beoordelingen.get(b, 0) + 1

    log(f"  Beoordelingen: {beoordelingen}")
    return data


def process_reviews(conn, review_data, dry_run=True):
    """Process all Frank's reviews."""
    cursor = conn.cursor(dictionary=True)

    goed_count = 0
    aanpassen_count = 0
    afkeuren_count = 0
    errors = 0
    frank_reviewed_ids = set()

    for row in review_data:
        poi_id = row['poi_id']
        staging_id = row['staging_id']
        beoordeling = row['beoordeling']
        aangepaste_tekst = row.get('aangepaste_tekst')
        dest_id = row['destination_id']
        naam = row.get('naam', f'POI {poi_id}')

        frank_reviewed_ids.add(poi_id)

        if not staging_id:
            log(f"  WARNING: POI {poi_id} ({naam}) has no staging_id, skipping")
            errors += 1
            continue

        try:
            if beoordeling == 'GOED':
                # Get current production content for audit trail
                cursor.execute("SELECT enriched_detail_description FROM POI WHERE id = %s", (poi_id,))
                current = cursor.fetchone()
                old_content = current['enriched_detail_description'] if current else ''

                # Get staging content
                cursor.execute("SELECT detail_description_en FROM poi_content_staging WHERE id = %s", (staging_id,))
                staging = cursor.fetchone()
                new_content = staging['detail_description_en'] if staging else ''

                if not new_content:
                    log(f"  WARNING: POI {poi_id} ({naam}) staging has no content, skipping")
                    errors += 1
                    continue

                if not dry_run:
                    # Update POI table
                    cursor.execute("""
                        UPDATE POI SET enriched_detail_description = %s WHERE id = %s
                    """, (new_content, poi_id))

                    # Update staging status
                    cursor.execute("""
                        UPDATE poi_content_staging
                        SET status = 'applied', applied_at = NOW(),
                            content_source = CONCAT(COALESCE(content_source, ''), '_frank_goed_r6')
                        WHERE id = %s
                    """, (staging_id,))

                    # Audit trail
                    cursor.execute("""
                        INSERT INTO poi_content_history
                        (poi_id, field_name, old_value, new_value, change_source, change_reason, changed_by)
                        VALUES (%s, 'enriched_detail_description', %s, %s, 'frank_review_r6', 'Manual review: GOED', 'frank')
                    """, (poi_id, old_content, new_content))

                goed_count += 1

            elif beoordeling == 'AANPASSEN':
                if not aangepaste_tekst:
                    log(f"  WARNING: POI {poi_id} ({naam}) AANPASSEN but no text, skipping")
                    errors += 1
                    continue

                # Get current production content for audit trail
                cursor.execute("SELECT enriched_detail_description FROM POI WHERE id = %s", (poi_id,))
                current = cursor.fetchone()
                old_content = current['enriched_detail_description'] if current else ''

                if not dry_run:
                    # Update POI table with Frank's text
                    cursor.execute("""
                        UPDATE POI SET enriched_detail_description = %s WHERE id = %s
                    """, (aangepaste_tekst, poi_id))

                    # Update staging with Frank's text + applied
                    cursor.execute("""
                        UPDATE poi_content_staging
                        SET detail_description_en = %s,
                            status = 'applied',
                            applied_at = NOW(),
                            content_source = 'frank_manual_edit_r6'
                        WHERE id = %s
                    """, (aangepaste_tekst, staging_id))

                    # Audit trail
                    cursor.execute("""
                        INSERT INTO poi_content_history
                        (poi_id, field_name, old_value, new_value, change_source, change_reason, changed_by)
                        VALUES (%s, 'enriched_detail_description', %s, %s, 'frank_manual_edit_r6', 'Manual review: AANPASSEN', 'frank')
                    """, (poi_id, old_content, aangepaste_tekst))

                aanpassen_count += 1

            elif beoordeling == 'AFKEUREN':
                if not dry_run:
                    cursor.execute("""
                        UPDATE poi_content_staging
                        SET status = 'rejected',
                            content_source = 'frank_rejected_r6'
                        WHERE id = %s
                    """, (staging_id,))

                afkeuren_count += 1

        except Exception as e:
            log(f"  ERROR: POI {poi_id} ({naam}): {e}")
            errors += 1

        # Commit every 50
        if not dry_run and (goed_count + aanpassen_count + afkeuren_count) % 50 == 0:
            conn.commit()

    if not dry_run:
        conn.commit()

    cursor.close()

    return {
        'goed': goed_count,
        'aanpassen': aanpassen_count,
        'afkeuren': afkeuren_count,
        'errors': errors,
        'frank_reviewed_ids': frank_reviewed_ids,
    }


def show_production_count(conn):
    """Show current production POI count."""
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT
            destination_id,
            COUNT(*) as totaal,
            SUM(CASE WHEN enriched_detail_description IS NOT NULL
                 AND enriched_detail_description != '' THEN 1 ELSE 0 END) as heeft_content
        FROM POI WHERE is_active = 1
        GROUP BY destination_id
    """)
    rows = cursor.fetchall()
    for r in rows:
        dest = 'Calpe' if r['destination_id'] == 1 else 'Texel'
        log(f"  {dest}: {r['heeft_content']}/{r['totaal']} met content")
    cursor.close()


def show_staging_status(conn):
    """Show staging status after processing."""
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT status, COUNT(*) as cnt
        FROM poi_content_staging
        WHERE DATE(created_at) = '2026-02-13'
        GROUP BY status
        ORDER BY FIELD(status, 'applied', 'approved', 'pending', 'review_required', 'rejected')
    """)
    rows = cursor.fetchall()
    for r in rows:
        log(f"  {r['status']:20s}: {r['cnt']}")
    cursor.close()


def main():
    parser = argparse.ArgumentParser(description='Fase R6: Process Frank review')
    parser.add_argument('--dry-run', action='store_true', default=True)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--json', default='/root/fase_r6_frank_reviewed_parsed.json',
                        help='Path to parsed review JSON file')
    args = parser.parse_args()
    dry_run = not args.execute

    log("=" * 70)
    log("FASE R6 STAP A.4: VERWERKING FRANK'S REVIEW")
    log("=" * 70)
    log(f"Mode: {'DRY-RUN' if dry_run else 'EXECUTE'}")
    log(f"JSON file: {args.json}")

    # Load review data
    review_data = load_review_data(args.json)
    log(f"Totaal reviews: {len(review_data)}")

    conn = get_connection()

    try:
        log("\n--- Productie status VOOR verwerking ---")
        show_production_count(conn)

        log("\n--- Staging status VOOR verwerking (R4 batch) ---")
        show_staging_status(conn)

        log("\n--- Verwerking Frank's beoordelingen ---")
        result = process_reviews(conn, review_data, dry_run=dry_run)

        log(f"\n--- Resultaat ---")
        log(f"GOED (naar productie):      {result['goed']}")
        log(f"AANPASSEN (Frank's tekst):  {result['aanpassen']}")
        log(f"AFKEUREN (naar Stap B):     {result['afkeuren']}")
        log(f"Errors:                     {result['errors']}")
        log(f"Totaal verwerkt:            {result['goed'] + result['aanpassen'] + result['afkeuren']}")

        if not dry_run:
            log("\n--- Productie status NA verwerking ---")
            show_production_count(conn)

            log("\n--- Staging status NA verwerking (R4 batch) ---")
            show_staging_status(conn)

            # Save result
            output = {
                'processed_at': datetime.now().isoformat(),
                'mode': 'EXECUTE',
                'goed': result['goed'],
                'aanpassen': result['aanpassen'],
                'afkeuren': result['afkeuren'],
                'errors': result['errors'],
                'frank_reviewed_poi_ids': sorted(list(result['frank_reviewed_ids'])),
            }
            with open('/root/fase_r6_frank_processed.json', 'w') as f:
                json.dump(output, f, indent=2)
            log("\nResultaat opgeslagen: /root/fase_r6_frank_processed.json")

    finally:
        conn.close()

    log("\n" + "=" * 70)
    log("DONE")
    log("=" * 70)


if __name__ == '__main__':
    main()
