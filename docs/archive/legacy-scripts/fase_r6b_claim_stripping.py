#!/usr/bin/env python3
"""
Fase R6b STAP 2: Chirurgisch Claim Strippen + AIDA Behoud
=========================================================
Per POI: ongecontroleerde claims verwijderen, vervangen door veilige
formuleringen op basis van enhanced brondata. AIDA-structuur behouden.
AM/PM → 24-uurs klok als post-processing.

Correcties t.o.v. command doc:
- POI kolommen: facebook_url, instagram_url (NIET facebook, instagram)
- poi_content_history: field_name, old_value, new_value (NIET destination_id, old_content, new_content)
- convert_ampm_to_24h() gedefinieerd VOOR eerste gebruik
"""

import json
import time
import re
import sys
import os
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

CHECKPOINT_FILE = '/root/fase_r6b_strip_checkpoint.json'
RESULTS_FILE = '/root/fase_r6b_stripped_results.json'
ENHANCED_FACTS_FILE = '/root/fase_r6b_enhanced_facts.json'

# Rate limiting
REQUESTS_PER_SECOND = 4
REQUEST_DELAY = 1.0 / REQUESTS_PER_SECOND

# ─── HULPFUNCTIES ───────────────────────────────────────────────────────────

def log(msg):
    """Timestamped logging"""
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


def clean_markdown(text):
    """Verwijder markdown formatting"""
    if not text:
        return text
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^[-*]\s+', '', text, flags=re.MULTILINE)
    text = text.strip()
    return text


def strip_quotes(text):
    """Verwijder omringende aanhalingstekens als de LLM die toevoegt"""
    if not text:
        return text
    if (text.startswith('"') and text.endswith('"')) or \
       (text.startswith("'") and text.endswith("'")):
        text = text[1:-1].strip()
    return text


# ─── SYSTEM PROMPT ──────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a professional content editor for a European tourism platform.
Your task is to IMPROVE an existing POI description by:

1. REMOVING UNVERIFIED CLAIMS — any claim not supported by the source data
2. KEEPING ONLY VERIFIED FACTS — facts that appear in the source data
3. PRESERVING the AIDA structure (Attention-Interest-Desire-Action)
4. Writing ALL times in 24-HOUR CLOCK notation (NEVER AM/PM)

STEP 1 — ANALYSE the current description. For each claim:
- VERIFIED: claim is found in the source data → KEEP
- UNVERIFIED: claim is NOT in the source data → REMOVE
- GENERIC: not a factual claim (e.g. "Worth a visit") → KEEP

STEP 2 — REWRITE the description:
- Remove ALL unverified claims
- Add VERIFIED facts from the source data that are not yet in the text
- Preserve the AIDA structure:
  A = Attention: Opening sentence that draws the reader (use a verified fact
      or the category + location as hook)
  I = Interest: What makes this POI interesting? (only verified details)
  D = Desire: Why would the visitor want to go? (verified experience or features)
  A = Action: Refer to website/social media for current info
      (opening hours, menu, prices, reservations)

ABSOLUTE RULES:

1. NEVER invent details not in the source data
2. If a fact IS in the source data → you MAY use it,
   UNLESS the source is marked as STALE (see rule 12)
3. If a fact is NOT in the source data → you MUST NOT use it
4. Write in British English
5. Times ALWAYS in 24-hour clock: "09:00-17:00" (NEVER "9 AM - 5 PM")
6. Prices ALWAYS with € symbol: "€12,50" (NEVER "$12.50")
7. No markdown formatting (no **, no #, no bullets)
8. No superlatives unless verified ("best", "finest", "most beautiful")
9. Location rule: "on Texel" (NEVER "in Texel"), "in Calpe"
10. Word count: 60-120 words (shorter if few verified facts)
11. If there is NO source data: write a short safe description of
    40-60 words without factual claims (similar to a generic entry)
12. STALENESS RULE FOR SOCIAL MEDIA:
    - Source data marked with "STALE" or "FRESHNESS UNKNOWN" is
      UNRELIABLE for dynamic information
    - From stale sources you may ONLY use: business name, address,
      phone number, category confirmation
    - From stale sources you must NEVER use: opening hours, menu,
      prices, services, facilities, offers, experiences
    - Reason: a stale Facebook page (last post >4 months ago)
      may be from a closed or changed business

AIDA ADJUSTMENT BY SOURCE DATA QUALITY:

RICH (many verified facts):
- Full AIDA, 100-120 words
- Concrete details: opening hours, prices, specialities
- All 4 AIDA components developed

MODERATE (some verified facts):
- AIDA but with shorter I+D sections, 70-100 words
- Use available facts, avoid empty promises
- Action refers to website for what you cannot verify

MINIMAL/NONE (little or no source data):
- AI structure (Attention + Interest + Action), skip Desire
- 40-70 words
- No factual claims, only category + location + website reference"""


# ─── USER PROMPT TEMPLATE ──────────────────────────────────────────────────

USER_PROMPT_TEMPLATE = """EDIT this POI description by removing unverified claims and keeping only
facts that appear in the source data below.

POI: {name}
Category: {category}
Location: {location}
Address: {address}
Website: {website}
Rating: {rating}/5 ({review_count} reviews)

CURRENT DESCRIPTION:
{current_en}

SOURCE DATA (use ONLY facts from this data):
{source_text}

RULES:
- Remove ANY claim not supported by the source data above
- Keep the AIDA structure (Attention-Interest-Desire-Action)
- ALL times in 24-hour format (09:00-17:00, NEVER 9 AM-5 PM)
- ALL prices with € symbol
- British English
- 60-120 words (shorter if few verified facts)
- Location: {location}
- End with a reference to the website/social media for current info
- No markdown, no bold, no headers
- Plain text only

Return ONLY the improved description, nothing else."""


# ─── HOOFDPROGRAMMA ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Fase R6b STAP 2: Claim Stripping')
    parser.add_argument('--dry-run', action='store_true', default=True,
                        help='Toon statistieken zonder wijzigingen (default)')
    parser.add_argument('--execute', action='store_true',
                        help='Voer claim stripping uit')
    parser.add_argument('--apply-db', action='store_true',
                        help='Pas stripped resultaten toe op database')
    parser.add_argument('--limit', type=int, default=0,
                        help='Beperk tot N POIs (0=alle)')
    parser.add_argument('--backup', action='store_true',
                        help='Maak database backup eerst')
    args = parser.parse_args()

    if args.execute or args.apply_db:
        args.dry_run = False

    log("=" * 70)
    log("FASE R6b STAP 2: CHIRURGISCH CLAIM STRIPPEN + AIDA BEHOUD")
    log("=" * 70)

    # ─── Database connectie ────────────────────────────────────────────

    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    # ─── Backup ────────────────────────────────────────────────────────

    if args.backup:
        log("Database backup maken...")
        backup_file = f"/root/backups/pre_r6b_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
        os.system(
            f"mysqldump --no-defaults -u {DB_CONFIG['user']} -p'{DB_CONFIG['password']}' "
            f"-h {DB_CONFIG['host']} {DB_CONFIG['database']} "
            f"POI poi_content_staging poi_content_history > {backup_file}"
        )
        log(f"Backup opgeslagen: {backup_file}")

    # ─── Laad enhanced fact sheets ─────────────────────────────────────

    log(f"Laden enhanced fact sheets: {ENHANCED_FACTS_FILE}")
    try:
        with open(ENHANCED_FACTS_FILE, 'r') as f:
            enhanced_facts = json.load(f)
        log(f"Enhanced facts geladen: {len(enhanced_facts)} POIs")
    except FileNotFoundError:
        log("ERROR: Enhanced fact sheets niet gevonden. Voer eerst STAP 1 uit.")
        log("Fallback: laden R2 fact sheets...")
        with open('/root/fase_r2_fact_sheets.json', 'r') as f:
            r2_facts = json.load(f)
        enhanced_facts = {}
        for item in (r2_facts if isinstance(r2_facts, list) else r2_facts.values()):
            pid = str(item.get('poi_id', ''))
            enhanced_facts[pid] = {
                'poi_id': pid,
                'source_text_for_llm': item.get('source_text_for_llm', ''),
                'new_quality': item.get('data_quality', 'none')
            }
        log(f"R2 facts geladen als fallback: {len(enhanced_facts)} POIs")

    # ─── Laad target POIs ──────────────────────────────────────────────

    cursor.execute("""
        SELECT DISTINCT p.id, p.name, p.category, p.subcategory, p.destination_id,
               p.address, p.website, p.facebook_url, p.instagram_url,
               p.rating, p.review_count,
               p.enriched_detail_description as current_en,
               h.change_source
        FROM POI p
        JOIN poi_content_history h ON p.id = h.poi_id
        WHERE h.change_source IN ('fase_r4_staging', 'r6_threshold_promote')
          AND p.is_active = 1
          AND p.enriched_detail_description IS NOT NULL
          AND p.enriched_detail_description != ''
    """)
    targets = cursor.fetchall()
    log(f"Claim stripping targets: {len(targets)}")

    # Deduplicate (een POI kan meerdere history entries hebben)
    seen_ids = set()
    unique_targets = []
    for t in targets:
        if t['id'] not in seen_ids:
            seen_ids.add(t['id'])
            unique_targets.append(t)
    targets = unique_targets
    log(f"Unieke targets na deduplicatie: {len(targets)}")

    if args.limit > 0:
        targets = targets[:args.limit]
        log(f"Beperkt tot {args.limit} POIs")

    # ─── Dry-run mode ──────────────────────────────────────────────────

    if args.dry_run:
        log("\n--- DRY-RUN: geen claim stripping ---")
        log(f"\nBij --execute:")
        log(f"  Targets: {len(targets)} POIs")
        log(f"  Model: {MISTRAL_MODEL}")
        log(f"  Rate: {REQUESTS_PER_SECOND} req/sec")
        log(f"  Geschatte doorlooptijd: {len(targets) * REQUEST_DELAY / 60:.0f} min")
        log(f"  Geschatte kosten: ~€{len(targets) * 0.003:.2f}")

        # Toon quality verdeling
        qualities = {}
        for t in targets:
            pid = str(t['id'])
            q = enhanced_facts.get(pid, {}).get('new_quality', 'unknown')
            qualities[q] = qualities.get(q, 0) + 1
        log(f"  Quality verdeling: {qualities}")

        # Toon destination verdeling
        dests = {}
        for t in targets:
            d = 'Texel' if t['destination_id'] == 2 else 'Calpe'
            dests[d] = dests.get(d, 0) + 1
        log(f"  Destination verdeling: {dests}")

        cursor.close()
        conn.close()
        return

    # ─── Apply-db mode ─────────────────────────────────────────────────

    if args.apply_db:
        log("Mode: APPLY — stripped resultaten toepassen op database")
        apply_results_to_db(conn, cursor)
        cursor.close()
        conn.close()
        return

    # ─── Execute mode: claim stripping ─────────────────────────────────

    log(f"Mode: EXECUTE — claim stripping voor {len(targets)} POIs")

    # Laad checkpoint
    processed_ids = set()
    existing_results = []
    try:
        with open(CHECKPOINT_FILE, 'r') as f:
            checkpoint = json.load(f)
            processed_ids = set(str(x) for x in checkpoint.get('processed_ids', []))
            log(f"Checkpoint geladen: {len(processed_ids)} al verwerkt")
    except FileNotFoundError:
        pass

    # Laad bestaande resultaten
    try:
        with open(RESULTS_FILE, 'r') as f:
            existing_results = json.load(f)
            log(f"Bestaande resultaten geladen: {len(existing_results)}")
    except FileNotFoundError:
        pass

    results = existing_results
    success = sum(1 for r in results if r.get('status') == 'success')
    failed = sum(1 for r in results if r.get('status') == 'failed')
    skipped = 0
    ampm_fixes_total = 0

    start_time = time.time()

    for i, poi in enumerate(targets):
        pid = str(poi['id'])

        if pid in processed_ids:
            skipped += 1
            continue

        # Enhanced brondata
        facts = enhanced_facts.get(pid, {})
        source_text = facts.get('source_text_for_llm', '')
        quality = facts.get('new_quality', 'none')
        location = "on Texel" if poi['destination_id'] == 2 else "in Calpe"

        # Bouw user prompt
        user_prompt = USER_PROMPT_TEMPLATE.format(
            name=poi['name'],
            category=poi.get('category', 'Unknown'),
            location=location,
            address=poi.get('address', 'not available'),
            website=poi.get('website', 'not available'),
            rating=poi.get('rating', 'N/A'),
            review_count=poi.get('review_count', 0),
            current_en=poi['current_en'] or '',
            source_text=source_text[:6000]  # Cap at 6000 chars
        )

        try:
            resp = requests.post(MISTRAL_URL, headers={
                'Authorization': f'Bearer {MISTRAL_API_KEY}',
                'Content-Type': 'application/json'
            }, json={
                'model': MISTRAL_MODEL,
                'messages': [
                    {'role': 'system', 'content': SYSTEM_PROMPT},
                    {'role': 'user', 'content': user_prompt}
                ],
                'temperature': 0.3,
                'max_tokens': 500
            }, timeout=30)

            if resp.status_code != 200:
                raise Exception(f"HTTP {resp.status_code}: {resp.text[:200]}")

            data = resp.json()
            new_text = data['choices'][0]['message']['content'].strip()

            # Post-processing
            new_text = clean_markdown(new_text)
            new_text = strip_quotes(new_text)
            new_text, ampm_count = convert_ampm_to_24h(new_text)
            ampm_fixes_total += ampm_count

            word_count = len(new_text.split())
            old_word_count = len((poi['current_en'] or '').split())

            results.append({
                'poi_id': pid,
                'name': poi['name'],
                'destination_id': poi['destination_id'],
                'category': poi.get('category', ''),
                'quality': quality,
                'old_text': poi['current_en'],
                'new_text': new_text,
                'old_word_count': old_word_count,
                'new_word_count': word_count,
                'ampm_fixes': ampm_count,
                'had_source_data': len(source_text) > 100,
                'status': 'success'
            })
            success += 1
            processed_ids.add(pid)

        except Exception as e:
            results.append({
                'poi_id': pid,
                'name': poi['name'],
                'destination_id': poi['destination_id'],
                'status': 'failed',
                'error': str(e)[:200]
            })
            failed += 1
            processed_ids.add(pid)

        # Rate limiting
        time.sleep(REQUEST_DELAY)

        # Voortgang + checkpoint elke 100 POIs
        processed_count = success + failed + skipped
        if (processed_count - skipped) % 100 == 0 and (processed_count - skipped) > 0:
            elapsed = time.time() - start_time
            rate = (success + failed) / elapsed if elapsed > 0 else 0
            eta = (len(targets) - processed_count) / rate / 60 if rate > 0 else 0

            log(f"Progress: {processed_count}/{len(targets)} "
                f"(success: {success}, failed: {failed}, skipped: {skipped}) "
                f"ETA: {eta:.0f} min")

            # Checkpoint opslaan
            with open(CHECKPOINT_FILE, 'w') as f:
                json.dump({
                    'processed_ids': list(processed_ids),
                    'success': success,
                    'failed': failed,
                    'timestamp': datetime.now().isoformat()
                }, f)

            # Tussentijds resultaten opslaan
            with open(RESULTS_FILE, 'w') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)

    # ─── Eindresultaten opslaan ────────────────────────────────────────

    with open(RESULTS_FILE, 'w') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    # Statistieken
    elapsed = time.time() - start_time
    success_results = [r for r in results if r.get('status') == 'success']
    word_counts_new = [r['new_word_count'] for r in success_results]
    word_counts_old = [r['old_word_count'] for r in success_results]

    log("\n" + "=" * 70)
    log("CLAIM STRIPPING COMPLEET")
    log("=" * 70)
    log(f"Totaal verwerkt: {success + failed}")
    log(f"Success: {success}")
    log(f"Failed: {failed}")
    log(f"Skipped (checkpoint): {skipped}")
    log(f"Doorlooptijd: {elapsed / 60:.1f} min")
    log(f"AM/PM → 24h fixes: {ampm_fixes_total}")

    if word_counts_new:
        log(f"\nWoordenaantal OUD: gem {sum(word_counts_old)/len(word_counts_old):.0f}, "
            f"min {min(word_counts_old)}, max {max(word_counts_old)}")
        log(f"Woordenaantal NIEUW: gem {sum(word_counts_new)/len(word_counts_new):.0f}, "
            f"min {min(word_counts_new)}, max {max(word_counts_new)}")

    # Per destination
    for dest_name, dest_id in [('Calpe', 1), ('Texel', 2)]:
        dest_results = [r for r in success_results if r.get('destination_id') == dest_id]
        if dest_results:
            wc = [r['new_word_count'] for r in dest_results]
            log(f"\n{dest_name}: {len(dest_results)} POIs, "
                f"gem {sum(wc)/len(wc):.0f} woorden")

    # Per quality
    for q in ['rich', 'moderate', 'minimal', 'none']:
        q_results = [r for r in success_results if r.get('quality') == q]
        if q_results:
            wc = [r['new_word_count'] for r in q_results]
            log(f"Quality {q}: {len(q_results)} POIs, "
                f"gem {sum(wc)/len(wc):.0f} woorden")

    log(f"\nResultaten opgeslagen: {RESULTS_FILE}")
    log(f"Checkpoint opgeslagen: {CHECKPOINT_FILE}")
    log(f"\nVolgende stap: python3 fase_r6b_claim_stripping.py --apply-db")

    cursor.close()
    conn.close()


def apply_results_to_db(conn, cursor):
    """Pas stripped resultaten toe op database + audit trail"""

    log(f"Laden resultaten: {RESULTS_FILE}")
    with open(RESULTS_FILE, 'r') as f:
        results = json.load(f)

    success_results = [r for r in results if r.get('status') == 'success']
    log(f"Te appliceren: {len(success_results)} POIs")

    applied = 0
    errors = 0

    for i, r in enumerate(success_results):
        try:
            # Haal huidige content op voor audit trail
            cursor.execute(
                "SELECT enriched_detail_description FROM POI WHERE id = %s",
                (r['poi_id'],)
            )
            current = cursor.fetchone()
            old_content = current['enriched_detail_description'] if current else ''

            # Skip als content identiek is
            if old_content == r['new_text']:
                continue

            # Update POI tabel
            cursor.execute("""
                UPDATE POI
                SET enriched_detail_description = %s
                WHERE id = %s
            """, (r['new_text'], r['poi_id']))

            # Audit trail — CORRECTE kolomnamen: field_name, old_value, new_value
            cursor.execute("""
                INSERT INTO poi_content_history
                (poi_id, field_name, old_value, new_value,
                 change_source, change_reason, changed_by, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
            """, (
                r['poi_id'],
                'enriched_detail_description',
                old_content,
                r['new_text'],
                'r6b_claim_strip',
                'Claim stripping: unverified claims removed, AIDA preserved, 24h clock',
                'system'
            ))

            applied += 1

        except Exception as e:
            log(f"ERROR POI {r['poi_id']}: {e}")
            errors += 1

        # Commit elke 200 POIs
        if (i + 1) % 200 == 0:
            conn.commit()
            log(f"Progress: {i+1}/{len(success_results)} (applied: {applied}, errors: {errors})")

    conn.commit()

    log(f"\n{'=' * 70}")
    log(f"DATABASE UPDATE COMPLEET")
    log(f"{'=' * 70}")
    log(f"Applied: {applied}")
    log(f"Errors: {errors}")
    log(f"Skipped (identiek): {len(success_results) - applied - errors}")

    # Verificatie
    cursor.execute("""
        SELECT COUNT(*) as cnt FROM poi_content_history
        WHERE change_source = 'r6b_claim_strip'
    """)
    audit_count = cursor.fetchone()['cnt']
    log(f"Audit trail entries (r6b_claim_strip): {audit_count}")


if __name__ == '__main__':
    main()
