#!/usr/bin/env python3
"""
Fase R6 STAP B: Generieke veilige beschrijvingen voor resterende POIs
HolidaiButler Content Repair Pipeline

Genereert korte, veilige beschrijvingen (40-70 woorden) zonder feitelijke claims
voor POIs die na Stap A nog niet in productie staan.

Usage:
    python3 fase_r6_generic_descriptions.py --dry-run      # Preview targets
    python3 fase_r6_generic_descriptions.py --execute       # Generate + apply
    python3 fase_r6_generic_descriptions.py --execute --resume  # Resume from checkpoint
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime

import mysql.connector
import requests

DB_CONFIG = {
    'host': 'jotx.your-database.de',
    'user': 'pxoziy_1',
    'password': 'j8,DrtshJSm$',
    'database': 'pxoziy_db1',
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci',
}

MISTRAL_API_KEY = 'pMPOgK7TmI7oe6rxPEXiCCPKDMk8pTUg'
MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions'
MISTRAL_MODEL = 'mistral-medium-latest'
RATE_LIMIT = 5  # requests per second
CHECKPOINT_FILE = '/root/fase_r6_generic_checkpoint.json'

SYSTEM_PROMPT = """Je bent een professionele copywriter voor een Europees toerismeplatform.
Je schrijft KORTE, VEILIGE beschrijvingen voor POIs (Points of Interest)
waar we GEEN betrouwbare brondata over hebben.

ABSOLUTE REGELS:
1. Schrijf in het Engels (British English)
2. Gebruik UITSLUITEND informatie die 100% zeker is:
   - De naam van de POI (gegeven)
   - De categorie (gegeven)
   - De locatie: "on Texel" of "in Calpe" (gegeven)
   - Het adres (indien gegeven)
   - De website/social media (indien gegeven)
3. Verzin NOOIT:
   - Prijzen, openingstijden, afstanden
   - Menu-items, faciliteiten, diensten
   - Historische feiten, jaartallen
   - Sensorische details ("cosy atmosphere", "stunning views")
   - Activiteiten of ervaringen
4. Verwijs ALTIJD naar de website of social media voor actuele info
5. Geen ** of markdown
6. Geen superlatieven of wervende taal

OPBOUW (3 delen, GEEN AIDA):
1. INTRO (1 zin): Introduceer de POI bij naam en locatie
2. BESCHRIJVING (1-2 zinnen): Wat het IS (categorie-gebaseerd),
   plus eventuele highlights uit de data (alleen als gegeven)
3. AFSLUITING (1 zin): Verwijs naar website/social media voor
   actuele informatie (openingstijden, menu, prijzen etc.)

WOORDENAANTAL: 40-70 woorden (kort en veilig)

CATEGORIE-SPECIFIEKE INTRO'S:
- Eten & Drinken / Food & Drinks: "[Naam] is a [subcategory] located [on Texel / in Calpe]."
- Natuur / Nature: "[Naam] is a natural area [on Texel / in Calpe]."
- Cultuur & Historie / Culture & History: "[Naam] is a cultural point of interest [on Texel / in Calpe]."
- Winkelen / Shopping: "[Naam] is a [subcategory] [on Texel / in Calpe]."
- Actief / Active: "[Naam] offers [subcategory] activities [on Texel / in Calpe]."
- Praktisch / Practical: "[Naam] is a [poi_type] [on Texel / in Calpe]."
- Recreatief / Recreation: "[Naam] is a recreational venue [on Texel / in Calpe]."
- Gezondheid & Verzorging / Health & Wellbeing: "[Naam] is a [subcategory] [on Texel / in Calpe]."

LOCATIEREGEL:
- Texel (destination_id = 2): altijd "on Texel" (NOOIT "in Texel")
- Calpe (destination_id = 1): altijd "in Calpe"
"""


def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


def build_user_prompt(poi):
    """Build the user prompt for a single POI."""
    dest = "on Texel" if poi['destination_id'] == 2 else "in Calpe"
    parts = [
        "Write a safe, factual description for this POI.",
        "Use ONLY the information provided below — do NOT add any details.",
        "",
        f"POI Name: {poi['name']}",
        f"Category: {poi['category'] or 'Unknown'}",
        f"Subcategory: {poi['subcategory'] or 'not available'}",
        f"Type: {poi['poi_type'] or 'not available'}",
        f"Location: {dest}",
        f"Address: {poi['address'] or 'not available'}",
        f"Website: {poi['website'] or 'not available'}",
        f"Google Rating: {poi['rating']}/5 ({poi['review_count']} reviews)" if poi['rating'] else "Google Rating: not available",
        f"Highlights: {poi['enriched_highlights'] or 'none'}",
        "",
        "Remember:",
        "- 40-70 words ONLY",
        "- NO invented details",
        "- Refer to website/social media for current information",
        "- Structure: intro, description, closing with website reference",
        "- Plain text, no markdown",
    ]
    return "\n".join(parts)


def call_mistral(system_prompt, user_prompt, retries=3):
    """Call Mistral API with retries."""
    headers = {
        'Authorization': f'Bearer {MISTRAL_API_KEY}',
        'Content-Type': 'application/json',
    }
    payload = {
        'model': MISTRAL_MODEL,
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt},
        ],
        'temperature': 0.3,
        'max_tokens': 200,
    }

    for attempt in range(retries):
        try:
            resp = requests.post(MISTRAL_URL, headers=headers, json=payload, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                return data['choices'][0]['message']['content'].strip()
            elif resp.status_code == 429:
                wait = 2 ** (attempt + 1)
                log(f"  Rate limited, waiting {wait}s...")
                time.sleep(wait)
            else:
                log(f"  API error {resp.status_code}: {resp.text[:200]}")
                time.sleep(1)
        except Exception as e:
            log(f"  Request error: {e}")
            time.sleep(1)

    return None


def load_checkpoint():
    """Load checkpoint of already-processed POI IDs."""
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, 'r') as f:
            data = json.load(f)
        return set(data.get('processed_poi_ids', []))
    return set()


def save_checkpoint(processed_ids):
    """Save checkpoint."""
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump({
            'processed_poi_ids': sorted(list(processed_ids)),
            'last_updated': datetime.now().isoformat(),
        }, f)


def fetch_targets(conn):
    """Fetch all POIs needing generic descriptions."""
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT s.id as staging_id, s.poi_id, s.destination_id,
               p.name, p.category, p.subcategory, p.poi_type,
               p.website, p.address, p.rating, p.review_count,
               p.enriched_highlights,
               p.enriched_detail_description as current_content,
               s.status as staging_status
        FROM poi_content_staging s
        JOIN POI p ON s.poi_id = p.id
        WHERE s.status IN ('review_required', 'rejected')
          AND DATE(s.created_at) = '2026-02-13'
          AND p.is_active = 1
        ORDER BY s.destination_id, p.category, p.name
    """)
    rows = cursor.fetchall()
    cursor.close()
    return rows


def main():
    parser = argparse.ArgumentParser(description='Fase R6 Stap B: Generic descriptions')
    parser.add_argument('--dry-run', action='store_true', default=True)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--resume', action='store_true', help='Resume from checkpoint')
    args = parser.parse_args()
    dry_run = not args.execute

    log("=" * 70)
    log("FASE R6 STAP B: GENERIEKE VEILIGE BESCHRIJVINGEN")
    log("=" * 70)
    log(f"Mode: {'DRY-RUN' if dry_run else 'EXECUTE'}")
    log(f"Model: {MISTRAL_MODEL}")

    conn = get_connection()
    targets = fetch_targets(conn)
    log(f"Totaal targets: {len(targets)}")

    # Per destination breakdown
    calpe = [t for t in targets if t['destination_id'] == 1]
    texel = [t for t in targets if t['destination_id'] == 2]
    log(f"  Calpe: {len(calpe)} (rejected: {sum(1 for t in calpe if t['staging_status'] == 'rejected')})")
    log(f"  Texel: {len(texel)} (rejected: {sum(1 for t in texel if t['staging_status'] == 'rejected')})")

    # Category breakdown
    cats = {}
    for t in targets:
        c = t['category'] or 'Unknown'
        cats[c] = cats.get(c, 0) + 1
    log(f"\nPer categorie:")
    for c, cnt in sorted(cats.items(), key=lambda x: -x[1]):
        log(f"  {c}: {cnt}")

    if dry_run:
        log("\n--- DRY-RUN: geen wijzigingen ---")
        # Show 3 example prompts
        log("\n--- Voorbeeld prompts (eerste 3) ---")
        for t in targets[:3]:
            prompt = build_user_prompt(t)
            log(f"\nPOI {t['poi_id']} ({t['name']}):")
            log(f"  {prompt[:200]}...")
        conn.close()
        return

    # Execute mode
    processed_ids = set()
    if args.resume:
        processed_ids = load_checkpoint()
        log(f"Resumed from checkpoint: {len(processed_ids)} already processed")

    cursor = conn.cursor(dictionary=True)

    generated = 0
    failed = 0
    word_counts = []
    request_times = []
    category_counts = {}

    for i, poi in enumerate(targets):
        if poi['poi_id'] in processed_ids:
            continue

        # Rate limiting
        if request_times:
            elapsed = time.time() - request_times[-1]
            if elapsed < 1.0 / RATE_LIMIT:
                time.sleep(1.0 / RATE_LIMIT - elapsed)

        user_prompt = build_user_prompt(poi)
        request_times.append(time.time())
        description = call_mistral(SYSTEM_PROMPT, user_prompt)

        if not description:
            log(f"  FAIL: POI {poi['poi_id']} ({poi['name']})")
            failed += 1
            continue

        # Clean up: remove any markdown, quotes
        description = description.strip('"\'')
        description = description.replace('**', '').replace('*', '')

        word_count = len(description.split())
        word_counts.append(word_count)

        cat = poi['category'] or 'Unknown'
        category_counts[cat] = category_counts.get(cat, 0) + 1

        # Update database
        try:
            # Update POI table
            cursor.execute("""
                UPDATE POI SET enriched_detail_description = %s WHERE id = %s
            """, (description, poi['poi_id']))

            # Update staging
            cursor.execute("""
                UPDATE poi_content_staging
                SET detail_description_en = %s,
                    content_source = 'generic_safe_r6',
                    status = 'applied',
                    applied_at = NOW()
                WHERE id = %s
            """, (description, poi['staging_id']))

            # Audit trail
            cursor.execute("""
                INSERT INTO poi_content_history
                (poi_id, field_name, old_value, new_value,
                 change_source, change_reason, changed_by)
                VALUES (%s, 'enriched_detail_description', %s, %s,
                        'generic_safe_r6',
                        'Generic safe description - no reliable source data',
                        'system')
            """, (poi['poi_id'], poi['current_content'] or '', description))

            generated += 1
            processed_ids.add(poi['poi_id'])

        except Exception as e:
            log(f"  DB ERROR: POI {poi['poi_id']} ({poi['name']}): {e}")
            failed += 1

        # Commit + checkpoint every 50
        if generated % 50 == 0:
            conn.commit()
            save_checkpoint(processed_ids)

        # Progress every 100
        if (generated + failed) % 100 == 0:
            pct = (generated + failed) / len(targets) * 100
            avg_wc = sum(word_counts[-100:]) / min(100, len(word_counts[-100:])) if word_counts else 0
            log(f"  Progress: {generated + failed}/{len(targets)} ({pct:.0f}%) | "
                f"Generated: {generated} | Failed: {failed} | Avg words: {avg_wc:.0f}")

    conn.commit()
    save_checkpoint(processed_ids)

    # Final report
    avg_words = sum(word_counts) / len(word_counts) if word_counts else 0
    min_words = min(word_counts) if word_counts else 0
    max_words = max(word_counts) if word_counts else 0

    log(f"\n{'=' * 70}")
    log(f"STAP B RESULTAAT")
    log(f"{'=' * 70}")
    log(f"Gegenereerd:         {generated}")
    log(f"Failed:              {failed}")
    log(f"Gem. woordenaantal:  {avg_words:.0f}")
    log(f"Min/Max woorden:     {min_words}/{max_words}")

    log(f"\nPer categorie gegenereerd:")
    for c, cnt in sorted(category_counts.items(), key=lambda x: -x[1]):
        log(f"  {c}: {cnt}")

    # Verify: staging status
    cursor.execute("""
        SELECT status, COUNT(*) as cnt
        FROM poi_content_staging
        WHERE DATE(created_at) = '2026-02-13'
        GROUP BY status
        ORDER BY FIELD(status, 'applied', 'approved', 'pending', 'review_required', 'rejected')
    """)
    log(f"\n--- Staging status NA Stap B ---")
    for r in cursor.fetchall():
        log(f"  {r['status']:20s}: {r['cnt']}")

    # Production count
    cursor.execute("""
        SELECT destination_id,
               SUM(CASE WHEN enriched_detail_description IS NOT NULL
                    AND enriched_detail_description != '' THEN 1 ELSE 0 END) as has_content,
               COUNT(*) as total
        FROM POI WHERE is_active = 1
        GROUP BY destination_id
    """)
    log(f"\n--- Productie status NA Stap B ---")
    for r in cursor.fetchall():
        dest = 'Calpe' if r['destination_id'] == 1 else 'Texel'
        log(f"  {dest}: {r['has_content']}/{r['total']} met content")

    cursor.close()
    conn.close()

    # Save final results
    results = {
        'completed_at': datetime.now().isoformat(),
        'generated': generated,
        'failed': failed,
        'avg_words': round(avg_words, 1),
        'min_words': min_words,
        'max_words': max_words,
        'category_counts': category_counts,
    }
    with open('/root/fase_r6_generic_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    log(f"\nResultaat opgeslagen: /root/fase_r6_generic_results.json")

    log(f"\n{'=' * 70}")
    log(f"DONE")
    log(f"{'=' * 70}")


if __name__ == '__main__':
    main()
