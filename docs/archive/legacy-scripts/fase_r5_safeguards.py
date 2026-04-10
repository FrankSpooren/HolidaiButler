#!/usr/bin/env python3
"""
Fase R5: Content Safeguards Module
HolidaiButler Content Repair Pipeline

Permanent content validation rules enforced before any content goes live.
Imported by fase_r5_promote_staging.py and fase_r5_monitoring.py.
"""

import json
import re

# === CONFIGURATION ===

# Word count targets per quality tier (from R3)
WORD_TARGETS = {
    'rich':     {'min': 110, 'max': 140},
    'moderate': {'min': 85,  'max': 115},
    'minimal':  {'min': 55,  'max': 85},
    'none':     {'min': 30,  'max': 60},
}

# Known destinations (extend when adding new ones)
KNOWN_DESTINATIONS = {1: 'Calpe', 2: 'Texel'}

# Hallucination thresholds
MAX_HALLUCINATION_RATE = 0.20       # Block if above this
MAX_HALLUCINATION_RATE_NONE = 0.30  # Slightly more lenient for 'none' quality

# Embellishment blocklist (from R3 rule 9)
EMBELLISHMENT_BLOCKLIST = [
    'unique', 'modern', 'cosy', 'cozy', 'convenient', 'charming',
    'inviting', 'vibrant', 'delightful', 'exceptional', 'exquisite',
    'stunning', 'breathtaking', 'magnificent', 'spectacular',
    'world-class', 'must-visit', 'hidden gem', 'best-kept secret',
    'unforgettable', 'unparalleled', 'state-of-the-art',
    'award-winning', 'renowned', 'prestigious', 'iconic',
]


def validate_content(poi_id, new_content, llm_context_json, destination_id=None):
    """
    Validate content against safeguard rules before promotion to production.

    Args:
        poi_id: int - POI database ID
        new_content: str - The generated description text
        llm_context_json: dict or str - Verification metadata from R4
        destination_id: int - Destination ID (1=Calpe, 2=Texel)

    Returns:
        dict: {
            'approved': bool,
            'reasons': list[str],    # Blocking reasons (if not approved)
            'warnings': list[str],   # Non-blocking warnings
        }
    """
    reasons = []
    warnings = []

    # Parse llm_context if string
    if isinstance(llm_context_json, str):
        try:
            llm_context_json = json.loads(llm_context_json)
        except (json.JSONDecodeError, TypeError):
            llm_context_json = {}

    if not llm_context_json:
        llm_context_json = {}

    data_quality = llm_context_json.get('data_quality', 'none')
    hallucination_rate = llm_context_json.get('hallucination_rate', 1.0)
    verdict = llm_context_json.get('verification_verdict', 'FAIL')
    unsupported_claims = llm_context_json.get('unsupported_claims', [])
    word_count = llm_context_json.get('word_count', 0)

    # If hallucination_rate is a percentage (>1), convert to fraction
    if hallucination_rate > 1:
        hallucination_rate = hallucination_rate / 100.0

    # === RULE 1: HIGH severity claim blocker ===
    high_severity_claims = [c for c in unsupported_claims
                           if isinstance(c, dict) and c.get('severity') == 'HIGH']
    if high_severity_claims:
        reasons.append(f"BLOCKED: {len(high_severity_claims)} HIGH severity unsupported claim(s)")

    # === RULE 2: Hallucination rate threshold ===
    threshold = MAX_HALLUCINATION_RATE_NONE if data_quality == 'none' else MAX_HALLUCINATION_RATE
    if hallucination_rate > threshold:
        reasons.append(f"BLOCKED: Hallucination rate {hallucination_rate:.0%} exceeds {threshold:.0%} threshold")

    # === RULE 3: Word count validation ===
    if new_content:
        actual_words = len(new_content.split())
        targets = WORD_TARGETS.get(data_quality, WORD_TARGETS['none'])
        # Allow 20% tolerance
        min_words = int(targets['min'] * 0.8)
        max_words = int(targets['max'] * 1.2)
        if actual_words < min_words:
            warnings.append(f"Word count {actual_words} below minimum {min_words} for {data_quality} quality")
        elif actual_words > max_words:
            warnings.append(f"Word count {actual_words} above maximum {max_words} for {data_quality} quality")
    else:
        reasons.append("BLOCKED: Empty content")

    # === RULE 4: Embellishment keyword check ===
    if new_content:
        content_lower = new_content.lower()
        found_embellishments = [word for word in EMBELLISHMENT_BLOCKLIST
                               if word in content_lower]
        if found_embellishments:
            warnings.append(f"Embellishment words found: {', '.join(found_embellishments[:5])}")

    # === RULE 5: New destination enforcer ===
    if destination_id and destination_id not in KNOWN_DESTINATIONS:
        reasons.append(f"BLOCKED: Unknown destination {destination_id} — requires mandatory manual review")

    # === RULE 6: Brondata coverage for 'none' quality ===
    if data_quality == 'none' and hallucination_rate > MAX_HALLUCINATION_RATE:
        # Already blocked by rule 2, but add specific reason
        if not any('Hallucination rate' in r for r in reasons):
            reasons.append(f"BLOCKED: No source data and hallucination rate {hallucination_rate:.0%}")

    approved = len(reasons) == 0

    return {
        'approved': approved,
        'reasons': reasons,
        'warnings': warnings,
    }


def validate_batch(staging_rows):
    """
    Validate a batch of staging rows.

    Args:
        staging_rows: list of dicts with keys: poi_id, detail_description_en,
                      llm_context_json, destination_id

    Returns:
        dict: {
            'total': int,
            'approved': int,
            'blocked': int,
            'warnings': int,
            'blocked_details': list[dict],
        }
    """
    total = len(staging_rows)
    approved_count = 0
    blocked_count = 0
    warning_count = 0
    blocked_details = []

    for row in staging_rows:
        result = validate_content(
            poi_id=row.get('poi_id'),
            new_content=row.get('detail_description_en', ''),
            llm_context_json=row.get('llm_context_json', '{}'),
            destination_id=row.get('destination_id'),
        )

        if result['approved']:
            approved_count += 1
            if result['warnings']:
                warning_count += 1
        else:
            blocked_count += 1
            blocked_details.append({
                'poi_id': row.get('poi_id'),
                'poi_name': row.get('poi_name', ''),
                'reasons': result['reasons'],
                'warnings': result['warnings'],
            })

    return {
        'total': total,
        'approved': approved_count,
        'blocked': blocked_count,
        'warnings': warning_count,
        'blocked_details': blocked_details,
    }


if __name__ == '__main__':
    # Self-test
    print("=== Fase R5 Safeguards — Self-Test ===\n")

    # Test 1: Clean content should pass
    result = validate_content(
        poi_id=1,
        new_content="This is a restaurant in Den Burg on Texel that serves Dutch pancakes. Open daily from 10:00 to 17:00.",
        llm_context_json={
            'data_quality': 'rich',
            'hallucination_rate': 0.10,
            'verification_verdict': 'REVIEW',
            'unsupported_claims': [],
            'word_count': 18,
        },
        destination_id=2,
    )
    assert result['approved'], f"Test 1 failed: {result}"
    print("Test 1 PASS: Clean rich content approved")

    # Test 2: HIGH severity should block
    result = validate_content(
        poi_id=2,
        new_content="Award-winning restaurant with Michelin stars.",
        llm_context_json={
            'data_quality': 'minimal',
            'hallucination_rate': 0.40,
            'verification_verdict': 'FAIL',
            'unsupported_claims': [{'claim': 'Michelin stars', 'severity': 'HIGH', 'reason': 'No source'}],
            'word_count': 7,
        },
        destination_id=1,
    )
    assert not result['approved'], f"Test 2 failed: {result}"
    print(f"Test 2 PASS: HIGH severity blocked — {result['reasons']}")

    # Test 3: Unknown destination should block
    result = validate_content(
        poi_id=3,
        new_content="A nice place to visit.",
        llm_context_json={
            'data_quality': 'rich',
            'hallucination_rate': 0.05,
            'verification_verdict': 'PASS',
            'unsupported_claims': [],
            'word_count': 6,
        },
        destination_id=99,
    )
    assert not result['approved'], f"Test 3 failed: {result}"
    print(f"Test 3 PASS: Unknown destination blocked — {result['reasons']}")

    # Test 4: Embellishment warning
    result = validate_content(
        poi_id=4,
        new_content="This stunning hidden gem offers a unique experience with charming views.",
        llm_context_json={
            'data_quality': 'rich',
            'hallucination_rate': 0.15,
            'verification_verdict': 'REVIEW',
            'unsupported_claims': [],
            'word_count': 11,
        },
        destination_id=2,
    )
    assert result['approved'], f"Test 4 failed: {result}"
    assert len(result['warnings']) > 0, f"Test 4 expected warnings: {result}"
    print(f"Test 4 PASS: Embellishment warning — {result['warnings']}")

    print("\nAll tests passed!")
