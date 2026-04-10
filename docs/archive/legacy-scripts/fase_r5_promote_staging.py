#!/usr/bin/env python3
"""
Fase R5: Staging Promotion Script
HolidaiButler Content Repair Pipeline

Promotes approved content from poi_content_staging to production POI table.
Includes safeguard validation, audit trail, and rollback capability.

Usage:
    python3 fase_r5_promote_staging.py --dry-run          # Preview (default)
    python3 fase_r5_promote_staging.py --execute           # Apply to production
    python3 fase_r5_promote_staging.py --batch-approve     # Approve all USE_NEW first
    python3 fase_r5_promote_staging.py --rollback 123      # Rollback POI ID 123
    python3 fase_r5_promote_staging.py --status            # Show staging status
"""

import argparse
import json
import sys
import time
from datetime import datetime

import mysql.connector

from fase_r5_safeguards import validate_content

# === DATABASE CONFIG ===
DB_CONFIG = {
    'host': 'jotx.your-database.de',
    'user': 'pxoziy_1',
    'password': 'j8,DrtshJSm$',
    'database': 'pxoziy_db1',
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci',
}

# Only promote R4 entries (2026-02-13 batch)
R4_BATCH_DATE = '2026-02-13'


def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def show_status(conn):
    """Show current staging status breakdown."""
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT status, COUNT(*) as cnt
        FROM poi_content_staging
        WHERE DATE(created_at) = %s
        GROUP BY status
        ORDER BY FIELD(status, 'approved', 'pending', 'review_required', 'rejected', 'applied')
    """, (R4_BATCH_DATE,))
    rows = cursor.fetchall()

    log("=== STAGING STATUS (R4 batch) ===")
    total = 0
    for row in rows:
        log(f"  {row['status']:20s}: {row['cnt']}")
        total += row['cnt']
    log(f"  {'TOTAL':20s}: {total}")

    # Recommendation breakdown
    cursor.execute("""
        SELECT comparison_recommendation, COUNT(*) as cnt
        FROM poi_content_staging
        WHERE DATE(created_at) = %s
        GROUP BY comparison_recommendation
    """, (R4_BATCH_DATE,))
    rows = cursor.fetchall()
    log("\n=== RECOMMENDATIONS ===")
    for row in rows:
        rec = row['comparison_recommendation'] or 'NULL'
        log(f"  {rec:20s}: {row['cnt']}")

    # Per-destination breakdown
    cursor.execute("""
        SELECT destination_id, status, COUNT(*) as cnt
        FROM poi_content_staging
        WHERE DATE(created_at) = %s
        GROUP BY destination_id, status
        ORDER BY destination_id, status
    """, (R4_BATCH_DATE,))
    rows = cursor.fetchall()
    log("\n=== PER DESTINATION ===")
    dest_names = {1: 'Calpe', 2: 'Texel'}
    for row in rows:
        dest = dest_names.get(row['destination_id'], f"Dest {row['destination_id']}")
        log(f"  {dest:8s} | {row['status']:20s}: {row['cnt']}")

    cursor.close()


def batch_approve(conn, dry_run=True):
    """Batch-approve all USE_NEW recommendations that are pending/review_required."""
    cursor = conn.cursor(dictionary=True)

    # Count how many would be approved
    cursor.execute("""
        SELECT COUNT(*) as cnt
        FROM poi_content_staging
        WHERE DATE(created_at) = %s
        AND comparison_recommendation = 'USE_NEW'
        AND status IN ('pending', 'review_required')
    """, (R4_BATCH_DATE,))
    count = cursor.fetchone()['cnt']

    if count == 0:
        log("No USE_NEW entries to batch-approve.")
        cursor.close()
        return 0

    if dry_run:
        log(f"[DRY-RUN] Would batch-approve {count} USE_NEW entries")
        cursor.close()
        return count

    # Validate each entry through safeguards first
    cursor.execute("""
        SELECT id, poi_id, poi_name, detail_description_en, llm_context_json, destination_id
        FROM poi_content_staging
        WHERE DATE(created_at) = %s
        AND comparison_recommendation = 'USE_NEW'
        AND status IN ('pending', 'review_required')
    """, (R4_BATCH_DATE,))
    rows = cursor.fetchall()

    approved = 0
    blocked = 0
    for row in rows:
        result = validate_content(
            poi_id=row['poi_id'],
            new_content=row['detail_description_en'],
            llm_context_json=row['llm_context_json'],
            destination_id=row['destination_id'],
        )

        if result['approved']:
            cursor.execute("""
                UPDATE poi_content_staging
                SET status = 'approved', reviewed_by = 'system_r5', reviewed_at = NOW()
                WHERE id = %s
            """, (row['id'],))
            approved += 1
        else:
            blocked += 1
            if blocked <= 10:
                log(f"  BLOCKED: POI {row['poi_id']} ({row['poi_name']}) — {'; '.join(result['reasons'])}")

    conn.commit()
    log(f"Batch-approved {approved} entries, blocked {blocked}")
    cursor.close()
    return approved


def promote_to_production(conn, dry_run=True):
    """Promote all approved staging entries to production POI table."""
    cursor = conn.cursor(dictionary=True)

    # Get all approved R4 entries not yet applied
    cursor.execute("""
        SELECT s.id, s.poi_id, s.poi_name, s.detail_description_en,
               s.llm_context_json, s.destination_id, s.old_content_snapshot,
               s.comparison_recommendation, s.comparison_rationale
        FROM poi_content_staging s
        WHERE DATE(s.created_at) = %s
        AND s.status = 'approved'
    """, (R4_BATCH_DATE,))
    rows = cursor.fetchall()

    if not rows:
        log("No approved entries to promote.")
        cursor.close()
        return 0

    log(f"Found {len(rows)} approved entries to promote")

    if dry_run:
        log(f"[DRY-RUN] Would promote {len(rows)} entries to production")
        # Show first 10 as preview
        for i, row in enumerate(rows[:10]):
            content_preview = (row['detail_description_en'] or '')[:80]
            log(f"  [{i+1}] POI {row['poi_id']} ({row['poi_name']}): {content_preview}...")
        if len(rows) > 10:
            log(f"  ... and {len(rows) - 10} more")
        cursor.close()
        return len(rows)

    promoted = 0
    errors = 0

    for row in rows:
        try:
            # Get current production content for audit trail
            cursor.execute("""
                SELECT enriched_detail_description
                FROM POI
                WHERE id = %s
            """, (row['poi_id'],))
            current = cursor.fetchone()

            if not current:
                log(f"  WARNING: POI {row['poi_id']} not found in production table")
                errors += 1
                continue

            old_content = current.get('enriched_detail_description', '')
            new_content = row['detail_description_en']

            # Skip if content is the same
            if old_content == new_content:
                cursor.execute("""
                    UPDATE poi_content_staging
                    SET status = 'applied', applied_at = NOW()
                    WHERE id = %s
                """, (row['id'],))
                promoted += 1
                continue

            # Update production POI table
            cursor.execute("""
                UPDATE POI
                SET enriched_detail_description = %s
                WHERE id = %s
            """, (new_content, row['poi_id']))

            # Log to audit trail
            verification_json = row['llm_context_json']
            if isinstance(verification_json, str):
                try:
                    verification_json = json.loads(verification_json)
                except (json.JSONDecodeError, TypeError):
                    verification_json = {}

            cursor.execute("""
                INSERT INTO poi_content_history
                (poi_id, field_name, old_value, new_value, change_source, change_reason, verification_result, changed_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                row['poi_id'],
                'enriched_detail_description',
                old_content,
                new_content,
                'fase_r4_staging',
                row['comparison_rationale'] or 'R4 regeneration approved',
                json.dumps(verification_json) if verification_json else None,
                'system_r5',
            ))

            # Mark staging entry as applied
            cursor.execute("""
                UPDATE poi_content_staging
                SET status = 'applied', applied_at = NOW()
                WHERE id = %s
            """, (row['id'],))

            promoted += 1

            if promoted % 100 == 0:
                conn.commit()
                log(f"  Progress: {promoted}/{len(rows)} promoted")

        except Exception as e:
            log(f"  ERROR promoting POI {row['poi_id']}: {e}")
            errors += 1

    conn.commit()
    log(f"\nPromotion complete: {promoted} promoted, {errors} errors")
    cursor.close()
    return promoted


def rollback_poi(conn, poi_id, dry_run=True):
    """Rollback a specific POI to its previous content using audit trail."""
    cursor = conn.cursor(dictionary=True)

    # Check audit trail for this POI
    cursor.execute("""
        SELECT id, old_value, new_value, change_source, created_at
        FROM poi_content_history
        WHERE poi_id = %s AND field_name = 'enriched_detail_description'
        ORDER BY created_at DESC
        LIMIT 1
    """, (poi_id,))
    history = cursor.fetchone()

    if not history:
        # Fallback: check staging table
        cursor.execute("""
            SELECT id, old_content_snapshot, detail_description_en
            FROM poi_content_staging
            WHERE poi_id = %s AND DATE(created_at) = %s
            ORDER BY created_at DESC
            LIMIT 1
        """, (poi_id, R4_BATCH_DATE))
        staging = cursor.fetchone()

        if not staging or not staging['old_content_snapshot']:
            log(f"ERROR: No rollback data found for POI {poi_id}")
            cursor.close()
            return False

        old_content = staging['old_content_snapshot']
        log(f"Using staging old_content_snapshot for rollback (no audit trail entry)")
    else:
        old_content = history['old_value']
        log(f"Found audit trail entry from {history['created_at']}")

    if not old_content:
        log(f"ERROR: Old content is empty for POI {poi_id}")
        cursor.close()
        return False

    if dry_run:
        log(f"[DRY-RUN] Would rollback POI {poi_id}")
        log(f"  Restore to: {old_content[:100]}...")
        cursor.close()
        return True

    # Get current content for audit
    cursor.execute("SELECT enriched_detail_description FROM POI WHERE id = %s", (poi_id,))
    current = cursor.fetchone()

    # Restore old content
    cursor.execute("""
        UPDATE POI
        SET enriched_detail_description = %s
        WHERE id = %s
    """, (old_content, poi_id))

    # Log the rollback in audit trail
    cursor.execute("""
        INSERT INTO poi_content_history
        (poi_id, field_name, old_value, new_value, change_source, change_reason, changed_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        poi_id,
        'enriched_detail_description',
        current.get('enriched_detail_description', '') if current else '',
        old_content,
        'rollback',
        'Manual rollback via fase_r5_promote_staging.py',
        'system_r5',
    ))

    # Update staging status back
    cursor.execute("""
        UPDATE poi_content_staging
        SET status = 'rejected', review_notes = 'Rolled back via R5'
        WHERE poi_id = %s AND DATE(created_at) = %s AND status = 'applied'
    """, (poi_id, R4_BATCH_DATE))

    conn.commit()
    log(f"POI {poi_id} rolled back successfully")
    cursor.close()
    return True


def main():
    parser = argparse.ArgumentParser(description='Fase R5: Promote staging content to production')
    parser.add_argument('--dry-run', action='store_true', default=True,
                       help='Preview without writing (default)')
    parser.add_argument('--execute', action='store_true',
                       help='Actually apply changes to production')
    parser.add_argument('--batch-approve', action='store_true',
                       help='Batch-approve all USE_NEW recommendations first')
    parser.add_argument('--rollback', type=int, metavar='POI_ID',
                       help='Rollback a specific POI to previous content')
    parser.add_argument('--status', action='store_true',
                       help='Show current staging status')
    args = parser.parse_args()

    dry_run = not args.execute

    log("=" * 70)
    log("FASE R5: CONTENT STAGING PROMOTION")
    log("HolidaiButler Content Repair Pipeline")
    log("=" * 70)
    log(f"Mode: {'DRY-RUN (preview only)' if dry_run else 'EXECUTE (writing to production!)'}")
    log(f"R4 Batch Date: {R4_BATCH_DATE}")

    conn = get_connection()

    try:
        if args.status:
            show_status(conn)
            return

        if args.rollback:
            log(f"\n--- Rollback POI {args.rollback} ---")
            rollback_poi(conn, args.rollback, dry_run=dry_run)
            return

        # Step 1: Show current status
        show_status(conn)

        # Step 2: Batch-approve USE_NEW if requested
        if args.batch_approve:
            log("\n--- Step 1: Batch-Approve USE_NEW ---")
            batch_approve(conn, dry_run=dry_run)

            if not dry_run:
                log("\nUpdated status after batch-approve:")
                show_status(conn)

        # Step 3: Promote approved entries to production
        log("\n--- Step 2: Promote to Production ---")
        promoted = promote_to_production(conn, dry_run=dry_run)

        if not dry_run and promoted > 0:
            log("\nFinal status after promotion:")
            show_status(conn)

            # Verify audit trail
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT COUNT(*) as cnt FROM poi_content_history WHERE change_source = 'fase_r4_staging'")
            audit_count = cursor.fetchone()['cnt']
            log(f"\nAudit trail entries: {audit_count}")
            cursor.close()

    finally:
        conn.close()

    log("\n" + "=" * 70)
    log("DONE")
    log("=" * 70)


if __name__ == '__main__':
    main()
