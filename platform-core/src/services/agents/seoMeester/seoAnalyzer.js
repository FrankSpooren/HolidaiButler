/**
 * SEO Analyzer — Meta checks, keyword density, heading structure analysis
 * Performs comprehensive SEO analysis on content items.
 *
 * @version 1.0.0
 */

import { calculateReadability } from './readabilityScore.js';
import { findLinkSuggestions, analyzeLinkDensity } from './internalLinker.js';
import logger from '../../../utils/logger.js';

/**
 * Run full SEO analysis on a content item
 * @param {Object} contentItem - { title, body_en, seo_data, content_type, keyword_cluster }
 * @param {number} destinationId
 * @returns {Object} SEO analysis result with score and recommendations
 */
export async function analyzeContent(contentItem, destinationId) {
  const body = contentItem.body_en || '';
  const title = contentItem.title || '';
  const seoData = contentItem.seo_data || {};
  const keywords = contentItem.keyword_cluster || [];
  const lang = 'en'; // Analyze English version as primary

  const checks = [];
  let totalScore = 0;
  let maxScore = 0;

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
  const lengthCheck = analyzeContentLength(body, contentItem.content_type);
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

  // Calculate overall score (0-100)
  const overallScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return {
    overallScore,
    grade: getGrade(overallScore),
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
