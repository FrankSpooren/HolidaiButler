#!/usr/bin/env python3
"""
Fase R6b STAP 5: Hervertaling van Gewijzigde POIs (NL, DE, ES)
===============================================================
Alle gestrippte POIs opnieuw vertalen naar NL, DE, ES.
Gebruikt dezelfde vertaal-pipeline als R6 Stap C.
Parallel: 10 workers, rate limiting 5 req/sec.
"""

import json
import time
import re
import sys
import argparse
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
import mysql.connector

# ─── CONFIGURATIE ───────────────────────────────────────────────────────────

MISTRAL_API_KEY = "pMPOgK7TmI7oe6rxPEXiCCPKDMk8pTUg"
MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"
MISTRAL_MODEL = "mistral-medium-latest"

DB_CONFIG = {
    'host': 'jotx.your-database.de',
    'user': 'pxoziy_1',
    'password': 'j8,DrtshJSm$',
    'database': 'pxoziy_db1',
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci'
}

CHECKPOINT_FILE = '/root/fase_r6b_translate_checkpoint.json'
RESULTS_FILE = '/root/fase_r6b_translate_results.json'

MAX_WORKERS = 10
BATCH_SIZE = 200

LANGUAGES = {
    'nl': {
        'name': 'Dutch (Nederlands)',
        'col': 'enriched_detail_description_nl',
        'texel': 'op Texel',
        'calpe': 'in Calpe'
    },
    'de': {
        'name': 'German (Deutsch)',
        'col': 'enriched_detail_description_de',
        'texel': 'auf Texel',
        'calpe': 'in Calpe'
    },
    'es': {
        'name': 'Spanish (Español)',
        'col': 'enriched_detail_description_es',
        'texel': 'en Texel',
        'calpe': 'en Calpe'
    }
}


def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def clean_markdown(text):
    """Verwijder markdown formatting"""
    if not text:
        return text
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)
    return text.strip()


def strip_quotes(text):
    """Verwijder omringende aanhalingstekens"""
    if not text:
        return text
    if (text.startswith('"') and text.endswith('"')) or \
       (text.startswith("'") and text.endswith("'")):
        text = text[1:-1].strip()
    return text


def translate_poi(poi_id, en_text, destination_id, lang_code, lang_info):
    """Vertaal één POI naar één taal"""
    location = lang_info['texel'] if destination_id == 2 else lang_info['calpe']

    system_prompt = f"""You are a professional translator for a European tourism platform.
Translate the following English POI description to {lang_info['name']}.

RULES:
1. Maintain the same tone and style as the original
2. Keep POI names UNTRANSLATED (they are brand names)
3. Use "{location}" for the location reference
4. Translate naturally — not word-for-word
5. Keep the same paragraph structure
6. No markdown formatting
7. Keep website URLs unchanged
8. ALL times remain in 24-hour format (09:00-17:00)
9. ALL prices remain with € symbol

Return ONLY the translation, nothing else."""

    try:
        resp = requests.post(MISTRAL_URL, headers={
            'Authorization': f'Bearer {MISTRAL_API_KEY}',
            'Content-Type': 'application/json'
        }, json={
            'model': MISTRAL_MODEL,
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': en_text}
            ],
            'temperature': 0.3,
            'max_tokens': 500
        }, timeout=30)

        if resp.status_code != 200:
            raise Exception(f"HTTP {resp.status_code}: {resp.text[:200]}")

        data = resp.json()
        translation = data['choices'][0]['message']['content'].strip()
        translation = clean_markdown(translation)
        translation = strip_quotes(translation)

        return {
            'poi_id': poi_id,
            'lang': lang_code,
            'column': lang_info['col'],
            'translation': translation,
            'word_count': len(translation.split()),
            'status': 'success'
        }
    except Exception as e:
        return {
            'poi_id': poi_id,
            'lang': lang_code,
            'column': lang_info['col'],
            'status': 'failed',
            'error': str(e)[:200]
        }


def main():
    parser = argparse.ArgumentParser(description='Fase R6b STAP 5: Hervertaling')
    parser.add_argument('--dry-run', action='store_true', default=True,
                        help='Toon statistieken zonder wijzigingen (default)')
    parser.add_argument('--execute', action='store_true',
                        help='Voer vertalingen uit')
    parser.add_argument('--limit', type=int, default=0,
                        help='Beperk tot N POIs (0=alle)')
    args = parser.parse_args()

    if args.execute:
        args.dry_run = False

    log("=" * 70)
    log("FASE R6b STAP 5: HERVERTALING GEWIJZIGDE POIs (NL, DE, ES)")
    log("=" * 70)

    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    # Selecteer gestrippte POIs (uit audit trail)
    cursor.execute("""
        SELECT DISTINCT p.id, p.destination_id,
               p.enriched_detail_description as en_text
        FROM POI p
        JOIN poi_content_history h ON p.id = h.poi_id
        WHERE h.change_source = 'r6b_claim_strip'
          AND h.field_name = 'enriched_detail_description'
          AND p.is_active = 1
          AND p.enriched_detail_description IS NOT NULL
          AND p.enriched_detail_description != ''
    """)
    targets = cursor.fetchall()

    # Voeg ook AM/PM-only fixes toe (die niet in de 2.047 zaten)
    ampm_only_ids = set()
    cursor.execute("""
        SELECT DISTINCT h.poi_id
        FROM poi_content_history h
        WHERE h.change_source = 'r6b_ampm_sweep'
          AND h.poi_id NOT IN (
              SELECT DISTINCT poi_id FROM poi_content_history
              WHERE change_source = 'r6b_claim_strip'
          )
    """)
    for row in cursor.fetchall():
        ampm_only_ids.add(row['poi_id'])

    if ampm_only_ids:
        cursor.execute(f"""
            SELECT id, destination_id,
                   enriched_detail_description as en_text
            FROM POI
            WHERE id IN ({','.join(str(x) for x in ampm_only_ids)})
              AND is_active = 1
              AND enriched_detail_description IS NOT NULL
        """)
        ampm_targets = cursor.fetchall()
        targets.extend(ampm_targets)
        log(f"Extra AM/PM-only targets: {len(ampm_targets)}")

    log(f"Translation targets: {len(targets)} POIs × 3 talen = {len(targets) * 3}")

    if args.limit > 0:
        targets = targets[:args.limit]
        log(f"Beperkt tot {args.limit} POIs")

    if args.dry_run:
        log("\n--- DRY-RUN: geen vertalingen ---")
        log(f"\nBij --execute:")
        log(f"  Targets: {len(targets)} POIs × 3 talen = {len(targets) * 3}")
        log(f"  Model: {MISTRAL_MODEL}")
        log(f"  Workers: {MAX_WORKERS}")
        log(f"  Geschatte doorlooptijd: {len(targets) * 3 * 2 / MAX_WORKERS / 60:.0f} min")
        log(f"  Geschatte kosten: ~€{len(targets) * 3 * 0.001:.2f}")

        dests = {}
        for t in targets:
            d = 'Texel' if t['destination_id'] == 2 else 'Calpe'
            dests[d] = dests.get(d, 0) + 1
        log(f"  Destination verdeling: {dests}")

        cursor.close()
        conn.close()
        return

    # ─── Execute mode ──────────────────────────────────────────────────

    log(f"Mode: EXECUTE — vertaling voor {len(targets)} POIs × 3 talen")

    # Laad checkpoint
    processed_keys = set()
    try:
        with open(CHECKPOINT_FILE, 'r') as f:
            checkpoint = json.load(f)
            processed_keys = set(checkpoint.get('processed_keys', []))
            log(f"Checkpoint geladen: {len(processed_keys)} al verwerkt")
    except FileNotFoundError:
        pass

    # Bouw takenlijst
    tasks = []
    for poi in targets:
        for lang_code, lang_info in LANGUAGES.items():
            key = f"{poi['id']}_{lang_code}"
            if key not in processed_keys:
                tasks.append((poi['id'], poi['en_text'], poi['destination_id'],
                              lang_code, lang_info))

    log(f"Taken: {len(tasks)} vertalingen (na checkpoint filter)")

    if not tasks:
        log("Alle vertalingen al verwerkt. Niets te doen.")
        cursor.close()
        conn.close()
        return

    # Parallelle vertaling
    completed = 0
    failed = 0
    batch_updates = []
    start_time = time.time()

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {}
        for task in tasks:
            future = executor.submit(translate_poi, *task)
            futures[future] = task

        for future in as_completed(futures):
            result = future.result()
            key = f"{result['poi_id']}_{result['lang']}"

            if result['status'] == 'success':
                batch_updates.append(result)
                completed += 1
                processed_keys.add(key)
            else:
                failed += 1
                log(f"FAILED: POI {result['poi_id']} {result['lang']}: {result.get('error', '')}")

            total = completed + failed
            if total % BATCH_SIZE == 0 and total > 0:
                # Batch apply
                for upd in batch_updates:
                    cursor.execute(f"""
                        UPDATE POI SET {upd['column']} = %s WHERE id = %s
                    """, (upd['translation'], upd['poi_id']))
                conn.commit()

                elapsed = time.time() - start_time
                rate = total / elapsed if elapsed > 0 else 0
                eta = (len(tasks) - total) / rate / 60 if rate > 0 else 0

                log(f"Progress: {total}/{len(tasks)} "
                    f"(success: {completed}, failed: {failed}) "
                    f"ETA: {eta:.0f} min")

                # Checkpoint
                with open(CHECKPOINT_FILE, 'w') as f:
                    json.dump({
                        'processed_keys': list(processed_keys),
                        'completed': completed,
                        'failed': failed,
                        'timestamp': datetime.now().isoformat()
                    }, f)

                batch_updates = []

    # Final batch
    for upd in batch_updates:
        cursor.execute(f"""
            UPDATE POI SET {upd['column']} = %s WHERE id = %s
        """, (upd['translation'], upd['poi_id']))
    conn.commit()

    elapsed = time.time() - start_time

    log(f"\n{'=' * 70}")
    log(f"HERVERTALING COMPLEET")
    log(f"{'=' * 70}")
    log(f"Totaal: {completed + failed} vertalingen")
    log(f"Success: {completed}")
    log(f"Failed: {failed}")
    log(f"Doorlooptijd: {elapsed / 60:.1f} min")

    # Per taal
    for lang_code in LANGUAGES:
        lang_count = sum(1 for k in processed_keys if k.endswith(f"_{lang_code}"))
        log(f"  {lang_code.upper()}: {lang_count} vertalingen")

    # Verificatie
    cursor.execute("""
        SELECT
            destination_id,
            COUNT(*) as totaal,
            SUM(CASE WHEN enriched_detail_description_nl IS NOT NULL
                 AND enriched_detail_description_nl != '' THEN 1 ELSE 0 END) as nl,
            SUM(CASE WHEN enriched_detail_description_de IS NOT NULL
                 AND enriched_detail_description_de != '' THEN 1 ELSE 0 END) as de,
            SUM(CASE WHEN enriched_detail_description_es IS NOT NULL
                 AND enriched_detail_description_es != '' THEN 1 ELSE 0 END) as es
        FROM POI
        WHERE is_active = 1
          AND enriched_detail_description IS NOT NULL
        GROUP BY destination_id
    """)
    for row in cursor.fetchall():
        dest = 'Texel' if row['destination_id'] == 2 else 'Calpe'
        log(f"\n{dest}: {row['totaal']} POIs — "
            f"NL: {row['nl']}, DE: {row['de']}, ES: {row['es']}")

    cursor.close()
    conn.close()

    # Opslaan
    log(f"\nCheckpoint: {CHECKPOINT_FILE}")


if __name__ == '__main__':
    main()
