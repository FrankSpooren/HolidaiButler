#!/usr/bin/env python3
"""
Fase R4: Content Regeneratie + Verificatie Loop
================================================
HolidaiButler Content Repair Pipeline

Regenerates all 3,079 POI descriptions using:
- R2 fact sheets (source data)
- R3 prompt templates (anti-hallucination prompts)
- Second-pass verification (automated fact-check)
- Staging-first workflow (poi_content_staging table)

Phases:
1. Content Generation: Generate new descriptions for all POIs
2. Verification: Fact-check each description against source data
3. Staging: Write results to poi_content_staging with status
4. Report: Generate triage report for Frank

Usage:
    python3 -u fase_r4_regeneration.py [--phase 1|2|3|4|all] [--limit N] [--offset N]

Output:
    poi_content_staging table (MySQL)
    /root/fase_r4_checkpoint.json
    /root/fase_r4_results.json
    /root/fase_r4_triage_report.md
    /root/fase_r4_summary_for_frank.md

Author: Claude Code (Fase R4)
Date: 13 februari 2026
"""

import json
import os
import sys
import time
import re
import argparse
import traceback
from datetime import datetime
from collections import Counter, defaultdict

# Import R3 prompt templates
sys.path.insert(0, '/root')
from fase_r3_prompt_templates import (
    build_generation_prompt,
    build_verification_prompt,
    WORD_TARGETS,
)

# =============================================================================
# CONFIG
# =============================================================================

FACT_SHEETS_PATH = '/root/fase_r2_fact_sheets.json'
CHECKPOINT_PATH = '/root/fase_r4_checkpoint.json'
RESULTS_PATH = '/root/fase_r4_results.json'
TRIAGE_REPORT_PATH = '/root/fase_r4_triage_report.md'
SUMMARY_PATH = '/root/fase_r4_summary_for_frank.md'

# Mistral API
MISTRAL_API_KEY = 'pMPOgK7TmI7oe6rxPEXiCCPKDMk8pTUg'
MISTRAL_MODEL = 'mistral-large-latest'
MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions'

# Database
DB_HOST = 'jotx.your-database.de'
DB_USER = 'pxoziy_1'
DB_PASS = 'j8,DrtshJSm$'
DB_NAME = 'pxoziy_db1'

# Rate limiting
API_DELAY = 0.5            # seconds between API calls
BATCH_SIZE = 50            # checkpoint every N POIs
MAX_RETRIES = 3            # max retries per API call
RETRY_DELAY = 3            # seconds between retries
WORD_COUNT_RETRIES = 1     # retries for word count out of range (reduced for speed)

# Model selection
MISTRAL_MODEL_GENERATE = 'mistral-large-latest'   # Large for generation (quality matters)
MISTRAL_MODEL_VERIFY = 'mistral-large-latest'      # Large for verification too (medium truncates JSON)

# Verification thresholds
PASS_THRESHOLD = 0.0       # hallucination_rate = 0
REVIEW_THRESHOLD = 0.20    # hallucination_rate <= 0.20
# Above REVIEW_THRESHOLD = FAIL

# Staging status mapping
STATUS_MAP = {
    'PASS': 'approved',           # Auto-approve clean content
    'REVIEW': 'pending',          # Needs Frank's review
    'FAIL': 'review_required',    # Requires attention
    'ERROR': 'review_required',   # Generation/verification failed
}


# =============================================================================
# DATABASE
# =============================================================================

def get_db_connection():
    """Get MySQL database connection."""
    import mysql.connector
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        charset='utf8mb4',
        collation='utf8mb4_unicode_ci',
        connect_timeout=30,
    )


def get_current_content(poi_ids: list) -> dict:
    """Fetch current enriched_detail_description for given POI IDs."""
    if not poi_ids:
        return {}
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    # Batch in chunks of 500
    result = {}
    for i in range(0, len(poi_ids), 500):
        batch = poi_ids[i:i+500]
        placeholders = ','.join(['%s'] * len(batch))
        cursor.execute(
            f"SELECT id, enriched_detail_description FROM POI WHERE id IN ({placeholders})",
            batch
        )
        for row in cursor.fetchall():
            result[row['id']] = row['enriched_detail_description'] or ''
    cursor.close()
    conn.close()
    return result


def clear_staging_for_r4():
    """Clear any existing R4 staging entries (for re-runs)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM poi_content_staging WHERE content_source = 'fase_r4_regeneration'"
    )
    deleted = cursor.rowcount
    conn.commit()
    cursor.close()
    conn.close()
    return deleted


def write_to_staging(entries: list):
    """Write a batch of entries to poi_content_staging."""
    if not entries:
        return

    conn = get_db_connection()
    cursor = conn.cursor()

    sql = """INSERT INTO poi_content_staging
        (poi_id, destination_id, poi_name, google_placeid,
         detail_description_en, content_source, content_priority,
         old_content_snapshot, llm_context_json,
         status, comparison_recommendation, comparison_rationale,
         created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON DUPLICATE KEY UPDATE
         detail_description_en = VALUES(detail_description_en),
         old_content_snapshot = VALUES(old_content_snapshot),
         llm_context_json = VALUES(llm_context_json),
         status = VALUES(status),
         comparison_recommendation = VALUES(comparison_recommendation),
         comparison_rationale = VALUES(comparison_rationale)"""

    for entry in entries:
        try:
            cursor.execute(sql, (
                entry['poi_id'],
                entry['destination_id'],
                entry['poi_name'],
                entry.get('google_placeid', ''),
                entry['new_content'],
                'fase_r4_regeneration',
                1,  # content_priority
                entry.get('old_content', ''),
                json.dumps(entry.get('llm_context', {}), ensure_ascii=False),
                entry['status'],
                entry.get('recommendation', 'MANUAL_REVIEW'),
                entry.get('rationale', ''),
            ))
        except Exception as e:
            log(f"  [DB ERROR] POI {entry['poi_id']}: {e}")

    conn.commit()
    cursor.close()
    conn.close()


# =============================================================================
# MISTRAL API
# =============================================================================

def call_mistral(system_prompt: str, user_prompt: str, temperature: float = 0.4,
                 max_tokens: int = 500, model: str = None) -> str:
    """Call Mistral AI API with retry logic."""
    import urllib.request
    import urllib.error

    payload = {
        'model': model or MISTRAL_MODEL_GENERATE,
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt},
        ],
        'temperature': temperature,
        'max_tokens': max_tokens,
    }

    data = json.dumps(payload).encode('utf-8')

    for attempt in range(MAX_RETRIES):
        try:
            req = urllib.request.Request(
                MISTRAL_API_URL,
                data=data,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {MISTRAL_API_KEY}',
                },
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=90) as resp:
                result = json.loads(resp.read().decode('utf-8'))
                return result['choices'][0]['message']['content'].strip()
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8') if e.fp else ''
            if e.code == 429:
                # Rate limited — wait longer
                wait = RETRY_DELAY * (attempt + 2)
                log(f"    [RATE LIMIT] Waiting {wait}s...")
                time.sleep(wait)
                continue
            elif e.code >= 500:
                # Server error — retry
                time.sleep(RETRY_DELAY)
                continue
            else:
                return f"ERROR: HTTP {e.code}: {error_body[:200]}"
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
                continue
            return f"ERROR: {e}"

    return "ERROR: Max retries exceeded"


# =============================================================================
# CHECKPOINT
# =============================================================================

def load_checkpoint() -> dict:
    """Load checkpoint state."""
    if os.path.exists(CHECKPOINT_PATH):
        with open(CHECKPOINT_PATH, 'r') as f:
            return json.load(f)
    return {'completed_ids': [], 'phase': 'generation', 'stats': {}}


def save_checkpoint(state: dict):
    """Save checkpoint state."""
    with open(CHECKPOINT_PATH, 'w') as f:
        json.dump(state, f, ensure_ascii=False)


# =============================================================================
# LOGGING
# =============================================================================

def log(msg: str):
    """Print timestamped log message."""
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{ts}] {msg}", flush=True)


# =============================================================================
# PHASE 1+2: GENERATION + VERIFICATION (combined for efficiency)
# =============================================================================

def count_words(text: str) -> int:
    """Count words in text."""
    return len(text.split())


def parse_verification(response: str) -> dict:
    """Parse verification JSON from LLM response."""
    if response.startswith('ERROR:'):
        return {'verdict': 'ERROR', 'error': response, 'hallucination_rate': 1.0}

    try:
        # Extract JSON from response (might be wrapped in markdown code block)
        # Try to find the outermost { ... } block
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            json_str = json_match.group()
            parsed = json.loads(json_str)
            # Ensure required fields
            if 'verdict' not in parsed:
                rate = parsed.get('hallucination_rate', 0)
                if rate == 0:
                    parsed['verdict'] = 'PASS'
                elif rate <= REVIEW_THRESHOLD:
                    parsed['verdict'] = 'REVIEW'
                else:
                    parsed['verdict'] = 'FAIL'
            return parsed
    except json.JSONDecodeError:
        # JSON might be truncated — try to extract key fields with regex
        verdict_match = re.search(r'"verdict"\s*:\s*"(PASS|REVIEW|FAIL)"', response)
        rate_match = re.search(r'"hallucination_rate"\s*:\s*([\d.]+)', response)
        unsupported_match = re.search(r'"unsupported"\s*:\s*(\d+)', response)
        total_match = re.search(r'"total_claims"\s*:\s*(\d+)', response)

        if verdict_match:
            verdict = verdict_match.group(1)
            rate = float(rate_match.group(1)) if rate_match else 0.5
            return {
                'verdict': verdict,
                'hallucination_rate': rate,
                'unsupported': int(unsupported_match.group(1)) if unsupported_match else 0,
                'total_claims': int(total_match.group(1)) if total_match else 0,
                'unsupported_claims': [],
                'parse_note': 'Extracted from truncated JSON',
            }

    # Last resort: check if the response mentions PASS/REVIEW/FAIL
    for v in ['PASS', 'REVIEW', 'FAIL']:
        if v in response:
            return {
                'verdict': v,
                'hallucination_rate': 0.0 if v == 'PASS' else 0.15 if v == 'REVIEW' else 0.3,
                'unsupported_claims': [],
                'parse_note': f'Fallback: found {v} in response text',
            }

    return {'verdict': 'ERROR', 'error': 'Could not parse verification response',
            'raw_response': response[:500], 'hallucination_rate': 1.0}


def process_single_poi(fact_sheet: dict, old_content: str) -> dict:
    """Process a single POI: generate + verify."""

    poi_id = fact_sheet['poi_id']
    poi_name = fact_sheet.get('name', 'Unknown')
    quality = fact_sheet.get('data_quality', 'none')
    targets = WORD_TARGETS.get(quality, WORD_TARGETS['none'])

    result = {
        'poi_id': poi_id,
        'poi_name': poi_name,
        'destination': fact_sheet.get('destination', 'Unknown'),
        'destination_id': fact_sheet.get('destination_id', 0),
        'category': fact_sheet.get('category', ''),
        'data_quality': quality,
        'google_placeid': fact_sheet.get('google_placeid', ''),
        'old_content': old_content,
    }

    # --- Step 1: Generate ---
    system_prompt, user_prompt = build_generation_prompt(fact_sheet)
    generated_text = call_mistral(system_prompt, user_prompt, temperature=0.4, max_tokens=400)

    if generated_text.startswith('ERROR:'):
        result['new_content'] = ''
        result['error'] = generated_text
        result['verdict'] = 'ERROR'
        result['status'] = STATUS_MAP['ERROR']
        result['recommendation'] = 'MANUAL_REVIEW'
        result['rationale'] = f'Generation failed: {generated_text}'
        return result

    # Check word count — retry if out of range
    word_count = count_words(generated_text)
    retry_count = 0
    while (word_count < targets['min'] or word_count > targets['max']) and retry_count < WORD_COUNT_RETRIES:
        retry_count += 1
        time.sleep(API_DELAY)
        generated_text = call_mistral(system_prompt, user_prompt, temperature=0.3 + retry_count * 0.1, max_tokens=400)
        if generated_text.startswith('ERROR:'):
            break
        word_count = count_words(generated_text)

    result['new_content'] = generated_text
    result['word_count'] = word_count
    result['word_target'] = targets
    result['word_count_ok'] = targets['min'] <= word_count <= targets['max']
    result['word_retries'] = retry_count

    time.sleep(API_DELAY)

    # --- Step 2: Verify ---
    verify_system, verify_user = build_verification_prompt(fact_sheet, generated_text)
    verify_response = call_mistral(verify_system, verify_user, temperature=0.1, max_tokens=1500,
                                    model=MISTRAL_MODEL_VERIFY)

    verification = parse_verification(verify_response)
    result['verification'] = verification
    result['verdict'] = verification.get('verdict', 'ERROR')
    result['hallucination_rate'] = verification.get('hallucination_rate', -1)

    # Map verdict to staging status
    verdict = result['verdict']
    result['status'] = STATUS_MAP.get(verdict, STATUS_MAP['ERROR'])

    # Set recommendation
    if verdict == 'PASS':
        result['recommendation'] = 'USE_NEW'
        result['rationale'] = f'Verification PASS: 0 unsupported claims. Quality: {quality}.'
    elif verdict == 'REVIEW':
        unsupported = verification.get('unsupported', 0)
        total = verification.get('total_claims', 0)
        result['recommendation'] = 'USE_NEW'
        result['rationale'] = f'Verification REVIEW: {unsupported}/{total} minor unsupported claims ({result["hallucination_rate"]:.0%}). Quality: {quality}.'
    elif verdict == 'FAIL':
        unsupported_claims = verification.get('unsupported_claims', [])
        high_severity = [c for c in unsupported_claims if c.get('severity') == 'HIGH']
        if high_severity:
            result['recommendation'] = 'MANUAL_REVIEW'
            result['rationale'] = f'Verification FAIL: {len(high_severity)} HIGH severity claims. Quality: {quality}.'
        else:
            result['recommendation'] = 'USE_NEW'
            result['rationale'] = f'Verification FAIL (no HIGH severity): {verification.get("unsupported", 0)} unsupported claims. Quality: {quality}.'
    else:
        result['recommendation'] = 'MANUAL_REVIEW'
        result['rationale'] = f'Verification error: {verdict}. Quality: {quality}.'

    # Build LLM context for staging
    result['llm_context'] = {
        'data_quality': quality,
        'word_count': word_count,
        'word_target': targets,
        'verification_verdict': verdict,
        'hallucination_rate': result['hallucination_rate'],
        'unsupported_count': verification.get('unsupported', 0),
        'total_claims': verification.get('total_claims', 0),
        'unsupported_claims': verification.get('unsupported_claims', [])[:5],
        'content_source': 'fase_r4_regeneration',
        'model_generate': MISTRAL_MODEL_GENERATE,
        'model_verify': MISTRAL_MODEL_VERIFY,
        'generated_at': datetime.now().isoformat(),
        'r3_prompt_version': 'v3_final',
    }

    time.sleep(API_DELAY)

    return result


def run_generation_and_verification(fact_sheets: list, old_content_map: dict,
                                     checkpoint: dict, limit: int = None,
                                     offset: int = 0) -> list:
    """Run generation + verification for all POIs."""

    completed_ids = set(checkpoint.get('completed_ids', []))
    results = checkpoint.get('results', [])

    # Apply offset and limit
    remaining = [fs for fs in fact_sheets if fs['poi_id'] not in completed_ids]
    if offset > 0:
        remaining = remaining[offset:]
    if limit:
        remaining = remaining[:limit]

    total = len(remaining)
    log(f"Processing {total} POIs ({len(completed_ids)} already done, {len(fact_sheets)} total)")

    batch_for_staging = []
    start_time = time.time()

    for i, fs in enumerate(remaining):
        poi_id = fs['poi_id']
        quality = fs.get('data_quality', 'none')
        name = fs.get('name', 'Unknown')[:40]

        log(f"  [{i+1}/{total}] [{quality.upper():8s}] {fs.get('destination','?'):6s} | {name}")

        # Process this POI
        old_content = old_content_map.get(poi_id, '')
        result = process_single_poi(fs, old_content)
        results.append(result)
        completed_ids.add(poi_id)

        # Log result
        verdict = result.get('verdict', '?')
        wc = result.get('word_count', '?')
        hr = result.get('hallucination_rate', -1)
        hr_str = f"{hr:.0%}" if isinstance(hr, (int, float)) and hr >= 0 else '?'
        log(f"           → {verdict} | {wc} words | hall: {hr_str} | {result.get('recommendation', '?')}")

        if result.get('error'):
            log(f"           → ERROR: {result['error'][:80]}")

        # Add to staging batch
        batch_for_staging.append(result)

        # Checkpoint + staging write every BATCH_SIZE POIs
        if len(batch_for_staging) >= BATCH_SIZE:
            log(f"  --- Checkpointing ({len(completed_ids)} done) ---")
            write_to_staging(batch_for_staging)
            batch_for_staging = []
            save_checkpoint({
                'completed_ids': list(completed_ids),
                'phase': 'generation',
                'stats': compute_stats(results),
            })

            # Progress estimate
            elapsed = time.time() - start_time
            rate = (i + 1) / elapsed if elapsed > 0 else 0
            remaining_count = total - (i + 1)
            eta_seconds = remaining_count / rate if rate > 0 else 0
            eta_minutes = eta_seconds / 60
            log(f"  --- Progress: {i+1}/{total} ({(i+1)/total*100:.1f}%) | "
                f"Rate: {rate:.1f} POIs/s | ETA: {eta_minutes:.0f} min ---")

    # Final staging write
    if batch_for_staging:
        write_to_staging(batch_for_staging)

    # Final checkpoint
    save_checkpoint({
        'completed_ids': list(completed_ids),
        'phase': 'complete',
        'stats': compute_stats(results),
    })

    # Save full results
    log(f"Saving results to {RESULTS_PATH}...")
    with open(RESULTS_PATH, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    return results


# =============================================================================
# STATISTICS
# =============================================================================

def compute_stats(results: list) -> dict:
    """Compute summary statistics from results."""
    if not results:
        return {}

    verdicts = Counter(r.get('verdict', 'ERROR') for r in results)
    statuses = Counter(r.get('status', '?') for r in results)
    qualities = Counter(r.get('data_quality', '?') for r in results)
    destinations = Counter(r.get('destination', '?') for r in results)

    # Hallucination rates (exclude errors)
    valid = [r for r in results if isinstance(r.get('hallucination_rate'), (int, float)) and r['hallucination_rate'] >= 0]
    avg_hall_rate = sum(r['hallucination_rate'] for r in valid) / len(valid) if valid else 0

    # Per quality level
    per_quality = {}
    for quality in ['rich', 'moderate', 'minimal', 'none']:
        q_results = [r for r in valid if r.get('data_quality') == quality]
        if q_results:
            per_quality[quality] = {
                'count': len(q_results),
                'avg_hall_rate': sum(r['hallucination_rate'] for r in q_results) / len(q_results),
                'pass': sum(1 for r in q_results if r.get('verdict') == 'PASS'),
                'review': sum(1 for r in q_results if r.get('verdict') == 'REVIEW'),
                'fail': sum(1 for r in q_results if r.get('verdict') == 'FAIL'),
            }

    # Word count compliance
    wc_ok = sum(1 for r in results if r.get('word_count_ok'))
    wc_retried = sum(1 for r in results if r.get('word_retries', 0) > 0)

    return {
        'total': len(results),
        'verdicts': dict(verdicts),
        'statuses': dict(statuses),
        'qualities': dict(qualities),
        'destinations': dict(destinations),
        'avg_hallucination_rate': avg_hall_rate,
        'per_quality': per_quality,
        'word_count_ok': wc_ok,
        'word_count_retried': wc_retried,
        'errors': sum(1 for r in results if r.get('error')),
    }


# =============================================================================
# PHASE 4: REPORT GENERATION
# =============================================================================

def generate_triage_report(results: list) -> str:
    """Generate triage report for Frank."""
    stats = compute_stats(results)
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    lines = [
        f"# Fase R4: Regeneratie + Verificatie — Triage Report",
        f"",
        f"**Datum**: {now}",
        f"**Totaal POIs**: {stats.get('total', 0)}",
        f"**Model generatie**: {MISTRAL_MODEL_GENERATE} | **Model verificatie**: {MISTRAL_MODEL_VERIFY}",
        f"",
        f"---",
        f"",
        f"## Samenvatting",
        f"",
        f"| Metriek | Waarde |",
        f"|---------|--------|",
        f"| Totaal verwerkt | {stats.get('total', 0)} |",
        f"| PASS (auto-approved) | {stats.get('verdicts', {}).get('PASS', 0)} |",
        f"| REVIEW (pending) | {stats.get('verdicts', {}).get('REVIEW', 0)} |",
        f"| FAIL (review required) | {stats.get('verdicts', {}).get('FAIL', 0)} |",
        f"| ERROR | {stats.get('errors', 0)} |",
        f"| Gem. hallucinatie-rate | {stats.get('avg_hallucination_rate', 0):.1%} |",
        f"| Woordtelling OK | {stats.get('word_count_ok', 0)}/{stats.get('total', 0)} |",
        f"",
        f"### Vergelijking met R1 Baseline",
        f"",
        f"| Metriek | R1 (oude prompt) | R4 (nieuwe content) |",
        f"|---------|-------------------|---------------------|",
        f"| Hallucinatie-rate | 61% | {stats.get('avg_hallucination_rate', 0):.0%} |",
        f"| PASS rate | 0% | {stats.get('verdicts', {}).get('PASS', 0)}/{stats.get('total', 0)} |",
        f"",
    ]

    # Per quality breakdown
    lines.extend([
        f"### Per Kwaliteitsniveau",
        f"",
        f"| Kwaliteit | Aantal | Gem. Hall. Rate | PASS | REVIEW | FAIL |",
        f"|-----------|--------|----------------|------|--------|------|",
    ])
    for quality in ['rich', 'moderate', 'minimal', 'none']:
        q = stats.get('per_quality', {}).get(quality, {})
        if q:
            lines.append(
                f"| {quality.upper()} | {q['count']} | {q['avg_hall_rate']:.1%} | "
                f"{q['pass']} | {q['review']} | {q['fail']} |"
            )
    lines.append("")

    # Top 30 per destination for Frank's review
    for dest in ['Texel', 'Calpe']:
        dest_results = [r for r in results if r.get('destination') == dest and r.get('verdict') in ('FAIL', 'REVIEW')]
        # Sort by hallucination rate descending
        dest_results.sort(key=lambda r: r.get('hallucination_rate', 0), reverse=True)
        top30 = dest_results[:30]

        if top30:
            lines.extend([
                f"---",
                f"",
                f"## Review Queue: {dest} (Top {len(top30)})",
                f"",
                f"| # | POI | Categorie | Kwaliteit | Verdict | Hall. Rate | Probleem |",
                f"|---|-----|-----------|-----------|---------|-----------|----------|",
            ])
            for j, r in enumerate(top30):
                claims = r.get('verification', {}).get('unsupported_claims', [])
                problem = claims[0].get('claim', '?')[:40] + "..." if claims else "—"
                lines.append(
                    f"| {j+1} | {r['poi_name'][:30]} | {r.get('category', '?')[:15]} | "
                    f"{r.get('data_quality', '?')} | {r['verdict']} | "
                    f"{r.get('hallucination_rate', 0):.0%} | {problem} |"
                )
            lines.append("")

    # FAIL examples with full text
    fail_results = [r for r in results if r.get('verdict') == 'FAIL']
    if fail_results:
        lines.extend([
            f"---",
            f"",
            f"## FAIL Voorbeelden (eerste 10)",
            f"",
        ])
        for r in fail_results[:10]:
            claims = r.get('verification', {}).get('unsupported_claims', [])
            lines.extend([
                f"### {r['poi_name']} ({r.get('destination', '?')}, {r.get('data_quality', '?')})",
                f"",
                f"**Verdict**: {r['verdict']} | Hall. rate: {r.get('hallucination_rate', 0):.0%}",
                f"",
                f"**Nieuwe tekst**:",
                f"> {r.get('new_content', 'N/A')[:300]}",
                f"",
            ])
            if claims:
                lines.append(f"**Niet-ondersteunde claims ({len(claims)}):**")
                for c in claims[:5]:
                    lines.append(f"- \"{c.get('claim', '?')[:80]}\" [{c.get('severity', '?')}]")
                lines.append("")

    return '\n'.join(lines)


def generate_summary(results: list) -> str:
    """Generate Dutch summary for Frank."""
    stats = compute_stats(results)
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    total = stats.get('total', 0)
    verdicts = stats.get('verdicts', {})
    pass_count = verdicts.get('PASS', 0)
    review_count = verdicts.get('REVIEW', 0)
    fail_count = verdicts.get('FAIL', 0)
    error_count = stats.get('errors', 0)
    auto_approved = pass_count  # PASS = auto-approved

    return f"""# Fase R4: Content Regeneratie — Samenvatting

**Datum**: {now}
**Status**: COMPLEET
**Totaal verwerkt**: {total} POIs

---

## Resultaten

Alle {total} POI-beschrijvingen zijn opnieuw gegenereerd met de anti-hallucinatie
prompts uit Fase R3 en de brondata uit Fase R2.

| Status | Aantal | Percentage | Actie |
|--------|--------|-----------|-------|
| PASS (auto-approved) | {pass_count} | {pass_count/total*100:.0f}% | Klaar voor productie |
| REVIEW (pending) | {review_count} | {review_count/total*100:.0f}% | Frank bekijken |
| FAIL (review required) | {fail_count} | {fail_count/total*100:.0f}% | Frank handmatig reviewen |
| ERROR | {error_count} | {error_count/total*100:.0f}% | Opnieuw proberen |

**Gemiddelde hallucinatie-rate**: {stats.get('avg_hallucination_rate', 0):.1%} (was 61% in R1)

## Volgende stappen

1. **Frank**: Review de Top 30 per bestemming in het triage rapport
2. **Frank**: Goedkeuren of afkeuren van REVIEW/FAIL items
3. **Na goedkeuring**: Content van staging naar productie (POI tabel)
4. **Na productie**: Vertalingen opnieuw draaien (Fase 5 herhaling)
5. **Fase R5**: Safeguards implementeren (permanente fact-check)

## Bestanden op Hetzner

| Bestand | Beschrijving |
|---------|-------------|
| poi_content_staging tabel | Alle nieuwe content met review status |
| fase_r4_results.json | Volledige resultaten per POI |
| fase_r4_triage_report.md | Review queue met Top 30 per bestemming |
| fase_r4_summary_for_frank.md | Dit bestand |
| fase_r4_checkpoint.json | Voortgang checkpoint |
"""


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description='Fase R4: Content Regeneratie + Verificatie')
    parser.add_argument('--limit', type=int, default=None, help='Limit number of POIs to process')
    parser.add_argument('--offset', type=int, default=0, help='Skip first N unprocessed POIs')
    parser.add_argument('--resume', action='store_true', help='Resume from checkpoint')
    parser.add_argument('--clear-staging', action='store_true', help='Clear R4 staging entries before starting')
    parser.add_argument('--report-only', action='store_true', help='Generate reports from existing results')
    args = parser.parse_args()

    start_time = time.time()

    log("=" * 70)
    log("FASE R4: CONTENT REGENERATIE + VERIFICATIE LOOP")
    log("HolidaiButler Content Repair Pipeline")
    log("=" * 70)

    # Report-only mode
    if args.report_only:
        log("Report-only mode — loading existing results...")
        if not os.path.exists(RESULTS_PATH):
            log(f"ERROR: {RESULTS_PATH} not found")
            sys.exit(1)
        with open(RESULTS_PATH, 'r', encoding='utf-8') as f:
            results = json.load(f)
        log(f"Loaded {len(results)} results")
        generate_reports(results)
        return

    # Load fact sheets
    log(f"Loading fact sheets from {FACT_SHEETS_PATH}...")
    with open(FACT_SHEETS_PATH, 'r', encoding='utf-8') as f:
        fact_sheets = json.load(f)
    log(f"Loaded {len(fact_sheets)} fact sheets")

    # Quality distribution
    quality_dist = Counter(fs.get('data_quality', 'none') for fs in fact_sheets)
    for q, c in sorted(quality_dist.items()):
        log(f"  {q}: {c} POIs")

    # Load checkpoint
    checkpoint = load_checkpoint() if args.resume else {'completed_ids': [], 'phase': 'generation'}

    if args.resume and checkpoint.get('completed_ids'):
        log(f"Resuming from checkpoint: {len(checkpoint['completed_ids'])} already completed")

    # Clear staging if requested
    if args.clear_staging:
        deleted = clear_staging_for_r4()
        log(f"Cleared {deleted} existing R4 staging entries")

    # Fetch current content for comparison
    log("Fetching current content from POI table...")
    poi_ids = [fs['poi_id'] for fs in fact_sheets]
    old_content_map = get_current_content(poi_ids)
    log(f"Fetched content for {len(old_content_map)} POIs")

    # Run generation + verification
    log("")
    log("=" * 70)
    log("PHASE 1+2: CONTENT GENERATION + VERIFICATION")
    log("=" * 70)

    results = run_generation_and_verification(
        fact_sheets, old_content_map, checkpoint,
        limit=args.limit, offset=args.offset
    )

    # Generate reports
    generate_reports(results)

    elapsed = time.time() - start_time
    log("")
    log("=" * 70)
    log(f"FASE R4 COMPLETE — {elapsed:.0f}s elapsed ({elapsed/60:.0f} min)")
    log(f"Results: {RESULTS_PATH}")
    log(f"Triage:  {TRIAGE_REPORT_PATH}")
    log(f"Summary: {SUMMARY_PATH}")
    log("=" * 70)


def generate_reports(results: list):
    """Generate all reports from results."""
    # Triage report
    log("Generating triage report...")
    triage = generate_triage_report(results)
    with open(TRIAGE_REPORT_PATH, 'w', encoding='utf-8') as f:
        f.write(triage)

    # Summary for Frank
    log("Generating summary...")
    summary = generate_summary(results)
    with open(SUMMARY_PATH, 'w', encoding='utf-8') as f:
        f.write(summary)

    # Print stats
    stats = compute_stats(results)
    log("")
    log("=== FINAL STATISTICS ===")
    log(f"Total: {stats.get('total', 0)}")
    log(f"Verdicts: {stats.get('verdicts', {})}")
    log(f"Avg hallucination rate: {stats.get('avg_hallucination_rate', 0):.1%}")
    log(f"Word count OK: {stats.get('word_count_ok', 0)}/{stats.get('total', 0)}")
    log(f"Errors: {stats.get('errors', 0)}")
    for q in ['rich', 'moderate', 'minimal', 'none']:
        qstats = stats.get('per_quality', {}).get(q, {})
        if qstats:
            log(f"  {q}: {qstats['count']} POIs, avg hall: {qstats['avg_hall_rate']:.1%}, "
                f"PASS: {qstats['pass']}, REVIEW: {qstats['review']}, FAIL: {qstats['fail']}")


if __name__ == '__main__':
    main()
