#!/usr/bin/env python3
"""
Fase R3: Prompt Redesign — Anti-Hallucination Content Generation Templates
===========================================================================
HolidaiButler Content Repair Pipeline

Based on:
- Fase R1 Damage Assessment: 61% hallucination rate, 716/1199 claims fabricated
- Fase R2 Source Data: 3,079 fact sheets with scraped website content
- R1 Root Cause: prompts demanded "concrete details" without providing source data
- R3 Anti-Hallucination Design: /root/fase_r3_prompt_improvements.md

Key changes from Fase 4 prompts:
1. REMOVED: "Include at least one concrete detail (price, distance, time, feature)"
2. REMOVED: "Hook with a unique fact, sensory detail, or surprising element"
3. REMOVED: "What will the visitor experience? Be specific"
4. ADDED: Full source data injection (website content + verified facts)
5. ADDED: Explicit anti-hallucination rules per error type
6. ADDED: Category-specific guardrails
7. ADDED: Second-pass verification prompt
8. ADDED: 4 quality-tier strategies (rich/moderate/minimal/none)

Usage:
    from fase_r3_prompt_templates import build_generation_prompt, build_verification_prompt

    system_msg, user_msg = build_generation_prompt(fact_sheet)
    verify_system, verify_user = build_verification_prompt(fact_sheet, generated_text)

Author: Claude Code (Fase R3)
Date: 13 februari 2026
"""

import json
import re

# =============================================================================
# CONSTANTS
# =============================================================================

# Word count targets per data quality level
WORD_TARGETS = {
    'rich':     {'min': 110, 'max': 140},   # Full AIDA, detailed
    'moderate': {'min': 85,  'max': 115},   # Partial AIDA, focused
    'minimal':  {'min': 55,  'max': 85},    # Short and safe
    'none':     {'min': 30,  'max': 60},    # Generic template
}

# Destination-specific location phrases
DESTINATION_CONFIG = {
    'Texel': {
        'preposition': 'on',           # "on Texel" (island)
        'geo_refs': 'the Wadden Sea, the North Sea, or specific Texel villages (Den Burg, De Koog, Oudeschild, Den Hoorn, De Cocksdorp, Oosterend)',
        'language_note': 'Use British English spelling (colour, centre, specialise).',
        'currency': 'EUR',
        'locale_context': 'a Dutch Wadden island known for its beaches, nature, and local produce',
    },
    'Calpe': {
        'preposition': 'in',           # "in Calpe"
        'geo_refs': 'the Peñón de Ifach, the Mediterranean Sea, the Costa Blanca, or the old town (casco antiguo)',
        'language_note': 'Use British English spelling (colour, centre, specialise). Use Spanish/Valencian terms where appropriate (tapas, chiringuito, paella, casco antiguo).',
        'currency': 'EUR',
        'locale_context': 'a coastal town on Spain\'s Costa Blanca known for the Peñón de Ifach, beaches, and Mediterranean cuisine',
    },
}

# =============================================================================
# ANTI-HALLUCINATION RULES (derived from R1 error analysis)
# =============================================================================

ANTI_HALLUCINATION_RULES = """
ANTI-HALLUCINATION RULES — ABSOLUTE, NON-NEGOTIABLE:

1. Use ONLY information that appears EXPLICITLY in the SOURCE DATA below. If something is not stated in the source data, DO NOT mention it — not even as an inference or reasonable assumption.
2. NEVER invent prices, costs, or fee amounts. Only mention prices if they appear VERBATIM in the source data.
3. NEVER invent distances (metres, kilometres, minutes walking). Do not estimate proximity to landmarks, the coast, or other features.
4. NEVER invent opening hours, days, or schedules. Only mention times if they appear VERBATIM in the source data.
5. NEVER invent specific menu items, dishes, or drinks unless they are EXPLICITLY listed in the source data. Do NOT infer products from the venue name or category (e.g., do NOT assume a bakery sells bread unless the source data says so).
6. NEVER invent facilities, amenities, or features (terraces, fireplaces, gardens, parking) unless EXPLICITLY stated in source data.
7. NEVER invent historical facts, founding years, or heritage claims unless documented in source data.
8. NEVER invent awards, ratings, certifications, or accolades (Michelin stars, TripAdvisor awards).
9. NEVER use embellishment adjectives that are not in the source data. Avoid: "unique", "modern", "cosy", "convenient", "charming", "inviting", "vibrant", "bustling", "stunning", "perfect", "renowned", "legendary", "delightful". Use NEUTRAL descriptive language instead.
10. NEVER invent sensory descriptions (aromas, sounds, atmosphere, textures) unless EXPLICITLY described in source data.
11. NEVER invent specific quantities (number of rooms, seats, wines, species) unless in source data.
12. NEVER infer what visitors "will experience" or "can expect" beyond what the source data explicitly states.
13. If the source data is limited, write a SHORTER description. A short accurate description is ALWAYS better than a longer fabricated one.
14. For current information (prices, hours, availability), direct the reader to the website or to contact the venue.
15. You may use the Google rating and review count as they are verified data.
16. You may state the venue category (restaurant, beach, museum, shop) as this is verified metadata.
""".strip()

# =============================================================================
# CATEGORY-SPECIFIC RULES (from R1 per-category error patterns)
# =============================================================================

CATEGORY_RULES = {
    # --- Texel categories (Dutch) ---
    'Eten & Drinken': """CATEGORY RULES — Eten & Drinken (Food & Drinks):
- NEVER invent specific dishes, menu items, or drinks. Only mention items listed in source data.
- NEVER invent price ranges for meals or drinks.
- NEVER claim a restaurant is "the only" or "the best" unless source data confirms this.
- You may mention the cuisine TYPE (Dutch, Mediterranean, seafood) if evident from name, category, or source data.
- Direct readers to the menu or website for current offerings and prices.""",

    'Food & Drinks': """CATEGORY RULES — Food & Drinks:
- NEVER invent specific dishes, menu items, or drinks. Only mention items listed in source data.
- NEVER invent price ranges for meals or drinks.
- NEVER claim a restaurant is "the only" or "the best" unless source data confirms this.
- You may mention the cuisine TYPE (Spanish, Mediterranean, tapas) if evident from name, category, or source data.
- Direct readers to the menu or website for current offerings and prices.""",

    'Natuur': """CATEGORY RULES — Natuur (Nature):
- NEVER invent specific wildlife species, plant names, or observation statistics.
- NEVER invent trail lengths, walking times, or distances.
- You may use general nature descriptions (dunes, beaches, forests, mudflats) if consistent with Texel geography.
- For nature reserves: mention access rules only if in source data.""",

    'Beaches & Nature': """CATEGORY RULES — Beaches & Nature:
- NEVER invent specific beach lengths, water temperatures, or wildlife counts.
- NEVER invent distances to the beach or walking times.
- You may use general geographical descriptions consistent with Calpe/Costa Blanca geography.
- For nature areas: mention access rules only if in source data.""",

    'Cultuur & Historie': """CATEGORY RULES — Cultuur & Historie (Culture & History):
- NEVER invent founding dates, historical events, or heritage claims.
- NEVER invent exhibition details, collection sizes, or artist names unless in source data.
- NEVER invent entry fees or opening hours.
- You may reference Texel's general maritime/agricultural heritage if contextually appropriate.""",

    'Culture & History': """CATEGORY RULES — Culture & History:
- NEVER invent founding dates, historical events, or heritage claims.
- NEVER invent exhibition details, collection sizes, or artist names unless in source data.
- NEVER invent entry fees or opening hours.
- You may reference Calpe's Moorish/Roman/fishing heritage if contextually appropriate.""",

    'Winkelen': """CATEGORY RULES — Winkelen (Shopping):
- NEVER invent specific products, brands, or price ranges.
- NEVER invent store layouts or atmosphere details.
- You may mention the GENERAL type of shop (souvenir, clothing, local produce) from category/name context.""",

    'Shopping': """CATEGORY RULES — Shopping:
- NEVER invent specific products, brands, or price ranges.
- NEVER invent store layouts or atmosphere details.
- You may mention the GENERAL type of shop if evident from the name or category.""",

    'Recreatief': """CATEGORY RULES — Recreatief (Recreation):
- NEVER invent specific activities, equipment details, or session durations.
- NEVER invent prices for activities or rentals.
- You may mention the general TYPE of recreation from the category/name.""",

    'Recreation': """CATEGORY RULES — Recreation:
- NEVER invent specific activities, equipment details, or session durations.
- NEVER invent prices for activities or rentals.
- You may mention the general TYPE of recreation from the category/name.""",

    'Actief': """CATEGORY RULES — Actief (Active):
- NEVER invent route lengths, difficulty levels, or duration estimates.
- NEVER invent equipment specifications or group sizes.
- NEVER invent prices for tours, lessons, or rentals.
- You may describe the general NATURE of the activity from category/name context.""",

    'Active': """CATEGORY RULES — Active:
- NEVER invent route lengths, difficulty levels, or duration estimates.
- NEVER invent equipment specifications or group sizes.
- NEVER invent prices for tours, lessons, or rentals.
- You may describe the general NATURE of the activity from category/name context.""",

    'Gezondheid & Verzorging': """CATEGORY RULES — Gezondheid & Verzorging (Health & Wellness):
- NEVER invent specific treatments, services, or their prices.
- NEVER invent qualifications or certifications of practitioners.
- You may mention the general TYPE of service (wellness, beauty, healthcare) from category/name.""",

    'Health & Wellness': """CATEGORY RULES — Health & Wellness:
- NEVER invent specific treatments, services, or their prices.
- NEVER invent qualifications or certifications of practitioners.
- You may mention the general TYPE of service from category/name.""",

    'Praktisch': """CATEGORY RULES — Praktisch (Practical):
- NEVER invent specific services, prices, or availability.
- Focus on factual, practical information from source data.
- Direct readers to the website or phone number for current details.""",

    'Practical': """CATEGORY RULES — Practical:
- NEVER invent specific services, prices, or availability.
- Focus on factual, practical information from source data.
- Direct readers to the website or phone number for current details.""",
}

# Default for categories not in the mapping
DEFAULT_CATEGORY_RULES = """CATEGORY RULES:
- NEVER invent specific details about products, services, or features not in source data.
- You may describe the general nature of this venue from the category and name context.
- Direct readers to the website for current details."""


# =============================================================================
# SYSTEM PROMPT BUILDER
# =============================================================================

def get_system_prompt(destination: str, data_quality: str) -> str:
    """Build the system prompt based on destination and data quality level."""

    config = DESTINATION_CONFIG.get(destination, DESTINATION_CONFIG['Calpe'])
    targets = WORD_TARGETS.get(data_quality, WORD_TARGETS['minimal'])

    # AIDA structure varies by data quality
    if data_quality == 'rich':
        structure_rules = """WRITING STRUCTURE (AIDA — full):
- Attention (1-2 sentences): Open with a factual detail FROM THE SOURCE DATA that makes this place interesting.
- Interest (1-2 sentences): What makes this place special? Use ONLY details from source data.
- Desire (1-2 sentences): What can the visitor expect? Ground this in source data facts.
- Action (1 sentence): Practical call-to-action. Refer to website/contact for current details."""
    elif data_quality == 'moderate':
        structure_rules = """WRITING STRUCTURE (AIDA — condensed):
- Attention (1 sentence): Open with a factual detail FROM THE SOURCE DATA.
- Interest (1-2 sentences): What makes this place worth visiting? Use ONLY source data.
- Action (1 sentence): Direct the reader to the website or contact for more information."""
    elif data_quality == 'minimal':
        structure_rules = """WRITING STRUCTURE (brief factual — STRICT):
- Opening (1 sentence): Introduce the venue using its name, category, and location.
- Description (1-2 sentences): Use ONLY whatever source data is available. If the data is thin, keep the description thin. Do NOT pad with assumptions or inferences.
- Action (1 sentence): Direct the reader to the website or contact for details.
- Do NOT add embellishment, atmosphere descriptions, or inferred offerings."""
    else:  # 'none'
        structure_rules = """WRITING STRUCTURE (generic safe — MAXIMUM CAUTION):
- Write ONLY: "[Name] is a [category] {preposition} [destination], located at [address if known]."
- Add ONE sentence directing the reader to visit or contact the venue for details.
- Do NOT describe what the venue offers, its atmosphere, its products, or what visitors can expect.
- Do NOT infer ANYTHING from the venue name (e.g., a bakery might not sell bread — you don't know).
- The ENTIRE description should be 2-3 sentences maximum.""".format(preposition=config['preposition'])

    system_prompt = f"""You are a professional tourism copywriter for {destination}, {config['locale_context']}.
You write accurate, engaging descriptions for Points of Interest based EXCLUSIVELY on provided source data.

WORD COUNT: Write EXACTLY {targets['min']}-{targets['max']} words. Count carefully.

OUTPUT FORMAT:
- Output ONLY plain text. NO markdown, NO square brackets, NO hyperlinks, NO bullet points, NO numbered lists, NO special formatting.
- Start with a NATURAL opening — NEVER use: 'Tucked away', 'Nestled in', 'Located in', 'Situated in', 'Set in', 'Found in', 'Discover', 'Welcome to'.
- Mention the POI name naturally in the first sentence.

{structure_rules}

LANGUAGE:
- {config['language_note']}
- Use '{config['preposition']} {destination}' (correct preposition for this destination).
- Reference {config['geo_refs']} where geographically relevant — but only if the source data supports it.

{ANTI_HALLUCINATION_RULES}

CRITICAL REMINDER: Every factual claim in your description MUST come DIRECTLY from the source data below. Do NOT:
- Add adjectives not in the source (cosy, unique, modern, vibrant, charming, stunning)
- Infer products/services from the venue name or category
- Describe what visitors "will experience" unless the source data says so
- Mention proximity to landmarks, the coast, or other features unless the source data explicitly states this
If the source data is thin, write a SHORTER description. Accuracy over length. ALWAYS."""

    return system_prompt


# =============================================================================
# USER PROMPT BUILDER
# =============================================================================

def get_category_rules(category: str) -> str:
    """Get category-specific anti-hallucination rules."""
    if category in CATEGORY_RULES:
        return CATEGORY_RULES[category]
    # Try case-insensitive match
    for key, rules in CATEGORY_RULES.items():
        if key.lower() == category.lower():
            return rules
    return DEFAULT_CATEGORY_RULES


def format_verified_facts(verified_facts: dict) -> str:
    """Format verified facts into readable text for the prompt."""
    if not verified_facts:
        return ""

    parts = []

    if verified_facts.get('address'):
        parts.append(f"Address: {verified_facts['address']}")

    if verified_facts.get('phone'):
        parts.append(f"Phone: {verified_facts['phone']}")

    if verified_facts.get('email'):
        parts.append(f"Email: {verified_facts['email']}")

    if verified_facts.get('opening_hours'):
        hours = verified_facts['opening_hours']
        if isinstance(hours, str):
            parts.append(f"Opening hours: {hours}")
        elif isinstance(hours, list):
            hours_str = '; '.join(str(h) for h in hours[:7])
            parts.append(f"Opening hours: {hours_str}")

    if verified_facts.get('prices') and len(verified_facts['prices']) > 0:
        prices_str = '; '.join(str(p) for p in verified_facts['prices'][:10])
        parts.append(f"Prices: {prices_str}")

    if verified_facts.get('features') and len(verified_facts['features']) > 0:
        features_str = ', '.join(str(f) for f in verified_facts['features'][:15])
        parts.append(f"Features/Services: {features_str}")

    if verified_facts.get('social_media') and len(verified_facts['social_media']) > 0:
        social_str = ', '.join(str(s) for s in verified_facts['social_media'][:5])
        parts.append(f"Social media: {social_str}")

    return '\n'.join(parts)


def build_user_prompt(fact_sheet: dict) -> str:
    """Build the user prompt with source data injection."""

    poi_name = fact_sheet.get('name', 'Unknown')
    category = fact_sheet.get('category', 'N/A')
    subcategory = fact_sheet.get('subcategory', 'N/A')
    destination = fact_sheet.get('destination', 'Unknown')
    city = fact_sheet.get('city', '')
    data_quality = fact_sheet.get('data_quality', 'none')
    rating = fact_sheet.get('rating')
    review_count = fact_sheet.get('review_count', 0)
    website = fact_sheet.get('website', '')
    source_text = fact_sheet.get('source_text_for_llm', '')
    verified_facts = fact_sheet.get('verified_facts', {})
    highlights = fact_sheet.get('highlights', '')

    # Format rating
    rating_str = f"{float(rating):.1f}/5 ({int(review_count)} reviews)" if rating else "N/A"

    # Get category-specific rules
    cat_rules = get_category_rules(category)

    # Build source data section based on quality
    source_section = _build_source_section(fact_sheet)

    # Data quality guidance
    quality_guidance = _get_quality_guidance(data_quality)

    targets = WORD_TARGETS.get(data_quality, WORD_TARGETS['minimal'])

    prompt = f"""Write a tourism description for this Point of Interest.

=== POI INFORMATION ===
POI Name: {poi_name}
Category: {category}
Subcategory: {subcategory}
Location: {city}, {destination}
Google Rating: {rating_str}
Website: {website if website else 'Not available'}

=== SOURCE DATA (use ONLY this information) ===
{source_section}

=== VERIFIED FACTS ===
{format_verified_facts(verified_facts) if verified_facts else 'No verified facts available.'}

{cat_rules}

{quality_guidance}

FINAL REMINDER: Write EXACTLY {targets['min']}-{targets['max']} words. Use ONLY facts from the source data above. If something is not in the source data, DO NOT include it. Accuracy is more important than engagement."""

    return prompt


def _build_source_section(fact_sheet: dict) -> str:
    """Build the source data section from the fact sheet."""

    source_text = fact_sheet.get('source_text_for_llm', '')
    data_quality = fact_sheet.get('data_quality', 'none')

    if data_quality == 'none' or not source_text.strip():
        return """NO SOURCE DATA AVAILABLE.
You have NO website content, NO scraped data, and NO detailed information about this venue.
Write ONLY a generic description based on the POI name, category, and location above.
Do NOT attempt to describe specific offerings, atmosphere, menu items, or experiences."""

    # Truncate very long source text to avoid token waste
    # Rich POIs can have 3000+ words of scraped content — keep the most relevant parts
    if len(source_text) > 6000:
        # Keep first 5500 chars (main content) + note about truncation
        source_text = source_text[:5500] + "\n\n[Source data truncated for length — use the information above]"

    return source_text


def _get_quality_guidance(data_quality: str) -> str:
    """Get quality-level-specific writing guidance."""

    if data_quality == 'rich':
        return """DATA QUALITY: RICH — You have substantial source data.
- Use the source data to write a detailed AIDA description.
- You may include specific details (services, features, specialties) ONLY if they appear EXPLICITLY in the source data.
- Mention prices, hours, or facilities ONLY if they appear VERBATIM in the source data.
- Do NOT paraphrase source data too liberally — stay close to what is actually stated.
- Do NOT add embellishment adjectives not present in source data.
- For anything not explicitly stated in the source data, direct readers to the website."""

    elif data_quality == 'moderate':
        return """DATA QUALITY: MODERATE — You have some source data but it is limited.
- Write a focused description using available facts. Do not pad with invented details.
- If the source data mentions specific services or features, you may include those.
- Keep claims conservative — only state what the source data supports.
- Direct readers to the website for complete information."""

    elif data_quality == 'minimal':
        return """DATA QUALITY: MINIMAL — Very little source data is available.
- Write a SHORT, factual description. Do NOT flesh it out with assumed or inferred details.
- Use ONLY the POI name, category, location, Google rating, and whatever minimal source data exists.
- Do NOT infer what the venue offers from its name or category. A "restaurant" could serve anything — do not guess.
- Do NOT add atmosphere descriptions, embellishments, or "what to expect" claims.
- It is PREFERRED to write a brief 65-85 word description rather than fabricate details.
- Direct readers to the website or venue for all specific information."""

    else:  # 'none'
        return """DATA QUALITY: NONE — No source data available at all.
- Write ONLY a very brief factual description (40-60 words, 2-3 sentences).
- Sentence 1: "[Name] is a [category type] {preposition} [destination]." Add address if available.
- Sentence 2: Mention Google rating if available.
- Sentence 3: "For details about [offerings/services/hours], visitors can contact the venue directly."
- Do NOT describe products, services, menus, atmosphere, experiences, or proximity to landmarks.
- Do NOT infer ANYTHING from the venue name or category type.
- A factual 40-word description is infinitely better than a fabricated 60-word one."""


# =============================================================================
# MAIN GENERATION PROMPT BUILDER
# =============================================================================

def build_generation_prompt(fact_sheet: dict) -> tuple:
    """
    Build the complete generation prompt (system + user) for a POI.

    Args:
        fact_sheet: Dict from fase_r2_fact_sheets.json

    Returns:
        (system_prompt: str, user_prompt: str)
    """
    destination = fact_sheet.get('destination', 'Calpe')
    data_quality = fact_sheet.get('data_quality', 'none')

    system_prompt = get_system_prompt(destination, data_quality)
    user_prompt = build_user_prompt(fact_sheet)

    return system_prompt, user_prompt


# =============================================================================
# VERIFICATION PROMPT (Second-pass fact-check for R4)
# =============================================================================

VERIFICATION_SYSTEM_PROMPT = """You are a rigorous fact-checker for tourism content. Your job is to compare a generated POI description against the provided source data and identify any claims that are NOT supported by the source data.

You must be STRICT but FAIR.

CLASSIFICATION RULES:
- VERIFIED: The claim appears in the source data — either verbatim or as a faithful translation/paraphrase.
- TRANSLATED_OK: The claim is a faithful English translation of Dutch or Spanish source text. Since source data is often in Dutch or Spanish and the output is in English, accurate translations count as VERIFIED, not UNSUPPORTED. Example: source says "gezellig verfijnd" → output says "refined atmosphere" = TRANSLATED_OK (verified).
- UNSUPPORTED: The claim adds NEW information not present in ANY form in the source data. This includes:
  - Specific prices, distances, times not in source data
  - Specific menu items, products, services not in source data
  - Historical claims, awards, or superlatives not in source data
  - Sensory descriptions (aromas, sounds, atmosphere) not described in source data
  - Facilities or amenities not mentioned in source data
  - Embellishment adjectives (unique, stunning, charming) not in source data
  - Claims about what visitors "will experience" that go beyond source data
- GENERAL_OK: The claim is a reasonable general statement that doesn't require source data:
  - Mentioning the category type ("restaurant", "beach", "museum", "bakery", "parking") — this is verified metadata
  - Using the Google rating/review count (this IS verified data)
  - Mentioning the city/destination location
  - General call-to-action ("visit the website", "contact for details")
  - Inferring category from the POI name in a foreign language ("Panadería" = bakery, "Parkeerplaats" = parking) — this is GENERAL_OK, not unsupported
  - General geographic facts about the destination that are widely known

IMPORTANT: The source data is often in Dutch or Spanish. A claim in the English output that faithfully translates the source data should be classified as VERIFIED or TRANSLATED_OK, NOT as UNSUPPORTED.

OUTPUT FORMAT (JSON):
{
    "total_claims": <number>,
    "verified": <number>,
    "translated_ok": <number>,
    "unsupported": <number>,
    "general_ok": <number>,
    "unsupported_claims": [
        {"claim": "exact quote from description", "reason": "why this is not in source data", "severity": "HIGH|MEDIUM|LOW"}
    ],
    "hallucination_rate": <float 0.0-1.0 based on unsupported/total_claims>,
    "verdict": "PASS" | "REVIEW" | "FAIL",
    "suggested_fix": "brief suggestion if REVIEW/FAIL"
}

SEVERITY LEVELS for unsupported claims:
- HIGH: Invented prices, distances, specific products/services, historical facts, awards
- MEDIUM: Embellishment adjectives, inferred experiences, atmosphere not in source
- LOW: Minor paraphrase liberties, slight geographic assumptions

VERDICT THRESHOLDS:
- PASS: hallucination_rate = 0.0 (zero unsupported claims)
- REVIEW: hallucination_rate > 0.0 and <= 0.20 (minor unsupported claims, no HIGH severity)
- FAIL: hallucination_rate > 0.20 OR any HIGH severity unsupported claim

Be thorough but fair. Count each distinct factual claim separately. Remember: faithful translations are VERIFIED."""


def build_verification_prompt(fact_sheet: dict, generated_text: str) -> tuple:
    """
    Build the verification prompt for second-pass fact-checking.

    Args:
        fact_sheet: Dict from fase_r2_fact_sheets.json
        generated_text: The LLM-generated description to verify

    Returns:
        (system_prompt: str, user_prompt: str)
    """
    source_text = fact_sheet.get('source_text_for_llm', '')
    verified_facts = fact_sheet.get('verified_facts', {})
    poi_name = fact_sheet.get('name', 'Unknown')
    category = fact_sheet.get('category', 'N/A')
    destination = fact_sheet.get('destination', 'Unknown')
    rating = fact_sheet.get('rating')
    review_count = fact_sheet.get('review_count', 0)
    highlights = fact_sheet.get('highlights', '')

    # Truncate source text for verification (same as generation)
    if len(source_text) > 6000:
        source_text = source_text[:5500] + "\n\n[Source data truncated]"

    rating_str = f"{float(rating):.1f}/5 ({int(review_count)} reviews)" if rating else "N/A"

    user_prompt = f"""Fact-check the following generated tourism description against the source data.

=== GENERATED DESCRIPTION (to verify) ===
{generated_text}

=== POI CONTEXT ===
POI Name: {poi_name}
Category: {category}
Destination: {destination}
Google Rating: {rating_str}

=== SOURCE DATA (ground truth) ===
{source_text if source_text.strip() else 'NO SOURCE DATA AVAILABLE — any specific claim should be marked UNSUPPORTED.'}

=== VERIFIED FACTS ===
{format_verified_facts(verified_facts) if verified_facts else 'No verified facts.'}

=== HIGHLIGHTS (from Google/DB) ===
{highlights if highlights else 'None available.'}

Now analyze EVERY factual claim in the generated description. Output JSON only."""

    return VERIFICATION_SYSTEM_PROMPT, user_prompt


# =============================================================================
# UTILITY: PROMPT STATISTICS
# =============================================================================

def get_prompt_stats(fact_sheets: list) -> dict:
    """
    Calculate prompt statistics for a batch of fact sheets.

    Returns dict with counts per quality level and estimated token usage.
    """
    from collections import Counter

    quality_counts = Counter(fs.get('data_quality', 'none') for fs in fact_sheets)
    dest_counts = Counter(fs.get('destination', 'Unknown') for fs in fact_sheets)

    # Estimate tokens (rough: 1 token ≈ 4 chars)
    total_source_chars = sum(len(fs.get('source_text_for_llm', '')) for fs in fact_sheets)
    avg_source_chars = total_source_chars / len(fact_sheets) if fact_sheets else 0

    # System prompt ~800 tokens, user prompt overhead ~200 tokens, source data varies
    est_input_tokens = sum(
        800 + 200 + min(len(fs.get('source_text_for_llm', '')), 6000) // 4
        for fs in fact_sheets
    )

    # Output tokens: ~max word count * 1.3 tokens/word
    est_output_tokens = sum(
        WORD_TARGETS.get(fs.get('data_quality', 'none'), WORD_TARGETS['none'])['max'] * 1.3
        for fs in fact_sheets
    )

    # Verification pass: ~same input + ~200 output per POI
    est_verify_input = est_input_tokens + len(fact_sheets) * 200  # + generated text
    est_verify_output = len(fact_sheets) * 200  # JSON output

    return {
        'total_pois': len(fact_sheets),
        'quality_distribution': dict(quality_counts),
        'destination_distribution': dict(dest_counts),
        'avg_source_chars': int(avg_source_chars),
        'estimated_generation': {
            'input_tokens': int(est_input_tokens),
            'output_tokens': int(est_output_tokens),
            'total_tokens': int(est_input_tokens + est_output_tokens),
        },
        'estimated_verification': {
            'input_tokens': int(est_verify_input),
            'output_tokens': int(est_verify_output),
            'total_tokens': int(est_verify_input + est_verify_output),
        },
        'estimated_total_tokens': int(est_input_tokens + est_output_tokens + est_verify_input + est_verify_output),
    }


# =============================================================================
# TEST / DEMO
# =============================================================================

def demo_prompts():
    """Print example prompts for each data quality level."""

    # Example fact sheets (minimal mock data for demonstration)
    examples = {
        'rich': {
            'poi_id': 2353,
            'name': 'Restaurant De Texelaar',
            'category': 'Eten & Drinken',
            'subcategory': 'Restaurant',
            'destination_id': 2,
            'destination': 'Texel',
            'rating': 4.6,
            'review_count': 312,
            'city': 'Den Burg',
            'website': 'https://www.detexelaar.nl',
            'data_sources': ['website_scrape', 'google_places', 'highlights'],
            'data_quality': 'rich',
            'source_text_for_llm': 'WEBSITE CONTENT:\nRestaurant De Texelaar is gevestigd in het hart van Den Burg op Texel. Ons restaurant serveert verse vis direct van de Texelse vloot, lokaal lamsvlees van de Texelse schapenboerderij, en seizoensgebonden groenten uit onze eigen moestuin. Onze chef-kok werkt uitsluitend met lokale producten. Reserveren aanbevolen, vooral in het hoogseizoen. Wij zijn geopend van woensdag tot en met zondag, van 17:00 tot 22:00. Op maandag en dinsdag zijn wij gesloten.\n\nGOOGLE PLACES DESCRIPTION:\nTraditional Dutch restaurant serving fresh local Texel produce in Den Burg.\n\nVERIFIED FACTS:\nAddress: Weverstraat 12, 1791 AX Den Burg, Texel\nPhone: 0222-312456\nOpening hours: woensdag-zondag 17:00-22:00',
            'verified_facts': {
                'address': 'Weverstraat 12, 1791 AX Den Burg, Texel',
                'phone': '0222-312456',
                'opening_hours': 'woensdag-zondag 17:00-22:00',
                'prices': [],
                'features': ['verse vis', 'lokaal lamsvlees', 'eigen moestuin', 'seizoensgebonden'],
                'email': None,
                'social_media': [],
            },
            'highlights': 'Verse vis | Lokaal lamsvlees | Eigen moestuin | Reserveren aanbevolen',
        },
        'moderate': {
            'poi_id': 1500,
            'name': 'Boutique Mar Azul',
            'category': 'Shopping',
            'subcategory': 'Clothing',
            'destination_id': 1,
            'destination': 'Calpe',
            'rating': 4.2,
            'review_count': 45,
            'city': 'Calpe',
            'website': 'https://www.marazul-calpe.com',
            'data_sources': ['website_scrape', 'google_places'],
            'data_quality': 'moderate',
            'source_text_for_llm': 'WEBSITE CONTENT:\nBoutique Mar Azul offers a curated selection of Mediterranean fashion and accessories. Located on Avenida Gabriel Miró in the heart of Calpe.\n\nGOOGLE PLACES DESCRIPTION:\nFashion boutique in Calpe town centre.\n\nVERIFIED FACTS:\nAddress: Avenida Gabriel Miró 34, 03710 Calpe',
            'verified_facts': {
                'address': 'Avenida Gabriel Miró 34, 03710 Calpe',
                'phone': None,
                'opening_hours': None,
                'prices': [],
                'features': ['Mediterranean fashion', 'accessories'],
                'email': None,
                'social_media': [],
            },
            'highlights': None,
        },
        'minimal': {
            'poi_id': 800,
            'name': 'Fietsverhuur Texel Sport',
            'category': 'Actief',
            'subcategory': 'Fietsverhuur',
            'destination_id': 2,
            'destination': 'Texel',
            'rating': 4.0,
            'review_count': 89,
            'city': 'De Koog',
            'website': 'https://www.texelsport.nl',
            'data_sources': ['highlights'],
            'data_quality': 'minimal',
            'source_text_for_llm': 'VERIFIED FACTS:\nAddress: Dorpsstraat 80, De Koog, Texel',
            'verified_facts': {
                'address': 'Dorpsstraat 80, De Koog, Texel',
                'phone': None,
                'opening_hours': None,
                'prices': [],
                'features': [],
                'email': None,
                'social_media': [],
            },
            'highlights': 'Fietsverhuur | E-bikes',
        },
        'none': {
            'poi_id': 971,
            'name': 'V de Beauty Centro de Estética',
            'category': 'Health & Wellness',
            'subcategory': 'Beauty Salon',
            'destination_id': 1,
            'destination': 'Calpe',
            'rating': 4.8,
            'review_count': 23,
            'city': 'Calpe',
            'website': None,
            'data_sources': [],
            'data_quality': 'none',
            'source_text_for_llm': 'VERIFIED FACTS:\nAddress: Carrer Malaga, 4, local 6, 03710 Calp, Alicante, Spain',
            'verified_facts': {
                'address': 'Carrer Malaga, 4, local 6, 03710 Calp, Alicante, Spain',
                'phone': None,
                'opening_hours': None,
                'prices': [],
                'features': [],
                'email': None,
                'social_media': [],
            },
            'highlights': None,
        },
    }

    for quality, fs in examples.items():
        print(f"\n{'='*80}")
        print(f"DATA QUALITY: {quality.upper()}")
        print(f"POI: {fs['name']} ({fs['destination']})")
        print(f"{'='*80}")

        system_prompt, user_prompt = build_generation_prompt(fs)

        print(f"\n--- SYSTEM PROMPT ({len(system_prompt)} chars) ---")
        print(system_prompt)
        print(f"\n--- USER PROMPT ({len(user_prompt)} chars) ---")
        print(user_prompt)

        # Also show verification prompt
        mock_generated = f"This is a mock generated description for {fs['name']}."
        verify_system, verify_user = build_verification_prompt(fs, mock_generated)
        print(f"\n--- VERIFICATION USER PROMPT ({len(verify_user)} chars) ---")
        print(verify_user[:500] + "..." if len(verify_user) > 500 else verify_user)
        print()


if __name__ == '__main__':
    demo_prompts()
