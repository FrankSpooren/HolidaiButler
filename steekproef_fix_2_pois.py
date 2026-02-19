#!/usr/bin/env python3
"""
Steekproef Fix — 2 POI-correcties (Vuurtoren Texel + Terra Mítica)
===================================================================
POI 2562: "Battle of Kikkert" → notaris Kikkert campagne
POI 326: "Open year-round" → seizoensgebonden
"""

import json
import re
import sys
import time
import argparse
from datetime import datetime

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

BACKUP_FILE = '/root/steekproef_fix_backup_%s.json' % datetime.now().strftime('%Y%m%d')

LANGUAGES = {
    'nl': {
        'name': 'Dutch (Nederlands)',
        'col': 'enriched_detail_description_nl',
    },
    'de': {
        'name': 'German (Deutsch)',
        'col': 'enriched_detail_description_de',
    },
    'es': {
        'name': 'Spanish (Español)',
        'col': 'enriched_detail_description_es',
    }
}

LOCATION_MAP = {
    2: {'nl': 'op Texel', 'de': 'auf Texel', 'es': 'en Texel'},
    1: {'nl': 'in Calpe', 'de': 'in Calpe', 'es': 'en Calpe'},
}

# ─── NIEUWE TEKSTEN ─────────────────────────────────────────────────────────

NEW_TEXTS = {
    2562: {
        'name': 'Vuurtoren Texel',
        'destination_id': 2,
        'en_text': """Vuurtoren Texel is the only lighthouse in the Netherlands where you can enjoy sea views on three sides from 47 metres above sea level. Built in 1864 after years of campaigning by Texel notary Kikkert, the lighthouse finally brought safety to these notoriously dangerous shipping waters. Climb 118 spiral steps through six floors of exhibits, including wartime damage and the lives of 1960s lighthouse keepers. The rotating lens system still beams its light every ten seconds.

Entry costs \u20ac6.50, with free admission for children under five and Texelaars with a local museum pass. Open Wednesday, Saturday, and Sunday from 10:00 to 17:00, and daily from 14 February. Book a timed ticket online in advance and wear sturdy shoes for the climb. For current details, visit vuurtorentexel.nl.""",
        'reason': 'Factual correction: "1864 Battle of Kikkert" is incorrect. Notary Kikkert campaigned for the lighthouse; there was no battle.'
    },
    326: {
        'name': 'Terra Mítica',
        'destination_id': 1,
        'en_text': """Terra M\u00edtica brings ancient civilisations to life in Benidorm, just a short distance from Calpe. This unique theme park features immersive zones inspired by Greek, Egyptian, and Roman cultures, complete with themed decor, thrilling roller coasters like Titanides, and family-friendly attractions. Visitors can enjoy live performances and shows while exploring distinct areas that blend education with excitement. The park operates seasonally, typically opening from mid-May through the autumn months, with extended hours and special events during summer. For exact opening dates, ticket prices, and event details, visit the official website.""",
        'reason': 'Factual correction: "Open year-round" is incorrect. Terra Mítica is seasonal, opening from mid-May.'
    }
}


def log(msg):
    print("[%s] %s" % (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), msg), flush=True)


def clean_markdown(text):
    if not text:
        return text
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)
    return text.strip()


def strip_quotes(text):
    if not text:
        return text
    if (text.startswith('"') and text.endswith('"')) or \
       (text.startswith("'") and text.endswith("'")):
        text = text[1:-1].strip()
    return text


def translate_poi(en_text, destination_id, lang_code, lang_info):
    location = LOCATION_MAP[destination_id][lang_code]

    system_prompt = """You are a professional translator for a European tourism platform.
Translate the following English POI description to %s.

RULES:
1. Maintain the same tone and style as the original
2. Keep POI names UNTRANSLATED (they are brand names)
3. Use "%s" for the location reference
4. Translate naturally — not word-for-word
5. Keep the same paragraph structure
6. No markdown formatting
7. Keep website URLs unchanged
8. ALL times remain in 24-hour format (09:00-17:00)
9. ALL prices remain with € symbol

Return ONLY the translation, nothing else.""" % (lang_info['name'], location)

    resp = requests.post(MISTRAL_URL, headers={
        'Authorization': 'Bearer %s' % MISTRAL_API_KEY,
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
        raise Exception("HTTP %d: %s" % (resp.status_code, resp.text[:200]))

    data = resp.json()
    translation = data['choices'][0]['message']['content'].strip()
    translation = clean_markdown(translation)
    translation = strip_quotes(translation)
    return translation


def main():
    parser = argparse.ArgumentParser(description='Steekproef Fix — 2 POI-correcties')
    parser.add_argument('--dry-run', action='store_true', default=True,
                        help='Toon wat er zou gebeuren (default)')
    parser.add_argument('--execute', action='store_true',
                        help='Voer correcties uit')
    args = parser.parse_args()

    if args.execute:
        args.dry_run = False

    log("=" * 70)
    log("STEEKPROEF FIX — 2 POI-CORRECTIES")
    log("=" * 70)

    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    # ─── STAP 1: BACKUP ──────────────────────────────────────────────────

    log("\nSTAP 1: BACKUP huidige teksten")
    backup = {}
    for poi_id in NEW_TEXTS:
        cursor.execute("""
            SELECT id, name, destination_id,
                   enriched_detail_description,
                   enriched_detail_description_nl,
                   enriched_detail_description_de,
                   enriched_detail_description_es
            FROM POI WHERE id = %s
        """, (poi_id,))
        row = cursor.fetchone()
        if row:
            backup[str(poi_id)] = {
                'id': row['id'],
                'name': row['name'],
                'destination_id': row['destination_id'],
                'en': row['enriched_detail_description'],
                'nl': row['enriched_detail_description_nl'],
                'de': row['enriched_detail_description_de'],
                'es': row['enriched_detail_description_es'],
            }
            log("  POI %d (%s): EN %d woorden, NL %s, DE %s, ES %s" % (
                poi_id, row['name'],
                len((row['enriched_detail_description'] or '').split()),
                'OK' if row['enriched_detail_description_nl'] else 'MISSING',
                'OK' if row['enriched_detail_description_de'] else 'MISSING',
                'OK' if row['enriched_detail_description_es'] else 'MISSING',
            ))
        else:
            log("  ERROR: POI %d niet gevonden!" % poi_id)

    if args.dry_run:
        log("\n--- DRY-RUN MODE ---")
        log("\nBij --execute:")
        log("  Backup: %s" % BACKUP_FILE)
        for poi_id, info in NEW_TEXTS.items():
            log("\n  POI %d (%s):" % (poi_id, info['name']))
            log("    Reden: %s" % info['reason'])
            log("    Nieuwe EN: %d woorden" % len(info['en_text'].split()))
            log("    Vertalingen: NL, DE, ES")
        log("\n  Totaal: 2 POIs × 4 talen = 8 updates")
        log("  Audit trail: 8 entries in poi_content_history")
        cursor.close()
        conn.close()
        return

    # ─── EXECUTE MODE ─────────────────────────────────────────────────────

    log("\nMode: EXECUTE")

    # Sla backup op
    with open(BACKUP_FILE, 'w') as f:
        json.dump(backup, f, indent=2, default=str)
    log("Backup opgeslagen: %s" % BACKUP_FILE)

    # ─── STAP 2: UPDATE EN TEKSTEN ───────────────────────────────────────

    log("\nSTAP 2: UPDATE EN teksten")
    for poi_id, info in NEW_TEXTS.items():
        old_en = backup[str(poi_id)]['en']
        new_en = info['en_text']

        cursor.execute("""
            UPDATE POI SET enriched_detail_description = %s WHERE id = %s
        """, (new_en, poi_id))

        # Audit trail
        cursor.execute("""
            INSERT INTO poi_content_history
            (poi_id, field_name, old_value, new_value,
             change_source, change_reason, changed_by, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
        """, (
            poi_id,
            'enriched_detail_description',
            old_en,
            new_en,
            'steekproef_fix',
            info['reason'],
            'system'
        ))

        log("  POI %d (%s): EN updated (%d -> %d woorden)" % (
            poi_id, info['name'],
            len((old_en or '').split()),
            len(new_en.split())
        ))

    conn.commit()

    # ─── STAP 3: VERTALINGEN NL/DE/ES ────────────────────────────────────

    log("\nSTAP 3: VERTALINGEN NL/DE/ES")
    translations = {}
    for poi_id, info in NEW_TEXTS.items():
        translations[poi_id] = {}
        for lang_code, lang_info in LANGUAGES.items():
            log("  Vertaling POI %d %s -> %s..." % (poi_id, info['name'], lang_code.upper()))
            try:
                translation = translate_poi(
                    info['en_text'],
                    info['destination_id'],
                    lang_code,
                    lang_info
                )
                translations[poi_id][lang_code] = translation

                old_val = backup[str(poi_id)][lang_code]

                # Update DB
                cursor.execute("""
                    UPDATE POI SET %s = %%s WHERE id = %%s
                """ % lang_info['col'], (translation, poi_id))

                # Audit trail
                cursor.execute("""
                    INSERT INTO poi_content_history
                    (poi_id, field_name, old_value, new_value,
                     change_source, change_reason, changed_by, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                """, (
                    poi_id,
                    lang_info['col'],
                    old_val,
                    translation,
                    'steekproef_fix',
                    'Retranslation after factual correction: %s' % info['reason'],
                    'system'
                ))

                log("    OK: %d woorden" % len(translation.split()))
                time.sleep(0.5)  # Rate limiting

            except Exception as e:
                log("    ERROR: %s" % str(e)[:200])

    conn.commit()

    # ─── STAP 4: VERIFICATIE ──────────────────────────────────────────────

    log("\nSTAP 4: VERIFICATIE")
    for poi_id, info in NEW_TEXTS.items():
        cursor.execute("""
            SELECT enriched_detail_description,
                   enriched_detail_description_nl,
                   enriched_detail_description_de,
                   enriched_detail_description_es
            FROM POI WHERE id = %s
        """, (poi_id,))
        row = cursor.fetchone()

        log("\n  POI %d (%s):" % (poi_id, info['name']))

        # Check EN
        en = row['enriched_detail_description']
        log("    EN: %d woorden — %s" % (
            len(en.split()),
            "MATCH" if en == info['en_text'] else "MISMATCH!"
        ))

        # Check translations exist
        for lang_code, lang_info in LANGUAGES.items():
            val = row[lang_info['col']]
            if val:
                has_ampm = bool(re.search(r'\d\s*[AaPp][Mm]', val))
                has_markdown = bool(re.search(r'\*\*|^#+', val, re.MULTILINE))
                issues = []
                if has_ampm:
                    issues.append("AM/PM!")
                if has_markdown:
                    issues.append("MARKDOWN!")
                status = "ISSUES: %s" % ', '.join(issues) if issues else "OK"
                log("    %s: %d woorden — %s" % (lang_code.upper(), len(val.split()), status))
            else:
                log("    %s: MISSING!" % lang_code.upper())

    # ─── STAP 5: AUDIT TRAIL VERIFICATIE ──────────────────────────────────

    log("\nSTAP 5: AUDIT TRAIL")
    cursor.execute("""
        SELECT poi_id, field_name, change_reason, created_at
        FROM poi_content_history
        WHERE change_source = 'steekproef_fix'
        ORDER BY poi_id, field_name
    """)
    audit = cursor.fetchall()
    log("  Audit trail entries: %d" % len(audit))
    for entry in audit:
        log("    POI %d | %s | %s" % (
            entry['poi_id'],
            entry['field_name'],
            entry['change_reason'][:80]
        ))

    log("\n" + "=" * 70)
    log("STEEKPROEF FIX COMPLEET")
    log("=" * 70)
    log("Backup: %s" % BACKUP_FILE)
    log("POIs gecorrigeerd: 2")
    log("Vertalingen: 6 (2 POIs × 3 talen)")
    log("Audit trail: %d entries" % len(audit))

    cursor.close()
    conn.close()


if __name__ == '__main__':
    main()
