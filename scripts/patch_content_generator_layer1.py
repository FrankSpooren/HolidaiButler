#!/usr/bin/env python3
"""
Optie D Layer 1 — Inject promptGuardrails + brandContext into all 5 AI generate paths
in contentGenerator.js.

Patches:
1. Add imports: promptGuardrails + buildBrandContextStructured
2. buildSystemPrompt() helper: inject anti-hallucination instructions in `base` (fixes generateContent + repurposeContent that use the helper)
3. improveContent: fetch brandContext + wrap system prompt with REFERENCE MATERIAL (Bug A fix)
4. generateAlternative: fetch brandContext + wrap system prompt
5. repurposeContent: fetch brandContext + wrap system prompt
6. generateFromTitle: fetch brandContext + wrap user prompt

Idempotent.
"""
import sys
from pathlib import Path

PATH = Path('/var/www/api.holidaibutler.com/platform-core/src/services/agents/contentRedacteur/contentGenerator.js')

# ---------------------------------------------------------------------
# 1. Imports — add new module imports after brandContext import
# ---------------------------------------------------------------------
A1 = "import { buildBrandContext } from './brandContext.js';\nimport featureFlagService from '../../featureFlagService.js';\nimport { mysqlSequelize as _mysqlForAudit } from '../../../config/database.js';"

R1 = """import { buildBrandContext, buildBrandContextStructured } from './brandContext.js';
import { buildAntiHallucinationInstructions, buildSystemPromptHeader } from '../../contentSafeguards/promptGuardrails.js';
import featureFlagService from '../../featureFlagService.js';
import { mysqlSequelize as _mysqlForAudit } from '../../../config/database.js';"""

# ---------------------------------------------------------------------
# 2. buildSystemPrompt(): inject anti-hallucination at top of base
# ---------------------------------------------------------------------
A2 = """  const brandBlock = brandContext ? `\\n${brandContext}\\n` : '';
  const groundingBlock = groundingContext ? `\\n${groundingContext}\\n` : '';

  const base = `You are an enterprise-grade content writer for a premium content platform.
${brandBlock}
${toneInstruction}
${groundingBlock}
ABSOLUTE RULES:
- Write ALL content in ${{ nl: 'Dutch', en: 'English', de: 'German', es: 'Spanish', fr: 'French' }[outputLanguage] || 'English'}. This is the destination's primary language. Do NOT write in English unless the destination's language IS English.
- Write original, high-quality content — NO plagiarism
- Facts must be accurate — do NOT hallucinate. If reference material is provided, use those facts.
- Preserve proper nouns (names, street names, local terms)
- EU AI Act compliance: this is AI-generated content
- If a target audience is specified, tailor language, tone, and content to their interests and pain points
- ONLY mention real places, restaurants, or businesses that are listed in the VERIFIED PLACES section above`;"""

R2 = """  const brandBlock = brandContext ? `\\n${brandContext}\\n` : '';
  const groundingBlock = groundingContext ? `\\n${groundingContext}\\n` : '';

  // Optie D Layer 1: prepend strict anti-hallucination guardrails (multi-locale)
  const _guardrails = buildAntiHallucinationInstructions(outputLanguage, {
    hasReferenceMaterial: Boolean(brandContext || groundingContext),
    strictMode: true,
  });

  const base = `You are an enterprise-grade content writer for a premium content platform.

${_guardrails}
${brandBlock}
${toneInstruction}
${groundingBlock}
ABSOLUTE RULES:
- Write ALL content in ${{ nl: 'Dutch', en: 'English', de: 'German', es: 'Spanish', fr: 'French' }[outputLanguage] || 'English'}. This is the destination's primary language. Do NOT write in English unless the destination's language IS English.
- Write original, high-quality content — NO plagiarism
- Facts must be accurate — STRICTLY follow the REFERENCE MATERIAL above. Where reference material lacks a specific fact, use generic wording, NEVER fabricate it.
- Preserve proper nouns (names, street names, local terms)
- EU AI Act compliance: this is AI-generated content
- If a target audience is specified, tailor language, tone, and content to their interests and pain points
- ONLY mention real places, restaurants, or businesses that are listed in the VERIFIED PLACES section above`;"""

# ---------------------------------------------------------------------
# 3. improveContent: add brandContext + wrap system prompt (Bug A fix)
# ---------------------------------------------------------------------
A3 = """async function improveContent(content, seoResult, options = {}) {
  const { destinationId, contentType, keywords = [], targetPlatform } = options;
  const MAX_ROUNDS = 2; // Two improvement rounds — balance between quality and response time
  const modelName = embeddingService.chatModel || 'mistral-small-latest';"""

R3 = """async function improveContent(content, seoResult, options = {}) {
  const { destinationId, contentType, keywords = [], targetPlatform } = options;
  const MAX_ROUNDS = 2; // Two improvement rounds — balance between quality and response time
  const modelName = embeddingService.chatModel || 'mistral-small-latest';

  // Optie D Bug A fix: improveContent needs brand context to detect/correct hallucinations
  // Without this, AI improves SEO but preserves invented facts (Rad van Fortuin etc.)
  let _improveBrandCtx = '';
  let _improveSources = [];
  let _improveHasIS = false;
  let _improveLang = 'en';
  try {
    if (destinationId) {
      const [[_destRow]] = await _mysqlForAudit.query(
        'SELECT default_language FROM destinations WHERE id = :id',
        { replacements: { id: Number(destinationId) } }
      );
      if (_destRow?.default_language) _improveLang = _destRow.default_language;
      const _bc = await buildBrandContextStructured(destinationId, {
        contentKeywords: keywords,
        includeReferenceInString: false,
      });
      _improveBrandCtx = _bc.contextString;
      _improveSources = _bc.sources;
      _improveHasIS = _bc.hasInternalSources;
    }
  } catch (_e) { /* brand context optional */ }"""

# ---------------------------------------------------------------------
# 4. improveContent system prompt: wrap with guardrails + REFERENCE
# ---------------------------------------------------------------------
A4 = """    const systemPrompt = `You are a surgical content optimizer. You fix ONLY what's broken — preserve everything that scores 10/10.

${toneInstruction}

CRITICAL FORMATTING RULES:"""

R4 = """    // Optie D Layer 1: wrap system prompt with strict anti-hallucination + REFERENCE MATERIAL
    const _improveHeader = buildSystemPromptHeader(
      _improveLang,
      _improveBrandCtx,
      _improveSources,
      { hasInternalSources: _improveHasIS, strictMode: true }
    );

    const systemPrompt = `You are a surgical content optimizer. You fix ONLY what's broken (SEO/format) WHILE ensuring factual accuracy against REFERENCE MATERIAL.

${_improveHeader}

${toneInstruction}

CRITICAL CONTENT RULES (in addition to anti-hallucination above):
- If the original content mentions specific facts (names, activities, events, dates, prices, locations) NOT in REFERENCE MATERIAL → REWRITE those parts using only generic language or facts from REFERENCE MATERIAL.
- Hallucinated content from the original MUST be removed or replaced with verified facts.

CRITICAL FORMATTING RULES:"""

# ---------------------------------------------------------------------
# 5. generateAlternative: add brandContext + wrap system prompt
# ---------------------------------------------------------------------
A5 = """  const systemPrompt = `You are a creative content remixer. Your job is to write a COMPLETELY DIFFERENT version of an existing piece of content — same topic, same target keywords, but a fundamentally different angle, narrative structure, opening hook and tone within the brand voice.

${toneInstruction}

CRITICAL RULES:"""

R5 = """  // Optie D Layer 1: fetch brand context for factual grounding
  let _altBrandCtx = '';
  let _altSources = [];
  let _altHasIS = false;
  let _altLang = 'en';
  try {
    if (destinationId) {
      const [[_destRow]] = await _mysqlForAudit.query(
        'SELECT default_language FROM destinations WHERE id = :id',
        { replacements: { id: Number(destinationId) } }
      );
      if (_destRow?.default_language) _altLang = _destRow.default_language;
      const _bc = await buildBrandContextStructured(destinationId, {
        contentKeywords: keywords, includeReferenceInString: false,
      });
      _altBrandCtx = _bc.contextString;
      _altSources = _bc.sources;
      _altHasIS = _bc.hasInternalSources;
    }
  } catch (_e) { /* brand context optional */ }

  const _altHeader = buildSystemPromptHeader(_altLang, _altBrandCtx, _altSources, {
    hasInternalSources: _altHasIS, strictMode: true,
  });

  const systemPrompt = `You are a creative content remixer. Your job is to write a COMPLETELY DIFFERENT version of an existing piece of content — same topic, same target keywords, but a fundamentally different angle, narrative structure, opening hook and tone within the brand voice.

${_altHeader}

${toneInstruction}

CRITICAL RULES:"""

# ---------------------------------------------------------------------
# 6. repurposeContent: add brandContext + wrap system prompt
# ---------------------------------------------------------------------
A6 = """    const systemPrompt = `You are a top-tier ${platform} content specialist for a premium tourism platform.
You REWRITE content from scratch for ${platform} — you do NOT summarize, truncate, or slightly edit the original.

${toneInstruction}

${groundingContext}"""

R6 = """    // Optie D Layer 1: prepend strict guardrails + REFERENCE MATERIAL block
    const _rpHeader = buildSystemPromptHeader(_repurposeLang, _repurposeBrandCtx, _repurposeSources, {
      hasInternalSources: _repurposeHasIS, strictMode: true,
    });

    const systemPrompt = `You are a top-tier ${platform} content specialist for a premium tourism platform.
You REWRITE content from scratch for ${platform} — you do NOT summarize, truncate, or slightly edit the original.

${_rpHeader}

${toneInstruction}

${groundingContext}"""

# ---------------------------------------------------------------------
# 7. repurposeContent: declare brand context vars BEFORE the loop
# Anchor: find the for-of loop start over targetPlatforms
# ---------------------------------------------------------------------
A7 = """  // POI/Event grounding for repurposed content
  const [relevantPOIs, relevantEvents] = await Promise.all([
    findRelevantPOIs(destId, keywords, sourceItem.content_type === 'blog' ? 15 : 5, sourceItem.title || ''),
    findRelevantEvents(destId, keywords),
  ]);
  const groundingContext = buildGroundingContext(relevantPOIs, relevantEvents, destId);"""

R7 = """  // POI/Event grounding for repurposed content
  const [relevantPOIs, relevantEvents] = await Promise.all([
    findRelevantPOIs(destId, keywords, sourceItem.content_type === 'blog' ? 15 : 5, sourceItem.title || ''),
    findRelevantEvents(destId, keywords),
  ]);
  const groundingContext = buildGroundingContext(relevantPOIs, relevantEvents, destId);

  // Optie D Layer 1: brand context for repurpose (shared across all platforms in loop)
  let _repurposeBrandCtx = '';
  let _repurposeSources = [];
  let _repurposeHasIS = false;
  let _repurposeLang = 'en';
  try {
    if (destId) {
      const [[_destRow]] = await _mysqlForAudit.query(
        'SELECT default_language FROM destinations WHERE id = :id',
        { replacements: { id: Number(destId) } }
      );
      if (_destRow?.default_language) _repurposeLang = _destRow.default_language;
      const _bc = await buildBrandContextStructured(destId, {
        contentKeywords: keywords, includeReferenceInString: false,
      });
      _repurposeBrandCtx = _bc.contextString;
      _repurposeSources = _bc.sources;
      _repurposeHasIS = _bc.hasInternalSources;
    }
  } catch (_e) { /* brand context optional */ }"""

# ---------------------------------------------------------------------
# 8. generateFromTitle: prepend guardrails + reference to the prompt
# ---------------------------------------------------------------------
A8 = """    try {
      const prompt = `You are a professional social media content creator.

TASK: Write a ${platform} post for the topic: "${title}"

PLATFORM RULES:"""

R8 = """    try {
      // Optie D Layer 1: prepend guardrails + REFERENCE MATERIAL
      let _gftBrandCtx = '';
      let _gftSources = [];
      let _gftHasIS = false;
      let _gftLang = 'en';
      try {
        if (destinationId) {
          const [[_destRow]] = await _mysqlForAudit.query(
            'SELECT default_language FROM destinations WHERE id = :id',
            { replacements: { id: Number(destinationId) } }
          );
          if (_destRow?.default_language) _gftLang = _destRow.default_language;
          const _bc = await buildBrandContextStructured(destinationId, {
            contentKeywords: sourceItem.keyword_cluster ? (typeof sourceItem.keyword_cluster === 'string' ? JSON.parse(sourceItem.keyword_cluster) : sourceItem.keyword_cluster) : [],
            includeReferenceInString: false,
          });
          _gftBrandCtx = _bc.contextString;
          _gftSources = _bc.sources;
          _gftHasIS = _bc.hasInternalSources;
        }
      } catch (_e) { /* optional */ }
      const _gftHeader = buildSystemPromptHeader(_gftLang, _gftBrandCtx, _gftSources, {
        hasInternalSources: _gftHasIS, strictMode: true,
      });

      const prompt = `You are a professional social media content creator.

${_gftHeader}

TASK: Write a ${platform} post for the topic: "${title}"

PLATFORM RULES:"""


PATCHES = [
    ('imports', A1, R1),
    ('buildSystemPrompt-base', A2, R2),
    ('improveContent-vars', A3, R3),
    ('improveContent-prompt', A4, R4),
    ('generateAlternative', A5, R5),
    ('repurpose-vars', A7, R7),
    ('repurpose-prompt', A6, R6),
    ('generateFromTitle', A8, R8),
]


def apply_patch(content, label, anchor, replacement):
    """Returns (new_content, status)"""
    if replacement in content:
        return content, f"  {label}: already applied (skip)"
    count = content.count(anchor)
    if count == 0:
        return None, f"  {label}: FAIL anchor not found"
    if count > 1:
        return None, f"  {label}: FAIL anchor not unique (found {count}x)"
    return content.replace(anchor, replacement, 1), f"  {label}: applied"


def main():
    if not PATH.exists():
        print(f"ERROR: {PATH} not found")
        return 2

    original = PATH.read_text(encoding='utf-8')
    content = original
    statuses = []

    for label, anchor, replacement in PATCHES:
        new_content, status = apply_patch(content, label, anchor, replacement)
        statuses.append(status)
        if new_content is None and 'already applied' not in status:
            print('Aborting on failure:')
            for s in statuses: print(s)
            return 3
        if new_content:
            content = new_content

    print("Patch results:")
    for s in statuses: print(s)

    if content == original:
        print("\nNo changes (all patches already applied).")
        return 0

    backup = PATH.with_suffix('.js.bak.layer1')
    backup.write_text(original, encoding='utf-8')
    PATH.write_text(content, encoding='utf-8')
    print(f"\nPatched: {PATH}")
    print(f"Backup:  {backup}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
