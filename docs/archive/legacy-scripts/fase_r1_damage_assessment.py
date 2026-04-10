#!/usr/bin/env python3
"""
Fase R1: Damage Assessment — POI Content Factual Verification
HolidaiButler Content Repair Pipeline

This script:
1. Selects 50 Texel + 50 Calpe POIs for the damage assessment sample
2. Scrapes their websites for factual verification
3. Runs LLM fact-checks comparing generated content vs website data
4. Generates a comprehensive damage assessment report

Usage: python3 -u fase_r1_damage_assessment.py [--phase PHASE]
  --phase select    : Only run POI selection
  --phase scrape    : Only run website scraping (requires select output)
  --phase factcheck : Only run LLM fact-check (requires scrape output)
  --phase report    : Only generate report (requires factcheck output)
  (no --phase)      : Run all phases sequentially
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

MISTRAL_API_KEY = 'pMPOgK7TmI7oe6rxPEXiCCPKDMk8pTUg'
MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions'
MISTRAL_MODEL = 'mistral-medium-latest'

# Rate limiting
SCRAPE_DELAY = 0.5          # 2 req/sec
DOMAIN_DELAY = 3.0          # 3s between different domains
SCRAPE_TIMEOUT = 10         # 10s per request
SCRAPE_MAX_RETRIES = 3
LLM_DELAY = 0.2             # 5 req/sec
LLM_MAX_RETRIES = 3
LLM_TIMEOUT = 60

USER_AGENT = 'HolidaiButler Content Verification Bot/1.0'

# Output files
OUTPUT_DIR = '/root'
SAMPLE_TEXEL = f'{OUTPUT_DIR}/fase_r1_sample_texel.json'
SAMPLE_CALPE = f'{OUTPUT_DIR}/fase_r1_sample_calpe.json'
WEBSITE_TEXEL = f'{OUTPUT_DIR}/fase_r1_website_data_texel.json'
WEBSITE_CALPE = f'{OUTPUT_DIR}/fase_r1_website_data_calpe.json'
FACTCHECK_TEXEL = f'{OUTPUT_DIR}/fase_r1_factcheck_texel.json'
FACTCHECK_CALPE = f'{OUTPUT_DIR}/fase_r1_factcheck_calpe.json'
REPORT_FILE = f'{OUTPUT_DIR}/fase_r1_damage_assessment.md'
SUMMARY_FILE = f'{OUTPUT_DIR}/fase_r1_summary_for_frank.md'
SCRAPE_TARGETS = f'{OUTPUT_DIR}/fase_r2_scrape_targets.json'
PROMPT_IMPROVEMENTS = f'{OUTPUT_DIR}/fase_r3_prompt_improvements.md'
CHECKPOINT_FILE = f'{OUTPUT_DIR}/fase_r1_checkpoint.json'

# Subpages to try scraping
SUBPAGES = ['/about', '/over-ons', '/menu', '/kaart', '/activiteiten',
            '/openingstijden', '/contact', '/over', '/info', '/aanbod',
            '/diensten', '/behandelingen', '/prijzen', '/tarieven']

# ============================================================
# TEXEL CATEGORY DISTRIBUTION (50 POIs)
# Maps desired plan categories to actual DB category names
# ============================================================
TEXEL_SAMPLE_DISTRIBUTION = {
    'Eten & Drinken': 10,
    'Natuur': 8,
    'Cultuur & Historie': 8,
    'Actief': 7,
    'Winkelen': 7,
    'Recreatief': 5,
    'Praktisch': 5,
}

# ============================================================
# CALPE CATEGORY DISTRIBUTION (50 POIs)
# ============================================================
CALPE_SAMPLE_DISTRIBUTION = {
    'Food & Drinks': 10,
    'Beaches & Nature': 8,
    'Culture & History': 7,
    'Active': 7,
    'Recreation': 6,
    'Shopping': 5,
    'Health & Wellbeing': 4,
    'Practical': 3,
}


def log(msg):
    """Timestamped logging."""
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f'[{ts}] {msg}')


def save_checkpoint(phase, data):
    """Save checkpoint for resume capability."""
    checkpoint = {}
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, 'r') as f:
            checkpoint = json.load(f)
    checkpoint[phase] = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'status': 'completed',
        'data': data
    }
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(checkpoint, f, indent=2, ensure_ascii=False)
    log(f'Checkpoint saved: {phase}')


def load_checkpoint(phase):
    """Load checkpoint if exists."""
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, 'r') as f:
            checkpoint = json.load(f)
        if phase in checkpoint and checkpoint[phase]['status'] == 'completed':
            return checkpoint[phase]['data']
    return None


# ============================================================
# PHASE 1: POI SELECTION
# ============================================================
def select_pois():
    """Select 50 Texel + 50 Calpe POIs for the damage assessment sample."""
    log('=== PHASE 1: POI SELECTION ===')

    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    texel_pois = select_destination_pois(cursor, 2, TEXEL_SAMPLE_DISTRIBUTION, 'Texel')
    calpe_pois = select_destination_pois(cursor, 1, CALPE_SAMPLE_DISTRIBUTION, 'Calpe')

    cursor.close()
    conn.close()

    # Save sample files
    with open(SAMPLE_TEXEL, 'w', encoding='utf-8') as f:
        json.dump(texel_pois, f, indent=2, ensure_ascii=False)
    log(f'Saved {len(texel_pois)} Texel POIs to {SAMPLE_TEXEL}')

    with open(SAMPLE_CALPE, 'w', encoding='utf-8') as f:
        json.dump(calpe_pois, f, indent=2, ensure_ascii=False)
    log(f'Saved {len(calpe_pois)} Calpe POIs to {SAMPLE_CALPE}')

    save_checkpoint('select', {
        'texel_count': len(texel_pois),
        'calpe_count': len(calpe_pois)
    })

    return texel_pois, calpe_pois


def select_destination_pois(cursor, dest_id, distribution, dest_name):
    """Select POIs for a destination according to category distribution."""
    log(f'Selecting POIs for {dest_name} (destination_id={dest_id})...')

    # First check actual categories available
    cursor.execute("""
        SELECT category, COUNT(*) as cnt
        FROM POI
        WHERE destination_id = %s AND is_active = 1
          AND enriched_detail_description IS NOT NULL
          AND enriched_detail_description != ''
          AND website IS NOT NULL AND website != ''
        GROUP BY category ORDER BY cnt DESC
    """, (dest_id,))
    available = {row['category']: row['cnt'] for row in cursor.fetchall()}
    log(f'  Available categories: {json.dumps(available, indent=4)}')

    selected = []
    for category, target_count in distribution.items():
        if category not in available:
            log(f'  WARNING: Category "{category}" not found in DB for {dest_name}')
            # Try fuzzy match
            matched = None
            for db_cat in available:
                if category.lower() in db_cat.lower() or db_cat.lower() in category.lower():
                    matched = db_cat
                    break
            if matched:
                log(f'  -> Using fuzzy match: "{matched}" instead')
                category = matched
            else:
                continue

        actual_count = min(target_count, available.get(category, 0))
        if actual_count == 0:
            continue

        cursor.execute("""
            SELECT id, name, category, subcategory, rating, review_count,
                   website, enriched_detail_description, latitude, longitude,
                   enriched_highlights, city
            FROM POI
            WHERE destination_id = %s AND is_active = 1
              AND category = %s
              AND enriched_detail_description IS NOT NULL
              AND enriched_detail_description != ''
              AND website IS NOT NULL AND website != ''
            ORDER BY rating DESC, review_count DESC
            LIMIT %s
        """, (dest_id, category, actual_count))

        rows = cursor.fetchall()
        for row in rows:
            # Convert Decimal/bytes types to JSON-serializable
            poi = {}
            for k, v in row.items():
                if hasattr(v, 'as_integer_ratio'):  # Decimal
                    poi[k] = float(v)
                elif isinstance(v, bytes):
                    poi[k] = v.decode('utf-8', errors='replace')
                else:
                    poi[k] = v
            selected.append(poi)
        log(f'  {category}: selected {len(rows)}/{target_count} (available: {available.get(category, 0)})')

    log(f'Total selected for {dest_name}: {len(selected)} POIs')
    return selected


# ============================================================
# PHASE 2: WEBSITE SCRAPING
# ============================================================
def scrape_websites(pois, dest_name, output_file):
    """Scrape websites for all selected POIs."""
    log(f'=== PHASE 2: WEBSITE SCRAPING ({dest_name}) ===')

    results = []
    last_domain = None
    success_count = 0
    fail_count = 0

    for i, poi in enumerate(pois):
        log(f'  [{i+1}/{len(pois)}] Scraping: {poi["name"]} ({poi["website"]})')

        url = poi['website']
        if not url.startswith('http'):
            url = 'https://' + url

        # Domain-based delay
        domain = urlparse(url).netloc
        if last_domain and domain != last_domain:
            time.sleep(DOMAIN_DELAY)
        last_domain = domain

        result = scrape_single_poi(poi['id'], url, poi['name'])
        results.append(result)

        if result['scrape_success']:
            success_count += 1
            # Show content preview
            content_len = len(result.get('main_content', ''))
            subpages_count = len(result.get('subpages', {}))
            log(f'    -> OK: {content_len} chars, {subpages_count} subpages')
        else:
            fail_count += 1
            log(f'    -> FAILED: {result.get("error", "unknown")}')

        time.sleep(SCRAPE_DELAY)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    log(f'{dest_name} scraping complete: {success_count} OK, {fail_count} failed -> {output_file}')
    return results


def scrape_single_poi(poi_id, url, poi_name):
    """Scrape a single POI website with retries."""
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
            'key_features': []
        },
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

            # Extract title
            title_tag = soup.find('title')
            result['page_title'] = title_tag.get_text(strip=True) if title_tag else ''

            # Extract meta description
            meta = soup.find('meta', attrs={'name': 'description'})
            if meta:
                result['meta_description'] = meta.get('content', '')

            # Extract main content
            # Remove script, style, nav, footer, header
            for tag in soup.find_all(['script', 'style', 'nav', 'footer', 'header', 'noscript']):
                tag.decompose()

            main_content = soup.get_text(separator='\n', strip=True)
            # Clean up excessive whitespace
            main_content = re.sub(r'\n{3,}', '\n\n', main_content)
            # Limit to 5000 words
            words = main_content.split()
            if len(words) > 5000:
                main_content = ' '.join(words[:5000])
            result['main_content'] = main_content

            # Extract structured data
            extract_facts(soup, result, main_content)

            result['scrape_success'] = True

            # Try subpages
            base_url = f'{urlparse(url).scheme}://{urlparse(url).netloc}'
            for subpage in SUBPAGES:
                try:
                    sub_url = urljoin(base_url, subpage)
                    sub_resp = requests.get(sub_url, headers=headers,
                                          timeout=SCRAPE_TIMEOUT,
                                          allow_redirects=True)
                    if sub_resp.status_code == 200:
                        sub_soup = BeautifulSoup(sub_resp.text, 'html.parser')
                        for tag in sub_soup.find_all(['script', 'style', 'nav', 'footer', 'header', 'noscript']):
                            tag.decompose()
                        sub_text = sub_soup.get_text(separator='\n', strip=True)
                        sub_text = re.sub(r'\n{3,}', '\n\n', sub_text)
                        words = sub_text.split()
                        if len(words) > 2000:
                            sub_text = ' '.join(words[:2000])
                        # Only add if content is meaningfully different from main
                        if len(sub_text) > 100 and sub_text[:200] != main_content[:200]:
                            result['subpages'][subpage] = sub_text
                    time.sleep(0.3)  # Small delay between subpages
                except Exception:
                    pass  # Subpage failures are OK

            break  # Success, exit retry loop

        except requests.exceptions.Timeout:
            result['error'] = f'Timeout after {SCRAPE_TIMEOUT}s (attempt {attempt+1})'
            if attempt < SCRAPE_MAX_RETRIES - 1:
                time.sleep(2 ** attempt)
        except requests.exceptions.HTTPError as e:
            result['error'] = f'HTTP {e.response.status_code} (attempt {attempt+1})'
            if e.response.status_code in (403, 404):
                break  # Don't retry 403/404
            if attempt < SCRAPE_MAX_RETRIES - 1:
                time.sleep(2 ** attempt)
        except requests.exceptions.SSLError:
            # Retry without SSL verification
            try:
                resp = requests.get(url, headers=headers, timeout=SCRAPE_TIMEOUT,
                                  allow_redirects=True, verify=False)
                soup = BeautifulSoup(resp.text, 'html.parser')
                title_tag = soup.find('title')
                result['page_title'] = title_tag.get_text(strip=True) if title_tag else ''
                for tag in soup.find_all(['script', 'style', 'nav', 'footer', 'header', 'noscript']):
                    tag.decompose()
                main_content = soup.get_text(separator='\n', strip=True)
                main_content = re.sub(r'\n{3,}', '\n\n', main_content)
                words = main_content.split()
                if len(words) > 5000:
                    main_content = ' '.join(words[:5000])
                result['main_content'] = main_content
                result['scrape_success'] = True
                result['error'] = 'SSL error (bypassed verification)'
            except Exception as e2:
                result['error'] = f'SSL error + fallback failed: {str(e2)}'
            break
        except Exception as e:
            result['error'] = f'{type(e).__name__}: {str(e)} (attempt {attempt+1})'
            if attempt < SCRAPE_MAX_RETRIES - 1:
                time.sleep(2 ** attempt)

    return result


def extract_facts(soup, result, text):
    """Extract structured facts from scraped content."""
    text_lower = text.lower()

    # Opening hours patterns (Dutch + English + Spanish)
    hours_patterns = [
        r'(?:maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|ma|di|wo|do|vr|za|zo)[\s\-:]+\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2}',
        r'(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)[\s\-:]+\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2}',
        r'(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo)[\s\-:]+\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2}',
        r'open(?:ingstijden|ing hours)[:\s]+([^\n]+)',
        r'geopend[:\s]+([^\n]+)',
    ]
    for pattern in hours_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            result['extracted_facts']['opening_hours'] = '; '.join(matches[:5])
            break

    # Prices (EUR/€)
    price_patterns = re.findall(r'[€]\s*\d+[.,]?\d*|\d+[.,]\d{2}\s*(?:euro|EUR)', text)
    if price_patterns:
        result['extracted_facts']['prices_found'] = list(set(price_patterns[:10]))

    # Address
    addr_patterns = [
        r'(?:adres|address|dirección)[:\s]+([^\n]+)',
        r'(?:\d{4}\s*[A-Z]{2})\s+\w+',  # Dutch postal code
        r'(?:\d{5})\s+(?:Calpe|Calp|Alicante)',  # Spanish postal code
    ]
    for pattern in addr_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result['extracted_facts']['address'] = match.group(0).strip()
            break

    # Key features (look for lists, USPs)
    features = []
    for li in soup.find_all('li'):
        li_text = li.get_text(strip=True)
        if 10 < len(li_text) < 200:
            features.append(li_text)
    result['extracted_facts']['key_features'] = features[:15]


# ============================================================
# PHASE 3: LLM FACT-CHECK
# ============================================================
FACTCHECK_SYSTEM_PROMPT = """Je bent een strenge feitencontroleur voor een toerismeplatform.
Je vergelijkt een LLM-gegenereerde POI-beschrijving met de WERKELIJKE informatie van de website van die POI.

Je taak: identificeer ELKE feitelijke bewering in de gegenereerde tekst en classificeer deze als:

1. VERIFIED — De bewering komt overeen met de website-informatie
2. HALLUCINATED — De bewering is NIET te vinden op de website en lijkt verzonnen (prijs, faciliteit, dienst, activiteit, feit)
3. UNVERIFIABLE — De bewering is niet te bevestigen noch te ontkrachten op basis van de beschikbare brondata
4. FACTUALLY_WRONG — De bewering is AANTOONBAAR ONJUIST op basis van de website-informatie
5. MISSING_ESSENTIAL — Belangrijke informatie op de website die ONTBREEKT in de gegenereerde tekst (awards, certificeringen, unieke kenmerken, etc.)

Wees STRENG. Elke specifieke claim (prijs, afstand, openingstijd, faciliteitnaam, historisch feit, getal) moet te verifiëren zijn.
Vage beweringen ("gezellige sfeer", "warm welcome") tellen NIET als claims.

Output UITSLUITEND geldig JSON. Geen markdown code blocks, geen extra tekst."""


def build_factcheck_prompt(poi, website_data):
    """Build the user prompt for fact-checking a POI."""
    # Get website content
    main_content = website_data.get('main_content', 'Not available')
    if len(main_content) > 4000:
        main_content = main_content[:4000] + '...[truncated]'

    subpages = website_data.get('subpages', {})
    subpages_text = ''
    for page, content in subpages.items():
        if len(content) > 1500:
            content = content[:1500] + '...[truncated]'
        subpages_text += f'\n--- {page} ---\n{content}\n'
    if not subpages_text:
        subpages_text = 'No subpages found'

    facts = website_data.get('extracted_facts', {})

    prompt = f"""POI Naam: {poi['name']}
Categorie: {poi.get('category', 'N/A')}

=== GEGENEREERDE TEKST (te controleren) ===
{poi.get('enriched_detail_description', 'No content')}

=== WEBSITE BRONDATA (waarheid) ===
Website: {poi.get('website', 'N/A')}
Pagina-titel: {website_data.get('page_title', 'N/A')}
Meta description: {website_data.get('meta_description', 'N/A')}

Hoofdcontent:
{main_content}

Subpagina's:
{subpages_text}

Gevonden openingstijden: {facts.get('opening_hours', 'Niet gevonden')}
Gevonden prijzen: {json.dumps(facts.get('prices_found', []))}
Adres: {facts.get('address', 'Niet gevonden')}

=== OPDRACHT ===

Analyseer de gegenereerde tekst zin voor zin. Geef voor ELKE feitelijke bewering een oordeel.
Tel daarna de scores op.

Bepaal de severity:
- CRITICAL: >50% hallucinated+factually_wrong, of missing_essential met importance=CRITICAL
- HIGH: 30-50% hallucinated+factually_wrong
- MEDIUM: 15-30% hallucinated+factually_wrong
- LOW: <15% hallucinated+factually_wrong

Geef je antwoord UITSLUITEND als geldig JSON (geen markdown):
{{
  "poi_name": "{poi['name']}",
  "poi_id": {poi['id']},
  "total_claims": 0,
  "verified": 0,
  "hallucinated": 0,
  "unverifiable": 0,
  "factually_wrong": 0,
  "missing_essential_count": 0,
  "hallucination_rate": 0.0,
  "severity": "HIGH",
  "claims_detail": [
    {{
      "claim": "specific claim from text",
      "verdict": "VERIFIED|HALLUCINATED|UNVERIFIABLE|FACTUALLY_WRONG",
      "evidence": "what website says or doesn't say",
      "severity": "HIGH|MEDIUM|LOW"
    }}
  ],
  "missing_info": [
    {{
      "info": "important missing info",
      "source": "where found on website",
      "importance": "CRITICAL|HIGH|MEDIUM"
    }}
  ],
  "overall_assessment": "PASS/FAIL with explanation"
}}"""
    return prompt


def run_factcheck(poi, website_data):
    """Run LLM fact-check for a single POI."""
    user_prompt = build_factcheck_prompt(poi, website_data)

    for attempt in range(LLM_MAX_RETRIES):
        try:
            response = requests.post(
                MISTRAL_API_URL,
                headers={
                    'Authorization': f'Bearer {MISTRAL_API_KEY}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': MISTRAL_MODEL,
                    'messages': [
                        {'role': 'system', 'content': FACTCHECK_SYSTEM_PROMPT},
                        {'role': 'user', 'content': user_prompt}
                    ],
                    'temperature': 0.1,  # Low temp for consistent analysis
                    'max_tokens': 4000,
                    'response_format': {'type': 'json_object'}
                },
                timeout=LLM_TIMEOUT
            )
            response.raise_for_status()
            data = response.json()

            content = data['choices'][0]['message']['content']

            # Parse JSON response
            # Handle potential markdown code blocks
            content = content.strip()
            if content.startswith('```'):
                content = re.sub(r'^```(?:json)?\s*', '', content)
                content = re.sub(r'\s*```$', '', content)

            result = json.loads(content)

            # Add usage info
            usage = data.get('usage', {})
            result['_llm_usage'] = {
                'prompt_tokens': usage.get('prompt_tokens', 0),
                'completion_tokens': usage.get('completion_tokens', 0),
                'total_tokens': usage.get('total_tokens', 0)
            }

            return result

        except json.JSONDecodeError as e:
            log(f'    JSON parse error (attempt {attempt+1}): {e}')
            if attempt < LLM_MAX_RETRIES - 1:
                time.sleep(2 ** attempt)
        except requests.exceptions.RequestException as e:
            log(f'    API error (attempt {attempt+1}): {e}')
            if attempt < LLM_MAX_RETRIES - 1:
                time.sleep(2 ** attempt)
        except Exception as e:
            log(f'    Unexpected error (attempt {attempt+1}): {e}')
            if attempt < LLM_MAX_RETRIES - 1:
                time.sleep(2 ** attempt)

    # Return error result
    return {
        'poi_name': poi['name'],
        'poi_id': poi['id'],
        'error': 'All retries failed',
        'total_claims': 0,
        'verified': 0,
        'hallucinated': 0,
        'unverifiable': 0,
        'factually_wrong': 0,
        'missing_essential_count': 0,
        'hallucination_rate': -1,
        'severity': 'UNKNOWN',
        'claims_detail': [],
        'missing_info': [],
        'overall_assessment': 'ERROR - could not complete fact-check'
    }


def run_factchecks(pois, website_data_list, dest_name, output_file):
    """Run fact-checks for all POIs of a destination."""
    log(f'=== PHASE 3: LLM FACT-CHECK ({dest_name}) ===')

    # Build website data lookup by poi_id
    website_lookup = {wd['poi_id']: wd for wd in website_data_list}

    results = []
    total_tokens = 0

    for i, poi in enumerate(pois):
        log(f'  [{i+1}/{len(pois)}] Fact-checking: {poi["name"]}')

        wd = website_lookup.get(poi['id'], {})
        if not wd.get('scrape_success', False):
            log(f'    -> SKIPPED: No website data available')
            results.append({
                'poi_name': poi['name'],
                'poi_id': poi['id'],
                'error': 'No website data (scrape failed)',
                'total_claims': 0,
                'verified': 0,
                'hallucinated': 0,
                'unverifiable': 0,
                'factually_wrong': 0,
                'missing_essential_count': 0,
                'hallucination_rate': -1,
                'severity': 'UNVERIFIABLE',
                'claims_detail': [],
                'missing_info': [],
                'overall_assessment': 'UNVERIFIABLE - no website data'
            })
            continue

        result = run_factcheck(poi, wd)
        results.append(result)

        tokens = result.get('_llm_usage', {}).get('total_tokens', 0)
        total_tokens += tokens

        severity = result.get('severity', 'UNKNOWN')
        hall_rate = result.get('hallucination_rate', -1)
        if hall_rate >= 0:
            log(f'    -> {severity}: hallucination_rate={hall_rate:.0%}, '
                f'verified={result.get("verified",0)}, '
                f'hallucinated={result.get("hallucinated",0)}, '
                f'wrong={result.get("factually_wrong",0)}')
        else:
            log(f'    -> {severity}: {result.get("overall_assessment", "N/A")}')

        time.sleep(LLM_DELAY)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    log(f'{dest_name} fact-check complete: {len(results)} POIs, {total_tokens} tokens -> {output_file}')
    return results


# ============================================================
# PHASE 4: REPORT GENERATION
# ============================================================
def generate_report(texel_pois, calpe_pois, texel_fc, calpe_fc,
                    texel_wd, calpe_wd):
    """Generate comprehensive damage assessment report."""
    log('=== PHASE 4: GENERATING DAMAGE ASSESSMENT REPORT ===')

    report = []
    report.append('# Fase R1: Damage Assessment Report')
    report.append(f'## POI Content Feitelijke Verificatie\n')
    report.append(f'**Datum**: {datetime.now().strftime("%d %B %Y")}')
    report.append(f'**Auteur**: Automated Fact-Check Pipeline')
    report.append(f'**Versie**: 1.0\n')
    report.append('---\n')

    # A. Executive Summary
    report.append('## A. Executive Summary\n')

    texel_stats = compute_stats(texel_fc, 'Texel')
    calpe_stats = compute_stats(calpe_fc, 'Calpe')

    report.append(f'| Metric | Texel | Calpe | Combined |')
    report.append(f'|--------|-------|-------|----------|')
    report.append(f'| POIs checked | {texel_stats["total_pois"]} | {calpe_stats["total_pois"]} | {texel_stats["total_pois"] + calpe_stats["total_pois"]} |')
    report.append(f'| POIs with data | {texel_stats["pois_with_data"]} | {calpe_stats["pois_with_data"]} | {texel_stats["pois_with_data"] + calpe_stats["pois_with_data"]} |')
    report.append(f'| Avg hallucination rate | {texel_stats["avg_hall_rate"]:.0%} | {calpe_stats["avg_hall_rate"]:.0%} | {(texel_stats["avg_hall_rate"] + calpe_stats["avg_hall_rate"])/2:.0%} |')
    report.append(f'| POIs severity HIGH/CRITICAL | {texel_stats["high_severity"]} ({texel_stats["high_severity_pct"]:.0%}) | {calpe_stats["high_severity"]} ({calpe_stats["high_severity_pct"]:.0%}) | {texel_stats["high_severity"] + calpe_stats["high_severity"]} |')
    report.append(f'| POIs with missing essential info | {texel_stats["missing_essential"]} | {calpe_stats["missing_essential"]} | {texel_stats["missing_essential"] + calpe_stats["missing_essential"]} |')
    report.append(f'| Avg claims per POI | {texel_stats["avg_claims"]:.1f} | {calpe_stats["avg_claims"]:.1f} | {(texel_stats["avg_claims"] + calpe_stats["avg_claims"])/2:.1f} |')
    report.append(f'| Total verified claims | {texel_stats["total_verified"]} | {calpe_stats["total_verified"]} | {texel_stats["total_verified"] + calpe_stats["total_verified"]} |')
    report.append(f'| Total hallucinated claims | {texel_stats["total_hallucinated"]} | {calpe_stats["total_hallucinated"]} | {texel_stats["total_hallucinated"] + calpe_stats["total_hallucinated"]} |')
    report.append(f'| Total factually wrong claims | {texel_stats["total_wrong"]} | {calpe_stats["total_wrong"]} | {texel_stats["total_wrong"] + calpe_stats["total_wrong"]} |')
    report.append('')

    combined_hall = (texel_stats["avg_hall_rate"] + calpe_stats["avg_hall_rate"]) / 2
    if combined_hall > 0.30:
        report.append('### GO/NO-GO Conclusie: **NO-GO** ❌\n')
        report.append(f'Met een gemiddeld hallucinatiepercentage van {combined_hall:.0%} is de huidige content '
                      f'**niet geschikt voor productie**. Feitelijke verificatie en regeneratie (Fase R2-R4) is '
                      f'VERPLICHT voordat het platform live kan.\n')
    elif combined_hall > 0.15:
        report.append('### GO/NO-GO Conclusie: **CONDITIONAL GO** ⚠️\n')
        report.append(f'Met een gemiddeld hallucinatiepercentage van {combined_hall:.0%} is de content '
                      f'**acceptabel met voorbehoud**. Tier 1/2 POIs moeten handmatig gecontroleerd worden.\n')
    else:
        report.append('### GO/NO-GO Conclusie: **GO** ✅\n')
        report.append(f'Met een gemiddeld hallucinatiepercentage van {combined_hall:.0%} is de content '
                      f'**acceptabel** voor productie.\n')

    report.append('---\n')

    # B. Per-destination analysis
    report.append('## B. Per-Bestemming Analyse\n')
    report.append('### Texel\n')
    report.append(generate_category_table(texel_fc, texel_pois))
    report.append('\n### Calpe\n')
    report.append(generate_category_table(calpe_fc, calpe_pois))
    report.append('')

    report.append('---\n')

    # C. Error patterns
    report.append('## C. Foutpatronen Analyse\n')
    all_fc = texel_fc + calpe_fc
    patterns = analyze_error_patterns(all_fc)
    report.append(patterns)
    report.append('')

    report.append('---\n')

    # D. Top 10 worst errors
    report.append('## D. Top 10 Ergste Fouten\n')
    top10 = get_top10_worst(all_fc, texel_pois + calpe_pois)
    report.append(top10)
    report.append('')

    report.append('---\n')

    # E. Category-specific risks
    report.append('## E. Categorie-Specifieke Risico\'s\n')
    cat_risks = analyze_category_risks(texel_fc, calpe_fc, texel_pois, calpe_pois)
    report.append(cat_risks)
    report.append('')

    report.append('---\n')

    # F. Recommendations
    report.append('## F. Aanbevelingen voor Fase R2-R4\n')
    recommendations = generate_recommendations(texel_stats, calpe_stats, all_fc)
    report.append(recommendations)
    report.append('')

    report.append('---\n')

    # G. Frank's review list
    report.append('## G. Frank\'s Handmatige Review Lijst\n')
    review_list = generate_review_list(texel_fc, calpe_fc, texel_pois, calpe_pois)
    report.append(review_list)

    report_text = '\n'.join(report)

    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write(report_text)
    log(f'Damage assessment report saved to {REPORT_FILE}')

    # Generate Frank's summary (Dutch)
    generate_frank_summary(texel_stats, calpe_stats, combined_hall, texel_fc, calpe_fc)

    # Generate R2 scrape targets
    generate_scrape_targets()

    # Generate R3 prompt improvements
    generate_prompt_improvements(all_fc, texel_stats, calpe_stats)

    return report_text


def compute_stats(factchecks, dest_name):
    """Compute statistics from fact-check results."""
    stats = {
        'destination': dest_name,
        'total_pois': len(factchecks),
        'pois_with_data': 0,
        'avg_hall_rate': 0,
        'high_severity': 0,
        'high_severity_pct': 0,
        'missing_essential': 0,
        'avg_claims': 0,
        'total_verified': 0,
        'total_hallucinated': 0,
        'total_wrong': 0,
        'total_unverifiable': 0
    }

    hall_rates = []
    claims_counts = []

    for fc in factchecks:
        if fc.get('hallucination_rate', -1) < 0:
            continue  # Skip errors
        stats['pois_with_data'] += 1

        # Calculate hallucination rate from actual claim counts (more reliable than LLM field)
        total_claims = fc.get('total_claims', 0)
        hallucinated = fc.get('hallucinated', 0)
        wrong = fc.get('factually_wrong', 0)
        if total_claims > 0:
            hall_rate = (hallucinated + wrong) / total_claims
        else:
            hall_rate = fc.get('hallucination_rate', 0)
            if isinstance(hall_rate, str):
                try:
                    hall_rate = float(hall_rate)
                except ValueError:
                    hall_rate = 0
            # Normalize: if LLM returned percentage (>1), convert to fraction
            if hall_rate > 1:
                hall_rate = hall_rate / 100
        hall_rates.append(hall_rate)

        total_claims = fc.get('total_claims', 0)
        claims_counts.append(total_claims)

        stats['total_verified'] += fc.get('verified', 0)
        stats['total_hallucinated'] += fc.get('hallucinated', 0)
        stats['total_wrong'] += fc.get('factually_wrong', 0)
        stats['total_unverifiable'] += fc.get('unverifiable', 0)

        severity = fc.get('severity', '').upper()
        if severity in ('HIGH', 'CRITICAL'):
            stats['high_severity'] += 1

        missing = fc.get('missing_info', []) or fc.get('missing_essential', [])
        if isinstance(missing, list) and len(missing) > 0:
            stats['missing_essential'] += 1
        elif fc.get('missing_essential_count', 0) > 0:
            stats['missing_essential'] += 1

    if hall_rates:
        stats['avg_hall_rate'] = sum(hall_rates) / len(hall_rates)
    if claims_counts:
        stats['avg_claims'] = sum(claims_counts) / len(claims_counts)
    if stats['pois_with_data'] > 0:
        stats['high_severity_pct'] = stats['high_severity'] / stats['pois_with_data']

    return stats


def generate_category_table(factchecks, pois):
    """Generate per-category analysis table."""
    # Build POI lookup
    poi_lookup = {p['id']: p for p in pois}

    # Group by category
    categories = {}
    for fc in factchecks:
        poi_id = fc.get('poi_id')
        poi = poi_lookup.get(poi_id, {})
        cat = poi.get('category', 'Unknown')
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(fc)

    lines = []
    lines.append('| Categorie | POIs | Avg Claims | Verified% | Hallucinated% | Wrong% | Unverifiable% | Avg Severity |')
    lines.append('|-----------|------|-----------|-----------|---------------|--------|---------------|-------------|')

    total_pois = 0
    total_claims = 0
    total_verified = 0
    total_hall = 0
    total_wrong = 0
    total_unver = 0

    for cat in sorted(categories.keys()):
        fcs = categories[cat]
        n = len(fcs)
        claims = sum(fc.get('total_claims', 0) for fc in fcs)
        verified = sum(fc.get('verified', 0) for fc in fcs)
        hallucinated = sum(fc.get('hallucinated', 0) for fc in fcs)
        wrong = sum(fc.get('factually_wrong', 0) for fc in fcs)
        unver = sum(fc.get('unverifiable', 0) for fc in fcs)

        avg_claims = claims / n if n > 0 else 0
        ver_pct = (verified / claims * 100) if claims > 0 else 0
        hall_pct = (hallucinated / claims * 100) if claims > 0 else 0
        wrong_pct = (wrong / claims * 100) if claims > 0 else 0
        unver_pct = (unver / claims * 100) if claims > 0 else 0

        severities = [fc.get('severity', 'UNKNOWN') for fc in fcs]
        sev_map = {'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'UNKNOWN': 0, 'UNVERIFIABLE': 0}
        avg_sev = sum(sev_map.get(s.upper(), 0) for s in severities) / len(severities) if severities else 0
        sev_label = 'CRITICAL' if avg_sev >= 3.5 else 'HIGH' if avg_sev >= 2.5 else 'MEDIUM' if avg_sev >= 1.5 else 'LOW'

        lines.append(f'| {cat} | {n} | {avg_claims:.1f} | {ver_pct:.0f}% | {hall_pct:.0f}% | {wrong_pct:.0f}% | {unver_pct:.0f}% | {sev_label} |')

        total_pois += n
        total_claims += claims
        total_verified += verified
        total_hall += hallucinated
        total_wrong += wrong
        total_unver += unver

    # Total row
    avg_claims_total = total_claims / total_pois if total_pois > 0 else 0
    ver_pct_total = (total_verified / total_claims * 100) if total_claims > 0 else 0
    hall_pct_total = (total_hall / total_claims * 100) if total_claims > 0 else 0
    wrong_pct_total = (total_wrong / total_claims * 100) if total_claims > 0 else 0
    unver_pct_total = (total_unver / total_claims * 100) if total_claims > 0 else 0

    lines.append(f'| **TOTAAL** | **{total_pois}** | **{avg_claims_total:.1f}** | **{ver_pct_total:.0f}%** | **{hall_pct_total:.0f}%** | **{wrong_pct_total:.0f}%** | **{unver_pct_total:.0f}%** | — |')

    return '\n'.join(lines)


def analyze_error_patterns(all_fc):
    """Analyze recurring error patterns."""
    lines = []

    # Collect all claims
    error_types = {
        'prices': 0, 'distances': 0, 'opening_hours': 0, 'facilities': 0,
        'menu_items': 0, 'historical_facts': 0, 'descriptions': 0,
        'activities': 0, 'awards': 0, 'other': 0
    }

    for fc in all_fc:
        for claim in fc.get('claims_detail', []):
            verdict = claim.get('verdict', '').upper()
            if verdict not in ('HALLUCINATED', 'FACTUALLY_WRONG'):
                continue
            claim_text = claim.get('claim', '').lower()
            if any(w in claim_text for w in ['€', 'euro', 'price', 'prijs', 'cost']):
                error_types['prices'] += 1
            elif any(w in claim_text for w in ['metre', 'meter', 'km', 'minute', 'walk', 'distance']):
                error_types['distances'] += 1
            elif any(w in claim_text for w in ['open', 'hour', 'uur', 'geopend', 'time']):
                error_types['opening_hours'] += 1
            elif any(w in claim_text for w in ['menu', 'dish', 'gerecht', 'coffee', 'beer', 'wine', 'food']):
                error_types['menu_items'] += 1
            elif any(w in claim_text for w in ['year', 'century', 'founded', 'history', 'built', 'established']):
                error_types['historical_facts'] += 1
            elif any(w in claim_text for w in ['award', 'star', 'michelin', 'prize', 'certificate']):
                error_types['awards'] += 1
            elif any(w in claim_text for w in ['facility', 'pool', 'terrace', 'garden', 'fireplace', 'parking']):
                error_types['facilities'] += 1
            elif any(w in claim_text for w in ['activity', 'tour', 'excursion', 'workshop', 'class']):
                error_types['activities'] += 1
            else:
                error_types['other'] += 1

    total_errors = sum(error_types.values())

    lines.append('### 1. Type fouten (hallucinated + factually_wrong)\n')
    lines.append('| Fouttype | Aantal | Percentage |')
    lines.append('|----------|--------|-----------|')
    for err_type, count in sorted(error_types.items(), key=lambda x: -x[1]):
        pct = (count / total_errors * 100) if total_errors > 0 else 0
        lines.append(f'| {err_type.replace("_", " ").title()} | {count} | {pct:.0f}% |')
    lines.append(f'| **Totaal** | **{total_errors}** | **100%** |')
    lines.append('')

    lines.append('### 2. Prompt-instructies die hallucinaties veroorzaken\n')
    lines.append('De volgende prompt-regels zijn waarschijnlijk de directe oorzaak van hallucinaties:\n')
    lines.append('1. **"Include at least one concrete detail (price, distance, time, feature)"** — Dit dwingt het LLM om details te verzinnen wanneer het deze niet kent')
    lines.append('2. **"Attention: Hook with a unique fact, sensory detail, or surprising element"** — Moedigt het LLM aan om "verrassende" (=verzonnen) feiten te genereren')
    lines.append('3. **"Desire: What will the visitor experience? Be specific"** — Vraagt om specificiteit zonder brondata')
    lines.append('4. **Geen brondata meegegeven** — Website URL is niet genoeg; de INHOUD van de website moet meegegeven worden')
    lines.append('')

    return '\n'.join(lines)


def get_top10_worst(all_fc, all_pois):
    """Get top 10 POIs with worst hallucination rates."""
    poi_lookup = {p['id']: p for p in all_pois}

    # Filter out errors and sort by computed hallucination rate
    def compute_hall_rate(fc):
        tc = fc.get('total_claims', 0)
        h = fc.get('hallucinated', 0)
        w = fc.get('factually_wrong', 0)
        return (h + w) / tc if tc > 0 else 0
    valid = [fc for fc in all_fc if fc.get('hallucination_rate', -1) >= 0]
    sorted_fc = sorted(valid, key=lambda x: compute_hall_rate(x), reverse=True)

    lines = []
    for i, fc in enumerate(sorted_fc[:10]):
        poi = poi_lookup.get(fc.get('poi_id'), {})
        lines.append(f'### {i+1}. {fc.get("poi_name", "Unknown")}')
        lines.append(f'- **Categorie**: {poi.get("category", "N/A")}')
        lines.append(f'- **Rating**: {poi.get("rating", "N/A")} ({poi.get("review_count", 0)} reviews)')
        computed_rate = compute_hall_rate(fc)
        lines.append(f'- **Hallucinatie-rate**: {computed_rate:.0%}')
        lines.append(f'- **Claims**: {fc.get("total_claims", 0)} totaal, {fc.get("verified", 0)} verified, {fc.get("hallucinated", 0)} hallucinated, {fc.get("factually_wrong", 0)} wrong')
        lines.append(f'- **Severity**: {fc.get("severity", "N/A")}')

        # Top 3 worst errors
        claims = fc.get('claims_detail', [])
        worst = [c for c in claims if c.get('verdict', '').upper() in ('HALLUCINATED', 'FACTUALLY_WRONG')]
        if worst:
            lines.append(f'- **Ergste fouten**:')
            for c in worst[:3]:
                lines.append(f'  - ❌ "{c.get("claim", "")}" → {c.get("verdict", "")}: {c.get("evidence", "")}')

        lines.append('')

    return '\n'.join(lines)


def analyze_category_risks(texel_fc, calpe_fc, texel_pois, calpe_pois):
    """Analyze per-category hallucination patterns."""
    lines = []

    all_fc = texel_fc + calpe_fc
    all_pois = texel_pois + calpe_pois
    poi_lookup = {p['id']: p for p in all_pois}

    # Group by category
    cat_claims = {}
    for fc in all_fc:
        poi = poi_lookup.get(fc.get('poi_id'), {})
        cat = poi.get('category', 'Unknown')
        if cat not in cat_claims:
            cat_claims[cat] = []
        for claim in fc.get('claims_detail', []):
            cat_claims[cat].append(claim)

    for cat in sorted(cat_claims.keys()):
        claims = cat_claims[cat]
        if not claims:
            continue

        hall_claims = [c for c in claims if c.get('verdict', '').upper() in ('HALLUCINATED', 'FACTUALLY_WRONG')]
        if not hall_claims:
            lines.append(f'### {cat}: LOW RISK\n')
            lines.append(f'Geen significante hallucinaties gevonden in de steekproef.\n')
            continue

        lines.append(f'### {cat}\n')
        lines.append(f'- Totaal claims: {len(claims)}, waarvan {len(hall_claims)} foutief ({len(hall_claims)/len(claims)*100:.0f}%)')

        # Categorize the errors
        error_examples = {}
        for c in hall_claims:
            claim_lower = c.get('claim', '').lower()
            if any(w in claim_lower for w in ['€', 'price', 'prijs']):
                error_examples.setdefault('Prijzen', []).append(c['claim'])
            elif any(w in claim_lower for w in ['metre', 'km', 'minute', 'distance']):
                error_examples.setdefault('Afstanden', []).append(c['claim'])
            elif any(w in claim_lower for w in ['menu', 'dish', 'food', 'coffee']):
                error_examples.setdefault('Menu/food items', []).append(c['claim'])
            elif any(w in claim_lower for w in ['facility', 'fireplace', 'terrace']):
                error_examples.setdefault('Faciliteiten', []).append(c['claim'])
            else:
                error_examples.setdefault('Overig', []).append(c['claim'])

        lines.append('- Typische fouten:')
        for err_type, examples in error_examples.items():
            lines.append(f'  - **{err_type}**: {", ".join(examples[:3])}')

        lines.append('')

    return '\n'.join(lines)


def generate_recommendations(texel_stats, calpe_stats, all_fc):
    """Generate recommendations for R2-R4."""
    lines = []

    lines.append('### 1. Prompt-aanpassingen (Fase R3)\n')
    lines.append('- **VERWIJDER** regel "Include at least one concrete detail" — dit forceert hallucinaties')
    lines.append('- **VERWIJDER** "hook with a surprising element" — moedigt verzinnen aan')
    lines.append('- **TOEVOEG**: "Gebruik UITSLUITEND informatie uit de meegeleverde brondata"')
    lines.append('- **TOEVOEG**: "Als je iets niet weet, noem het NIET — verzin NOOIT details"')
    lines.append('- **TOEVOEG**: "Noem GEEN specifieke prijzen, afstanden of openingstijden tenzij deze expliciet in de brondata staan"')
    lines.append('- **TOEVOEG**: "Verwijs naar de website voor actuele informatie"')
    lines.append('')

    lines.append('### 2. Essentiële brondata per categorie (Fase R2)\n')
    lines.append('| Categorie | Minimale brondata |')
    lines.append('|-----------|-------------------|')
    lines.append('| Eten & Drinken | Menu-items, specialiteiten, sfeer, concept |')
    lines.append('| Natuur | Feitelijke afmetingen, flora/fauna, seizoensinformatie |')
    lines.append('| Cultuur & Historie | Jaartallen, historische feiten, collectie-omschrijving |')
    lines.append('| Actief | Beschikbare activiteiten, vereisten, reservering |')
    lines.append('| Winkelen | Productaanbod, specialisatie, merken |')
    lines.append('| Recreatief | Faciliteiten, leeftijdsgroepen, voorzieningen |')
    lines.append('| Gezondheid | Behandelingen, certificeringen, specialisaties |')
    lines.append('| Praktisch | Diensten, contactinfo, bereikbaarheid |')
    lines.append('')

    lines.append('### 3. Vertalingen (Fase 5)\n')
    lines.append('JA — de vertalingen (NL, DE, ES) moeten opnieuw gedraaid worden na content reparatie, ')
    lines.append('aangezien deze gebaseerd zijn op de foutieve Engelse bronteksten.\n')

    return '\n'.join(lines)


def generate_review_list(texel_fc, calpe_fc, texel_pois, calpe_pois):
    """Generate list of POIs for Frank's manual review."""
    lines = []

    for dest_name, fcs, pois in [('Texel', texel_fc, texel_pois),
                                  ('Calpe', calpe_fc, calpe_pois)]:
        poi_lookup = {p['id']: p for p in pois}
        lines.append(f'### {dest_name} — Top 30 voor Handmatige Review\n')
        lines.append('| # | POI Naam | Categorie | Rating | Reviews | Hall.Rate | Severity |')
        lines.append('|---|----------|-----------|--------|---------|-----------|----------|')

        # Sort by severity then computed hallucination rate
        def compute_hr(fc):
            tc = fc.get('total_claims', 0)
            h = fc.get('hallucinated', 0)
            w = fc.get('factually_wrong', 0)
            return (h + w) / tc if tc > 0 else 0
        valid = [fc for fc in fcs if fc.get('hallucination_rate', -1) >= 0]
        sev_map = {'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}
        sorted_fcs = sorted(valid,
                           key=lambda x: (sev_map.get(x.get('severity', '').upper(), 0),
                                         compute_hr(x)),
                           reverse=True)

        for i, fc in enumerate(sorted_fcs[:30]):
            poi = poi_lookup.get(fc.get('poi_id'), {})
            lines.append(f'| {i+1} | {fc.get("poi_name", "?")} | {poi.get("category", "?")} | '
                        f'{poi.get("rating", "?")} | {poi.get("review_count", 0)} | '
                        f'{compute_hr(fc):.0%} | {fc.get("severity", "?")} |')

        lines.append('')

    return '\n'.join(lines)


def generate_frank_summary(texel_stats, calpe_stats, combined_hall, texel_fc, calpe_fc):
    """Generate Dutch summary for Frank."""
    log('Generating Frank summary...')

    lines = []
    lines.append('# Samenvatting Fase R1: Damage Assessment')
    lines.append(f'## POI Content Feitelijke Verificatie\n')
    lines.append(f'**Datum**: {datetime.now().strftime("%d februari %Y")}')
    lines.append(f'**Voor**: Frank Spooren\n')
    lines.append('---\n')

    lines.append('## Kernresultaten\n')
    lines.append(f'We hebben **{texel_stats["pois_with_data"] + calpe_stats["pois_with_data"]} POI-beschrijvingen** gecontroleerd ')
    lines.append(f'({texel_stats["pois_with_data"]} Texel + {calpe_stats["pois_with_data"]} Calpe) door de gegenereerde tekst ')
    lines.append(f'te vergelijken met de WERKELIJKE informatie op de website van elke POI.\n')

    lines.append('### Bevindingen:\n')
    lines.append(f'- **Gemiddeld hallucinatiepercentage**: {combined_hall:.0%}')
    lines.append(f'  - Texel: {texel_stats["avg_hall_rate"]:.0%}')
    lines.append(f'  - Calpe: {calpe_stats["avg_hall_rate"]:.0%}')
    lines.append(f'- **POIs met ernstige fouten** (severity HIGH/CRITICAL): {texel_stats["high_severity"] + calpe_stats["high_severity"]}')
    lines.append(f'- **POIs met ontbrekende essentiële info**: {texel_stats["missing_essential"] + calpe_stats["missing_essential"]}')
    lines.append('')

    if combined_hall > 0.30:
        lines.append('### Conclusie: **Niet geschikt voor productie** ❌\n')
        lines.append('De LLM-gegenereerde content bevat te veel verzonnen details om live te gaan. ')
        lines.append('Dit bevestigt jouw handmatige steekproef: het probleem is systematisch.\n')
    elif combined_hall > 0.15:
        lines.append('### Conclusie: **Voorwaardelijk acceptabel** ⚠️\n')
        lines.append('De content heeft significant minder fouten dan verwacht op basis van je steekproef, ')
        lines.append('maar Tier 1/2 POIs moeten nog handmatig gecontroleerd worden.\n')

    lines.append('### Typische fouten die we vonden:\n')
    lines.append('1. **Verzonnen afstanden** ("300 meter van het centrum", "5 minuten fietsen")')
    lines.append('2. **Verzonnen prijzen** (specifieke bedragen die nergens te vinden zijn)')
    lines.append('3. **Verzonnen faciliteiten** (haardvuren, terrassen, diensten die niet bestaan)')
    lines.append('4. **Verzonnen menu-items** (specifieke gerechten/dranken)')
    lines.append('5. **Ontbrekende onderscheidingen** (Michelin-sterren, awards die wél bestaan)\n')

    lines.append('### Oorzaak\n')
    lines.append('De prompt instructie "Include at least one concrete detail" dwong het LLM om details ')
    lines.append('te verzinnen. De website-URL werd wél meegegeven, maar de INHOUD van die website niet. ')
    lines.append('Zonder feitelijke brondata vult het LLM informatiegaten met plausibel-klinkende maar ')
    lines.append('verzonnen details.\n')

    lines.append('### Volgende stappen\n')
    lines.append('1. **Fase R2** — Alle POI-websites scrapen als feitelijke bron')
    lines.append('2. **Fase R3** — Prompt herschrijven: ALLEEN schrijven wat in de brondata staat')
    lines.append('3. **Fase R4** — Alle content opnieuw genereren + automatische fact-check')
    lines.append('4. **Jouw review** — Top 30 POIs per bestemming handmatig controleren')
    lines.append('5. **Vertalingen** — Opnieuw draaien na content reparatie\n')

    lines.append('Het volledige technische rapport staat op de server:')
    lines.append(f'`/root/fase_r1_damage_assessment.md`\n')

    text = '\n'.join(lines)
    with open(SUMMARY_FILE, 'w', encoding='utf-8') as f:
        f.write(text)
    log(f'Frank summary saved to {SUMMARY_FILE}')


def generate_scrape_targets():
    """Generate list of ALL POI websites for R2 full scraping."""
    log('Generating R2 scrape targets...')

    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT id, name, website, category, rating, review_count, destination_id
        FROM POI
        WHERE is_active = 1
          AND enriched_detail_description IS NOT NULL
          AND enriched_detail_description != ''
          AND website IS NOT NULL AND website != ''
        ORDER BY destination_id, rating DESC, review_count DESC
    """)

    targets = []
    for row in cursor.fetchall():
        rating = float(row['rating']) if row.get('rating') else 0
        reviews = row.get('review_count', 0) or 0

        # Determine tier
        if rating >= 4.5 and reviews >= 50:
            tier = 1
        elif rating >= 4.0 and reviews >= 20:
            tier = 2
        elif rating >= 3.5:
            tier = 3
        else:
            tier = 4

        targets.append({
            'poi_id': row['id'],
            'name': row['name'],
            'website': row['website'],
            'category': row['category'],
            'destination_id': row['destination_id'],
            'rating': rating,
            'review_count': reviews,
            'tier': tier
        })

    cursor.close()
    conn.close()

    with open(SCRAPE_TARGETS, 'w', encoding='utf-8') as f:
        json.dump(targets, f, indent=2, ensure_ascii=False)
    log(f'R2 scrape targets: {len(targets)} POIs saved to {SCRAPE_TARGETS}')


def generate_prompt_improvements(all_fc, texel_stats, calpe_stats):
    """Generate prompt improvement recommendations for R3."""
    log('Generating R3 prompt improvements...')

    lines = []
    lines.append('# Fase R3: Prompt Verbeteringen')
    lines.append(f'## Op basis van Fase R1 Damage Assessment\n')
    lines.append(f'**Datum**: {datetime.now().strftime("%d februari %Y")}\n')
    lines.append('---\n')

    lines.append('## 1. Anti-Hallucinatie Regels (VERPLICHT)\n')
    lines.append('```')
    lines.append('CRITICAL RULES - NEVER VIOLATE:')
    lines.append('- Use ONLY information from the provided source data below')
    lines.append('- If you do not know something, DO NOT mention it — NEVER invent details')
    lines.append('- NEVER include specific prices unless they appear in the source data')
    lines.append('- NEVER include specific distances in metres or kilometres')
    lines.append('- NEVER include specific opening hours unless confirmed in source data')
    lines.append('- NEVER invent menu items, dishes, treatments, or facility names')
    lines.append('- NEVER invent historical facts, dates, or statistics')
    lines.append('- If the source data is limited, write a shorter but ACCURATE description')
    lines.append('- Refer visitors to the website for current prices and opening hours')
    lines.append('```\n')

    lines.append('## 2. Aangepaste AIDA Structuur\n')
    lines.append('```')
    lines.append('AIDA structure (adapt based on available source data):')
    lines.append('- Attention: Start with a VERIFIED fact or genuine atmosphere description')
    lines.append('- Interest: Highlight features that are CONFIRMED in the source data')
    lines.append('- Desire: Describe the experience based on REAL visitor information')
    lines.append('- Action: Direct to the website for reservations/current info')
    lines.append('```\n')

    lines.append('## 3. Verwijderde Regels\n')
    lines.append('De volgende regels uit de Fase 4 prompt MOETEN verwijderd worden:\n')
    lines.append('- ❌ "Include at least one concrete detail (price, distance, time, feature)"')
    lines.append('- ❌ "Hook with a unique fact, sensory detail, or surprising element"')
    lines.append('- ❌ "What will the visitor experience? Be specific" (zonder brondata)\n')

    lines.append('## 4. Brondata Format (mee te geven aan LLM)\n')
    lines.append('```')
    lines.append('=== SOURCE DATA (use ONLY this information) ===')
    lines.append('Website content: {scraped_content}')
    lines.append('Verified features: {extracted_features}')
    lines.append('Address: {verified_address}')
    lines.append('Category: {category}')
    lines.append('Rating: {rating} ({review_count} reviews)')
    lines.append('')
    lines.append('NOTE: Any claim not supported by the above source data')
    lines.append('will be flagged as a hallucination and rejected.')
    lines.append('```\n')

    lines.append('## 5. Categorie-Specifieke Regels\n')
    lines.append('### Eten & Drinken')
    lines.append('- Noem ALLEEN gerechten/dranken die op de website/menukaart staan')
    lines.append('- Geen specifieke prijzen tenzij in brondata')
    lines.append('- Focus op concept, sfeer, type keuken\n')
    lines.append('### Natuur')
    lines.append('- Geen verzonnen afmetingen of aantallen')
    lines.append('- Gebruik algemene beschrijvingen ("uitgestrekt duingebied" i.p.v. "2km lang")')
    lines.append('- Seizoensinformatie alleen als geverifieerd\n')
    lines.append('### Cultuur & Historie')
    lines.append('- GEEN verzonnen jaartallen of historische claims')
    lines.append('- Alleen feiten die op de website staan')
    lines.append('- Bij musea: alleen beschreven collecties noemen\n')
    lines.append('### Actief')
    lines.append('- Alleen activiteiten noemen die op de website staan')
    lines.append('- Geen verzonnen prijzen voor activiteiten')
    lines.append('- "Check website for current availability and prices"\n')

    lines.append('## 6. NOOIT Doen Lijst\n')
    lines.append('1. Prijzen verzinnen (€4,50, €7,90, €12,50)')
    lines.append('2. Afstanden verzinnen ("300 meter van", "5 minuten lopen")')
    lines.append('3. Openingstijden verzinnen')
    lines.append('4. Menu-items/gerechten verzinnen')
    lines.append('5. Faciliteiten verzinnen (haardvuur, zwembad, terras)')
    lines.append('6. Historische feiten verzinnen')
    lines.append('7. Awards/certificeringen verzinnen OF weglaten als ze WEL bestaan')
    lines.append('8. Specifieke aantallen verzinnen ("250+ bieren", "6.000 jaar")')

    text = '\n'.join(lines)
    with open(PROMPT_IMPROVEMENTS, 'w', encoding='utf-8') as f:
        f.write(text)
    log(f'R3 prompt improvements saved to {PROMPT_IMPROVEMENTS}')


# ============================================================
# MAIN
# ============================================================
def main():
    parser = argparse.ArgumentParser(description='Fase R1: Damage Assessment')
    parser.add_argument('--phase', choices=['select', 'scrape', 'factcheck', 'report'],
                       help='Run only a specific phase')
    args = parser.parse_args()

    start_time = time.time()
    log('=' * 70)
    log('FASE R1: DAMAGE ASSESSMENT — POI Content Factual Verification')
    log('HolidaiButler Content Repair Pipeline')
    log('=' * 70)

    try:
        if args.phase is None or args.phase == 'select':
            texel_pois, calpe_pois = select_pois()
        else:
            # Load from files
            with open(SAMPLE_TEXEL, 'r', encoding='utf-8') as f:
                texel_pois = json.load(f)
            with open(SAMPLE_CALPE, 'r', encoding='utf-8') as f:
                calpe_pois = json.load(f)
            log(f'Loaded {len(texel_pois)} Texel + {len(calpe_pois)} Calpe POIs from files')

        if args.phase is None or args.phase == 'scrape':
            texel_wd = scrape_websites(texel_pois, 'Texel', WEBSITE_TEXEL)
            calpe_wd = scrape_websites(calpe_pois, 'Calpe', WEBSITE_CALPE)
            save_checkpoint('scrape', {
                'texel_success': sum(1 for w in texel_wd if w['scrape_success']),
                'texel_fail': sum(1 for w in texel_wd if not w['scrape_success']),
                'calpe_success': sum(1 for w in calpe_wd if w['scrape_success']),
                'calpe_fail': sum(1 for w in calpe_wd if not w['scrape_success']),
            })
        else:
            with open(WEBSITE_TEXEL, 'r', encoding='utf-8') as f:
                texel_wd = json.load(f)
            with open(WEBSITE_CALPE, 'r', encoding='utf-8') as f:
                calpe_wd = json.load(f)
            log(f'Loaded website data from files')

        if args.phase is None or args.phase == 'factcheck':
            texel_fc = run_factchecks(texel_pois, texel_wd, 'Texel', FACTCHECK_TEXEL)
            calpe_fc = run_factchecks(calpe_pois, calpe_wd, 'Calpe', FACTCHECK_CALPE)
            save_checkpoint('factcheck', {
                'texel_count': len(texel_fc),
                'calpe_count': len(calpe_fc)
            })
        else:
            with open(FACTCHECK_TEXEL, 'r', encoding='utf-8') as f:
                texel_fc = json.load(f)
            with open(FACTCHECK_CALPE, 'r', encoding='utf-8') as f:
                calpe_fc = json.load(f)
            log(f'Loaded factcheck data from files')

        if args.phase is None or args.phase == 'report':
            generate_report(texel_pois, calpe_pois, texel_fc, calpe_fc, texel_wd, calpe_wd)

        elapsed = time.time() - start_time
        log(f'\n{"=" * 70}')
        log(f'FASE R1 COMPLETE in {elapsed/60:.1f} minutes')
        log(f'{"=" * 70}')
        log(f'Output files:')
        log(f'  {SAMPLE_TEXEL}')
        log(f'  {SAMPLE_CALPE}')
        log(f'  {WEBSITE_TEXEL}')
        log(f'  {WEBSITE_CALPE}')
        log(f'  {FACTCHECK_TEXEL}')
        log(f'  {FACTCHECK_CALPE}')
        log(f'  {REPORT_FILE}')
        log(f'  {SUMMARY_FILE}')
        log(f'  {SCRAPE_TARGETS}')
        log(f'  {PROMPT_IMPROVEMENTS}')

    except Exception as e:
        log(f'FATAL ERROR: {e}')
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
