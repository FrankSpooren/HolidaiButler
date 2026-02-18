#!/usr/bin/env python3
"""
Fase R6 STAP A.5: Promoveer overige pending POIs met verhoogde threshold
HolidaiButler Content Repair Pipeline

Criteria:
- hallucination_rate <= 0.25 (was 0.20 in R5)
- Geen HIGH severity claims
- Niet in Frank's reviewlijst (die zijn al verwerkt in A.4)

Usage:
    python3 fase_r6_promote_remaining.py --dry-run     # Preview
    python3 fase_r6_promote_remaining.py --execute      # Apply
"""

import argparse
import json
import sys
from datetime import datetime

import mysql.connector

DB_CONFIG = {
    'host': 'jotx.your-database.de',
    'user': 'pxoziy_1',
    'password': 'j8,DrtshJSm$',
    'database': 'pxoziy_db1',
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci',
}

HALL_THRESHOLD = 0.25


def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


def load_frank_reviewed_ids():
    """Load Frank's reviewed POI IDs from A.4 output."""
    try:
        with open('/root/fase_r6_frank_processed.json', 'r') as f:
            data = json.load(f)
        ids = set(data.get('frank_reviewed_poi_ids', []))
        log(f"  Frank's reviewed POIs: {len(ids)}")
        return ids
    except FileNotFoundError:
        log("  WARNING: fase_r6_frank_processed.json not found, assuming empty set")
        return set()


def has_high_severity(llm_json_str):
    """Check if any unsupported claim has HIGH severity."""
    if not llm_json_str:
        return True  # No data = assume high risk
    try:
        data = json.loads(llm_json_str)
        claims = data.get('unsupported_claims', [])
        for claim in claims:
            if claim.get('severity', '').upper() == 'HIGH':
                return True
        return False
    except (json.JSONDecodeError, TypeError):
        return True  # Parse error = assume high risk


def get_hallucination_rate(llm_json_str):
    """Extract hallucination rate from llm_context_json."""
    if not llm_json_str:
        return 1.0  # No data = max risk
    try:
        data = json.loads(llm_json_str)
        rate = data.get('hallucination_rate', 1.0)
        if isinstance(rate, (int, float)):
            return float(rate)
        return 1.0
    except (json.JSONDecodeError, TypeError):
        return 1.0


def main():
    parser = argparse.ArgumentParser(description='Fase R6 A.5: Promote remaining pending')
    parser.add_argument('--dry-run', action='store_true', default=True)
    parser.add_argument('--execute', action='store_true')
    args = parser.parse_args()
    dry_run = not args.execute

    log("=" * 70)
    log("FASE R6 STAP A.5: PROMOVEER OVERIGE PENDING POIs")
    log("=" * 70)
    log(f"Mode: {'DRY-RUN' if dry_run else 'EXECUTE'}")
    log(f"Hallucinatie-threshold: {HALL_THRESHOLD} (25%)")

    frank_ids = load_frank_reviewed_ids()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Get all remaining pending POIs from R4 batch
        cursor.execute("""
            SELECT s.id as staging_id, s.poi_id, s.destination_id,
                   s.detail_description_en, s.llm_context_json,
                   p.enriched_detail_description as old_content,
                   p.name as poi_name
            FROM poi_content_staging s
            JOIN POI p ON s.poi_id = p.id
            WHERE s.status = 'pending'
            AND DATE(s.created_at) = '2026-02-13'
        """)
        pending = cursor.fetchall()
        log(f"\nTotaal pending (R4 batch): {len(pending)}")

        # Filter out Frank's reviewed POIs
        remaining = [r for r in pending if r['poi_id'] not in frank_ids]
        log(f"Na uitsluiting Frank's review: {len(remaining)}")

        promoted = 0
        blocked = 0
        no_content = 0
        promoted_list = []
        blocked_list = []

        for row in remaining:
            hall_rate = get_hallucination_rate(row['llm_context_json'])
            high_sev = has_high_severity(row['llm_context_json'])

            if hall_rate <= HALL_THRESHOLD and not high_sev:
                if not row['detail_description_en']:
                    log(f"  WARNING: POI {row['poi_id']} ({row['poi_name']}) has no staging content")
                    no_content += 1
                    continue

                if not dry_run:
                    # Update POI table
                    cursor.execute("""
                        UPDATE POI SET enriched_detail_description = %s WHERE id = %s
                    """, (row['detail_description_en'], row['poi_id']))

                    # Update staging
                    cursor.execute("""
                        UPDATE poi_content_staging
                        SET status = 'applied', applied_at = NOW(),
                            content_source = CONCAT(COALESCE(content_source, ''), '_r6_threshold25')
                        WHERE id = %s
                    """, (row['staging_id'],))

                    # Audit trail
                    cursor.execute("""
                        INSERT INTO poi_content_history
                        (poi_id, field_name, old_value, new_value,
                         change_source, change_reason, changed_by)
                        VALUES (%s, 'enriched_detail_description', %s, %s,
                                'r6_threshold_promote',
                                'Hallucination rate <= 25%%, no HIGH severity claims',
                                'system')
                    """, (row['poi_id'], row['old_content'] or '', row['detail_description_en']))

                promoted += 1
                promoted_list.append({
                    'poi_id': row['poi_id'],
                    'name': row['poi_name'],
                    'hall_rate': round(hall_rate, 3),
                    'dest': row['destination_id']
                })
            else:
                # Doesn't meet threshold → mark as review_required for Stap B
                reason = []
                if hall_rate > HALL_THRESHOLD:
                    reason.append(f"hall_rate={hall_rate:.2f}")
                if high_sev:
                    reason.append("HIGH_severity")

                if not dry_run:
                    cursor.execute("""
                        UPDATE poi_content_staging
                        SET status = 'review_required',
                            review_notes = CONCAT(COALESCE(review_notes, ''), ' r6_blocked: ', %s)
                        WHERE id = %s
                    """, (', '.join(reason), row['staging_id']))

                blocked += 1
                blocked_list.append({
                    'poi_id': row['poi_id'],
                    'name': row['poi_name'],
                    'hall_rate': round(hall_rate, 3),
                    'reason': ', '.join(reason),
                    'dest': row['destination_id']
                })

            # Commit every 100
            if not dry_run and (promoted + blocked) % 100 == 0:
                conn.commit()

        if not dry_run:
            conn.commit()

        # Report
        log(f"\n--- Resultaat A.5 ---")
        log(f"Gepromoveerd (hall <= 25%, geen HIGH): {promoted}")
        log(f"Geblokkeerd (naar Stap B):            {blocked}")
        log(f"Geen content:                         {no_content}")

        # Per destination
        promo_calpe = sum(1 for p in promoted_list if p['dest'] == 1)
        promo_texel = sum(1 for p in promoted_list if p['dest'] == 2)
        block_calpe = sum(1 for b in blocked_list if b['dest'] == 1)
        block_texel = sum(1 for b in blocked_list if b['dest'] == 2)
        log(f"\nPer bestemming:")
        log(f"  Calpe:  {promo_calpe} gepromoveerd, {block_calpe} geblokkeerd")
        log(f"  Texel:  {promo_texel} gepromoveerd, {block_texel} geblokkeerd")

        if not dry_run:
            # Show new staging status
            cursor.execute("""
                SELECT status, COUNT(*) as cnt
                FROM poi_content_staging
                WHERE DATE(created_at) = '2026-02-13'
                GROUP BY status
                ORDER BY FIELD(status, 'applied', 'approved', 'pending', 'review_required', 'rejected')
            """)
            log(f"\n--- Staging status NA A.5 ---")
            for r in cursor.fetchall():
                log(f"  {r['status']:20s}: {r['cnt']}")

            # Show production count
            cursor.execute("""
                SELECT destination_id,
                       SUM(CASE WHEN enriched_detail_description IS NOT NULL
                            AND enriched_detail_description != '' THEN 1 ELSE 0 END) as has_content,
                       COUNT(*) as total
                FROM POI WHERE is_active = 1
                GROUP BY destination_id
            """)
            log(f"\n--- Productie status NA A.5 ---")
            for r in cursor.fetchall():
                dest = 'Calpe' if r['destination_id'] == 1 else 'Texel'
                log(f"  {dest}: {r['has_content']}/{r['total']} met content")

            # Save results
            output = {
                'processed_at': datetime.now().isoformat(),
                'mode': 'EXECUTE',
                'threshold': HALL_THRESHOLD,
                'promoted': promoted,
                'blocked': blocked,
                'no_content': no_content,
                'promoted_list': promoted_list,
                'blocked_count_calpe': block_calpe,
                'blocked_count_texel': block_texel,
            }
            with open('/root/fase_r6_a5_results.json', 'w') as f:
                json.dump(output, f, indent=2)
            log("\nResultaat opgeslagen: /root/fase_r6_a5_results.json")

    finally:
        cursor.close()
        conn.close()

    log("\n" + "=" * 70)
    log("DONE")
    log("=" * 70)


if __name__ == '__main__':
    main()
