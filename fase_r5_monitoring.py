#!/usr/bin/env python3
"""
Fase R5: Content Quality Monitoring & Reporting
HolidaiButler Content Repair Pipeline

Generates quality reports and runs quarterly content audits.

Usage:
    python3 fase_r5_monitoring.py                  # Generate quality report
    python3 fase_r5_monitoring.py --audit           # Quarterly audit (re-verify 50 random POIs)
"""

import argparse
import json
import random
import sys
import time
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

DEST_NAMES = {1: 'Calpe', 2: 'Texel'}
R4_BATCH_DATE = '2026-02-13'


def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def generate_quality_report(conn):
    """Generate comprehensive content quality report."""
    cursor = conn.cursor(dictionary=True)
    report = []
    report.append("# Fase R5: Content Quality Report")
    report.append(f"\n**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # === 1. Staging Status ===
    report.append("\n---\n\n## 1. Staging Status (R4 Batch)")
    cursor.execute("""
        SELECT status, COUNT(*) as cnt
        FROM poi_content_staging
        WHERE DATE(created_at) = %s
        GROUP BY status
        ORDER BY FIELD(status, 'applied', 'approved', 'pending', 'review_required', 'rejected')
    """, (R4_BATCH_DATE,))
    rows = cursor.fetchall()
    report.append("\n| Status | Count |")
    report.append("|--------|-------|")
    total = 0
    for row in rows:
        report.append(f"| {row['status']} | {row['cnt']} |")
        total += row['cnt']
    report.append(f"| **Total** | **{total}** |")

    # === 2. Per-Destination Breakdown ===
    report.append("\n## 2. Per-Destination Breakdown")
    cursor.execute("""
        SELECT destination_id, status, COUNT(*) as cnt
        FROM poi_content_staging
        WHERE DATE(created_at) = %s
        GROUP BY destination_id, status
        ORDER BY destination_id, FIELD(status, 'applied', 'approved', 'pending', 'review_required', 'rejected')
    """, (R4_BATCH_DATE,))
    rows = cursor.fetchall()
    report.append("\n| Destination | Status | Count |")
    report.append("|-------------|--------|-------|")
    for row in rows:
        dest = DEST_NAMES.get(row['destination_id'], f"Dest {row['destination_id']}")
        report.append(f"| {dest} | {row['status']} | {row['cnt']} |")

    # === 3. Hallucination Distribution ===
    report.append("\n## 3. Hallucination Rate Distribution")
    cursor.execute("""
        SELECT
            CASE
                WHEN JSON_EXTRACT(llm_context_json, '$.hallucination_rate') = 0 THEN '0%'
                WHEN JSON_EXTRACT(llm_context_json, '$.hallucination_rate') <= 0.10 THEN '1-10%'
                WHEN JSON_EXTRACT(llm_context_json, '$.hallucination_rate') <= 0.20 THEN '11-20%'
                WHEN JSON_EXTRACT(llm_context_json, '$.hallucination_rate') <= 0.30 THEN '21-30%'
                WHEN JSON_EXTRACT(llm_context_json, '$.hallucination_rate') <= 0.50 THEN '31-50%'
                ELSE '51%+'
            END as rate_bucket,
            COUNT(*) as cnt
        FROM poi_content_staging
        WHERE DATE(created_at) = %s AND llm_context_json IS NOT NULL
        GROUP BY rate_bucket
        ORDER BY MIN(JSON_EXTRACT(llm_context_json, '$.hallucination_rate'))
    """, (R4_BATCH_DATE,))
    rows = cursor.fetchall()
    report.append("\n| Hallucination Rate | Count |")
    report.append("|-------------------|-------|")
    for row in rows:
        report.append(f"| {row['rate_bucket']} | {row['cnt']} |")

    # === 4. Per-Quality Tier ===
    report.append("\n## 4. Per-Quality Tier")
    cursor.execute("""
        SELECT
            JSON_UNQUOTE(JSON_EXTRACT(llm_context_json, '$.data_quality')) as quality,
            COUNT(*) as cnt,
            ROUND(AVG(JSON_EXTRACT(llm_context_json, '$.hallucination_rate')) * 100, 1) as avg_hall,
            SUM(CASE WHEN JSON_EXTRACT(llm_context_json, '$.verification_verdict') = '"PASS"' THEN 1 ELSE 0 END) as pass_cnt,
            SUM(CASE WHEN JSON_EXTRACT(llm_context_json, '$.verification_verdict') = '"REVIEW"' THEN 1 ELSE 0 END) as review_cnt,
            SUM(CASE WHEN JSON_EXTRACT(llm_context_json, '$.verification_verdict') = '"FAIL"' THEN 1 ELSE 0 END) as fail_cnt
        FROM poi_content_staging
        WHERE DATE(created_at) = %s AND llm_context_json IS NOT NULL
        GROUP BY quality
        ORDER BY FIELD(quality, 'rich', 'moderate', 'minimal', 'none')
    """, (R4_BATCH_DATE,))
    rows = cursor.fetchall()
    report.append("\n| Quality | Count | Avg Hall. | PASS | REVIEW | FAIL |")
    report.append("|---------|-------|-----------|------|--------|------|")
    for row in rows:
        report.append(f"| {row['quality']} | {row['cnt']} | {row['avg_hall']}% | {row['pass_cnt']} | {row['review_cnt']} | {row['fail_cnt']} |")

    # === 5. Audit Trail Summary ===
    report.append("\n## 5. Audit Trail Summary")
    cursor.execute("""
        SELECT change_source, COUNT(*) as cnt, MAX(created_at) as latest
        FROM poi_content_history
        GROUP BY change_source
        ORDER BY latest DESC
    """)
    rows = cursor.fetchall()
    if rows:
        report.append("\n| Source | Count | Latest |")
        report.append("|--------|-------|--------|")
        for row in rows:
            report.append(f"| {row['change_source']} | {row['cnt']} | {row['latest']} |")
    else:
        report.append("\nNo audit trail entries yet.")

    # === 6. Content Freshness ===
    report.append("\n## 6. Content Freshness")
    cursor.execute("""
        SELECT destination_id, COUNT(*) as total,
               SUM(CASE WHEN enriched_detail_description IS NOT NULL AND enriched_detail_description != '' THEN 1 ELSE 0 END) as has_content
        FROM POI
        WHERE is_active = 1
        GROUP BY destination_id
    """)
    rows = cursor.fetchall()
    report.append("\n| Destination | Active POIs | With Content | Coverage |")
    report.append("|-------------|-------------|-------------|----------|")
    for row in rows:
        dest = DEST_NAMES.get(row['destination_id'], f"Dest {row['destination_id']}")
        coverage = f"{row['has_content']/row['total']*100:.0f}%" if row['total'] > 0 else "N/A"
        report.append(f"| {dest} | {row['total']} | {row['has_content']} | {coverage} |")

    # === 7. Safeguard Blocked POIs (Top 20) ===
    report.append("\n## 7. Still Pending/Blocked (Top 20 by Hallucination Rate)")
    cursor.execute("""
        SELECT poi_id, poi_name, destination_id, status,
               JSON_EXTRACT(llm_context_json, '$.hallucination_rate') as hall_rate,
               JSON_UNQUOTE(JSON_EXTRACT(llm_context_json, '$.data_quality')) as quality,
               comparison_recommendation
        FROM poi_content_staging
        WHERE DATE(created_at) = %s
        AND status IN ('pending', 'review_required')
        ORDER BY JSON_EXTRACT(llm_context_json, '$.hallucination_rate') DESC
        LIMIT 20
    """, (R4_BATCH_DATE,))
    rows = cursor.fetchall()
    if rows:
        report.append("\n| POI | Destination | Quality | Hall. Rate | Status | Rec. |")
        report.append("|-----|-------------|---------|-----------|--------|------|")
        for row in rows:
            dest = DEST_NAMES.get(row['destination_id'], '?')
            hall = f"{float(row['hall_rate'])*100:.0f}%" if row['hall_rate'] else '?'
            report.append(f"| {row['poi_name'][:40]} | {dest} | {row['quality']} | {hall} | {row['status']} | {row['comparison_recommendation']} |")

    cursor.close()

    report_text = '\n'.join(report)

    # Write to file
    report_path = '/root/fase_r5_quality_report.md'
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report_text)

    log(f"Report saved to {report_path}")
    print(report_text)
    return report_text


def quarterly_audit(conn, sample_size=50):
    """
    Quarterly content audit: re-verify random sample against current production.
    Requires Mistral API key for re-verification.
    """
    try:
        from fase_r3_prompt_templates import build_verification_prompt
    except ImportError:
        log("ERROR: fase_r3_prompt_templates.py required for audit mode")
        return

    import requests

    MISTRAL_API_KEY = 'pMPOgK7TmI7oe6rxPEXiCCPKDMk8pTUg'
    MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions'
    MISTRAL_MODEL = 'mistral-large-latest'

    cursor = conn.cursor(dictionary=True)

    # Get random sample of applied POIs (balanced per destination)
    per_dest = sample_size // 2
    samples = []

    for dest_id in [1, 2]:
        cursor.execute("""
            SELECT s.poi_id, s.poi_name, s.destination_id,
                   p.enriched_detail_description as current_content,
                   JSON_UNQUOTE(JSON_EXTRACT(s.llm_context_json, '$.data_quality')) as quality,
                   JSON_EXTRACT(s.llm_context_json, '$.hallucination_rate') as r4_hall_rate
            FROM poi_content_staging s
            JOIN POI p ON s.poi_id = p.id
            WHERE DATE(s.created_at) = %s AND s.status = 'applied' AND s.destination_id = %s
            ORDER BY RAND()
            LIMIT %s
        """, (R4_BATCH_DATE, dest_id, per_dest))
        samples.extend(cursor.fetchall())

    log(f"Selected {len(samples)} POIs for audit ({per_dest} per destination)")

    # Load fact sheets for verification
    try:
        with open('/root/fase_r2_fact_sheets.json', 'r', encoding='utf-8') as f:
            all_fact_sheets = json.load(f)
        fact_sheet_map = {fs['poi_id']: fs for fs in all_fact_sheets}
    except FileNotFoundError:
        log("ERROR: /root/fase_r2_fact_sheets.json not found")
        return

    results = []

    for i, sample in enumerate(samples):
        poi_id = sample['poi_id']
        content = sample['current_content']
        fact_sheet = fact_sheet_map.get(poi_id, {})

        if not content or not fact_sheet:
            log(f"  [{i+1}/{len(samples)}] Skipping POI {poi_id} (no content or fact sheet)")
            continue

        # Build verification prompt
        sys_prompt, user_prompt = build_verification_prompt(fact_sheet, content)

        try:
            resp = requests.post(MISTRAL_URL, headers={
                'Authorization': f'Bearer {MISTRAL_API_KEY}',
                'Content-Type': 'application/json',
            }, json={
                'model': MISTRAL_MODEL,
                'messages': [
                    {'role': 'system', 'content': sys_prompt},
                    {'role': 'user', 'content': user_prompt},
                ],
                'temperature': 0.1,
                'max_tokens': 1500,
            }, timeout=30)
            resp.raise_for_status()
            response_text = resp.json()['choices'][0]['message']['content']

            # Parse verification result
            import re
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                verification = json.loads(json_match.group())
                hall_rate = verification.get('hallucination_rate', 0)
                verdict = verification.get('verdict', 'ERROR')
            else:
                hall_rate = -1
                verdict = 'PARSE_ERROR'

        except Exception as e:
            log(f"  [{i+1}/{len(samples)}] ERROR: {e}")
            hall_rate = -1
            verdict = 'API_ERROR'

        dest = DEST_NAMES.get(sample['destination_id'], '?')
        r4_rate = float(sample['r4_hall_rate']) if sample['r4_hall_rate'] else 0
        log(f"  [{i+1}/{len(samples)}] {dest:5s} | {sample['poi_name'][:30]:30s} | "
            f"R4: {r4_rate:.0%} -> Audit: {hall_rate:.0%} | {verdict}")

        results.append({
            'poi_id': poi_id,
            'poi_name': sample['poi_name'],
            'destination': dest,
            'quality': sample['quality'],
            'r4_hall_rate': r4_rate,
            'audit_hall_rate': hall_rate,
            'audit_verdict': verdict,
        })

        time.sleep(0.5)

    # Generate audit summary
    valid_results = [r for r in results if r['audit_hall_rate'] >= 0]
    if valid_results:
        avg_r4 = sum(r['r4_hall_rate'] for r in valid_results) / len(valid_results)
        avg_audit = sum(r['audit_hall_rate'] for r in valid_results) / len(valid_results)

        log(f"\n=== QUARTERLY AUDIT RESULTS ===")
        log(f"Sample size: {len(valid_results)}")
        log(f"R4 baseline avg:  {avg_r4:.1%}")
        log(f"Audit avg:        {avg_audit:.1%}")
        log(f"Delta:            {avg_audit - avg_r4:+.1%}")

        degraded = [r for r in valid_results if r['audit_hall_rate'] > r['r4_hall_rate'] + 0.10]
        if degraded:
            log(f"\nDEGRADED POIs ({len(degraded)}):")
            for r in degraded:
                log(f"  POI {r['poi_id']} ({r['poi_name']}): {r['r4_hall_rate']:.0%} -> {r['audit_hall_rate']:.0%}")

    # Save results
    with open('/root/fase_r5_audit_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    log(f"\nAudit results saved to /root/fase_r5_audit_results.json")

    cursor.close()


def main():
    parser = argparse.ArgumentParser(description='Fase R5: Content Quality Monitoring')
    parser.add_argument('--audit', action='store_true',
                       help='Run quarterly audit (re-verify 50 random POIs)')
    parser.add_argument('--sample-size', type=int, default=50,
                       help='Audit sample size (default: 50)')
    args = parser.parse_args()

    conn = get_connection()

    try:
        if args.audit:
            log("=== QUARTERLY CONTENT AUDIT ===")
            quarterly_audit(conn, sample_size=args.sample_size)
        else:
            generate_quality_report(conn)
    finally:
        conn.close()


if __name__ == '__main__':
    main()
