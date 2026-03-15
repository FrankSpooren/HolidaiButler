/**
 * SEO Analyzer — Content-type-aware SEO analysis
 * Blog posts: full SEO metrics (meta, headings, links, length, keywords, readability)
 * Social posts: platform-appropriate metrics (hashtags, CTA, caption length, emoji, mentions)
 * Video scripts: video-appropriate metrics (hook, CTA, scene structure, pacing)
 *
 * @version 2.0.0
 */

import { calculateReadability } from './readabilityScore.js';
import { findLinkSuggestions, analyzeLinkDensity } from './internalLinker.js';
import logger from '../../../utils/logger.js';

/**
 * Run full SEO analysis on a content item — content-type-aware
 * @param {Object} contentItem - { title, body_en, seo_data, content_type, keyword_cluster }
 * @param {number} destinationId
 * @returns {Object} SEO analysis result with score and recommendations
 */
export async function analyzeContent(contentItem, destinationId) {
  const body = contentItem.body_en || '';
  const title = contentItem.title || '';
  const seoData = contentItem.seo_data || {};
  const keywords = contentItem.keyword_cluster || [];
  const contentType = contentItem.content_type || 'blog';
  const lang = 'en';

  const checks = [];
  let totalScore = 0;
  let maxScore = 0;

  if (contentType === 'social_post') {
    // --- SOCIAL POST metrics ---
    // 1. Caption length (platform-appropriate)
    const captionCheck = analyzeCaptionLength(body);
    checks.push(captionCheck);
    totalScore += captionCheck.score;
    maxScore += captionCheck.maxScore;

    // 2. Hashtags
    const hashtagCheck = analyzeHashtags(body);
    checks.push(hashtagCheck);
    totalScore += hashtagCheck.score;
    maxScore += hashtagCheck.maxScore;

    // 3. Call-to-action
    const ctaCheck = analyzeCallToAction(body);
    checks.push(ctaCheck);
    totalScore += ctaCheck.score;
    maxScore += ctaCheck.maxScore;

    // 4. Emoji usage
    const emojiCheck = analyzeEmojiUsage(body);
    checks.push(emojiCheck);
    totalScore += emojiCheck.score;
    maxScore += emojiCheck.maxScore;

    // 5. Keyword presence
    const keywordCheck = analyzeKeywordPresence(body, keywords);
    checks.push(keywordCheck);
    totalScore += keywordCheck.score;
    maxScore += keywordCheck.maxScore;

    // 6. Readability (lighter weight for social)
    const readability = calculateReadability(body, lang);
    const readabilityCheck = {
      name: 'Readability',
      score: readability.score >= 40 ? 10 : readability.score >= 20 ? 7 : 3,
      maxScore: 10,
      status: readability.score >= 40 ? 'pass' : readability.score >= 20 ? 'warning' : 'fail',
      details: `Readability: ${readability.score} (${readability.label}). Social posts should be easy to scan.`,
      readabilityData: readability,
    };
    checks.push(readabilityCheck);
    totalScore += readabilityCheck.score;
    maxScore += readabilityCheck.maxScore;

    // 7. Opening hook
    const hookCheck = analyzeOpeningHook(body);
    checks.push(hookCheck);
    totalScore += hookCheck.score;
    maxScore += hookCheck.maxScore;

  } else if (contentType === 'video_script') {
    // --- VIDEO SCRIPT metrics ---
    // 1. Hook (first 5 seconds / first line)
    const hookCheck = analyzeVideoHook(body);
    checks.push(hookCheck);
    totalScore += hookCheck.score;
    maxScore += hookCheck.maxScore;

    // 2. Script structure (scenes/segments)
    const structureCheck = analyzeScriptStructure(body);
    checks.push(structureCheck);
    totalScore += structureCheck.score;
    maxScore += structureCheck.maxScore;

    // 3. CTA
    const ctaCheck = analyzeCallToAction(body);
    checks.push(ctaCheck);
    totalScore += ctaCheck.score;
    maxScore += ctaCheck.maxScore;

    // 4. Script length / pacing
    const lengthCheck = analyzeContentLength(body, 'video_script');
    checks.push(lengthCheck);
    totalScore += lengthCheck.score;
    maxScore += lengthCheck.maxScore;

    // 5. Keyword presence
    const keywordCheck = analyzeKeywordPresence(body, keywords);
    checks.push(keywordCheck);
    totalScore += keywordCheck.score;
    maxScore += keywordCheck.maxScore;

    // 6. Readability
    const readability = calculateReadability(body, lang);
    const readabilityCheck = {
      name: 'Readability',
      score: readability.score >= 50 ? 10 : readability.score >= 30 ? 5 : 0,
      maxScore: 10,
      status: readability.score >= 50 ? 'pass' : readability.score >= 30 ? 'warning' : 'fail',
      details: `Readability: ${readability.score} (${readability.label}). Video scripts should be conversational.`,
      readabilityData: readability,
    };
    checks.push(readabilityCheck);
    totalScore += readabilityCheck.score;
    maxScore += readabilityCheck.maxScore;

    // 7. Visual cues
    const visualCheck = analyzeVisualCues(body);
    checks.push(visualCheck);
    totalScore += visualCheck.score;
    maxScore += visualCheck.maxScore;

  } else {
    // --- BLOG metrics (original 7 checks) ---
    // 1. Title analysis
    const titleCheck = analyzeTitle(title);
    checks.push(titleCheck);
    totalScore += titleCheck.score;
    maxScore += titleCheck.maxScore;

    // 2. Meta description
    const metaCheck = analyzeMetaDescription(seoData.meta_description || '');
    checks.push(metaCheck);
    totalScore += metaCheck.score;
    maxScore += metaCheck.maxScore;

    // 3. Heading structure
    const headingCheck = analyzeHeadings(body);
    checks.push(headingCheck);
    totalScore += headingCheck.score;
    maxScore += headingCheck.maxScore;

    // 4. Keyword density
    const keywordCheck = analyzeKeywordDensity(body, keywords);
    checks.push(keywordCheck);
    totalScore += keywordCheck.score;
    maxScore += keywordCheck.maxScore;

    // 5. Readability
    const readability = calculateReadability(body, lang);
    const readabilityCheck = {
      name: 'Readability',
      score: readability.score >= 50 ? 10 : readability.score >= 30 ? 5 : 0,
      maxScore: 10,
      status: readability.score >= 50 ? 'pass' : readability.score >= 30 ? 'warning' : 'fail',
      details: `Flesch-Kincaid: ${readability.score} (${readability.label}), ${readability.words} words, ${readability.sentences} sentences`,
      readabilityData: readability,
    };
    checks.push(readabilityCheck);
    totalScore += readabilityCheck.score;
    maxScore += readabilityCheck.maxScore;

    // 6. Content length
    const lengthCheck = analyzeContentLength(body, 'blog');
    checks.push(lengthCheck);
    totalScore += lengthCheck.score;
    maxScore += lengthCheck.maxScore;

    // 7. Internal links
    const linkDensity = analyzeLinkDensity(body);
    let linkSuggestions = [];
    try {
      linkSuggestions = await findLinkSuggestions(body, destinationId);
    } catch (err) {
      logger.warn('[SEOAnalyzer] Link suggestion lookup failed:', err.message);
    }
    const linkCheck = {
      name: 'Internal Links',
      score: linkDensity.totalLinks >= 2 ? 10 : linkDensity.totalLinks >= 1 ? 5 : 0,
      maxScore: 10,
      status: linkDensity.totalLinks >= 2 ? 'pass' : linkDensity.totalLinks >= 1 ? 'warning' : 'fail',
      details: `${linkDensity.totalLinks} links found. ${linkDensity.recommendation}`,
      linkSuggestions: linkSuggestions.slice(0, 5),
    };
    checks.push(linkCheck);
    totalScore += linkCheck.score;
    maxScore += linkCheck.maxScore;
  }

  // Calculate overall score (0-100)
  const overallScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return {
    overallScore,
    grade: getGrade(overallScore),
    contentType,
    checks,
    recommendations: checks.filter(c => c.status !== 'pass').map(c => c.details),
    analyzedAt: new Date().toISOString(),
  };
}

function analyzeTitle(title) {
  const len = title.length;
  const isGoodLength = len >= 50 && len <= 60;
  const hasGoodLength = len >= 30 && len <= 70;

  return {
    name: 'Title Length',
    score: isGoodLength ? 10 : hasGoodLength ? 7 : len > 0 ? 3 : 0,
    maxScore: 10,
    status: isGoodLength ? 'pass' : hasGoodLength ? 'warning' : 'fail',
    details: `Title: ${len} chars (optimal: 50-60). ${isGoodLength ? 'Good!' : len < 50 ? 'Too short — add more descriptive keywords.' : 'Too long — search engines may truncate.'}`,
  };
}

function analyzeMetaDescription(meta) {
  const len = meta.length;
  const isGoodLength = len >= 150 && len <= 160;
  const hasContent = len >= 100 && len <= 200;

  return {
    name: 'Meta Description',
    score: isGoodLength ? 10 : hasContent ? 6 : len > 0 ? 3 : 0,
    maxScore: 10,
    status: isGoodLength ? 'pass' : hasContent ? 'warning' : 'fail',
    details: `Meta description: ${len} chars (optimal: 150-160). ${len === 0 ? 'Missing! Add a compelling meta description.' : isGoodLength ? 'Good!' : 'Adjust length for best search display.'}`,
  };
}

function analyzeHeadings(body) {
  const h1Count = (body.match(/^#\s+/gm) || []).length + (body.match(/<h1/gi) || []).length;
  const h2Count = (body.match(/^##\s+/gm) || []).length + (body.match(/<h2/gi) || []).length;
  const h3Count = (body.match(/^###\s+/gm) || []).length + (body.match(/<h3/gi) || []).length;
  const hasProperHierarchy = h2Count > 0;
  const noMultipleH1 = h1Count <= 1;

  let score = 0;
  if (hasProperHierarchy) score += 5;
  if (noMultipleH1) score += 3;
  if (h3Count > 0) score += 2;

  return {
    name: 'Heading Structure',
    score,
    maxScore: 10,
    status: score >= 8 ? 'pass' : score >= 5 ? 'warning' : 'fail',
    details: `H1: ${h1Count}, H2: ${h2Count}, H3: ${h3Count}. ${!hasProperHierarchy ? 'Add H2 headings for better structure.' : ''} ${!noMultipleH1 ? 'Use only one H1.' : ''}`.trim(),
  };
}

function analyzeKeywordDensity(body, keywords) {
  if (!keywords || keywords.length === 0) {
    return {
      name: 'Keyword Density',
      score: 5,
      maxScore: 10,
      status: 'warning',
      details: 'No target keywords specified — cannot analyze keyword density.',
    };
  }

  const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount === 0) {
    return { name: 'Keyword Density', score: 0, maxScore: 10, status: 'fail', details: 'No content to analyze.' };
  }

  const bodyLower = body.toLowerCase();
  const densities = keywords.map(kw => {
    const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = bodyLower.match(regex);
    const count = matches ? matches.length : 0;
    const density = Math.round((count / wordCount) * 100 * 10) / 10;
    return { keyword: kw, count, density };
  });

  const avgDensity = densities.reduce((s, d) => s + d.density, 0) / densities.length;
  const hasKeywords = densities.some(d => d.count > 0);
  const isGoodDensity = avgDensity >= 0.5 && avgDensity <= 3;

  return {
    name: 'Keyword Density',
    score: isGoodDensity ? 10 : hasKeywords ? 6 : 0,
    maxScore: 10,
    status: isGoodDensity ? 'pass' : hasKeywords ? 'warning' : 'fail',
    details: `Avg density: ${avgDensity.toFixed(1)}% (optimal: 0.5-3%). ${densities.map(d => `"${d.keyword}": ${d.count}x (${d.density}%)`).join(', ')}`,
    keywords: densities,
  };
}

// === SOCIAL POST analysis functions ===

function analyzeCaptionLength(body) {
  const len = body.length;
  // Instagram optimal: 138-150 chars for engagement, max 2200
  // Facebook optimal: 40-80 chars, max 63206
  // LinkedIn optimal: 25-50 chars for headline
  // General social: 100-300 chars is the sweet spot
  const isGood = len >= 80 && len <= 300;
  const isAcceptable = len >= 40 && len <= 600;

  return {
    name: 'Caption Length',
    score: isGood ? 10 : isAcceptable ? 7 : len > 0 ? 3 : 0,
    maxScore: 10,
    status: isGood ? 'pass' : isAcceptable ? 'warning' : 'fail',
    details: `Caption: ${len} chars (optimal: 80-300). ${isGood ? 'Good length!' : len < 80 ? 'Too short — add more engaging copy.' : len > 600 ? 'Too long — consider shortening for better engagement.' : 'Acceptable, but could be optimized.'}`,
  };
}

function analyzeHashtags(body) {
  const hashtags = body.match(/#\w+/g) || [];
  const count = hashtags.length;
  // Instagram: 3-5 targeted > 30 spammy. Facebook/LinkedIn: 1-3 max
  const isGood = count >= 3 && count <= 8;
  const hasAny = count >= 1;

  return {
    name: 'Hashtags',
    score: isGood ? 10 : hasAny ? 6 : 0,
    maxScore: 10,
    status: isGood ? 'pass' : hasAny ? 'warning' : 'fail',
    details: `${count} hashtags (optimal: 3-8). ${count === 0 ? 'Add relevant hashtags for discoverability.' : isGood ? 'Good hashtag count!' : count > 8 ? 'Too many hashtags — looks spammy.' : 'Add more targeted hashtags.'}`,
    hashtags,
  };
}

function analyzeCallToAction(body) {
  const ctaPatterns = [
    /\b(click|tap|swipe|visit|book|check out|discover|explore|learn more|sign up|subscribe|follow|share|comment|tag|save|try|get|grab|join|register|download|read more|find out|contact|reach out|dm|message)\b/gi,
    /\b(klik|bezoek|ontdek|bekijk|boek|reserveer|lees meer|volg|deel|reageer|tag|bewaar|probeer|meld je aan)\b/gi,
    /👉|⬇️|🔗|📩|📞|💬|➡️/g,
    /\b(link in bio|link in beschrijving|swipe up)\b/gi,
  ];

  let ctaCount = 0;
  for (const pattern of ctaPatterns) {
    const matches = body.match(pattern);
    if (matches) ctaCount += matches.length;
  }

  const hasCta = ctaCount > 0;
  const hasStrongCta = ctaCount >= 2;

  return {
    name: 'Call-to-Action',
    score: hasStrongCta ? 10 : hasCta ? 7 : 0,
    maxScore: 10,
    status: hasStrongCta ? 'pass' : hasCta ? 'warning' : 'fail',
    details: `${ctaCount} CTA element(s) found. ${!hasCta ? 'Add a call-to-action (e.g., "Discover...", "Book now", "Link in bio").' : hasStrongCta ? 'Strong CTA presence!' : 'Consider adding a clearer call-to-action.'}`,
  };
}

function analyzeEmojiUsage(body) {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu;
  const emojis = body.match(emojiRegex) || [];
  const count = emojis.length;
  const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;
  const ratio = wordCount > 0 ? count / wordCount : 0;

  // Optimal: 1-5 emojis, not more than 1 per 10 words
  const isGood = count >= 1 && count <= 5 && ratio <= 0.15;
  const hasAny = count >= 1;

  return {
    name: 'Emoji Usage',
    score: isGood ? 10 : hasAny && count <= 10 ? 7 : hasAny ? 4 : 2,
    maxScore: 10,
    status: isGood ? 'pass' : hasAny && count <= 10 ? 'warning' : 'fail',
    details: `${count} emoji(s). ${count === 0 ? 'Add 1-5 emojis to boost engagement and visual appeal.' : isGood ? 'Good emoji usage!' : count > 10 ? 'Too many emojis — can appear unprofessional.' : 'Consider adjusting emoji count (1-5 optimal).'}`,
  };
}

function analyzeKeywordPresence(body, keywords) {
  if (!keywords || keywords.length === 0) {
    return {
      name: 'Keyword Presence',
      score: 5,
      maxScore: 10,
      status: 'warning',
      details: 'No target keywords specified — cannot verify keyword presence.',
    };
  }

  const bodyLower = body.toLowerCase();
  const found = keywords.filter(kw => bodyLower.includes(kw.toLowerCase()));
  const coverage = found.length / keywords.length;

  return {
    name: 'Keyword Presence',
    score: coverage >= 0.5 ? 10 : coverage > 0 ? 6 : 0,
    maxScore: 10,
    status: coverage >= 0.5 ? 'pass' : coverage > 0 ? 'warning' : 'fail',
    details: `${found.length}/${keywords.length} keywords present. ${coverage >= 0.5 ? 'Good keyword coverage!' : coverage > 0 ? 'Include more target keywords naturally.' : 'None of the target keywords found in content.'}`,
    found,
    missing: keywords.filter(kw => !bodyLower.includes(kw.toLowerCase())),
  };
}

function analyzeOpeningHook(body) {
  const firstLine = body.split(/[.\n!?]/)[0] || '';
  const hookPatterns = [
    /^(did you know|have you|imagine|picture this|what if|here's|discover|ever wonder|ready to|looking for|tired of|want to|the secret|top \d|best \d|\d+ )/i,
    /^(wist je|stel je voor|ontdek|ken je|klaar voor|op zoek naar|de beste|top \d|\d+ )/i,
    /[?!]$/,
    /[\u{1F300}-\u{1F9FF}]/u,
  ];

  const hasHook = hookPatterns.some(p => p.test(firstLine));
  const isShort = firstLine.length <= 100;

  return {
    name: 'Opening Hook',
    score: hasHook && isShort ? 10 : hasHook || isShort ? 7 : 3,
    maxScore: 10,
    status: hasHook && isShort ? 'pass' : hasHook || isShort ? 'warning' : 'fail',
    details: `Opening: "${firstLine.substring(0, 60)}${firstLine.length > 60 ? '...' : ''}". ${hasHook ? 'Strong hook!' : 'Start with a question, number, or attention-grabber to stop the scroll.'}`,
  };
}

// === VIDEO SCRIPT analysis functions ===

function analyzeVideoHook(body) {
  const lines = body.split('\n').filter(l => l.trim());
  const firstLine = lines[0] || '';
  const hookWords = /\b(attention|watch|look|imagine|what if|did you know|stop|wait|here's|breaking|secret|amazing|incredible)\b/i;
  const hookWordsNl = /\b(kijk|ontdek|stel je voor|wist je|stop|wacht|hier is|verbazingwekkend)\b/i;
  const hasHook = hookWords.test(firstLine) || hookWordsNl.test(firstLine) || firstLine.endsWith('?') || firstLine.endsWith('!');

  return {
    name: 'Video Hook',
    score: hasHook ? 10 : firstLine.length > 0 ? 5 : 0,
    maxScore: 10,
    status: hasHook ? 'pass' : 'warning',
    details: `Opening line: "${firstLine.substring(0, 50)}${firstLine.length > 50 ? '...' : ''}". ${hasHook ? 'Strong opening hook!' : 'Start with an attention-grabbing hook (question, bold statement, surprising fact). You have 3 seconds.'}`,
  };
}

function analyzeScriptStructure(body) {
  const sceneMarkers = body.match(/\b(scene|scène|shot|take|intro|outro|segment|deel|opening|closing|b-roll|voice.?over|vo:|narrator)\b/gi) || [];
  const timeMarkers = body.match(/\b(\d+:\d+|\d+s|\d+ sec|\d+ seconds|\d+ seconden)\b/gi) || [];
  const hasStructure = sceneMarkers.length >= 2 || timeMarkers.length >= 2;
  const hasGoodStructure = sceneMarkers.length >= 3 && timeMarkers.length >= 1;

  return {
    name: 'Script Structure',
    score: hasGoodStructure ? 10 : hasStructure ? 7 : sceneMarkers.length > 0 ? 4 : 2,
    maxScore: 10,
    status: hasGoodStructure ? 'pass' : hasStructure ? 'warning' : 'fail',
    details: `${sceneMarkers.length} scene markers, ${timeMarkers.length} timing cues. ${hasGoodStructure ? 'Well-structured script!' : 'Add scene markers (Scene 1, Intro, B-roll) and timing cues for production clarity.'}`,
  };
}

function analyzeVisualCues(body) {
  const visualPatterns = /\b(show|display|cut to|pan|zoom|close.?up|wide shot|aerial|drone|b-roll|overlay|text on screen|graphic|animation|transition|toon|laat zien|beeld|overgang)\b/gi;
  const visuals = body.match(visualPatterns) || [];
  const hasVisuals = visuals.length >= 2;
  const hasGoodVisuals = visuals.length >= 4;

  return {
    name: 'Visual Cues',
    score: hasGoodVisuals ? 10 : hasVisuals ? 7 : visuals.length > 0 ? 4 : 1,
    maxScore: 10,
    status: hasGoodVisuals ? 'pass' : hasVisuals ? 'warning' : 'fail',
    details: `${visuals.length} visual direction cues. ${hasGoodVisuals ? 'Good visual guidance!' : 'Add visual directions (show, cut to, zoom, B-roll) to guide video production.'}`,
  };
}

// === BLOG analysis functions (original) ===

function analyzeContentLength(body, contentType) {
  const wordCount = body.split(/\s+/).filter(w => w.length > 0).length;
  const specs = { blog: { min: 800, max: 1500 }, social_post: { min: 20, max: 400 }, video_script: { min: 200, max: 800 } };
  const spec = specs[contentType] || specs.blog;
  const isGood = wordCount >= spec.min && wordCount <= spec.max;
  const isAcceptable = wordCount >= spec.min * 0.7 && wordCount <= spec.max * 1.3;

  return {
    name: 'Content Length',
    score: isGood ? 10 : isAcceptable ? 6 : wordCount > 0 ? 3 : 0,
    maxScore: 10,
    status: isGood ? 'pass' : isAcceptable ? 'warning' : 'fail',
    details: `${wordCount} words (target: ${spec.min}-${spec.max} for ${contentType}). ${isGood ? 'Good!' : wordCount < spec.min ? 'Content is too short.' : 'Content is too long.'}`,
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

export default { analyzeContent };
