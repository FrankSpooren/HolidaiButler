#!/usr/bin/env python3
"""
Fase R6 STAP C: Vertalingen naar NL, DE, ES (PARALLEL)
HolidaiButler Content Repair Pipeline

Vertaalt alle POIs met Engelse content naar NL, DE, ES.
Gebruikt concurrent.futures voor parallel API calls (10 workers).

Usage:
    python3 fase_r6_translations.py --dry-run       # Preview targets
    python3 fase_r6_translations.py --execute        # Generate translations
    python3 fase_r6_translations.py --execute --resume  # Resume from checkpoint
"""

import argparse
import json
import os
import sys
import time
import threading
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

import mysql.connector
from mysql.connector import pooling
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
MAX_WORKERS = 10
CHECKPOINT_FILE = '/root/fase_r6_translations_checkpoint.json'
CHECKPOINT_INTERVAL = 100  # POIs between checkpoints

LANGUAGES = {
    'nl': {
        'name': 'Dutch (Nederlands)',
        'column': 'enriched_detail_description_nl',
        'texel_preposition': 'op Texel',
        'calpe_preposition': 'in Calpe',
    },
    'de': {
        'name': 'German (Deutsch)',
        'column': 'enriched_detail_description_de',
        'texel_preposition': 'auf Texel',
        'calpe_preposition': 'in Calpe',
    },
    'es': {
        'name': 'Spanish (Español)',
        'column': 'enriched_detail_description_es',
        'texel_preposition': 'en Texel',
        'calpe_preposition': 'en Calpe',
    },
}

TRANSLATE_SYSTEM_PROMPT = """You are a professional translator for a European tourism platform.
Translate the following English POI description to {target_language}.

RULES:
1. Maintain the same tone and style as the original
2. Keep POI names UNTRANSLATED (they are brand names)
3. Keep location prepositions correct:
   - Texel: "{texel_prep}" (NEVER "in Texel" for NL/DE)
   - Calpe: "{calpe_prep}"
4. Translate naturally — not word-for-word
5. Keep the same paragraph structure
6. No markdown formatting (no ** or *)
7. Keep website URLs unchanged
8. Keep the same approximate length as the original"""

# Thread-safe counters
lock = threading.Lock()
stats = {
    'translations': 0,
    'failed': 0,
    'nl': 0,
    'de': 0,
    'es': 0,
}


def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


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
        'temperature': 0.2,
        'max_tokens': 500,
    }

    for attempt in range(retries):
        try:
            resp = requests.post(MISTRAL_URL, headers=headers, json=payload, timeout=60)
            if resp.status_code == 200:
                data = resp.json()
                return data['choices'][0]['message']['content'].strip()
            elif resp.status_code == 429:
                wait = 2 ** (attempt + 1)
                time.sleep(wait)
            else:
                time.sleep(1)
        except Exception as e:
            time.sleep(2)

    return None


def clean_translation(text):
    if not text:
        return text
    text = text.strip('"\'')
    text = text.replace('**', '').replace('*', '')
    return text.strip()


def translate_poi(poi, checkpoint_processed):
    """Translate a single POI to all 3 languages. Returns results."""
    poi_id = poi['id']
    poi_id_str = str(poi_id)
    done_langs = set(checkpoint_processed.get(poi_id_str, []))
    results = []

    for lang_code, lang_config in LANGUAGES.items():
        if lang_code in done_langs:
            continue

        system = TRANSLATE_SYSTEM_PROMPT.format(
            target_language=lang_config['name'],
            texel_prep=lang_config['texel_preposition'],
            calpe_prep=lang_config['calpe_preposition'],
        )
        user = f"Translate to {lang_config['name']}:\n\n{poi['enriched_detail_description']}"

        translation = call_mistral(system, user)

        if translation:
            translation = clean_translation(translation)
            results.append({
                'poi_id': poi_id,
                'lang': lang_code,
                'column': lang_config['column'],
                'translation': translation,
                'success': True,
            })
            with lock:
                stats['translations'] += 1
                stats[lang_code] += 1
        else:
            results.append({
                'poi_id': poi_id,
                'lang': lang_code,
                'success': False,
            })
            with lock:
                stats['failed'] += 1

    return results


def load_checkpoint():
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, 'r') as f:
            return json.load(f)
    return {'processed': {}, 'last_updated': None}


def save_checkpoint(checkpoint):
    checkpoint['last_updated'] = datetime.now().isoformat()
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(checkpoint, f)


def fetch_targets(conn):
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT id, destination_id, name, enriched_detail_description
        FROM POI
        WHERE is_active = 1
          AND enriched_detail_description IS NOT NULL
          AND enriched_detail_description != ''
        ORDER BY destination_id, id
    """)
    rows = cursor.fetchall()
    cursor.close()
    return rows


def main():
    parser = argparse.ArgumentParser(description='Fase R6 Stap C: Translations (parallel)')
    parser.add_argument('--dry-run', action='store_true', default=True)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--resume', action='store_true')
    args = parser.parse_args()
    dry_run = not args.execute

    log("=" * 70)
    log("FASE R6 STAP C: VERTALINGEN NL, DE, ES (PARALLEL)")
    log("=" * 70)
    log(f"Mode: {'DRY-RUN' if dry_run else 'EXECUTE'}")
    log(f"Model: {MISTRAL_MODEL}")
    log(f"Workers: {MAX_WORKERS}")

    conn = get_connection()
    targets = fetch_targets(conn)
    log(f"Totaal POIs met EN content: {len(targets)}")

    calpe = [t for t in targets if t['destination_id'] == 1]
    texel = [t for t in targets if t['destination_id'] == 2]
    log(f"  Calpe: {len(calpe)}")
    log(f"  Texel: {len(texel)}")
    log(f"Verwachte API calls: {len(targets)} x 3 talen = {len(targets) * 3}")

    if dry_run:
        log("\n--- DRY-RUN: geen wijzigingen ---")
        conn.close()
        return

    # Execute mode
    checkpoint = {'processed': {}, 'last_updated': None}
    if args.resume:
        checkpoint = load_checkpoint()
        already = sum(len(v) for v in checkpoint['processed'].values())
        log(f"Resumed from checkpoint: {already} translations done, "
            f"{len(checkpoint['processed'])} POIs")

    # Filter out already-completed POIs (all 3 langs done)
    todo = []
    for poi in targets:
        pid = str(poi['id'])
        done = set(checkpoint['processed'].get(pid, []))
        if len(done) < 3:
            todo.append(poi)

    log(f"POIs to process: {len(todo)} (skipping {len(targets) - len(todo)} fully done)")

    start_time = time.time()
    db_write_conn = get_connection()
    db_cursor = db_write_conn.cursor()
    processed_count = 0

    # Process in parallel using ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {}
        for poi in todo:
            future = executor.submit(translate_poi, poi, checkpoint['processed'])
            futures[future] = poi

        for future in as_completed(futures):
            poi = futures[future]
            poi_id_str = str(poi['id'])

            try:
                results = future.result()

                for r in results:
                    if r['success']:
                        db_cursor.execute(f"""
                            UPDATE POI SET {r['column']} = %s WHERE id = %s
                        """, (r['translation'], r['poi_id']))

                        if poi_id_str not in checkpoint['processed']:
                            checkpoint['processed'][poi_id_str] = []
                        checkpoint['processed'][poi_id_str].append(r['lang'])

                processed_count += 1

                # Commit + checkpoint periodically
                if processed_count % CHECKPOINT_INTERVAL == 0:
                    db_write_conn.commit()
                    save_checkpoint(checkpoint)
                    elapsed = (time.time() - start_time) / 60
                    rate = stats['translations'] / elapsed if elapsed > 0 else 0
                    remaining = (len(todo) * 3 - stats['translations']) / rate if rate > 0 else 0
                    log(f"  Progress: {processed_count}/{len(todo)} POIs | "
                        f"Translations: {stats['translations']} | "
                        f"Failed: {stats['failed']} | "
                        f"Rate: {rate:.0f}/min | ETA: {remaining:.0f} min")

            except Exception as e:
                log(f"  ERROR processing POI {poi['id']}: {e}")

    # Final commit
    db_write_conn.commit()
    save_checkpoint(checkpoint)

    elapsed_min = (time.time() - start_time) / 60

    # Final report
    log(f"\n{'=' * 70}")
    log(f"STAP C RESULTAAT")
    log(f"{'=' * 70}")
    log(f"Totaal vertalingen:  {stats['translations']}")
    log(f"  NL: {stats['nl']}")
    log(f"  DE: {stats['de']}")
    log(f"  ES: {stats['es']}")
    log(f"Failed:              {stats['failed']}")
    log(f"Doorlooptijd:        {elapsed_min:.0f} minuten")

    # Verification
    log(f"\n--- Verificatie ---")
    verify_cursor = db_write_conn.cursor(dictionary=True)
    verify_cursor.execute("""
        SELECT
            destination_id,
            COUNT(*) as totaal,
            SUM(CASE WHEN enriched_detail_description IS NOT NULL
                 AND enriched_detail_description != '' THEN 1 ELSE 0 END) as en,
            SUM(CASE WHEN enriched_detail_description_nl IS NOT NULL
                 AND enriched_detail_description_nl != '' THEN 1 ELSE 0 END) as nl,
            SUM(CASE WHEN enriched_detail_description_de IS NOT NULL
                 AND enriched_detail_description_de != '' THEN 1 ELSE 0 END) as de_col,
            SUM(CASE WHEN enriched_detail_description_es IS NOT NULL
                 AND enriched_detail_description_es != '' THEN 1 ELSE 0 END) as es
        FROM POI
        WHERE is_active = 1
        GROUP BY destination_id
    """)
    for r in verify_cursor.fetchall():
        dest = 'Calpe' if r['destination_id'] == 1 else 'Texel'
        log(f"  {dest}: EN={r['en']}/{r['totaal']} | NL={r['nl']} | DE={r['de_col']} | ES={r['es']}")

    # Quality checks
    log(f"\n--- Kwaliteitschecks ---")
    verify_cursor.execute("""
        SELECT COUNT(*) as cnt FROM POI
        WHERE is_active = 1
          AND enriched_detail_description IS NOT NULL
          AND enriched_detail_description != ''
          AND (enriched_detail_description_nl IS NULL OR enriched_detail_description_nl = '')
    """)
    missing_nl = verify_cursor.fetchone()['cnt']
    log(f"  POIs met EN maar GEEN NL: {missing_nl}")

    verify_cursor.execute("""
        SELECT COUNT(*) as cnt FROM POI
        WHERE is_active = 1 AND destination_id = 2
          AND enriched_detail_description_nl LIKE '%%in Texel%%'
    """)
    wrong_texel = verify_cursor.fetchone()['cnt']
    log(f"  NL vertalingen met 'in Texel' (fout): {wrong_texel}")

    verify_cursor.execute("""
        SELECT COUNT(*) as cnt FROM POI
        WHERE is_active = 1
          AND (enriched_detail_description_nl LIKE '%%**%%'
               OR enriched_detail_description_de LIKE '%%**%%'
               OR enriched_detail_description_es LIKE '%%**%%')
    """)
    markdown_leak = verify_cursor.fetchone()['cnt']
    log(f"  Vertalingen met markdown (** lekkage): {markdown_leak}")

    verify_cursor.close()
    db_cursor.close()
    db_write_conn.close()
    conn.close()

    # Save results
    results = {
        'completed_at': datetime.now().isoformat(),
        'total_translations': stats['translations'],
        'lang_counts': {'nl': stats['nl'], 'de': stats['de'], 'es': stats['es']},
        'failed': stats['failed'],
        'duration_minutes': round(elapsed_min, 1),
        'missing_nl': missing_nl,
        'wrong_texel_nl': wrong_texel,
        'markdown_leak': markdown_leak,
    }
    with open('/root/fase_r6_translation_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    log(f"\nResultaat opgeslagen: /root/fase_r6_translation_results.json")

    log(f"\n{'=' * 70}")
    log(f"DONE")
    log(f"{'=' * 70}")


if __name__ == '__main__':
    main()
