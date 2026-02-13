#!/usr/bin/env python3
"""
Fase R2: Source Data Verrijking — Full Website Scraping + Fact Sheets
HolidaiButler Content Repair Pipeline

This script:
1. Scrapes ALL 1,923 POI websites (from fase_r2_scrape_targets.json)
2. Queries DB for fallback data (description, highlights) for ALL POIs with content
3. Builds structured "fact sheets" per POI combining all sources
4. Generates a coverage report

Usage: python3 -u fase_r2_source_data_enrichment.py [--phase PHASE] [--batch-size N] [--resume]
  --phase scrape     : Only run website scraping
  --phase factsheets : Only generate fact sheets (requires scrape output)
  --phase report     : Only generate coverage report
  (no --phase)       : Run all phases sequentially
  --batch-size N     : POIs per checkpoint batch (default 25)
  --resume           : Resume scraping from last checkpoint
  --dest texel|calpe : Only process one destination
"""

import json
import time
import re
import os
import sys
import argparse
import traceback
from datetime import datetime, timezone
from urllib.parse import urlparse, urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

import mysql.connector
import requests
from bs4 import BeautifulSoup

# ============================================================
# CONFIG
# ============================================================
DB_CONFIG = {
    'host': 'jotx.your-database.de',
    'user': 'pxoziy_1',
    'password': 'j8,DrtshJSm$',
    'database': 'pxoziy_db1',
    'charset': 'utf8mb4'
}

# Rate limiting
SCRAPE_DELAY = 0.3          # 0.3s between requests
DOMAIN_DELAY = 1.5          # 1.5s between different domains
SCRAPE_TIMEOUT = 8          # 8s per request
SUBPAGE_TIMEOUT = 5         # 5s per subpage request (faster fail)
SCRAPE_MAX_RETRIES = 2      # 2 retries (3 was too slow for 1923 POIs)
MAX_WORKERS = 3             # Concurrent scraping threads (conservative)
SKIP_SUBPAGES_THRESHOLD = 2000  # Skip subpages if main content > N words
MAX_SUBPAGES_SUCCESS = 3    # Stop trying subpages after N successes

USER_AGENT = 'HolidaiButler Content Verification Bot/2.0'

# Output files
OUTPUT_DIR = '/root'
SCRAPE_TARGETS = f'{OUTPUT_DIR}/fase_r2_scrape_targets.json'
SCRAPE_OUTPUT = f'{OUTPUT_DIR}/fase_r2_scraped_data.json'
SCRAPE_CHECKPOINT = f'{OUTPUT_DIR}/fase_r2_scrape_checkpoint.json'
FACT_SHEETS = f'{OUTPUT_DIR}/fase_r2_fact_sheets.json'
COVERAGE_REPORT = f'{OUTPUT_DIR}/fase_r2_coverage_report.md'
SUMMARY_FILE = f'{OUTPUT_DIR}/fase_r2_summary_for_frank.md'

# Subpages to try scraping (reduced from 22 to 10 most useful)
SUBPAGES = ['/over-ons', '/about', '/menu', '/openingstijden',
            '/contact', '/diensten', '/prijzen', '/about-us',
            '/nuestra-carta', '/horarios']

# ============================================================
# LOGGING
# ============================================================
_log_lock = threading.Lock()

def log(msg):
    """Thread-safe timestamped logging."""
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with _log_lock:
        print(f'[{ts}] {msg}', flush=True)


# ============================================================
# CHECKPOINT MANAGEMENT
# ============================================================
def save_scrape_checkpoint(scraped_data, failed_ids, stats):
    """Save scraping progress for resume capability."""
    checkpoint = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'scraped_count': len(scraped_data),
        'failed_count': len(failed_ids),
        'scraped_poi_ids': [d['poi_id'] for d in scraped_data],
        'failed_poi_ids': list(failed_ids),
        'stats': stats
    }
    with open(SCRAPE_CHECKPOINT, 'w') as f:
        json.dump(checkpoint, f, indent=2)
    # Also save scraped data incrementally
    with open(SCRAPE_OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(scraped_data, f, indent=2, ensure_ascii=False)


def load_scrape_checkpoint():
    """Load scraping checkpoint for resume."""
    if os.path.exists(SCRAPE_CHECKPOINT):
        with open(SCRAPE_CHECKPOINT, 'r') as f:
            return json.load(f)
    return None


# ============================================================
# PHASE 1: WEBSITE SCRAPING
# ============================================================
def scrape_all_websites(targets, batch_size=25, resume=False, dest_filter=None):
    """Scrape websites for all target POIs with checkpointing."""
    log('=' * 70)
    log('PHASE 1: WEBSITE SCRAPING — Full POI Website Scrape')
    log('=' * 70)

    # Filter by destination if requested
    if dest_filter:
        dest_id = 2 if dest_filter == 'texel' else 1
        targets = [t for t in targets if t['destination_id'] == dest_id]
        log(f'Filtered to {dest_filter}: {len(targets)} POIs')

    # Load existing scraped data if resuming
    scraped_data = []
    scraped_ids = set()
    failed_ids = set()

    if resume:
        checkpoint = load_scrape_checkpoint()
        if checkpoint:
            scraped_ids = set(checkpoint.get('scraped_poi_ids', []))
            failed_ids = set(checkpoint.get('failed_poi_ids', []))
            log(f'Resuming: {len(scraped_ids)} already scraped, {len(failed_ids)} failed')
            # Load existing scraped data
            if os.path.exists(SCRAPE_OUTPUT):
                with open(SCRAPE_OUTPUT, 'r', encoding='utf-8') as f:
                    scraped_data = json.load(f)
                log(f'Loaded {len(scraped_data)} existing scrape results')

    # Filter out already-scraped POIs
    remaining = [t for t in targets if t['poi_id'] not in scraped_ids]
    log(f'Total targets: {len(targets)}, remaining: {len(remaining)}')

    if not remaining:
        log('All POIs already scraped. Nothing to do.')
        return scraped_data

    # Group by domain for efficient rate limiting
    domain_groups = {}
    for t in remaining:
        url = t['website']
        if not url.startswith('http'):
            url = 'https://' + url
        domain = urlparse(url).netloc
        domain_groups.setdefault(domain, []).append(t)

    log(f'Unique domains: {len(domain_groups)}')

    # Stats
    stats = {
        'total': len(remaining),
        'success': 0,
        'failed': 0,
        'skipped': 0,
        'total_content_chars': 0,
        'total_subpages': 0,
        'start_time': time.time()
    }

    # Process POIs sequentially with domain-aware rate limiting
    last_domain = None
    batch_count = 0

    for i, target in enumerate(remaining):
        poi_id = target['poi_id']
        url = target['website']
        if not url.startswith('http'):
            url = 'https://' + url

        domain = urlparse(url).netloc

        # Domain-based delay
        if last_domain and domain != last_domain:
            time.sleep(DOMAIN_DELAY)
        last_domain = domain

        dest_name = 'Texel' if target['destination_id'] == 2 else 'Calpe'
        log(f'  [{i+1}/{len(remaining)}] [{dest_name}] {target["name"]} ({domain})')

        result = scrape_single_poi(poi_id, url, target['name'])
        scraped_data.append(result)
        scraped_ids.add(poi_id)

        if result['scrape_success']:
            stats['success'] += 1
            content_len = len(result.get('main_content', ''))
            subpages_count = len(result.get('subpages', {}))
            stats['total_content_chars'] += content_len
            stats['total_subpages'] += subpages_count
            log(f'    -> OK: {content_len} chars, {subpages_count} subpages')
        else:
            stats['failed'] += 1
            failed_ids.add(poi_id)
            log(f'    -> FAILED: {result.get("error", "unknown")}')

        time.sleep(SCRAPE_DELAY)

        # Checkpoint every batch_size POIs
        batch_count += 1
        if batch_count >= batch_size:
            batch_count = 0
            elapsed = time.time() - stats['start_time']
            rate = (stats['success'] + stats['failed']) / elapsed * 60 if elapsed > 0 else 0
            log(f'  --- CHECKPOINT: {stats["success"]} OK, {stats["failed"]} failed, '
                f'{rate:.0f} POIs/min, {elapsed/60:.1f} min elapsed ---')
            save_scrape_checkpoint(scraped_data, failed_ids, stats)

    # Final save
    elapsed = time.time() - stats['start_time']
    stats['elapsed_minutes'] = elapsed / 60
    save_scrape_checkpoint(scraped_data, failed_ids, stats)

    log(f'\nScraping complete:')
    log(f'  Success: {stats["success"]}/{stats["total"]}')
    log(f'  Failed: {stats["failed"]}/{stats["total"]}')
    log(f'  Total content: {stats["total_content_chars"]:,} chars')
    log(f'  Total subpages: {stats["total_subpages"]}')
    log(f'  Elapsed: {stats["elapsed_minutes"]:.1f} minutes')
    log(f'  Output: {SCRAPE_OUTPUT}')

    return scraped_data


def scrape_single_poi(poi_id, url, poi_name):
    """Scrape a single POI website with retries. Reuses proven R1 logic."""
    result = {
        'poi_id': poi_id,
        'website': url,
        'scrape_success': False,
        'scrape_timestamp': datetime.now(timezone.utc).isoformat(),
        'page_title': '',
        'meta_description': '',
        'main_content': '',
        'subpages': {},
        'extracted_facts': {
            'opening_hours': None,
            'prices_found': [],
            'address': None,
            'phone': None,
            'email': None,
            'key_features': [],
            'social_media': []
        },
        'content_language': None,
        'error': None
    }

    headers = {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'nl,en;q=0.9,de;q=0.8,es;q=0.7'
    }

    for attempt in range(SCRAPE_MAX_RETRIES):
        try:
            resp = requests.get(url, headers=headers, timeout=SCRAPE_TIMEOUT,
                              allow_redirects=True, verify=True)
            resp.raise_for_status()

            soup = BeautifulSoup(resp.text, 'html.parser')

            # Detect language
            html_tag = soup.find('html')
            if html_tag and html_tag.get('lang'):
                result['content_language'] = html_tag['lang'][:2]

            # Extract title
            title_tag = soup.find('title')
            result['page_title'] = title_tag.get_text(strip=True) if title_tag else ''

            # Extract meta description
            meta = soup.find('meta', attrs={'name': 'description'})
            if meta:
                result['meta_description'] = meta.get('content', '')

            # Remove non-content tags
            for tag in soup.find_all(['script', 'style', 'nav', 'footer',
                                      'header', 'noscript', 'iframe', 'svg']):
                tag.decompose()

            # Extract main content
            main_content = soup.get_text(separator='\n', strip=True)
            main_content = re.sub(r'\n{3,}', '\n\n', main_content)
            # Limit to 5000 words
            words = main_content.split()
            if len(words) > 5000:
                main_content = ' '.join(words[:5000])
            result['main_content'] = main_content

            # Extract structured data
            extract_facts_enhanced(soup, result, main_content)

            result['scrape_success'] = True

            # Try subpages (skip if main content is already extensive)
            main_word_count = len(main_content.split())
            if main_word_count < SKIP_SUBPAGES_THRESHOLD:
                base_url = f'{urlparse(url).scheme}://{urlparse(url).netloc}'
                subpage_successes = 0
                for subpage in SUBPAGES:
                    if subpage_successes >= MAX_SUBPAGES_SUCCESS:
                        break  # Got enough subpages
                    try:
                        sub_url = urljoin(base_url, subpage)
                        sub_resp = requests.get(sub_url, headers=headers,
                                              timeout=SUBPAGE_TIMEOUT,
                                              allow_redirects=True)
                        if sub_resp.status_code == 200 and sub_resp.url != resp.url:
                            sub_soup = BeautifulSoup(sub_resp.text, 'html.parser')
                            for tag in sub_soup.find_all(['script', 'style', 'nav',
                                                          'footer', 'header', 'noscript',
                                                          'iframe', 'svg']):
                                tag.decompose()
                            sub_text = sub_soup.get_text(separator='\n', strip=True)
                            sub_text = re.sub(r'\n{3,}', '\n\n', sub_text)
                            words_sub = sub_text.split()
                            if len(words_sub) > 2000:
                                sub_text = ' '.join(words_sub[:2000])
                            if len(sub_text) > 100 and sub_text[:200] != main_content[:200]:
                                result['subpages'][subpage] = sub_text
                                extract_facts_enhanced(sub_soup, result, sub_text)
                                subpage_successes += 1
                        time.sleep(0.2)
                    except Exception:
                        pass

            break  # Success, exit retry loop

        except requests.exceptions.Timeout:
            result['error'] = f'Timeout after {SCRAPE_TIMEOUT}s (attempt {attempt+1})'
            if attempt < SCRAPE_MAX_RETRIES - 1:
                time.sleep(1)
        except requests.exceptions.HTTPError as e:
            result['error'] = f'HTTP {e.response.status_code} (attempt {attempt+1})'
            if e.response.status_code in (403, 404, 410, 451):
                break  # Don't retry permanent errors
            if attempt < SCRAPE_MAX_RETRIES - 1:
                time.sleep(1)
        except requests.exceptions.SSLError:
            # Retry without SSL verification
            try:
                resp = requests.get(url, headers=headers, timeout=SCRAPE_TIMEOUT,
                                  allow_redirects=True, verify=False)
                soup = BeautifulSoup(resp.text, 'html.parser')
                title_tag = soup.find('title')
                result['page_title'] = title_tag.get_text(strip=True) if title_tag else ''
                for tag in soup.find_all(['script', 'style', 'nav', 'footer',
                                          'header', 'noscript', 'iframe', 'svg']):
                    tag.decompose()
                main_content = soup.get_text(separator='\n', strip=True)
                main_content = re.sub(r'\n{3,}', '\n\n', main_content)
                words = main_content.split()
                if len(words) > 5000:
                    main_content = ' '.join(words[:5000])
                result['main_content'] = main_content
                extract_facts_enhanced(soup, result, main_content)
                result['scrape_success'] = True
                result['error'] = 'SSL error (bypassed verification)'
            except Exception as e2:
                result['error'] = f'SSL error + fallback failed: {str(e2)}'
            break
        except requests.exceptions.ConnectionError as e:
            result['error'] = f'Connection error: {str(e)[:100]} (attempt {attempt+1})'
            if attempt < SCRAPE_MAX_RETRIES - 1:
                time.sleep(1)
        except Exception as e:
            result['error'] = f'{type(e).__name__}: {str(e)[:100]} (attempt {attempt+1})'
            if attempt < SCRAPE_MAX_RETRIES - 1:
                time.sleep(1)

    return result


def extract_facts_enhanced(soup, result, text):
    """Extract structured facts from scraped content. Enhanced version of R1."""
    text_lower = text.lower()
    facts = result['extracted_facts']

    # Opening hours patterns (Dutch + English + Spanish)
    if not facts.get('opening_hours'):
        hours_patterns = [
            r'(?:maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|ma|di|wo|do|vr|za|zo)[\s\-:]+\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2}',
            r'(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)[\s\-:]+\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2}',
            r'(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo)[\s\-:]+\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2}',
            r'open(?:ingstijden|ing hours|ed)[:\s]+([^\n]+)',
            r'geopend[:\s]+([^\n]+)',
            r'horario[:\s]+([^\n]+)',
        ]
        for pattern in hours_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                facts['opening_hours'] = '; '.join(matches[:7])
                break

    # Prices (EUR/€)
    price_patterns = re.findall(r'[€]\s*\d+[.,]?\d*|\d+[.,]\d{2}\s*(?:euro|EUR|€)', text)
    if price_patterns:
        existing = set(facts.get('prices_found', []))
        existing.update(price_patterns[:15])
        facts['prices_found'] = list(existing)[:20]

    # Address (enhanced)
    if not facts.get('address'):
        addr_patterns = [
            r'(?:adres|address|dirección|ubicación)[:\s]+([^\n]{10,80})',
            r'(\d{4}\s*[A-Z]{2}\s+\w[\w\s,]{5,50})',  # Dutch postal code + city
            r'(\d{5}\s+(?:Calpe|Calp|Alicante|Benissa)[\w\s,]*)',  # Spanish postal code
            r'((?:Calle|Carrer|Avenida|Avda|Paseo|Pl\.?)\s+[^\n]{5,60})',  # Spanish street
        ]
        for pattern in addr_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                facts['address'] = match.group(0).strip()[:120]
                break

    # Phone numbers
    if not facts.get('phone'):
        phone_patterns = [
            r'(?:tel|telefoon|phone|llamar)[.:\s]+([+\d\s\-()]{8,20})',
            r'(\+31\s*\d[\d\s\-]{7,15})',  # Dutch
            r'(\+34\s*\d[\d\s\-]{7,15})',  # Spanish
            r'(0\d{2,3}[\s\-]?\d{3,4}[\s\-]?\d{2,4})',  # Dutch local
            r'(9\d{2}[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2})',  # Spanish local
        ]
        for pattern in phone_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                phone = match.group(1) if match.lastindex else match.group(0)
                phone = phone.strip()
                if len(phone) >= 8:
                    facts['phone'] = phone
                    break

    # Email
    if not facts.get('email'):
        email_match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', text)
        if email_match:
            facts['email'] = email_match.group(0)

    # Key features (from list items)
    features = facts.get('key_features', [])
    existing_features = set(f.lower() for f in features)
    for li in soup.find_all('li'):
        li_text = li.get_text(strip=True)
        if 10 < len(li_text) < 200 and li_text.lower() not in existing_features:
            features.append(li_text)
            existing_features.add(li_text.lower())
    facts['key_features'] = features[:25]

    # Social media links
    social_patterns = {
        'facebook': r'facebook\.com/[\w.]+',
        'instagram': r'instagram\.com/[\w.]+',
        'twitter': r'(?:twitter|x)\.com/[\w]+',
        'tripadvisor': r'tripadvisor\.[\w]+/[\w/\-]+',
    }
    existing_social = set(s.get('platform', '') for s in facts.get('social_media', []))
    for platform, pattern in social_patterns.items():
        if platform not in existing_social:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                facts['social_media'].append({
                    'platform': platform,
                    'url': match.group(0)
                })

    # JSON-LD structured data (schema.org)
    for script_tag in soup.find_all('script', type='application/ld+json'):
        try:
            ld_data = json.loads(script_tag.string)
            if isinstance(ld_data, list):
                ld_data = ld_data[0] if ld_data else {}
            # Extract opening hours from schema.org
            if not facts.get('opening_hours') and 'openingHours' in ld_data:
                facts['opening_hours'] = str(ld_data['openingHours'])
            if not facts.get('address') and 'address' in ld_data:
                addr = ld_data['address']
                if isinstance(addr, dict):
                    parts = [addr.get('streetAddress', ''), addr.get('postalCode', ''),
                             addr.get('addressLocality', '')]
                    facts['address'] = ', '.join(p for p in parts if p)
                elif isinstance(addr, str):
                    facts['address'] = addr
            if not facts.get('phone') and 'telephone' in ld_data:
                facts['phone'] = ld_data['telephone']
        except (json.JSONDecodeError, TypeError, AttributeError):
            pass


# ============================================================
# PHASE 2: FACT SHEET GENERATION
# ============================================================
def generate_fact_sheets(scraped_data, dest_filter=None):
    """Build structured fact sheets combining scraped data + DB data for ALL POIs."""
    log('=' * 70)
    log('PHASE 2: FACT SHEET GENERATION')
    log('=' * 70)

    # Build scraped data lookup
    scraped_lookup = {}
    for sd in scraped_data:
        scraped_lookup[sd['poi_id']] = sd

    log(f'Scraped data available for {len(scraped_lookup)} POIs')

    # Query ALL POIs with content from DB
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    dest_clause = ''
    params = []
    if dest_filter:
        dest_id = 2 if dest_filter == 'texel' else 1
        dest_clause = 'AND destination_id = %s'
        params = [dest_id]

    cursor.execute(f"""
        SELECT id, name, category, subcategory, rating, review_count,
               website, description, enriched_highlights,
               enriched_detail_description, city, address,
               latitude, longitude, destination_id, google_placeid,
               google_price_level
        FROM POI
        WHERE is_active = 1
          AND enriched_detail_description IS NOT NULL
          AND enriched_detail_description != ''
          {dest_clause}
        ORDER BY destination_id, rating DESC, review_count DESC
    """, params)

    all_pois = cursor.fetchall()
    cursor.close()
    conn.close()

    log(f'Total POIs with content from DB: {len(all_pois)}')

    # Build fact sheets
    fact_sheets = []
    quality_counts = {'rich': 0, 'moderate': 0, 'minimal': 0, 'none': 0}

    for poi in all_pois:
        poi_id = poi['id']
        # Normalize Decimal/bytes types
        for k, v in poi.items():
            if hasattr(v, 'as_integer_ratio'):
                poi[k] = float(v)
            elif isinstance(v, bytes):
                poi[k] = v.decode('utf-8', errors='replace')

        scraped = scraped_lookup.get(poi_id, {})
        has_scrape = scraped.get('scrape_success', False)

        # Build the fact sheet
        fs = {
            'poi_id': poi_id,
            'name': poi['name'],
            'category': poi['category'],
            'subcategory': poi.get('subcategory'),
            'destination_id': poi['destination_id'],
            'destination': 'Texel' if poi['destination_id'] == 2 else 'Calpe',
            'rating': poi.get('rating'),
            'review_count': poi.get('review_count', 0),
            'google_placeid': poi.get('google_placeid'),
            'google_price_level': poi.get('google_price_level'),
            'city': poi.get('city'),
            'website': poi.get('website'),
            'current_content': poi.get('enriched_detail_description', ''),

            # Source data quality
            'data_sources': [],
            'data_quality': 'none',

            # Combined fact sheet content
            'website_content': '',
            'website_subpages': {},
            'verified_facts': {
                'opening_hours': None,
                'prices': [],
                'address': poi.get('address'),
                'phone': None,
                'email': None,
                'features': [],
                'social_media': []
            },
            'google_description': poi.get('description', ''),
            'highlights': poi.get('enriched_highlights', ''),

            # For LLM prompt in R4
            'source_text_for_llm': ''
        }

        # Add scraped website data
        if has_scrape:
            fs['data_sources'].append('website_scrape')
            fs['website_content'] = scraped.get('main_content', '')
            fs['website_subpages'] = scraped.get('subpages', {})
            fs['page_title'] = scraped.get('page_title', '')
            fs['meta_description'] = scraped.get('meta_description', '')
            fs['content_language'] = scraped.get('content_language')

            # Merge extracted facts
            ext_facts = scraped.get('extracted_facts', {})
            if ext_facts.get('opening_hours'):
                fs['verified_facts']['opening_hours'] = ext_facts['opening_hours']
            if ext_facts.get('prices_found'):
                fs['verified_facts']['prices'] = ext_facts['prices_found']
            if ext_facts.get('address'):
                fs['verified_facts']['address'] = ext_facts['address']
            if ext_facts.get('phone'):
                fs['verified_facts']['phone'] = ext_facts['phone']
            if ext_facts.get('email'):
                fs['verified_facts']['email'] = ext_facts['email']
            if ext_facts.get('key_features'):
                fs['verified_facts']['features'] = ext_facts['key_features']
            if ext_facts.get('social_media'):
                fs['verified_facts']['social_media'] = ext_facts['social_media']

        # Add Google Places description
        if poi.get('description') and poi['description'].strip():
            fs['data_sources'].append('google_places')

        # Add highlights
        if poi.get('enriched_highlights') and poi['enriched_highlights'].strip():
            fs['data_sources'].append('highlights')

        # Determine data quality
        website_words = len(fs['website_content'].split()) if fs['website_content'] else 0
        subpage_words = sum(len(v.split()) for v in fs['website_subpages'].values())
        google_words = len(fs['google_description'].split()) if fs['google_description'] else 0
        highlight_words = len(fs['highlights'].split()) if fs['highlights'] else 0
        total_source_words = website_words + subpage_words + google_words + highlight_words

        if website_words >= 100 and len(fs['data_sources']) >= 2:
            fs['data_quality'] = 'rich'
            quality_counts['rich'] += 1
        elif website_words >= 50 or (google_words >= 20 and highlight_words >= 10):
            fs['data_quality'] = 'moderate'
            quality_counts['moderate'] += 1
        elif total_source_words >= 10:
            fs['data_quality'] = 'minimal'
            quality_counts['minimal'] += 1
        else:
            fs['data_quality'] = 'none'
            quality_counts['none'] += 1

        # Build the combined source text for LLM (R4 will use this)
        source_parts = []

        if fs['website_content']:
            # Truncate to 3000 words for LLM context
            wc = fs['website_content'].split()
            if len(wc) > 3000:
                source_parts.append('WEBSITE CONTENT:\n' + ' '.join(wc[:3000]) + '...[truncated]')
            else:
                source_parts.append('WEBSITE CONTENT:\n' + fs['website_content'])

        if fs['website_subpages']:
            subpage_text = []
            for page, content in fs['website_subpages'].items():
                wc = content.split()
                if len(wc) > 1000:
                    content = ' '.join(wc[:1000]) + '...[truncated]'
                subpage_text.append(f'--- {page} ---\n{content}')
            source_parts.append('SUBPAGES:\n' + '\n'.join(subpage_text))

        if fs['google_description']:
            source_parts.append(f'GOOGLE PLACES DESCRIPTION:\n{fs["google_description"]}')

        if fs['highlights']:
            source_parts.append(f'HIGHLIGHTS:\n{fs["highlights"]}')

        # Add verified facts
        vf_parts = []
        vf = fs['verified_facts']
        if vf.get('opening_hours'):
            vf_parts.append(f'Opening hours: {vf["opening_hours"]}')
        if vf.get('prices'):
            vf_parts.append(f'Prices found: {", ".join(vf["prices"][:10])}')
        if vf.get('address'):
            vf_parts.append(f'Address: {vf["address"]}')
        if vf.get('phone'):
            vf_parts.append(f'Phone: {vf["phone"]}')
        if vf.get('email'):
            vf_parts.append(f'Email: {vf["email"]}')
        if vf_parts:
            source_parts.append('VERIFIED FACTS:\n' + '\n'.join(vf_parts))

        fs['source_text_for_llm'] = '\n\n'.join(source_parts)
        fs['source_word_count'] = total_source_words

        fact_sheets.append(fs)

    # Save fact sheets
    with open(FACT_SHEETS, 'w', encoding='utf-8') as f:
        json.dump(fact_sheets, f, indent=2, ensure_ascii=False)

    log(f'\nFact sheets generated: {len(fact_sheets)}')
    log(f'  Quality distribution:')
    log(f'    Rich (website + other): {quality_counts["rich"]}')
    log(f'    Moderate (some data): {quality_counts["moderate"]}')
    log(f'    Minimal (little data): {quality_counts["minimal"]}')
    log(f'    None (no source data): {quality_counts["none"]}')
    log(f'  Output: {FACT_SHEETS}')

    return fact_sheets, quality_counts


# ============================================================
# PHASE 3: COVERAGE REPORT
# ============================================================
def generate_coverage_report(fact_sheets, quality_counts, scrape_stats=None):
    """Generate comprehensive coverage report."""
    log('=' * 70)
    log('PHASE 3: COVERAGE REPORT')
    log('=' * 70)

    report = []
    report.append('# Fase R2: Source Data Verrijking — Coverage Report')
    report.append(f'\n**Datum**: {datetime.now().strftime("%d %B %Y")}')
    report.append(f'**Auteur**: Automated Scraping Pipeline v2.0\n')
    report.append('---\n')

    # A. Executive Summary
    report.append('## A. Executive Summary\n')
    total = len(fact_sheets)
    texel_fs = [fs for fs in fact_sheets if fs['destination_id'] == 2]
    calpe_fs = [fs for fs in fact_sheets if fs['destination_id'] == 1]

    report.append(f'| Metric | Texel | Calpe | Totaal |')
    report.append(f'|--------|-------|-------|--------|')
    report.append(f'| POIs met content | {len(texel_fs)} | {len(calpe_fs)} | {total} |')

    for quality in ['rich', 'moderate', 'minimal', 'none']:
        t_count = sum(1 for fs in texel_fs if fs['data_quality'] == quality)
        c_count = sum(1 for fs in calpe_fs if fs['data_quality'] == quality)
        report.append(f'| Data quality: {quality} | {t_count} | {c_count} | {t_count + c_count} |')

    # Website scrape stats
    t_scraped = sum(1 for fs in texel_fs if 'website_scrape' in fs['data_sources'])
    c_scraped = sum(1 for fs in calpe_fs if 'website_scrape' in fs['data_sources'])
    report.append(f'| Website gescrapet | {t_scraped} | {c_scraped} | {t_scraped + c_scraped} |')

    t_google = sum(1 for fs in texel_fs if 'google_places' in fs['data_sources'])
    c_google = sum(1 for fs in calpe_fs if 'google_places' in fs['data_sources'])
    report.append(f'| Google Places beschrijving | {t_google} | {c_google} | {t_google + c_google} |')

    t_highlights = sum(1 for fs in texel_fs if 'highlights' in fs['data_sources'])
    c_highlights = sum(1 for fs in calpe_fs if 'highlights' in fs['data_sources'])
    report.append(f'| Enriched highlights | {t_highlights} | {c_highlights} | {t_highlights + c_highlights} |')

    # Avg source words
    t_words = [fs['source_word_count'] for fs in texel_fs if fs['source_word_count'] > 0]
    c_words = [fs['source_word_count'] for fs in calpe_fs if fs['source_word_count'] > 0]
    t_avg = sum(t_words) / len(t_words) if t_words else 0
    c_avg = sum(c_words) / len(c_words) if c_words else 0
    report.append(f'| Gem. bronwoorden per POI | {t_avg:.0f} | {c_avg:.0f} | {(t_avg+c_avg)/2:.0f} |')

    report.append('')

    # Coverage assessment
    rich_pct = quality_counts['rich'] / total * 100 if total > 0 else 0
    moderate_pct = quality_counts['moderate'] / total * 100 if total > 0 else 0
    usable_pct = (quality_counts['rich'] + quality_counts['moderate']) / total * 100 if total > 0 else 0

    report.append(f'### Coverage Assessment\n')
    report.append(f'- **{usable_pct:.0f}% van POIs** heeft bruikbare brondata (rich + moderate)')
    report.append(f'- **{rich_pct:.0f}%** heeft rijke brondata (website + extra bronnen)')
    report.append(f'- **{quality_counts["none"]}** POIs hebben GEEN bruikbare brondata')
    report.append(f'- Deze POIs krijgen een generieke beschrijving op basis van naam, categorie en rating\n')

    report.append('---\n')

    # B. Per-category analysis
    report.append('## B. Per-Categorie Dekking\n')

    for dest_name, dest_fs in [('Texel', texel_fs), ('Calpe', calpe_fs)]:
        report.append(f'### {dest_name}\n')
        report.append('| Categorie | Totaal | Rich | Moderate | Minimal | None | Dekking% |')
        report.append('|-----------|--------|------|----------|---------|------|----------|')

        cat_groups = {}
        for fs in dest_fs:
            cat = fs['category'] or 'Unknown'
            cat_groups.setdefault(cat, []).append(fs)

        for cat in sorted(cat_groups.keys()):
            fss = cat_groups[cat]
            n = len(fss)
            rich = sum(1 for fs in fss if fs['data_quality'] == 'rich')
            mod = sum(1 for fs in fss if fs['data_quality'] == 'moderate')
            mini = sum(1 for fs in fss if fs['data_quality'] == 'minimal')
            none_ = sum(1 for fs in fss if fs['data_quality'] == 'none')
            coverage = (rich + mod) / n * 100 if n > 0 else 0
            report.append(f'| {cat} | {n} | {rich} | {mod} | {mini} | {none_} | {coverage:.0f}% |')

        # Total
        n = len(dest_fs)
        rich = sum(1 for fs in dest_fs if fs['data_quality'] == 'rich')
        mod = sum(1 for fs in dest_fs if fs['data_quality'] == 'moderate')
        mini = sum(1 for fs in dest_fs if fs['data_quality'] == 'minimal')
        none_ = sum(1 for fs in dest_fs if fs['data_quality'] == 'none')
        coverage = (rich + mod) / n * 100 if n > 0 else 0
        report.append(f'| **TOTAAL** | **{n}** | **{rich}** | **{mod}** | **{mini}** | **{none_}** | **{coverage:.0f}%** |')
        report.append('')

    report.append('---\n')

    # C. Extracted facts summary
    report.append('## C. Geëxtraheerde Feiten Samenvatting\n')

    has_hours = sum(1 for fs in fact_sheets if fs['verified_facts'].get('opening_hours'))
    has_prices = sum(1 for fs in fact_sheets if fs['verified_facts'].get('prices'))
    has_address = sum(1 for fs in fact_sheets if fs['verified_facts'].get('address'))
    has_phone = sum(1 for fs in fact_sheets if fs['verified_facts'].get('phone'))
    has_email = sum(1 for fs in fact_sheets if fs['verified_facts'].get('email'))
    has_features = sum(1 for fs in fact_sheets if fs['verified_facts'].get('features'))

    report.append('| Feit Type | Aantal POIs | Percentage |')
    report.append('|-----------|-------------|-----------|')
    report.append(f'| Openingstijden | {has_hours} | {has_hours/total*100:.0f}% |')
    report.append(f'| Prijzen | {has_prices} | {has_prices/total*100:.0f}% |')
    report.append(f'| Adres | {has_address} | {has_address/total*100:.0f}% |')
    report.append(f'| Telefoon | {has_phone} | {has_phone/total*100:.0f}% |')
    report.append(f'| Email | {has_email} | {has_email/total*100:.0f}% |')
    report.append(f'| Features/kenmerken | {has_features} | {has_features/total*100:.0f}% |')
    report.append('')

    report.append('---\n')

    # D. POIs without source data
    report.append('## D. POIs Zonder Brondata\n')
    report.append('Deze POIs hebben geen website en geen Google Places beschrijving. ')
    report.append('Ze krijgen in Fase R4 een generieke beschrijving.\n')

    no_data = [fs for fs in fact_sheets if fs['data_quality'] == 'none']
    if no_data:
        report.append('| # | POI | Categorie | Destination | Rating |')
        report.append('|---|-----|-----------|-------------|--------|')
        for i, fs in enumerate(no_data[:50]):
            report.append(f'| {i+1} | {fs["name"]} | {fs["category"]} | {fs["destination"]} | {fs.get("rating", "?")} |')
        if len(no_data) > 50:
            report.append(f'\n*... en nog {len(no_data) - 50} andere POIs*\n')
    else:
        report.append('Alle POIs hebben ten minste enige brondata.\n')

    report.append('---\n')

    # E. Recommendations for R3/R4
    report.append('## E. Aanbevelingen voor Fase R3/R4\n')
    report.append(f'1. **{quality_counts["rich"]} POIs (rich data)**: Volledige regeneratie met strikte fact-grounding')
    report.append(f'2. **{quality_counts["moderate"]} POIs (moderate data)**: Regeneratie met beschikbare brondata + generieke aanvulling')
    report.append(f'3. **{quality_counts["minimal"]} POIs (minimal data)**: Korte, veilige beschrijving op basis van naam/categorie')
    report.append(f'4. **{quality_counts["none"]} POIs (no data)**: Generieke template-beschrijving (geen specifieke claims)')
    report.append(f'5. **Vertalingen**: Na R4 regeneratie opnieuw draaien voor NL/DE/ES\n')

    report.append('### Prompt Strategie per Data Quality\n')
    report.append('| Quality | Prompt Aanpak | Max Woorden |')
    report.append('|---------|---------------|-------------|')
    report.append('| Rich | Volledige AIDA met grounded facts | 120-140 |')
    report.append('| Moderate | AIDA met beschikbare facts, generiek voor rest | 100-120 |')
    report.append('| Minimal | Korte beschrijving, alleen naam/categorie/sfeer | 70-90 |')
    report.append('| None | Template: "{name} is een {category} in {destination}. Bezoek de website voor meer informatie." | 40-60 |')

    report_text = '\n'.join(report)
    with open(COVERAGE_REPORT, 'w', encoding='utf-8') as f:
        f.write(report_text)
    log(f'Coverage report saved to {COVERAGE_REPORT}')

    # Generate Frank's summary
    generate_frank_summary(fact_sheets, quality_counts, texel_fs, calpe_fs)

    return report_text


def generate_frank_summary(fact_sheets, quality_counts, texel_fs, calpe_fs):
    """Generate Dutch summary for Frank."""
    log('Generating Frank summary...')

    total = len(fact_sheets)
    usable = quality_counts['rich'] + quality_counts['moderate']
    usable_pct = usable / total * 100 if total > 0 else 0

    t_scraped = sum(1 for fs in texel_fs if 'website_scrape' in fs['data_sources'])
    c_scraped = sum(1 for fs in calpe_fs if 'website_scrape' in fs['data_sources'])

    lines = []
    lines.append('# Samenvatting Fase R2: Source Data Verrijking')
    lines.append(f'\n**Datum**: {datetime.now().strftime("%d februari %Y")}')
    lines.append(f'**Voor**: Frank Spooren\n')
    lines.append('---\n')

    lines.append('## Wat hebben we gedaan?\n')
    lines.append(f'We hebben de websites van **{t_scraped + c_scraped} POIs** gescrapet ')
    lines.append(f'({t_scraped} Texel + {c_scraped} Calpe) om feitelijke brondata te verzamelen ')
    lines.append(f'voor de content regeneratie in Fase R4.\n')

    lines.append('## Resultaten\n')
    lines.append(f'- **{total} POIs** in totaal verwerkt')
    lines.append(f'- **{usable} POIs ({usable_pct:.0f}%)** hebben voldoende brondata voor goede regeneratie')
    lines.append(f'- **{quality_counts["rich"]} POIs** hebben rijke brondata (website + extra)')
    lines.append(f'- **{quality_counts["moderate"]} POIs** hebben redelijke brondata')
    lines.append(f'- **{quality_counts["minimal"]} POIs** hebben beperkte brondata')
    lines.append(f'- **{quality_counts["none"]} POIs** hebben geen brondata (krijgen generieke beschrijving)\n')

    lines.append('## Wat is er voor elke POI verzameld?\n')
    lines.append('Per POI is een "fact sheet" gemaakt met:')
    lines.append('- Website tekst (hoofd- + subpagina\'s)')
    lines.append('- Openingstijden, prijzen, adres, telefoon (waar gevonden)')
    lines.append('- Google Places beschrijving (als fallback)')
    lines.append('- Bestaande highlights\n')

    lines.append('## Volgende stap: Fase R3 + R4\n')
    lines.append('De fact sheets worden nu gebruikt als brondata voor:')
    lines.append('1. **Fase R3**: De prompt herschrijven zodat het LLM ALLEEN feitelijke brondata gebruikt')
    lines.append('2. **Fase R4**: Alle content opnieuw genereren + automatische fact-check')
    lines.append('3. **Jouw review**: Top 30 POIs per bestemming handmatig controleren\n')

    lines.append('Het volledige technische rapport staat op de server:')
    lines.append(f'`{COVERAGE_REPORT}`\n')

    text = '\n'.join(lines)
    with open(SUMMARY_FILE, 'w', encoding='utf-8') as f:
        f.write(text)
    log(f'Frank summary saved to {SUMMARY_FILE}')


# ============================================================
# MAIN
# ============================================================
def main():
    parser = argparse.ArgumentParser(description='Fase R2: Source Data Verrijking')
    parser.add_argument('--phase', choices=['scrape', 'factsheets', 'report'],
                       help='Run only a specific phase')
    parser.add_argument('--batch-size', type=int, default=25,
                       help='POIs per checkpoint batch (default 25)')
    parser.add_argument('--resume', action='store_true',
                       help='Resume scraping from last checkpoint')
    parser.add_argument('--dest', choices=['texel', 'calpe'],
                       help='Only process one destination')
    args = parser.parse_args()

    start_time = time.time()
    log('=' * 70)
    log('FASE R2: SOURCE DATA VERRIJKING — Full Website Scraping + Fact Sheets')
    log('HolidaiButler Content Repair Pipeline')
    log('=' * 70)

    try:
        # Load scrape targets
        with open(SCRAPE_TARGETS, 'r', encoding='utf-8') as f:
            targets = json.load(f)
        log(f'Loaded {len(targets)} scrape targets from {SCRAPE_TARGETS}')

        scraped_data = []
        quality_counts = None

        # Phase 1: Scraping
        if args.phase is None or args.phase == 'scrape':
            scraped_data = scrape_all_websites(
                targets,
                batch_size=args.batch_size,
                resume=args.resume,
                dest_filter=args.dest
            )
        else:
            # Load existing scraped data
            if os.path.exists(SCRAPE_OUTPUT):
                with open(SCRAPE_OUTPUT, 'r', encoding='utf-8') as f:
                    scraped_data = json.load(f)
                log(f'Loaded {len(scraped_data)} scraped POIs from {SCRAPE_OUTPUT}')
            else:
                log(f'WARNING: No scraped data found at {SCRAPE_OUTPUT}')

        # Phase 2: Fact sheets
        if args.phase is None or args.phase == 'factsheets':
            fact_sheets, quality_counts = generate_fact_sheets(
                scraped_data, dest_filter=args.dest
            )
        else:
            if os.path.exists(FACT_SHEETS):
                with open(FACT_SHEETS, 'r', encoding='utf-8') as f:
                    fact_sheets = json.load(f)
                log(f'Loaded {len(fact_sheets)} fact sheets from {FACT_SHEETS}')
                quality_counts = {
                    'rich': sum(1 for fs in fact_sheets if fs['data_quality'] == 'rich'),
                    'moderate': sum(1 for fs in fact_sheets if fs['data_quality'] == 'moderate'),
                    'minimal': sum(1 for fs in fact_sheets if fs['data_quality'] == 'minimal'),
                    'none': sum(1 for fs in fact_sheets if fs['data_quality'] == 'none'),
                }

        # Phase 3: Report
        if args.phase is None or args.phase == 'report':
            if quality_counts is None:
                quality_counts = {
                    'rich': sum(1 for fs in fact_sheets if fs['data_quality'] == 'rich'),
                    'moderate': sum(1 for fs in fact_sheets if fs['data_quality'] == 'moderate'),
                    'minimal': sum(1 for fs in fact_sheets if fs['data_quality'] == 'minimal'),
                    'none': sum(1 for fs in fact_sheets if fs['data_quality'] == 'none'),
                }
            generate_coverage_report(fact_sheets, quality_counts)

        elapsed = time.time() - start_time
        log(f'\n{"=" * 70}')
        log(f'FASE R2 COMPLETE in {elapsed/60:.1f} minutes')
        log(f'{"=" * 70}')
        log(f'Output files:')
        log(f'  {SCRAPE_OUTPUT} — Scraped website data')
        log(f'  {FACT_SHEETS} — Structured fact sheets')
        log(f'  {COVERAGE_REPORT} — Coverage report')
        log(f'  {SUMMARY_FILE} — Summary for Frank')

    except Exception as e:
        log(f'FATAL ERROR: {e}')
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
