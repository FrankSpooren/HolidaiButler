#!/usr/bin/env python3
"""
Fase R6b STAP 3: AM/PM Sweep — Database-breed
==============================================
Controleer ALLE POI-beschrijvingen (EN, NL, DE, ES) op AM/PM
notatie en converteer naar 24-uurs klok. Dit betreft ook de 884
generieke beschrijvingen en de 148 Frank-reviewed POIs.

Schrijft ook audit trail entries voor gewijzigde POIs.
"""

import re
import sys
import argparse
from datetime import datetime

import mysql.connector

DB_CONFIG = {
    'host': 'jotx.your-database.de',
    'user': 'pxoziy_1',
    'password': 'j8,DrtshJSm$',
    'database': 'pxoziy_db1',
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci'
}

COLUMNS = [
    'enriched_detail_description',
    'enriched_detail_description_nl',
    'enriched_detail_description_de',
    'enriched_detail_description_es'
]

COLUMN_LABELS = {
    'enriched_detail_description': 'EN',
    'enriched_detail_description_nl': 'NL',
    'enriched_detail_description_de': 'DE',
    'enriched_detail_description_es': 'ES'
}


def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def convert_ampm_to_24h(text):
    """Converteer alle AM/PM notaties naar 24-uurs klok"""
    if not text:
        return text, 0

    def ampm_to_24(match):
        time_str = match.group(1).strip()
        period = match.group(2).upper().strip()

        parts = time_str.replace('.', ':').split(':')
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0

        if period == 'PM' and hour != 12:
            hour += 12
        elif period == 'AM' and hour == 12:
            hour = 0

        return f"{hour:02d}:{minute:02d}"

    pattern = r'(\d{1,2}(?:[:.]\d{2})?)\s*([AaPp][Mm])'
    count = len(re.findall(pattern, text))
    new_text = re.sub(pattern, ampm_to_24, text)
    return new_text, count


def main():
    parser = argparse.ArgumentParser(description='Fase R6b STAP 3: AM/PM Sweep')
    parser.add_argument('--dry-run', action='store_true', default=True,
                        help='Toon statistieken zonder wijzigingen (default)')
    parser.add_argument('--execute', action='store_true',
                        help='Voer AM/PM sweep uit')
    args = parser.parse_args()

    if args.execute:
        args.dry_run = False

    log("=" * 70)
    log("FASE R6b STAP 3: AM/PM SWEEP — DATABASE-BREED")
    log("=" * 70)

    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    # Selecteer ALLE actieve POIs met content
    cursor.execute("""
        SELECT id, destination_id,
               enriched_detail_description,
               enriched_detail_description_nl,
               enriched_detail_description_de,
               enriched_detail_description_es
        FROM POI
        WHERE is_active = 1
          AND enriched_detail_description IS NOT NULL
          AND enriched_detail_description != ''
    """)
    pois = cursor.fetchall()
    log(f"Scanning {len(pois)} POIs voor AM/PM notatie...")

    # ─── Scan fase ──────────────────────────────────────────────────────

    total_fixes = 0
    pois_with_ampm = []
    fixes_per_lang = {col: 0 for col in COLUMNS}
    fixes_per_dest = {}

    for poi in pois:
        poi_fixes = {}

        for col in COLUMNS:
            text = poi.get(col)
            if not text:
                continue

            _, count = convert_ampm_to_24h(text)
            if count > 0:
                poi_fixes[col] = count
                fixes_per_lang[col] += count

        if poi_fixes:
            dest = 'Texel' if poi['destination_id'] == 2 else 'Calpe'
            fixes_per_dest[dest] = fixes_per_dest.get(dest, 0) + sum(poi_fixes.values())
            pois_with_ampm.append({
                'id': poi['id'],
                'destination_id': poi['destination_id'],
                'fixes': poi_fixes,
                'total': sum(poi_fixes.values())
            })
            total_fixes += sum(poi_fixes.values())

    log(f"\nScan resultaat:")
    log(f"  POIs met AM/PM: {len(pois_with_ampm)}")
    log(f"  Totaal AM/PM notaties: {total_fixes}")
    log(f"  Per taal:")
    for col, count in fixes_per_lang.items():
        if count > 0:
            log(f"    {COLUMN_LABELS[col]}: {count}")
    log(f"  Per bestemming:")
    for dest, count in fixes_per_dest.items():
        if count > 0:
            log(f"    {dest}: {count}")

    if args.dry_run:
        log("\n--- DRY-RUN: geen wijzigingen ---")
        if pois_with_ampm:
            log(f"\nVoorbeelden (eerste 5):")
            for p in pois_with_ampm[:5]:
                log(f"  POI {p['id']}: {p['total']} fixes in {list(p['fixes'].keys())}")
        cursor.close()
        conn.close()
        return

    if not pois_with_ampm:
        log("\nGeen AM/PM notaties gevonden. Niets te doen.")
        cursor.close()
        conn.close()
        return

    # ─── Execute: fix AM/PM ──────────────────────────────────────────────

    log(f"\nMode: EXECUTE — {len(pois_with_ampm)} POIs fixen")

    applied = 0
    errors = 0

    for poi_info in pois_with_ampm:
        poi_id = poi_info['id']

        try:
            # Haal actuele tekst op
            cursor.execute(f"""
                SELECT {', '.join(COLUMNS)} FROM POI WHERE id = %s
            """, (poi_id,))
            poi = cursor.fetchone()

            for col in poi_info['fixes']:
                old_text = poi[col]
                new_text, count = convert_ampm_to_24h(old_text)

                if count > 0 and new_text != old_text:
                    # Update POI
                    cursor.execute(f"""
                        UPDATE POI SET {col} = %s WHERE id = %s
                    """, (new_text, poi_id))

                    # Audit trail — correcte kolomnamen
                    cursor.execute("""
                        INSERT INTO poi_content_history
                        (poi_id, field_name, old_value, new_value,
                         change_source, change_reason, changed_by, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                    """, (
                        poi_id,
                        col,
                        old_text,
                        new_text,
                        'r6b_ampm_sweep',
                        f'AM/PM to 24h clock conversion ({count} fixes in {COLUMN_LABELS[col]})',
                        'system'
                    ))

            applied += 1

        except Exception as e:
            log(f"ERROR POI {poi_id}: {e}")
            errors += 1

        if applied % 50 == 0 and applied > 0:
            conn.commit()
            log(f"Progress: {applied}/{len(pois_with_ampm)}")

    conn.commit()

    log(f"\n{'=' * 70}")
    log(f"AM/PM SWEEP COMPLEET")
    log(f"{'=' * 70}")
    log(f"POIs geüpdatet: {applied}")
    log(f"Errors: {errors}")
    log(f"Totaal AM/PM → 24h conversies: {total_fixes}")

    # Verificatie: check dat er geen AM/PM meer is
    cursor.execute("""
        SELECT COUNT(*) as cnt FROM POI
        WHERE is_active = 1
          AND (
            enriched_detail_description REGEXP '[0-9] ?[AaPp][Mm]'
            OR enriched_detail_description_nl REGEXP '[0-9] ?[AaPp][Mm]'
            OR enriched_detail_description_de REGEXP '[0-9] ?[AaPp][Mm]'
            OR enriched_detail_description_es REGEXP '[0-9] ?[AaPp][Mm]'
          )
    """)
    remaining = cursor.fetchone()['cnt']
    log(f"\nVerificatie: {remaining} POIs met resterende AM/PM")

    if remaining > 0:
        log("WARNING: Niet alle AM/PM notaties zijn geconverteerd!")
        log("Dit kan komen door edge cases (bijv. 'Spam', 'Amsterdam')")
    else:
        log("PASS: Geen AM/PM notaties meer in database")

    cursor.close()
    conn.close()


if __name__ == '__main__':
    main()
