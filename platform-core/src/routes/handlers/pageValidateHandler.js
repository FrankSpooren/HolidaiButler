/**
 * Page Validate Handler
 *
 * GET /api/v1/admin-portal/pages/:id/validate
 *
 * Run quality + SEO + accessibility checks op een page (incl. block-content)
 * en retourneer score + categorized issues + brand-context suggesties.
 *
 * Output schema:
 *   {
 *     overallScore: 0-100,
 *     errors: int, warnings: int, info: int,
 *     categories: { seo, accessibility, content, data, performance },
 *     items: [{ severity, category, message, blockId?, fix? }],
 *     brandContextSuggestions: [string]
 *   }
 *
 * Threshold SEO 70 (per MEMORY-regel) — pages onder die score krijgen
 * brand-context-driven verbetervoorstellen (Mistral + buildBrandContextStructured).
 *
 * @version BLOK F5 (22-05-2026)
 */

import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';
import { buildBrandContextStructured } from '../../services/agents/contentRedacteur/brandContext.js';

const SEO_THRESHOLD = 70;
const SUPPORTED_LOCALES = ['en', 'nl', 'de', 'es', 'fr'];

function isI18nObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  return keys.every(k => SUPPORTED_LOCALES.includes(k));
}

function pickLocaleValue(value, locale) {
  if (typeof value === 'string') return value;
  if (isI18nObject(value)) {
    return value[locale] || value.en || value.nl || Object.values(value).find(v => v && String(v).trim()) || '';
  }
  return '';
}

function collectTextContent(props, locale, results) {
  if (!props || typeof props !== 'object') return;
  if (Array.isArray(props)) {
    props.forEach(p => collectTextContent(p, locale, results));
    return;
  }
  if (isI18nObject(props)) {
    const text = pickLocaleValue(props, locale);
    if (text && String(text).trim()) results.push(String(text));
    return;
  }
  Object.entries(props).forEach(([key, value]) => {
    if (typeof value === 'string' && key !== 'url' && key !== 'href' && key !== 'src' && key !== 'image' && key !== 'imageUrl') {
      if (value.trim() && /[a-zA-Z]/.test(value)) results.push(value);
    } else if (typeof value === 'object') {
      collectTextContent(value, locale, results);
    }
  });
}

function analyzeSeo(page, locale) {
  const items = [];
  const title = pickLocaleValue({ en: page.title_en, nl: page.title_nl, de: page.title_de, es: page.title_es, fr: page.title_fr }, locale);
  const seoTitle = pickLocaleValue({ en: page.seo_title_en, nl: page.seo_title_nl, de: page.seo_title_de, es: page.seo_title_es, fr: page.seo_title_fr }, locale);
  const seoDesc = pickLocaleValue({ en: page.seo_description_en, nl: page.seo_description_nl, de: page.seo_description_de, es: page.seo_description_es, fr: page.seo_description_fr }, locale);

  let score = 100;

  if (!title || title.length < 10) { items.push({ severity: 'error', category: 'seo', message: `Page title te kort of ontbreekt (${locale})`, fix: 'Vul title in (>= 10 chars)' }); score -= 20; }
  else if (title.length > 70) { items.push({ severity: 'warning', category: 'seo', message: `Title te lang (${title.length} chars, max 65 aanbevolen) — ${locale}` }); score -= 5; }

  if (!seoTitle) { items.push({ severity: 'warning', category: 'seo', message: `SEO-title ontbreekt (${locale}) — meta-title valt terug op page-title`, fix: 'Vul seo_title voor optimale meta-tag' }); score -= 10; }
  else if (seoTitle.length < 30 || seoTitle.length > 65) { items.push({ severity: 'info', category: 'seo', message: `SEO-title length ${seoTitle.length} buiten ideale range 30-65 (${locale})` }); score -= 3; }

  if (!seoDesc) { items.push({ severity: 'error', category: 'seo', message: `SEO-description ontbreekt (${locale}) — search snippet leeg`, fix: 'Vul seo_description 140-160 chars' }); score -= 20; }
  else if (seoDesc.length < 100 || seoDesc.length > 170) { items.push({ severity: 'warning', category: 'seo', message: `SEO-description length ${seoDesc.length} buiten range 140-160 (${locale})` }); score -= 5; }

  if (!page.og_image_url && !page.og_image_path) { items.push({ severity: 'warning', category: 'seo', message: 'OG image ontbreekt — social-share previews krijgen geen visual', fix: 'Upload OG image via Basis-tab' }); score -= 8; }

  if (!page.slug || page.slug.length < 2) { items.push({ severity: 'error', category: 'seo', message: 'Page slug ontbreekt of te kort' }); score -= 15; }

  return { score: Math.max(0, score), items };
}

function analyzeBlocks(blocks, locale) {
  const items = [];
  if (!Array.isArray(blocks) || blocks.length === 0) {
    items.push({ severity: 'warning', category: 'content', message: 'Page heeft 0 blocks — geen content om te tonen' });
    return { items, blockCount: 0 };
  }

  const allText = [];
  blocks.forEach((block) => {
    if (block.type === 'hero' && !block.props?.image) {
      items.push({ severity: 'warning', category: 'data', message: 'Hero block zonder achtergrond-image', blockId: block.id, fix: 'Selecteer Brand Visual of upload image' });
    }
    collectTextContent(block.props, locale, allText);
  });

  const totalWords = allText.join(' ').split(/\s+/).filter(Boolean).length;
  if (totalWords < 50) {
    items.push({ severity: 'warning', category: 'content', message: `Page heeft alleen ${totalWords} woorden tekst (${locale}) — minimum 300 aanbevolen voor SEO` });
  } else if (totalWords < 300) {
    items.push({ severity: 'info', category: 'content', message: `Page heeft ${totalWords} woorden — meer content versterkt SEO` });
  }

  return { items, blockCount: blocks.length, wordCount: totalWords };
}

function analyzeAccessibility(blocks) {
  const items = [];
  if (!Array.isArray(blocks)) return { items };

  blocks.forEach((block) => {
    if (block.type === 'hero' && block.props?.image && !block.props?.imageAlt) {
      items.push({ severity: 'warning', category: 'accessibility', message: 'Hero image zonder alt-text', blockId: block.id });
    }
    if ((block.type === 'gallery' || block.type === 'partners') && Array.isArray(block.props?.items)) {
      block.props.items.forEach((item, i) => {
        const hasAltContent = item.alt && (typeof item.alt === 'string' ? item.alt.trim() : Object.values(item.alt || {}).some(v => v && String(v).trim()));
        if (!hasAltContent && (item.url || item.image)) {
          items.push({ severity: 'warning', category: 'accessibility', message: `${block.type} item ${i + 1} zonder alt-text`, blockId: block.id });
        }
      });
    }
  });

  return { items };
}

async function generateBrandSuggestions(destinationId, currentScore, items, locale) {
  if (currentScore >= SEO_THRESHOLD) return [];
  try {
    const bcStruct = await buildBrandContextStructured(destinationId, { includeReferenceInString: false, maxKbChunks: 4 });
    if (!bcStruct.hasInternalSources) return [];
    const suggestions = [];
    const seoIssues = items.filter(i => i.category === 'seo' && i.severity === 'error');
    if (seoIssues.length > 0) {
      suggestions.push(`Gebruik AI Brand Profile om SEO-title/description te genereren met ${bcStruct.internalSourcesCount} Knowledge Base-bronnen.`);
    }
    return suggestions;
  } catch (err) {
    logger.warn('[page-validate] brand suggestions failed:', err.message);
    return [];
  }
}

export async function handlePageValidate(req, res) {
  const pageId = Number(req.params.id);
  const locale = String(req.query.locale || 'en').toLowerCase().slice(0, 2);

  if (!pageId) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_PAGE_ID', message: 'Invalid page id' } });
  }

  try {
    const [[page]] = await mysqlSequelize.query(
      `SELECT * FROM pages WHERE id = :id`,
      { replacements: { id: pageId } }
    );
    if (!page) {
      return res.status(404).json({ success: false, error: { code: 'PAGE_NOT_FOUND', message: 'Page not found' } });
    }

    let layout = { blocks: [] };
    try { layout = typeof page.layout === 'string' ? JSON.parse(page.layout) : (page.layout || { blocks: [] }); } catch { /* empty */ }

    const seoAnalysis = analyzeSeo(page, locale);
    const blockAnalysis = analyzeBlocks(layout.blocks, locale);
    const a11yAnalysis = analyzeAccessibility(layout.blocks);

    const allItems = [...seoAnalysis.items, ...blockAnalysis.items, ...a11yAnalysis.items];
    const errors = allItems.filter(i => i.severity === 'error').length;
    const warnings = allItems.filter(i => i.severity === 'warning').length;
    const info = allItems.filter(i => i.severity === 'info').length;

    const overallScore = Math.max(0, seoAnalysis.score - (warnings * 2));

    const brandContextSuggestions = await generateBrandSuggestions(page.destination_id, overallScore, allItems, locale);

    const categories = {
      seo: { score: seoAnalysis.score, issues: allItems.filter(i => i.category === 'seo').length },
      accessibility: { score: Math.max(0, 100 - a11yAnalysis.items.length * 10), issues: a11yAnalysis.items.length },
      content: { wordCount: blockAnalysis.wordCount || 0, blockCount: blockAnalysis.blockCount || 0, issues: blockAnalysis.items.length },
    };

    return res.json({
      success: true,
      overallScore,
      threshold: SEO_THRESHOLD,
      passesThreshold: overallScore >= SEO_THRESHOLD,
      errors,
      warnings,
      info,
      total: errors + warnings + info,
      categories,
      items: allItems,
      issues: allItems, // alias backward-compat met PageQualityPanel.jsx
      brandContextSuggestions,
      locale,
      page_id: pageId,
    });
  } catch (error) {
    logger.error('[page-validate] error:', error);
    return res.status(500).json({ success: false, error: { code: 'PAGE_VALIDATE_ERROR', message: error.message } });
  }
}
