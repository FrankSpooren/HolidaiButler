#!/usr/bin/env python3
"""
Fase R3: Prompt Test — Run anti-hallucination prompts on real POIs
===================================================================
Tests the R3 prompt templates with real fact sheets from R2.
Picks 3 POIs per data quality level (12 total) and runs:
1. Content generation with new prompts
2. Verification (fact-check) pass
3. Outputs comparison report

Usage:
    python3 -u fase_r3_test_prompts.py

Output:
    /root/fase_r3_test_results.json  — Full results
    /root/fase_r3_test_report.md     — Human-readable report
"""

import json
import os
import sys
import time
import random
import re
from datetime import datetime

# Import our R3 prompt templates
from fase_r3_prompt_templates import (
    build_generation_prompt,
    build_verification_prompt,
    WORD_TARGETS,
)

# =============================================================================
# CONFIG
# =============================================================================

FACT_SHEETS_PATH = '/root/fase_r2_fact_sheets.json'
RESULTS_PATH = '/root/fase_r3_test_results.json'
REPORT_PATH = '/root/fase_r3_test_report.md'

MISTRAL_API_KEY = 'pMPOgK7TmI7oe6rxPEXiCCPKDMk8pTUg'
MISTRAL_MODEL = 'mistral-large-latest'
MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions'

# Pick N POIs per quality level to test
SAMPLES_PER_QUALITY = 3

# Ensure diverse categories in selection
PREFERRED_CATEGORIES_TEXEL = ['Eten & Drinken', 'Natuur', 'Actief', 'Winkelen', 'Cultuur & Historie']
PREFERRED_CATEGORIES_CALPE = ['Food & Drinks', 'Beaches & Nature', 'Active', 'Shopping', 'Culture & History']

# API rate limiting
API_DELAY = 1.5  # seconds between API calls


# =============================================================================
# MISTRAL API
# =============================================================================

def call_mistral(system_prompt: str, user_prompt: str, temperature: float = 0.4,
                 max_tokens: int = 500) -> str:
    """Call Mistral AI API and return the response text."""
    import urllib.request
    import urllib.error

    payload = {
        'model': MISTRAL_MODEL,
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt},
        ],
        'temperature': temperature,
        'max_tokens': max_tokens,
    }

    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        MISTRAL_API_URL,
        data=data,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {MISTRAL_API_KEY}',
        },
        method='POST',
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            return result['choices'][0]['message']['content'].strip()
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else ''
        print(f"  [ERROR] Mistral API HTTP {e.code}: {error_body[:200]}")
        return f"ERROR: HTTP {e.code}"
    except Exception as e:
        print(f"  [ERROR] Mistral API: {e}")
        return f"ERROR: {e}"


# =============================================================================
# SAMPLE SELECTION
# =============================================================================

def select_test_samples(fact_sheets: list) -> list:
    """Select diverse test samples: 3 per quality level, mixed destinations & categories."""

    samples = []

    for quality in ['rich', 'moderate', 'minimal', 'none']:
        pool = [fs for fs in fact_sheets if fs.get('data_quality') == quality]

        if not pool:
            print(f"  WARNING: No POIs with quality '{quality}' found")
            continue

        # Split by destination
        texel = [fs for fs in pool if fs.get('destination') == 'Texel']
        calpe = [fs for fs in pool if fs.get('destination') == 'Calpe']

        selected = []

        # Try to pick from diverse categories
        for dest_pool, preferred in [(texel, PREFERRED_CATEGORIES_TEXEL), (calpe, PREFERRED_CATEGORIES_CALPE)]:
            if not dest_pool:
                continue
            # Pick one from preferred category if possible
            for cat in preferred:
                candidates = [fs for fs in dest_pool if fs.get('category') == cat and fs not in selected]
                if candidates:
                    selected.append(random.choice(candidates))
                    break

        # Fill remaining slots randomly (ensuring we get SAMPLES_PER_QUALITY)
        remaining_pool = [fs for fs in pool if fs not in selected]
        while len(selected) < SAMPLES_PER_QUALITY and remaining_pool:
            pick = random.choice(remaining_pool)
            selected.append(pick)
            remaining_pool.remove(pick)

        samples.extend(selected[:SAMPLES_PER_QUALITY])

    return samples


# =============================================================================
# TEST RUNNER
# =============================================================================

def count_words(text: str) -> int:
    """Count words in text."""
    return len(text.split())


def run_test(fact_sheets: list) -> list:
    """Run generation + verification on selected samples."""

    print(f"\n{'='*70}")
    print(f"FASE R3: PROMPT TEST — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*70}")

    # Select samples
    random.seed(42)  # Reproducible selection
    samples = select_test_samples(fact_sheets)
    print(f"\nSelected {len(samples)} test POIs:")
    for s in samples:
        print(f"  [{s['data_quality'].upper():8s}] {s['destination']:6s} | {s.get('category','?'):20s} | {s['name'][:50]}")

    results = []

    for i, fs in enumerate(samples):
        quality = fs.get('data_quality', 'none')
        targets = WORD_TARGETS.get(quality, WORD_TARGETS['none'])

        print(f"\n--- [{i+1}/{len(samples)}] {fs['name'][:50]} ({quality}) ---")

        # Step 1: Generate description
        print(f"  Generating description...")
        system_prompt, user_prompt = build_generation_prompt(fs)
        generated_text = call_mistral(system_prompt, user_prompt, temperature=0.4, max_tokens=400)

        if generated_text.startswith('ERROR:'):
            print(f"  GENERATION FAILED: {generated_text}")
            results.append({
                'poi_id': fs.get('poi_id'),
                'name': fs.get('name'),
                'destination': fs.get('destination'),
                'category': fs.get('category'),
                'data_quality': quality,
                'error': generated_text,
            })
            time.sleep(API_DELAY)
            continue

        word_count = count_words(generated_text)
        in_range = targets['min'] <= word_count <= targets['max']
        print(f"  Generated: {word_count} words (target: {targets['min']}-{targets['max']}) {'OK' if in_range else 'OUT OF RANGE'}")
        print(f"  Preview: {generated_text[:150]}...")

        time.sleep(API_DELAY)

        # Step 2: Verify (fact-check)
        print(f"  Running verification...")
        verify_system, verify_user = build_verification_prompt(fs, generated_text)
        verify_response = call_mistral(verify_system, verify_user, temperature=0.1, max_tokens=800)

        # Parse verification JSON
        verification = None
        if not verify_response.startswith('ERROR:'):
            try:
                # Extract JSON from response (might be wrapped in markdown code block)
                json_match = re.search(r'\{[\s\S]*\}', verify_response)
                if json_match:
                    verification = json.loads(json_match.group())
                    hall_rate = verification.get('hallucination_rate', -1)
                    verdict = verification.get('verdict', '?')
                    unsupported = verification.get('unsupported', 0)
                    total = verification.get('total_claims', 0)
                    print(f"  Verification: {verdict} — {unsupported}/{total} unsupported claims (rate: {hall_rate:.1%})")
                    if verification.get('unsupported_claims'):
                        for uc in verification['unsupported_claims'][:3]:
                            print(f"    - \"{uc.get('claim', '?')[:80]}\" — {uc.get('reason', '?')[:60]}")
                else:
                    print(f"  Could not parse verification JSON")
                    verification = {'raw_response': verify_response[:500]}
            except json.JSONDecodeError as e:
                print(f"  JSON parse error: {e}")
                verification = {'raw_response': verify_response[:500]}

        time.sleep(API_DELAY)

        results.append({
            'poi_id': fs.get('poi_id'),
            'name': fs.get('name'),
            'destination': fs.get('destination'),
            'category': fs.get('category'),
            'data_quality': quality,
            'word_count': word_count,
            'word_target': targets,
            'word_count_ok': in_range,
            'generated_text': generated_text,
            'verification': verification,
            'system_prompt_length': len(system_prompt),
            'user_prompt_length': len(user_prompt),
        })

    return results


# =============================================================================
# REPORT GENERATION
# =============================================================================

def generate_report(results: list) -> str:
    """Generate a human-readable markdown report."""

    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    lines = [
        f"# Fase R3: Prompt Test Report",
        f"",
        f"**Datum**: {now}",
        f"**Geteste POIs**: {len(results)}",
        f"**Model**: {MISTRAL_MODEL}",
        f"",
        f"---",
        f"",
        f"## Samenvatting",
        f"",
    ]

    # Summary statistics
    successful = [r for r in results if 'error' not in r]
    failed_gen = [r for r in results if 'error' in r]

    if successful:
        word_ok = sum(1 for r in successful if r.get('word_count_ok'))
        verified = [r for r in successful if r.get('verification') and 'verdict' in r.get('verification', {})]

        pass_count = sum(1 for r in verified if r['verification']['verdict'] == 'PASS')
        review_count = sum(1 for r in verified if r['verification']['verdict'] == 'REVIEW')
        fail_count = sum(1 for r in verified if r['verification']['verdict'] == 'FAIL')

        avg_hall_rate = 0
        if verified:
            rates = [r['verification'].get('hallucination_rate', 0) for r in verified]
            avg_hall_rate = sum(rates) / len(rates)

        lines.extend([
            f"| Metriek | Waarde |",
            f"|---------|--------|",
            f"| Gegenereerd | {len(successful)}/{len(results)} |",
            f"| Woordtelling OK | {word_ok}/{len(successful)} |",
            f"| Verificatie PASS | {pass_count}/{len(verified)} |",
            f"| Verificatie REVIEW | {review_count}/{len(verified)} |",
            f"| Verificatie FAIL | {fail_count}/{len(verified)} |",
            f"| Gem. hallucinatie-rate | {avg_hall_rate:.1%} |",
            f"",
        ])

        # Compare with R1 baseline
        lines.extend([
            f"### Vergelijking met Fase R1 Baseline",
            f"",
            f"| Metriek | R1 (oude prompt) | R3 (nieuwe prompt) |",
            f"|---------|-------------------|-------------------|",
            f"| Hallucinatie-rate | 61% | {avg_hall_rate:.0%} |",
            f"| PASS rate | 0% | {pass_count}/{len(verified)} ({pass_count/len(verified)*100:.0f}%) |" if verified else f"| PASS rate | 0% | N/A |",
            f"",
        ])

    # Per-quality breakdown
    for quality in ['rich', 'moderate', 'minimal', 'none']:
        quality_results = [r for r in successful if r.get('data_quality') == quality]
        if not quality_results:
            continue

        targets = WORD_TARGETS[quality]
        lines.extend([
            f"---",
            f"",
            f"## Data Quality: {quality.upper()} ({len(quality_results)} POIs)",
            f"",
            f"Woorddoel: {targets['min']}-{targets['max']} woorden",
            f"",
        ])

        for r in quality_results:
            v = r.get('verification', {})
            verdict = v.get('verdict', '?')
            hall_rate = v.get('hallucination_rate', -1)
            unsupported = v.get('unsupported_claims', [])

            emoji = '🟢' if verdict == 'PASS' else '🟡' if verdict == 'REVIEW' else '🔴' if verdict == 'FAIL' else '⚪'

            lines.extend([
                f"### {emoji} {r['name']} ({r['destination']})",
                f"",
                f"- **Categorie**: {r['category']}",
                f"- **Woorden**: {r.get('word_count', '?')} (doel: {targets['min']}-{targets['max']}) {'✅' if r.get('word_count_ok') else '❌'}",
                f"- **Verificatie**: {verdict} (hallucinatie-rate: {hall_rate:.0%})" if hall_rate >= 0 else f"- **Verificatie**: {verdict}",
                f"",
                f"**Gegenereerde tekst:**",
                f"> {r.get('generated_text', 'N/A')}",
                f"",
            ])

            if unsupported:
                lines.append(f"**Niet-ondersteunde claims ({len(unsupported)}):**")
                for uc in unsupported:
                    lines.append(f"- \"{uc.get('claim', '?')}\" — {uc.get('reason', '?')}")
                lines.append("")

    # Generation failures
    if failed_gen:
        lines.extend([
            f"---",
            f"",
            f"## Generatie-fouten ({len(failed_gen)})",
            f"",
        ])
        for r in failed_gen:
            lines.append(f"- **{r['name']}**: {r.get('error', 'Unknown error')}")
        lines.append("")

    return '\n'.join(lines)


# =============================================================================
# MAIN
# =============================================================================

def main():
    start_time = time.time()

    # Load fact sheets
    print(f"Loading fact sheets from {FACT_SHEETS_PATH}...")
    with open(FACT_SHEETS_PATH, 'r', encoding='utf-8') as f:
        fact_sheets = json.load(f)
    print(f"Loaded {len(fact_sheets)} fact sheets")

    # Run tests
    results = run_test(fact_sheets)

    # Save results JSON
    print(f"\nSaving results to {RESULTS_PATH}...")
    with open(RESULTS_PATH, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # Generate and save report
    report = generate_report(results)
    print(f"Saving report to {REPORT_PATH}...")
    with open(REPORT_PATH, 'w', encoding='utf-8') as f:
        f.write(report)

    elapsed = time.time() - start_time
    print(f"\n{'='*70}")
    print(f"FASE R3 TEST COMPLETE — {elapsed:.0f}s elapsed")
    print(f"Results: {RESULTS_PATH}")
    print(f"Report:  {REPORT_PATH}")
    print(f"{'='*70}")


if __name__ == '__main__':
    main()
