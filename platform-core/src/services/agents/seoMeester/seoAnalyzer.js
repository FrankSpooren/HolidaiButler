/**
 * SEO Analyzer v3.0 — Twee gescheiden scoresystemen
 *
 * analyzeBlogSEO():   7 checks, SEO metadata suggesties, interne links — voor blogs/website
 * analyzeSocialScore(): Per-platform checks met PLATFORM_CHECKS — voor social posts
 * analyzeVideoScore(): 7 checks — voor video scripts
 *
 * @version 3.0.0
 */

import { calculateReadability } from './readabilityScore.js';
import { findLinkSuggestions, analyzeLinkDensity } from './internalLinker.js';
import logger from '../../../utils/logger.js';

// ============================================================
// PLATFORM-SPECIFIEKE SOCIAL SCORE CHECKS (Opdracht 3)
// ============================================================

const PLATFORM_CHECKS = {
  instagram: [
    { name: 'char_limit', weight: 20, limit: 2200, desc: 'Tekst ≤ 2200 tekens' },
    { name: 'hashtags', weight: 15, optimal: { min: 5, max: 15 }, desc: 'Hashtags 5-15' },
    { name: 'emoji', weight: 10, optimal: { min: 3, max: 6 }, desc: 'Emoji 3-6' },
    { name: 'cta', weight: 15, desc: 'Call-to-action aanwezig' },
    { name: 'hook', weight: 15, desc: 'Eerste zin pakt aandacht' },
    { name: 'image', weight: 15, desc: 'Afbeelding gekoppeld (verplicht)' },
    { name: 'readability', weight: 10, desc: 'Leesbaarheid passend bij platform' },
  ],
  facebook: [
    { name: 'char_limit', weight: 20, limit: 500, desc: 'Tekst ≤ 500 tekens (optimaal)' },
    { name: 'hashtags', weight: 10, optimal: { min: 3, max: 5 }, desc: 'Hashtags 3-5' },
    { name: 'emoji', weight: 10, optimal: { min: 2, max: 4 }, desc: 'Emoji 2-4' },
    { name: 'cta', weight: 20, desc: 'Call-to-action aanwezig' },
    { name: 'hook', weight: 15, desc: 'Eerste zin is vraag of prikkelend' },
    { name: 'image', weight: 15, desc: 'Afbeelding gekoppeld' },
    { name: 'link', weight: 10, desc: 'Link naar website aanwezig' },
  ],
  linkedin: [
    { name: 'char_limit', weight: 15, limit: 3000, desc: 'Tekst ≤ 3000 tekens' },
    { name: 'hashtags', weight: 10, optimal: { min: 3, max: 5 }, desc: 'Hashtags 3-5' },
    { name: 'emoji', weight: 5, optimal: { min: 0, max: 2 }, desc: 'Emoji 0-2 (professioneel)' },
    { name: 'cta', weight: 15, desc: 'Call-to-action aanwezig' },
    { name: 'hook', weight: 20, desc: 'Opening biedt inzicht of waarde' },
    { name: 'professional_tone', weight: 20, desc: 'Professionele toon' },
    { name: 'image', weight: 15, desc: 'Afbeelding gekoppeld' },
  ],
  x: [
    { name: 'char_limit', weight: 25, limit: 280, desc: 'Tekst ≤ 280 tekens (strikt)' },
    { name: 'hashtags', weight: 10, optimal: { min: 1, max: 2 }, desc: 'Hashtags 1-2 (inline)' },
    { name: 'hook', weight: 25, desc: 'Eerste woorden pakken direct aandacht' },
    { name: 'cta', weight: 15, desc: 'Actie-element aanwezig' },
    { name: 'conciseness', weight: 15, desc: 'Puntig en direct' },
    { name: 'image', weight: 10, desc: 'Afbeelding optioneel maar aanbevolen' },
  ],
  tiktok: [
    { name: 'char_limit', weight: 25, limit: 150, desc: 'Tekst ≤ 150 tekens (strikt)' },
    { name: 'hashtags', weight: 15, optimal: { min: 3, max: 5 }, desc: 'Hashtags 3-5' },
    { name: 'hook', weight: 25, desc: 'Ultra-korte hook (eerste 3 woorden)' },
    { name: 'trend_relevance', weight: 20, desc: 'Aansluiting bij trending topics' },
    { name: 'emoji', weight: 15, optimal: { min: 1, max: 3 }, desc: 'Emoji 1-3' },
  ],
  pinterest: [
    { name: 'char_limit', weight: 15, limit: 500, desc: 'Tekst ≤ 500 tekens' },
    { name: 'keywords', weight: 25, desc: 'Zoek-keywords in tekst' },
    { name: 'cta', weight: 15, desc: 'Link/CTA aanwezig' },
    { name: 'image', weight: 25, desc: 'Afbeelding verplicht' },
    { name: 'descriptive', weight: 20, desc: 'Beschrijvend en aspirerend' },
  ],
  youtube: [
    { name: 'char_limit', weight: 10, limit: 5000, desc: 'Beschrijving ≤ 5000 tekens' },
    { name: 'hashtags', weight: 10, optimal: { min: 5, max: 15 }, desc: 'Hashtags 5-15' },
    { name: 'keywords', weight: 20, desc: 'SEO-keywords in beschrijving' },
    { name: 'timestamps', weight: 15, desc: 'Timestamps aanwezig' },
    { name: 'cta', weight: 15, desc: 'Subscribe/CTA aanwezig' },
    { name: 'links', weight: 15, desc: 'Relevante links in beschrijving' },
    { name: 'hook', weight: 15, desc: 'Eerste 2 regels pakkend' },
  ],
};

// ============================================================
// analyzeBlogSEO — 7 checks, totaal 100 punten
// ============================================================

export async function analyzeBlogSEO(contentItem, destinationId) {
  const body = contentItem.body_en || '';
  const title = contentItem.title || '';
  const seoData = contentItem.seo_data || {};
  const keywords = contentItem.keyword_cluster || [];

  const checks = [];

  // 1. Keyword density (15 pts)
  checks.push(analyzeKeywordDensity(body, keywords, 15));

  // 2. Readability (20 pts)
  const readability = calculateReadability(body, 'en');
  checks.push({
    name: 'readability', weight: 20,
    score: readability.score >= 50 ? 20 : readability.score >= 30 ? 12 : 4,
    maxScore: 20, status: readability.score >= 50 ? 'pass' : readability.score >= 30 ? 'warning' : 'fail',
    details: `Flesch-Kincaid: ${readability.score} (${readability.label}), ${readability.words} words`,
    readabilityData: readability,
  });

  // 3. Content length (15 pts) — 800-1500 words
  const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;
  const goodLen = wordCount >= 800 && wordCount <= 1500;
  const okLen = wordCount >= 500 && wordCount <= 2000;
  checks.push({
    name: 'content_length', weight: 15,
    score: goodLen ? 15 : okLen ? 9 : wordCount > 0 ? 4 : 0,
    maxScore: 15, status: goodLen ? 'pass' : okLen ? 'warning' : 'fail',
    details: `${wordCount} words (target: 800-1500). ${goodLen ? 'Good!' : wordCount < 800 ? 'Too short.' : 'Acceptable.'}`,
  });

  // 4. Opening hook (15 pts)
  checks.push(analyzeOpeningHook(body, 15));

  // 5. Call-to-action (10 pts)
  checks.push(analyzeCallToAction(body, 10));

  // 6. Image attached (10 pts)
  const hasMedia = contentItem.media_ids && contentItem.media_ids !== '[]' && contentItem.media_ids !== 'null';
  checks.push({
    name: 'image_attached', weight: 10,
    score: hasMedia ? 10 : 0,
    maxScore: 10, status: hasMedia ? 'pass' : 'fail',
    details: hasMedia ? 'Image attached.' : 'No image — add an image to improve engagement.',
  });

  // 7. Unique content (15 pts) — simplified: check body length indicates original work
  const isUnique = body.length > 500;
  checks.push({
    name: 'unique_content', weight: 15,
    score: isUnique ? 15 : body.length > 200 ? 8 : 0,
    maxScore: 15, status: isUnique ? 'pass' : body.length > 200 ? 'warning' : 'fail',
    details: isUnique ? 'Content appears original and substantial.' : 'Content seems too short to be unique.',
  });

  const totalScore = checks.reduce((s, c) => s + c.score, 0);
  const maxScore = checks.reduce((s, c) => s + c.maxScore, 0);
  const overallScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  // Generate SEO metadata suggestions (NOT in score)
  const seoSuggestions = generateSEOSuggestions(contentItem, destinationId);
  let internalLinks = [];
  try {
    internalLinks = await findLinkSuggestions(body, destinationId);
  } catch (err) {
    logger.warn('[SEOAnalyzer] Link suggestions failed:', err.message);
  }

  return {
    score: overallScore,
    overallScore, // backward compat (frontend + scheduled audit)
    type: 'seo',
    grade: getGrade(overallScore),
    contentType: 'blog',
    checks,
    seoSuggestions: {
      ...seoSuggestions,
      internal_links: internalLinks.slice(0, 5),
    },
    recommendations: checks.filter(c => c.status !== 'pass').map(c => c.details),
    analyzedAt: new Date().toISOString(),
  };
}

// ============================================================
// analyzeSocialScore — per-platform checks
// ============================================================

export function analyzeSocialScore(contentItem, platform) {
  const body = contentItem.body_en || '';
  const keywords = contentItem.keyword_cluster || [];
  const platformKey = (platform || contentItem.target_platform || 'instagram').toLowerCase();
  const platformChecks = PLATFORM_CHECKS[platformKey] || PLATFORM_CHECKS.instagram;

  const checks = [];

  for (const check of platformChecks) {
    const result = evaluateSocialCheck(check, body, contentItem, keywords);
    checks.push(result);
  }

  const totalScore = checks.reduce((s, c) => s + c.score, 0);
  const maxScore = checks.reduce((s, c) => s + c.maxScore, 0);
  const overallScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return {
    score: overallScore,
    overallScore, // backward compat
    type: 'social',
    platform: platformKey,
    grade: getGrade(overallScore),
    contentType: 'social_post',
    checks,
    recommendations: checks.filter(c => c.status !== 'pass').map(c => c.details),
    analyzedAt: new Date().toISOString(),
  };
}

// ============================================================
// analyzeVideoScore — 7 checks for video scripts
// ============================================================

export function analyzeVideoScore(contentItem) {
  const body = contentItem.body_en || '';
  const keywords = contentItem.keyword_cluster || [];
  const checks = [];

  checks.push(analyzeVideoHook(body, 15));
  checks.push(analyzeScriptStructure(body, 15));
  checks.push(analyzeCallToAction(body, 10));
  checks.push(analyzeVideoLength(body, 15));
  checks.push(analyzeKeywordPresence(body, keywords, 15));

  const readability = calculateReadability(body, 'en');
  checks.push({
    name: 'readability', weight: 15,
    score: readability.score >= 50 ? 15 : readability.score >= 30 ? 8 : 3,
    maxScore: 15, status: readability.score >= 50 ? 'pass' : 'warning',
    details: `Readability: ${readability.score} (${readability.label}). Video scripts should be conversational.`,
  });

  checks.push(analyzeVisualCues(body, 15));

  const totalScore = checks.reduce((s, c) => s + c.score, 0);
  const maxScore = checks.reduce((s, c) => s + c.maxScore, 0);
  const overallScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return {
    score: overallScore,
    overallScore, // backward compat
    type: 'video',
    grade: getGrade(overallScore),
    contentType: 'video_script',
    checks,
    recommendations: checks.filter(c => c.status !== 'pass').map(c => c.details),
    analyzedAt: new Date().toISOString(),
  };
}

// ============================================================
// Unified entry — routes naar juiste functie
// ============================================================

export async function analyzeContent(contentItem, destinationId, platform) {
  const contentType = contentItem.content_type || 'blog';
  if (contentType === 'social_post') return analyzeSocialScore(contentItem, platform);
  if (contentType === 'video_script') return analyzeVideoScore(contentItem);
  return analyzeBlogSEO(contentItem, destinationId);
}

// ============================================================
// SEO Metadata Suggestions (alleen voor blogs)
// ============================================================

function generateSEOSuggestions(contentItem, destinationId) {
  const title = contentItem.title || '';
  const body = contentItem.body_en || '';

  // Meta title suggestion — volledig, NIET afkorten
  let metaTitle = contentItem.seo_meta_title || '';
  if (!metaTitle) {
    metaTitle = title.length <= 70 ? title : title.substring(0, 70);
  }

  // Meta description suggestion — volledig, NIET afkorten
  let metaDesc = contentItem.seo_meta_description || '';
  if (!metaDesc && body.length > 100) {
    // First meaningful paragraph, full sentence up to 170 chars
    const firstParagraph = body.split('\n').filter(l => l.trim().length > 50)[0] || body;
    metaDesc = firstParagraph.substring(0, 170);
    // Try to end at a sentence boundary
    const lastDot = metaDesc.lastIndexOf('.');
    if (lastDot > 80) metaDesc = metaDesc.substring(0, lastDot + 1);
  }

  // URL slug suggestion — geen leading slash (frontend voegt toe)
  let slug = contentItem.seo_slug || '';
  if (!slug) {
    slug = 'blog/' + title.toLowerCase()
      .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/[ñ]/g, 'n')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      .substring(0, 80);
  }

  // Heading suggestions
  const h2Count = (body.match(/^##\s+/gm) || []).length + (body.match(/<h2/gi) || []).length;
  let headingSuggestion = null;
  if (h2Count < 2 && body.length > 500) {
    headingSuggestion = 'Consider adding H2 headings to structure your article for better readability and SEO.';
  }

  return {
    meta_title: metaTitle,
    meta_title_length: metaTitle.length,
    meta_description: metaDesc,
    meta_description_length: metaDesc.length,
    slug,
    heading_suggestion: headingSuggestion,
  };
}

// ============================================================
// Social check evaluator
// ============================================================

function evaluateSocialCheck(check, body, contentItem, keywords) {
  const weight = check.weight;
  let score = 0;
  let status = 'fail';
  let details = '';

  switch (check.name) {
    case 'char_limit': {
      const len = body.length;
      const withinLimit = len <= check.limit;
      const good = withinLimit && len >= 20;
      score = good ? weight : withinLimit ? Math.round(weight * 0.7) : Math.round(weight * 0.3);
      status = good ? 'pass' : withinLimit ? 'warning' : 'fail';
      details = `${len}/${check.limit} chars. ${good ? 'Good!' : len > check.limit ? `Exceeds ${check.limit} char limit.` : 'Too short.'}`;
      break;
    }
    case 'hashtags': {
      const hashtags = body.match(/#\w+/g) || [];
      const count = hashtags.length;
      const opt = check.optimal;
      const good = count >= opt.min && count <= opt.max;
      score = good ? weight : count > 0 ? Math.round(weight * 0.6) : 0;
      status = good ? 'pass' : count > 0 ? 'warning' : 'fail';
      details = `${count} hashtags (optimal: ${opt.min}-${opt.max}). ${good ? 'Good!' : count === 0 ? 'Add hashtags.' : count > opt.max ? 'Too many.' : 'Add more.'}`;
      break;
    }
    case 'emoji': {
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu;
      const emojis = body.match(emojiRegex) || [];
      const count = emojis.length;
      const opt = check.optimal;
      const good = count >= opt.min && count <= opt.max;
      score = good ? weight : count >= opt.min ? Math.round(weight * 0.7) : count > 0 ? Math.round(weight * 0.5) : Math.round(weight * 0.2);
      status = good ? 'pass' : count > 0 ? 'warning' : 'fail';
      details = `${count} emoji (optimal: ${opt.min}-${opt.max}). ${good ? 'Good!' : count > opt.max ? 'Too many.' : 'Add more.'}`;
      break;
    }
    case 'cta': {
      const result = analyzeCallToAction(body, weight);
      return result;
    }
    case 'hook': {
      const result = analyzeOpeningHook(body, weight);
      return result;
    }
    case 'image': {
      const hasMedia = contentItem.media_ids && contentItem.media_ids !== '[]' && contentItem.media_ids !== 'null';
      score = hasMedia ? weight : 0;
      status = hasMedia ? 'pass' : 'fail';
      details = hasMedia ? 'Image attached.' : 'No image — visual content strongly recommended.';
      break;
    }
    case 'readability': {
      const readability = calculateReadability(body, 'en');
      score = readability.score >= 40 ? weight : readability.score >= 20 ? Math.round(weight * 0.7) : Math.round(weight * 0.3);
      status = readability.score >= 40 ? 'pass' : 'warning';
      details = `Readability: ${readability.score} (${readability.label}).`;
      break;
    }
    case 'link': {
      const hasLink = /https?:\/\/\S+/.test(body);
      score = hasLink ? weight : 0;
      status = hasLink ? 'pass' : 'fail';
      details = hasLink ? 'Link found.' : 'Add a link to your website.';
      break;
    }
    case 'professional_tone': {
      const informal = /\b(lol|omg|wtf|haha|yolo|bruh|ngl|tbh|fr fr|no cap)\b/gi;
      const matches = body.match(informal) || [];
      const isProf = matches.length === 0;
      score = isProf ? weight : Math.round(weight * 0.3);
      status = isProf ? 'pass' : 'warning';
      details = isProf ? 'Professional tone.' : `Informal language detected: ${matches.join(', ')}`;
      break;
    }
    case 'conciseness': {
      const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;
      const good = wordCount <= 50;
      score = good ? weight : wordCount <= 80 ? Math.round(weight * 0.6) : Math.round(weight * 0.2);
      status = good ? 'pass' : 'warning';
      details = `${wordCount} words. ${good ? 'Concise!' : 'Consider shortening.'}`;
      break;
    }
    case 'keywords': {
      const result = analyzeKeywordPresence(body, keywords, weight);
      return result;
    }
    case 'trend_relevance': {
      // Basic check: if keywords are present, assume trend-relevant
      const bodyLower = body.toLowerCase();
      const relevant = keywords.some(kw => bodyLower.includes(kw.toLowerCase()));
      score = relevant ? weight : Math.round(weight * 0.3);
      status = relevant ? 'pass' : 'warning';
      details = relevant ? 'Content aligns with trending topics.' : 'Consider incorporating trending keywords.';
      break;
    }
    case 'timestamps': {
      const hasTimestamps = /\d{1,2}:\d{2}/.test(body);
      score = hasTimestamps ? weight : 0;
      status = hasTimestamps ? 'pass' : 'warning';
      details = hasTimestamps ? 'Timestamps found.' : 'Add timestamps for better navigation.';
      break;
    }
    case 'links': {
      const linkCount = (body.match(/https?:\/\/\S+/g) || []).length;
      score = linkCount >= 2 ? weight : linkCount >= 1 ? Math.round(weight * 0.6) : 0;
      status = linkCount >= 2 ? 'pass' : linkCount >= 1 ? 'warning' : 'fail';
      details = `${linkCount} link(s). ${linkCount >= 2 ? 'Good!' : 'Add relevant links.'}`;
      break;
    }
    case 'descriptive': {
      const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;
      score = wordCount >= 30 ? weight : wordCount >= 15 ? Math.round(weight * 0.6) : Math.round(weight * 0.2);
      status = wordCount >= 30 ? 'pass' : 'warning';
      details = `${wordCount} words. ${wordCount >= 30 ? 'Good descriptive content.' : 'Add more descriptive text.'}`;
      break;
    }
    default:
      score = 0;
      details = `Unknown check: ${check.name}`;
  }

  return { name: check.name, weight, score, maxScore: weight, status, details, desc: check.desc };
}

// ============================================================
// Shared helper functions
// ============================================================

function normalizeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function analyzeKeywordDensity(body, keywords, weight) {
  if (!keywords || keywords.length === 0) {
    return { name: 'keyword_density', weight, score: Math.round(weight * 0.5), maxScore: weight, status: 'warning', details: 'No target keywords specified.' };
  }
  const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount === 0) return { name: 'keyword_density', weight, score: 0, maxScore: weight, status: 'fail', details: 'No content.' };

  const bodyNorm = normalizeAccents(body);
  const densities = keywords.map(kw => {
    const kwNorm = normalizeAccents(kw);
    const regex = new RegExp(kwNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = bodyNorm.match(regex);
    const count = matches ? matches.length : 0;
    return { keyword: kw, count, density: Math.round((count / wordCount) * 1000) / 10 };
  });

  const avgDensity = densities.reduce((s, d) => s + d.density, 0) / densities.length;
  const hasKeywords = densities.some(d => d.count > 0);
  const good = avgDensity >= 0.5 && avgDensity <= 3;

  return {
    name: 'keyword_density', weight,
    score: good ? weight : hasKeywords ? Math.round(weight * 0.6) : 0,
    maxScore: weight, status: good ? 'pass' : hasKeywords ? 'warning' : 'fail',
    details: `Avg density: ${avgDensity.toFixed(1)}% (optimal: 0.5-3%). ${densities.map(d => `"${d.keyword}": ${d.count}x`).join(', ')}`,
    keywords: densities,
  };
}

function analyzeKeywordPresence(body, keywords, weight) {
  if (!keywords || keywords.length === 0) {
    return { name: 'keywords', weight, score: Math.round(weight * 0.5), maxScore: weight, status: 'warning', details: 'No target keywords.' };
  }
  const bodyNorm = normalizeAccents(body);
  const found = keywords.filter(kw => bodyNorm.includes(normalizeAccents(kw)));
  const coverage = found.length / keywords.length;
  return {
    name: 'keywords', weight,
    score: coverage >= 0.5 ? weight : coverage > 0 ? Math.round(weight * 0.6) : 0,
    maxScore: weight, status: coverage >= 0.5 ? 'pass' : coverage > 0 ? 'warning' : 'fail',
    details: `${found.length}/${keywords.length} keywords present. ${coverage >= 0.5 ? 'Good!' : 'Include more target keywords.'}`,
    found, missing: keywords.filter(kw => !bodyNorm.includes(normalizeAccents(kw))),
  };
}

function analyzeOpeningHook(body, weight) {
  const firstLine = body.split(/[.\n!?]/)[0] || '';
  const textOnly = firstLine.replace(/^[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]+/gu, '').trim();
  const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(firstLine);
  const hookPatterns = [
    /^(did you know|have you|imagine|picture this|what if|here's|discover|ever wonder|ready to|looking for|tired of|want to|the secret|top \d|best \d|\d+ |dive into|don't miss|breaking|attention)/i,
    /^(wist je|stel je voor|ontdek|ken je|klaar voor|op zoek naar|de beste|top \d|\d+ |zin in|mis het niet|wat als|heb je|kom|geniet van|dit is|hier is|wil je|droom je)/i,
    /^(wusstest du|stell dir vor|entdecke|bereit für|auf der suche|die besten|top \d|\d+ )/i,
    /^(sabías que|imagina|descubre|listo para|buscas|los mejores|top \d|\d+ )/i,
  ];
  const hasHookWords = hookPatterns.some(p => p.test(textOnly));
  const endsQ = /[?!]$/.test(firstLine.trim());
  const hasHook = hasEmoji || hasHookWords || endsQ;
  const strong = (hasEmoji && hasHookWords) || (hasHookWords && endsQ);
  const isShort = firstLine.length <= 100;

  return {
    name: 'hook', weight,
    score: strong && isShort ? weight : hasHook && isShort ? Math.round(weight * 0.8) : hasHook ? Math.round(weight * 0.7) : Math.round(weight * 0.3),
    maxScore: weight, status: strong ? 'pass' : hasHook ? 'warning' : 'fail',
    details: `Opening: "${firstLine.substring(0, 60)}...". ${strong ? 'Excellent hook!' : hasHook ? 'Good hook.' : 'Start with an attention-grabber.'}`,
  };
}

function analyzeCallToAction(body, weight) {
  const ctaPatterns = [
    /\b(click|tap|swipe|visit|book|check out|discover|explore|learn more|sign up|subscribe|follow|share|comment|tag|save|try|get|grab|join|register|download|read more|contact|dm|message|come|go to|find out|don't miss|see you|watch|listen)\b/gi,
    /\b(klik|bezoek|ontdek|bekijk|boek|reserveer|lees meer|volg|deel|reageer|tag|bewaar|probeer|meld je aan|kom|ga naar|schrijf je in|mis het niet|tot ziens|plan|geniet|ervaar|neem contact|stuur|bel|check|doe mee)\b/gi,
    /\b(besuchen|entdecken|buchen|folgen|teilen|kommentieren|speichern|klicken|mehr erfahren|jetzt|mitmachen)\b/gi,
    /\b(descubre|visita|reserva|comparte|sigue|comenta|guarda|haz clic|únete|no te pierdas|ven)\b/gi,
    /👉|⬇️|🔗|📩|📞|💬|➡️|🎫|🔥|✨/g,
    /\b(link in bio|link in beschrijving|swipe up)\b/gi,
  ];
  let ctaCount = 0;
  for (const pattern of ctaPatterns) {
    const matches = body.match(pattern);
    if (matches) ctaCount += matches.length;
  }
  const strong = ctaCount >= 2;
  const has = ctaCount > 0;
  return {
    name: 'cta', weight,
    score: strong ? weight : has ? Math.round(weight * 0.7) : 0,
    maxScore: weight, status: strong ? 'pass' : has ? 'warning' : 'fail',
    details: `${ctaCount} CTA(s). ${strong ? 'Strong CTA!' : has ? 'Consider a clearer CTA.' : 'Add a call-to-action.'}`,
  };
}

// Video-specific helpers

function analyzeVideoHook(body, weight) {
  const lines = body.split('\n').filter(l => l.trim());
  const firstLine = lines[0] || '';
  const hookWords = /\b(attention|watch|look|imagine|what if|did you know|stop|wait|here's|breaking|secret|amazing)\b/i;
  const hasHook = hookWords.test(firstLine) || firstLine.endsWith('?') || firstLine.endsWith('!');
  return {
    name: 'video_hook', weight,
    score: hasHook ? weight : firstLine.length > 0 ? Math.round(weight * 0.5) : 0,
    maxScore: weight, status: hasHook ? 'pass' : 'warning',
    details: `Opening: "${firstLine.substring(0, 50)}...". ${hasHook ? 'Strong hook!' : 'Start with an attention-grabbing hook.'}`,
  };
}

function analyzeScriptStructure(body, weight) {
  const scenes = body.match(/\b(scene|scène|shot|take|intro|outro|segment|deel|opening|closing|b-roll|voice.?over|vo:|narrator)\b/gi) || [];
  const times = body.match(/\b(\d+:\d+|\d+s|\d+ sec|\d+ seconds)\b/gi) || [];
  const good = scenes.length >= 3 && times.length >= 1;
  const ok = scenes.length >= 2 || times.length >= 2;
  return {
    name: 'script_structure', weight,
    score: good ? weight : ok ? Math.round(weight * 0.7) : scenes.length > 0 ? Math.round(weight * 0.4) : Math.round(weight * 0.2),
    maxScore: weight, status: good ? 'pass' : ok ? 'warning' : 'fail',
    details: `${scenes.length} scene markers, ${times.length} timing cues. ${good ? 'Well-structured!' : 'Add scene markers and timing.'}`,
  };
}

function analyzeVideoLength(body, weight) {
  const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;
  const good = wordCount >= 200 && wordCount <= 800;
  const ok = wordCount >= 100 && wordCount <= 1200;
  return {
    name: 'script_length', weight,
    score: good ? weight : ok ? Math.round(weight * 0.6) : Math.round(weight * 0.3),
    maxScore: weight, status: good ? 'pass' : ok ? 'warning' : 'fail',
    details: `${wordCount} words (target: 200-800). ${good ? 'Good length!' : ''}`,
  };
}

function analyzeVisualCues(body, weight) {
  const visuals = body.match(/\b(show|display|cut to|pan|zoom|close.?up|wide shot|aerial|drone|b-roll|overlay|text on screen|graphic|animation|transition|toon|laat zien)\b/gi) || [];
  const good = visuals.length >= 4;
  const ok = visuals.length >= 2;
  return {
    name: 'visual_cues', weight,
    score: good ? weight : ok ? Math.round(weight * 0.7) : visuals.length > 0 ? Math.round(weight * 0.4) : Math.round(weight * 0.1),
    maxScore: weight, status: good ? 'pass' : ok ? 'warning' : 'fail',
    details: `${visuals.length} visual cues. ${good ? 'Good visual guidance!' : 'Add visual directions.'}`,
  };
}

function getGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export { PLATFORM_CHECKS };
export default { analyzeContent, analyzeBlogSEO, analyzeSocialScore, analyzeVideoScore, PLATFORM_CHECKS };
