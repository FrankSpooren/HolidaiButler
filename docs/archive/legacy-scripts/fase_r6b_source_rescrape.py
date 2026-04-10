#!/usr/bin/env python3
"""
Fase R6b STAP 1: Bron Re-scrape (Facebook + Instagram + Diepere Website)
HolidaiButler Content Quality Hardening

Scrapes Facebook, Instagram en diepere website-pagina's voor de 2.047 target POIs.
Combineert met R2 fact sheets tot enhanced fact sheets.

Freshness filter: bronnen ouder dan 4 maanden = STALE (alleen statische info).

Usage:
    python3 -u fase_r6b_source_rescrape.py --dry-run          # Preview targets
    python3 -u fase_r6b_source_rescrape.py --execute           # Full scrape
    python3 -u fase_r6b_source_rescrape.py --execute --resume  # Resume from checkpoint
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timedelta
from urllib.parse import urljoin

import mysql.connector
import requests
from bs4 import BeautifulSoup

DB_CONFIG = {
    'host': 'jotx.your-database.de',
    'user': 'pxoziy_1',
    'password': 'j8,DrtshJSm$',
    'database': 'pxoziy_db1',
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci',
}

HEADERS_MOBILE = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
}
HEADERS_DESKTOP = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

FRESHNESS_CUTOFF = datetime(2025, 10, 18)  # 4 maanden voor vandaag (18 feb 2026)

CHECKPOINT_FILE = '/root/fase_r6b_scrape_checkpoint.json'
TARGETS_FILE = '/root/fase_r6b_targets.json'
FACEBOOK_FILE = '/root/fase_r6b_facebook_data.json'
INSTAGRAM_FILE = '/root/fase_r6b_instagram_data.json'
DEEP_SCRAPE_FILE = '/root/fase_r6b_deep_rescrape.json'
ENHANCED_FILE = '/root/fase_r6b_enhanced_facts.json'

WEBSITE_SUBPAGES = [
    '', '/over-ons', '/about', '/about-us', '/info',
    '/menu', '/menukaart', '/spijskaart', '/carta',
    '/openingstijden', '/opening-hours', '/horarios',
    '/contact', '/contacto',
    '/prijzen', '/tarieven', '/prices', '/precios',
    '/diensten', '/services', '/servicios',
    '/activiteiten', '/activities', '/actividades',
    '/aanbod', '/assortiment', '/products',
]


def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


# ── FRESHNESS DETECTION ──────────────────────────────────────────────────

def detect_freshness_from_text(text):
    """Detect freshness from page text. Returns (status, last_activity_date)."""
    if not text:
        return 'unknown', None

    found_dates = []

    # Pattern 1: "January 15, 2026"
    for m in re.finditer(
        r'(January|February|March|April|May|June|July|August|'
        r'September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})',
        text, re.IGNORECASE
    ):
        try:
            d = datetime.strptime(f"{m.group(1)} {m.group(2)} {m.group(3)}", "%B %d %Y")
            found_dates.append(d)
        except ValueError:
            pass

    # Pattern 2: "15 jan 2026" / "3 feb 2025"
    month_map = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
        'mrt': 3, 'mei': 5, 'okt': 10,  # Dutch
        'ene': 1, 'abr': 4, 'ago': 8, 'dic': 12,  # Spanish
    }
    for m in re.finditer(
        r'(\d{1,2})\s+(jan|feb|mar|mrt|apr|may|mei|jun|jul|aug|sep|oct|okt|nov|dec|'
        r'ene|abr|ago|dic)[a-z]*\.?\s+(\d{4})',
        text, re.IGNORECASE
    ):
        mn = month_map.get(m.group(2)[:3].lower())
        if mn:
            try:
                found_dates.append(datetime(int(m.group(3)), mn, int(m.group(1))))
            except ValueError:
                pass

    # Pattern 3: ISO dates "2025-12-03"
    for m in re.finditer(r'(\d{4})-(\d{2})-(\d{2})', text):
        try:
            d = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            if 2020 <= d.year <= 2027:
                found_dates.append(d)
        except ValueError:
            pass

    # Pattern 4: Recent indicators
    recent_indicators = [
        'hour ago', 'hours ago', 'minute ago', 'minutes ago',
        'yesterday', 'just now', 'uur geleden', 'minuten geleden',
        'gisteren', 'hace un momento', 'hace una hora',
    ]
    for indicator in recent_indicators:
        if indicator.lower() in text.lower():
            found_dates.append(datetime.now())
            break

    # Pattern 5: Copyright years
    for m in re.finditer(r'[©®]\s*(\d{4})', text):
        try:
            yr = int(m.group(1))
            if 2020 <= yr <= 2027:
                found_dates.append(datetime(yr, 6, 1))
        except ValueError:
            pass
    for m in re.finditer(r'copyright\s+(\d{4})', text, re.IGNORECASE):
        try:
            yr = int(m.group(1))
            if 2020 <= yr <= 2027:
                found_dates.append(datetime(yr, 6, 1))
        except ValueError:
            pass

    if found_dates:
        last = max(found_dates)
        status = 'fresh' if last >= FRESHNESS_CUTOFF else 'stale'
        return status, last

    return 'unknown', None


# ── FACEBOOK SCRAPING ─────────────────────────────────────────────────────

def scrape_facebook(url, poi_name):
    """Scrape a Facebook page. Returns dict with text, freshness etc."""
    if not url or 'facebook.com' not in url.lower():
        return None

    # Normalize to mobile URL
    fb_url = url.strip()
    fb_url = fb_url.replace('www.facebook.com', 'm.facebook.com')
    fb_url = fb_url.replace('web.facebook.com', 'm.facebook.com')
    if 'facebook.com' in fb_url and 'm.facebook.com' not in fb_url:
        fb_url = fb_url.replace('facebook.com', 'm.facebook.com')
    if not fb_url.startswith('http'):
        fb_url = 'https://' + fb_url

    try:
        resp = requests.get(fb_url, headers=HEADERS_MOBILE, timeout=10,
                           allow_redirects=True)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')
            page_text = soup.get_text(separator='\n', strip=True)[:3000]

            # Check for login wall
            if 'log in' in page_text.lower()[:500] and len(page_text) < 500:
                return {'status': 'login_wall', 'url': fb_url}

            freshness, last_date = detect_freshness_from_text(page_text)

            return {
                'status': 'success',
                'url': fb_url,
                'text': page_text,
                'freshness_status': freshness,
                'last_activity_date': last_date.isoformat() if last_date else None,
                'usable_for_claims': freshness == 'fresh',
            }
        else:
            return {'status': 'failed', 'url': fb_url, 'error': f'HTTP {resp.status_code}'}
    except Exception as e:
        return {'status': 'failed', 'url': fb_url, 'error': str(e)[:200]}


# ── INSTAGRAM SCRAPING ────────────────────────────────────────────────────

def scrape_instagram(url, poi_name):
    """Scrape Instagram profile bio. Returns dict."""
    if not url:
        return None

    ig_url = url.strip()
    if not ig_url.startswith('http'):
        if ig_url.startswith('@'):
            ig_url = f'https://www.instagram.com/{ig_url[1:]}/'
        elif 'instagram.com' not in ig_url:
            ig_url = f'https://www.instagram.com/{ig_url}/'
        else:
            ig_url = 'https://' + ig_url

    try:
        resp = requests.get(ig_url, headers=HEADERS_DESKTOP, timeout=10,
                           allow_redirects=True)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, 'html.parser')

            # Bio is in og:description
            meta_desc = soup.find('meta', attrs={'property': 'og:description'})
            bio = meta_desc['content'] if meta_desc and meta_desc.get('content') else ''

            meta_title = soup.find('meta', attrs={'property': 'og:title'})
            title = meta_title['content'] if meta_title and meta_title.get('content') else ''

            if not bio and not title:
                return {'status': 'empty', 'url': ig_url}

            return {
                'status': 'success',
                'url': ig_url,
                'bio': bio,
                'title': title,
                'freshness_status': 'unknown',  # Instagram bio = statisch
                'usable_for_claims': False,  # Bio alleen voor naam/type/adres
                'usable_for_static': bool(bio),
            }
        else:
            return {'status': 'failed', 'url': ig_url, 'error': f'HTTP {resp.status_code}'}
    except Exception as e:
        return {'status': 'failed', 'url': ig_url, 'error': str(e)[:200]}


# ── DEEP WEBSITE SCRAPING ─────────────────────────────────────────────────

def scrape_website_deep(url, poi_name):
    """Deep website scrape: subpages + Schema.org + OpenGraph."""
    if not url:
        return None

    website = url.strip().rstrip('/')
    if not website.startswith('http'):
        website = 'https://' + website

    result = {
        'status': 'success',
        'url': website,
        'pages': {},
        'structured_data': {},
        'meta_data': {},
        'extracted_facts': {},
    }

    for subpage in WEBSITE_SUBPAGES:
        page_url = website + subpage
        try:
            resp = requests.get(page_url, headers=HEADERS_DESKTOP, timeout=8,
                               allow_redirects=True)
            if resp.status_code == 200 and len(resp.text) > 500:
                soup = BeautifulSoup(resp.text, 'html.parser')

                # Schema.org / JSON-LD
                for script in soup.find_all('script', type='application/ld+json'):
                    try:
                        ld_data = json.loads(script.string)
                        result['structured_data'][subpage or '/'] = ld_data
                    except (json.JSONDecodeError, TypeError):
                        pass

                # OpenGraph meta tags
                og_tags = {}
                for meta in soup.find_all('meta', attrs={'property': re.compile(r'^og:')}):
                    og_tags[meta.get('property', '')] = meta.get('content', '')
                if og_tags:
                    result['meta_data'][subpage or '/'] = og_tags

                # Page text (beperkt tot 2000 tekens)
                page_text = soup.get_text(separator='\n', strip=True)[:2000]
                result['pages'][subpage or '/'] = page_text

        except Exception:
            pass

        time.sleep(0.3)

    # Extract structured facts
    for page, ld in result['structured_data'].items():
        items = [ld] if isinstance(ld, dict) else (ld if isinstance(ld, list) else [])
        for item in items:
            if not isinstance(item, dict):
                continue
            if 'openingHoursSpecification' in item:
                result['extracted_facts']['opening_hours'] = item['openingHoursSpecification']
            elif 'openingHours' in item:
                result['extracted_facts']['opening_hours'] = item['openingHours']
            if 'priceRange' in item:
                result['extracted_facts']['price_range'] = item['priceRange']
            if 'description' in item:
                result['extracted_facts']['description'] = item['description']
            if 'address' in item:
                result['extracted_facts']['address'] = item['address']
            if 'telephone' in item:
                result['extracted_facts']['telephone'] = item['telephone']
            if 'hasMenu' in item:
                result['extracted_facts']['menu_url'] = item['hasMenu']
            if 'servesCuisine' in item:
                result['extracted_facts']['cuisine'] = item['servesCuisine']
            if 'dateModified' in item:
                result['extracted_facts']['date_modified'] = item['dateModified']
            if 'datePublished' in item:
                result['extracted_facts']['date_published'] = item['datePublished']

    # Freshness check from website
    all_text = '\n'.join(result['pages'].values())
    freshness, last_date = detect_freshness_from_text(all_text)

    # Also check Schema.org dates
    for date_key in ['date_modified', 'date_published']:
        date_str = result['extracted_facts'].get(date_key, '')
        if date_str:
            try:
                d = datetime.fromisoformat(str(date_str).replace('Z', '+00:00').split('+')[0].split('T')[0])
                if last_date is None or d > last_date:
                    last_date = d
                    freshness = 'fresh' if d >= FRESHNESS_CUTOFF else 'stale'
            except (ValueError, TypeError):
                pass

    result['freshness_status'] = freshness
    result['last_activity_date'] = last_date.isoformat() if last_date else None
    result['combined_source_text'] = all_text[:5000]

    if not result['pages'] and not result['structured_data']:
        result['status'] = 'empty'

    return result


# ── MAIN ──────────────────────────────────────────────────────────────────

def load_checkpoint():
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, 'r') as f:
            return json.load(f)
    return {'fb_done': [], 'ig_done': [], 'web_done': [], 'phase': 'facebook'}


def save_checkpoint(ckpt):
    ckpt['last_updated'] = datetime.now().isoformat()
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(ckpt, f)


def main():
    parser = argparse.ArgumentParser(description='Fase R6b Stap 1: Source Re-scrape')
    parser.add_argument('--dry-run', action='store_true', default=True)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--resume', action='store_true')
    args = parser.parse_args()
    dry_run = not args.execute

    log("=" * 70)
    log("FASE R6b STAP 1: BRON RE-SCRAPE")
    log("=" * 70)
    log(f"Mode: {'DRY-RUN' if dry_run else 'EXECUTE'}")
    log(f"Freshness cutoff: {FRESHNESS_CUTOFF.strftime('%Y-%m-%d')} (4 maanden)")

    # ── Fetch targets ──
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT DISTINCT p.id as poi_id, p.name, p.destination_id,
               p.category, p.subcategory, p.website, p.facebook_url,
               p.instagram_url, p.address, p.phone, p.rating,
               p.review_count, p.enriched_detail_description as current_en,
               p.enriched_highlights, h.change_source
        FROM POI p
        JOIN poi_content_history h ON p.id = h.poi_id
        WHERE h.change_source IN ('fase_r4_staging', 'r6_threshold_promote')
          AND p.is_active = 1
        ORDER BY p.destination_id, p.category, p.name
    """)
    targets = cursor.fetchall()
    cursor.close()
    conn.close()

    log(f"Totaal targets: {len(targets)}")

    # Save targets JSON
    with open(TARGETS_FILE, 'w') as f:
        json.dump([dict(t) for t in targets], f, indent=2, ensure_ascii=False, default=str)
    log(f"Targets opgeslagen: {TARGETS_FILE}")

    # Stats
    has_fb = [t for t in targets if t['facebook_url']]
    has_ig = [t for t in targets if t['instagram_url']]
    has_web = [t for t in targets if t['website']]
    no_source = [t for t in targets if not t['website'] and not t['facebook_url'] and not t['instagram_url']]

    log(f"  Met Facebook URL: {len(has_fb)}")
    log(f"  Met Instagram URL: {len(has_ig)}")
    log(f"  Met Website URL: {len(has_web)}")
    log(f"  Zonder online bron: {len(no_source)}")

    # Load R2 fact sheets voor quality levels
    log("\nLaden R2 fact sheets...")
    with open('/root/fase_r2_fact_sheets.json', 'r') as f:
        r2_facts = json.load(f)
    r2_lookup = {}
    for item in r2_facts:
        r2_lookup[str(item.get('poi_id', ''))] = item

    # Quality distribution for targets
    quality_dist = {}
    for t in targets:
        q = r2_lookup.get(str(t['poi_id']), {}).get('data_quality', 'unknown')
        quality_dist[q] = quality_dist.get(q, 0) + 1
    log(f"R2 quality verdeling targets: {quality_dist}")

    # Deep scrape targets: minimal/none quality OR no website data
    deep_targets = [t for t in targets
                    if t['website']
                    and r2_lookup.get(str(t['poi_id']), {}).get('data_quality', 'unknown')
                    in ('minimal', 'none', 'unknown')]
    log(f"Deep re-scrape targets (minimal/none + website): {len(deep_targets)}")

    if dry_run:
        log("\n--- DRY-RUN: geen scraping ---")
        log(f"\nBij execute:")
        log(f"  Facebook: {len(has_fb)} pagina's (rate: 2/sec)")
        log(f"  Instagram: {len(has_ig)} profielen (rate: 1/sec)")
        log(f"  Deep website: {len(deep_targets)} sites ({len(WEBSITE_SUBPAGES)} subpages elk)")
        est_fb = len(has_fb) * 0.5 / 60
        est_ig = len(has_ig) * 1.0 / 60
        est_web = len(deep_targets) * len(WEBSITE_SUBPAGES) * 0.3 / 60
        log(f"  Geschatte doorlooptijd: {est_fb:.0f} + {est_ig:.0f} + {est_web:.0f} = {est_fb+est_ig+est_web:.0f} min")
        return

    # ── EXECUTE MODE ──
    checkpoint = load_checkpoint() if args.resume else {'fb_done': [], 'ig_done': [], 'web_done': [], 'phase': 'facebook'}
    start_time = time.time()

    # ── Phase 1: Facebook ──
    log(f"\n{'='*50}")
    log(f"FASE 1/3: FACEBOOK SCRAPING ({len(has_fb)} targets)")
    log(f"{'='*50}")

    fb_results = {}
    if os.path.exists(FACEBOOK_FILE) and args.resume:
        with open(FACEBOOK_FILE, 'r') as f:
            fb_results = json.load(f)
        log(f"Resumed: {len(fb_results)} Facebook results loaded")

    fb_done_ids = set(str(k) for k in fb_results.keys())
    fb_success = sum(1 for v in fb_results.values() if v.get('status') == 'success')
    fb_failed = sum(1 for v in fb_results.values() if v.get('status') in ('failed', 'login_wall'))

    for i, poi in enumerate(has_fb):
        pid = str(poi['poi_id'])
        if pid in fb_done_ids:
            continue

        result = scrape_facebook(poi['facebook_url'], poi['name'])
        if result:
            result['poi_id'] = poi['poi_id']
            result['name'] = poi['name']
            result['destination_id'] = poi['destination_id']
            fb_results[pid] = result

            if result['status'] == 'success':
                fb_success += 1
            else:
                fb_failed += 1

        time.sleep(0.5)  # Rate limiting

        if (i + 1) % 50 == 0:
            with open(FACEBOOK_FILE, 'w') as f:
                json.dump(fb_results, f, indent=2, ensure_ascii=False)
            log(f"  FB Progress: {i+1}/{len(has_fb)} (success: {fb_success}, failed: {fb_failed})")

    with open(FACEBOOK_FILE, 'w') as f:
        json.dump(fb_results, f, indent=2, ensure_ascii=False)

    fb_fresh = sum(1 for v in fb_results.values() if v.get('freshness_status') == 'fresh')
    fb_stale = sum(1 for v in fb_results.values() if v.get('freshness_status') == 'stale')
    fb_unknown = sum(1 for v in fb_results.values() if v.get('freshness_status') == 'unknown')
    fb_login = sum(1 for v in fb_results.values() if v.get('status') == 'login_wall')

    log(f"\nFacebook resultaat:")
    log(f"  Success: {fb_success}, Failed: {fb_failed}, Login wall: {fb_login}")
    log(f"  Fresh (<4 mnd): {fb_fresh}, Stale (>4 mnd): {fb_stale}, Unknown: {fb_unknown}")

    # ── Phase 2: Instagram ──
    log(f"\n{'='*50}")
    log(f"FASE 2/3: INSTAGRAM SCRAPING ({len(has_ig)} targets)")
    log(f"{'='*50}")

    ig_results = {}
    if os.path.exists(INSTAGRAM_FILE) and args.resume:
        with open(INSTAGRAM_FILE, 'r') as f:
            ig_results = json.load(f)
        log(f"Resumed: {len(ig_results)} Instagram results loaded")

    ig_done_ids = set(str(k) for k in ig_results.keys())
    ig_success = sum(1 for v in ig_results.values() if v.get('status') == 'success')
    ig_failed = sum(1 for v in ig_results.values() if v.get('status') in ('failed', 'empty'))

    for i, poi in enumerate(has_ig):
        pid = str(poi['poi_id'])
        if pid in ig_done_ids:
            continue

        result = scrape_instagram(poi['instagram_url'], poi['name'])
        if result:
            result['poi_id'] = poi['poi_id']
            result['name'] = poi['name']
            result['destination_id'] = poi['destination_id']
            ig_results[pid] = result

            if result['status'] == 'success':
                ig_success += 1
            else:
                ig_failed += 1

        time.sleep(1.0)  # Instagram is strenger

        if (i + 1) % 50 == 0:
            with open(INSTAGRAM_FILE, 'w') as f:
                json.dump(ig_results, f, indent=2, ensure_ascii=False)
            log(f"  IG Progress: {i+1}/{len(has_ig)} (success: {ig_success}, failed: {ig_failed})")

    with open(INSTAGRAM_FILE, 'w') as f:
        json.dump(ig_results, f, indent=2, ensure_ascii=False)

    log(f"\nInstagram resultaat: success={ig_success}, failed={ig_failed}")

    # ── Phase 3: Deep Website Re-scrape ──
    log(f"\n{'='*50}")
    log(f"FASE 3/3: DEEP WEBSITE RE-SCRAPE ({len(deep_targets)} targets)")
    log(f"{'='*50}")

    deep_results = {}
    if os.path.exists(DEEP_SCRAPE_FILE) and args.resume:
        with open(DEEP_SCRAPE_FILE, 'r') as f:
            deep_results = json.load(f)
        log(f"Resumed: {len(deep_results)} deep scrape results loaded")

    deep_done_ids = set(str(k) for k in deep_results.keys())
    deep_success = sum(1 for v in deep_results.values() if v.get('status') == 'success')
    deep_empty = sum(1 for v in deep_results.values() if v.get('status') == 'empty')

    for i, poi in enumerate(deep_targets):
        pid = str(poi['poi_id'])
        if pid in deep_done_ids:
            continue

        result = scrape_website_deep(poi['website'], poi['name'])
        if result:
            result['poi_id'] = poi['poi_id']
            result['name'] = poi['name']
            result['destination_id'] = poi['destination_id']
            result['category'] = poi['category']
            deep_results[pid] = result

            if result['status'] == 'success':
                deep_success += 1
            else:
                deep_empty += 1

        if (i + 1) % 25 == 0:
            with open(DEEP_SCRAPE_FILE, 'w') as f:
                json.dump(deep_results, f, indent=2, ensure_ascii=False)
            log(f"  Deep Progress: {i+1}/{len(deep_targets)} (data: {deep_success}, empty: {deep_empty})")

    with open(DEEP_SCRAPE_FILE, 'w') as f:
        json.dump(deep_results, f, indent=2, ensure_ascii=False)

    has_structured = sum(1 for v in deep_results.values() if v.get('extracted_facts'))
    has_hours = sum(1 for v in deep_results.values()
                    if v.get('extracted_facts', {}).get('opening_hours'))
    log(f"\nDeep scrape resultaat: data={deep_success}, empty={deep_empty}")
    log(f"  Schema.org data: {has_structured}")
    log(f"  Opening hours (structured): {has_hours}")

    # ── Phase 4: Combine into Enhanced Fact Sheets ──
    log(f"\n{'='*50}")
    log(f"FASE 4/4: ENHANCED FACT SHEETS SAMENSTELLEN")
    log(f"{'='*50}")

    enhanced_facts = {}
    improved_count = 0

    for poi in targets:
        pid = str(poi['poi_id'])

        # Start met R2 data
        r2 = r2_lookup.get(pid, {})
        source_text = r2.get('source_text_for_llm', '')
        old_quality = r2.get('data_quality', 'none')

        # Voeg Facebook toe (met freshness filter)
        fb = fb_results.get(pid, {})
        has_fresh_social = False
        if fb.get('status') == 'success' and fb.get('text'):
            fb_fresh_status = fb.get('freshness_status', 'unknown')
            fb_date = fb.get('last_activity_date', 'unknown')

            if fb_fresh_status == 'fresh':
                source_text += f"\n\n--- FACEBOOK PAGE DATA (FRESH — last active: {fb_date}) ---"
                source_text += f"\n{fb['text']}"
                has_fresh_social = True
            elif fb_fresh_status == 'stale':
                source_text += f"\n\n--- FACEBOOK PAGE DATA (STALE — last active: {fb_date}) ---"
                source_text += f"\nWARNING: This Facebook page has not been updated in >4 months."
                source_text += f"\nONLY use for: business name confirmation, address, phone number."
                source_text += f"\nDO NOT use for: opening hours, menu, prices, services, facilities."
                source_text += f"\n{fb['text']}"
            else:
                source_text += f"\n\n--- FACEBOOK PAGE DATA (FRESHNESS UNKNOWN) ---"
                source_text += f"\nWARNING: Cannot determine if this page is current."
                source_text += f"\nONLY use for: business name confirmation, address, phone number."
                source_text += f"\n{fb['text']}"

        # Voeg Instagram toe (bio = statisch)
        ig = ig_results.get(pid, {})
        if ig.get('status') == 'success' and ig.get('bio'):
            source_text += f"\n\n--- INSTAGRAM BIO (STATIC — use for name/type only) ---"
            source_text += f"\n{ig['bio']}"

        # Voeg deep re-scrape toe
        deep = deep_results.get(pid, {})
        if deep and deep.get('status') == 'success':
            if deep.get('extracted_facts'):
                facts = deep['extracted_facts']
                source_text += "\n\n--- STRUCTURED DATA (SCHEMA.ORG) ---"
                for key, val in facts.items():
                    source_text += f"\n{key}: {json.dumps(val, ensure_ascii=False)}"

            if deep.get('combined_source_text'):
                deep_text = deep['combined_source_text']
                r2_text_len = len(r2.get('source_text_for_llm', ''))
                if len(deep_text) > r2_text_len + 500:
                    source_text += f"\n\n--- DEEP WEBSITE RE-SCRAPE ---\n{deep_text}"

        # Bepaal nieuwe quality level
        new_quality = old_quality
        has_structured_data = bool(deep.get('extracted_facts'))

        if old_quality in ('none', 'minimal'):
            if has_fresh_social:
                new_quality = 'moderate'
                improved_count += 1
            if has_structured_data:
                new_quality = 'rich' if new_quality == 'moderate' else 'moderate'
                if old_quality in ('none', 'minimal'):
                    improved_count += 1

        enhanced_facts[pid] = {
            'poi_id': int(pid),
            'name': poi['name'],
            'destination_id': poi['destination_id'],
            'category': poi['category'],
            'old_quality': old_quality,
            'new_quality': new_quality,
            'source_text_for_llm': source_text[:8000],
            'has_facebook': fb.get('status') == 'success',
            'facebook_fresh': fb.get('freshness_status', 'none'),
            'has_instagram': ig.get('status') == 'success',
            'has_deep_scrape': bool(deep.get('pages')),
            'has_structured_data': has_structured_data,
        }

    with open(ENHANCED_FILE, 'w') as f:
        json.dump(enhanced_facts, f, indent=2, ensure_ascii=False)

    # Final stats
    elapsed = (time.time() - start_time) / 60
    qualities_old = {}
    qualities_new = {}
    for ef in enhanced_facts.values():
        qualities_old[ef['old_quality']] = qualities_old.get(ef['old_quality'], 0) + 1
        qualities_new[ef['new_quality']] = qualities_new.get(ef['new_quality'], 0) + 1

    log(f"\n{'='*70}")
    log(f"STAP 1 RESULTAAT")
    log(f"{'='*70}")
    log(f"Enhanced fact sheets: {len(enhanced_facts)}")
    log(f"Doorlooptijd: {elapsed:.0f} minuten")
    log(f"\nQuality verdeling (oud → nieuw):")
    for q in ['rich', 'moderate', 'minimal', 'none', 'unknown']:
        old = qualities_old.get(q, 0)
        new = qualities_new.get(q, 0)
        diff = new - old
        if old or new:
            log(f"  {q:12s}: {old:5d} → {new:5d} ({'+' if diff >= 0 else ''}{diff})")
    log(f"POIs met verbeterde quality: {improved_count}")
    log(f"\nBrondata:")
    log(f"  Facebook success: {fb_success} (fresh: {fb_fresh}, stale: {fb_stale}, login: {fb_login})")
    log(f"  Instagram success: {ig_success}")
    log(f"  Deep scrape data: {deep_success} (structured: {has_structured})")
    log(f"\nDeliverables:")
    log(f"  {TARGETS_FILE}")
    log(f"  {FACEBOOK_FILE}")
    log(f"  {INSTAGRAM_FILE}")
    log(f"  {DEEP_SCRAPE_FILE}")
    log(f"  {ENHANCED_FILE}")

    log(f"\n{'='*70}")
    log(f"DONE — Ga door naar Stap 2: Claim Stripping")
    log(f"{'='*70}")


if __name__ == '__main__':
    main()
