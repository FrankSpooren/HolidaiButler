import https from 'https';
import { logAgent, logError } from '../../../orchestrator/auditTrail/index.js';
import { getPreviousScan, calculatePerformanceTrend } from './trendHelper.js';
import { raiseIssue, autoCloseIssues } from '../../base/agentIssues.js';

/**
 * UX/UI Reviewer Agent
 * Automated interface quality analysis based on HolidaiButler Design System
 *
 * Checks:
 * - Brand color compliance
 * - Typography consistency
 * - Accessibility (WCAG)
 * - Mobile responsiveness
 * - UX principles (Miller's Law, Hick's Law, etc.)
 */

// Per-destination brand colors (from CLAUDE.md)
const DESTINATION_BRAND_COLORS = {
  calpe: {
    headerGradientStart: '#7FA594',
    headerGradientMid: '#5E8B7E',
    headerGradientEnd: '#4A7066',
    goldenAccent: '#D4AF37',
    buttonPrimary: '#8BA99D',
    textPrimary: '#2C3E50',
    textSecondary: '#687684'
  },
  texel: {
    primaryColor: '#30c59b',
    secondaryColor: '#3572de',
    tertiaryColor: '#2a5cb8',
    accentColor: '#ecde3c',
    headerGradientStart: '#30c59b',
    headerGradientMid: '#28a883',
    headerGradientEnd: '#209070',
    buttonPrimary: '#30c59b',
    textPrimary: '#1a1a2e',
    textSecondary: '#666666',
    backgroundColor: '#f8fffe',
    footerBackground: '#1a1a2e'
  }
};

// Combined palette (union of all destination colors) for shared files
const ALL_BRAND_COLORS = [...new Set(
  Object.values(DESTINATION_BRAND_COLORS)
    .flatMap(dest => Object.values(dest))
    .map(c => c.toLowerCase())
)];

// Legacy export (Calpe defaults for backward compat)
const BRAND_COLORS = DESTINATION_BRAND_COLORS.calpe;

// UX Principles to validate
const UX_PRINCIPLES = {
  MILLERS_LAW: {
    name: "Miller's Law",
    description: 'Limit choices to 7±2 items',
    maxItems: 9
  },
  HICKS_LAW: {
    name: "Hick's Law",
    description: 'Use progressive disclosure',
    maxInitialOptions: 5
  },
  FITTS_LAW: {
    name: "Fitts' Law",
    description: 'Touch targets min 44x44px on mobile',
    minTouchTarget: 44
  },
  PROXIMITY: {
    name: 'Proximity Principle',
    description: 'Group related elements together'
  },
  JAKOBS_LAW: {
    name: "Jakob's Law",
    description: 'Use familiar patterns users know'
  }
};

// Accessibility checks (WCAG 2.1)
const WCAG_CHECKS = {
  COLOR_CONTRAST: {
    name: 'Color Contrast',
    level: 'AA',
    minRatio: 4.5
  },
  FOCUS_VISIBLE: {
    name: 'Focus Indicators',
    description: 'Interactive elements must have visible focus'
  },
  ALT_TEXT: {
    name: 'Image Alt Text',
    description: 'All images must have alt text'
  },
  SEMANTIC_HTML: {
    name: 'Semantic HTML',
    description: 'Use proper heading hierarchy and landmarks'
  },
  KEYBOARD_NAV: {
    name: 'Keyboard Navigation',
    description: 'All interactive elements accessible via keyboard'
  }
};

class UXReviewer {
  constructor() {
    this.reviewResults = [];
  }

  /**
   * Review a component or page file
   */
  async reviewFile(filePath, fileContent) {
    console.log(`[De Stylist] Reviewing: ${filePath}`);

    const review = {
      file: filePath,
      timestamp: new Date().toISOString(),
      scores: {},
      issues: [],
      warnings: [],
      passed: []
    };

    try {
      // 1. Check brand colors
      const colorResult = this.checkBrandColors(fileContent, filePath);
      review.scores.brandColors = colorResult.score;
      review.issues.push(...colorResult.issues);
      review.passed.push(...colorResult.passed);

      // 2. Check typography
      const typoResult = this.checkTypography(fileContent);
      review.scores.typography = typoResult.score;
      review.issues.push(...typoResult.issues);
      review.passed.push(...typoResult.passed);

      // 3. Check accessibility
      const a11yResult = this.checkAccessibility(fileContent);
      review.scores.accessibility = a11yResult.score;
      review.issues.push(...a11yResult.issues);
      review.warnings.push(...a11yResult.warnings);
      review.passed.push(...a11yResult.passed);

      // 4. Check responsive design
      const responsiveResult = this.checkResponsiveDesign(fileContent);
      review.scores.responsive = responsiveResult.score;
      review.issues.push(...responsiveResult.issues);
      review.passed.push(...responsiveResult.passed);

      // 5. Check UX principles
      const uxResult = this.checkUXPrinciples(fileContent);
      review.scores.uxPrinciples = uxResult.score;
      review.warnings.push(...uxResult.warnings);
      review.passed.push(...uxResult.passed);

      // Calculate overall score
      const scores = Object.values(review.scores);
      review.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      review.status = review.overallScore >= 80 ? 'PASS' : review.overallScore >= 60 ? 'WARNING' : 'FAIL';

      await logAgent('dev-layer', 'ux_review_completed', {
        description: `UX review: ${filePath} - Score: ${review.overallScore}%`,
        metadata: { file: filePath, score: review.overallScore, status: review.status }
      });

      return review;
    } catch (error) {
      await logError('dev-layer', error, { action: 'ux_review', file: filePath });
      throw error;
    }
  }

  /**
   * Detect destination from file path
   */
  detectDestination(filePath) {
    if (!filePath) return null;
    const pathLower = filePath.toLowerCase();
    if (pathLower.includes('texel') || pathLower.includes('texelmaps')) return 'texel';
    if (pathLower.includes('calpe') || pathLower.includes('holidaibutler.com')) return 'calpe';
    return null; // Unknown — use combined palette
  }

  /**
   * Check brand color compliance (destination-aware)
   */
  checkBrandColors(content, filePath = null) {
    const result = { score: 100, issues: [], passed: [] };

    // Determine which color palette to use based on file path
    const destination = this.detectDestination(filePath);
    const brandColorValues = destination && DESTINATION_BRAND_COLORS[destination]
      ? Object.values(DESTINATION_BRAND_COLORS[destination]).map(c => c.toLowerCase())
      : ALL_BRAND_COLORS;

    // Check for non-brand colors (hex codes not in our palette)
    const hexPattern = /#[0-9A-Fa-f]{6}\b/g;
    const foundColors = content.match(hexPattern) || [];

    const nonBrandColors = foundColors.filter(c =>
      !brandColorValues.includes(c.toLowerCase()) &&
      !['#ffffff', '#000000', '#fff', '#000'].includes(c.toLowerCase())
    );

    if (nonBrandColors.length > 0) {
      const uniqueNonBrand = [...new Set(nonBrandColors)];
      result.score -= Math.min(30, uniqueNonBrand.length * 5);
      result.issues.push({
        type: 'BRAND_COLOR_VIOLATION',
        severity: 'warning',
        message: `Found ${uniqueNonBrand.length} non-brand colors: ${uniqueNonBrand.slice(0, 3).join(', ')}`,
        recommendation: 'Use brand colors from Design System: ' + Object.keys(BRAND_COLORS).join(', ')
      });
    } else {
      result.passed.push('All colors are from brand palette');
    }

    // Check for golden accent usage in CTAs
    if (content.includes('button') || content.includes('Button')) {
      if (!content.includes(BRAND_COLORS.goldenAccent) && !content.includes('goldenAccent')) {
        result.warnings = result.warnings || [];
        result.warnings.push({
          type: 'CTA_COLOR',
          severity: 'info',
          message: 'Consider using golden accent (#D4AF37) for primary CTAs'
        });
      }
    }

    return result;
  }

  /**
   * Check typography consistency
   */
  checkTypography(content) {
    const result = { score: 100, issues: [], passed: [] };

    // Check for Inter font usage
    if (content.includes('font-family') && !content.includes('Inter')) {
      result.score -= 20;
      result.issues.push({
        type: 'FONT_VIOLATION',
        severity: 'error',
        message: 'Non-standard font detected. Use Inter as primary font.',
        recommendation: "font-family: 'Inter', sans-serif"
      });
    } else if (content.includes('Inter')) {
      result.passed.push('Using Inter font family');
    }

    // Check for consistent heading sizes
    const headingSizes = content.match(/text-\d+xl|font-size:\s*\d+px/g) || [];
    if (headingSizes.length > 0) {
      result.passed.push('Typography sizing detected');
    }

    // Check for Tailwind typography classes
    if (content.includes('className') || content.includes('class=')) {
      const hasTailwindText = /text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)/.test(content);
      if (hasTailwindText) {
        result.passed.push('Using Tailwind typography scale');
      }
    }

    return result;
  }

  /**
   * Check accessibility compliance
   */
  checkAccessibility(content) {
    const result = { score: 100, issues: [], warnings: [], passed: [] };

    // Check for alt text on images
    const imgTags = content.match(/<img[^>]*>/gi) || [];
    const imgsWithoutAlt = imgTags.filter(img => !img.includes('alt='));

    if (imgsWithoutAlt.length > 0) {
      result.score -= 15;
      result.issues.push({
        type: 'MISSING_ALT_TEXT',
        severity: 'error',
        message: `${imgsWithoutAlt.length} image(s) missing alt text`,
        wcag: 'WCAG 2.1 - 1.1.1 Non-text Content'
      });
    } else if (imgTags.length > 0) {
      result.passed.push('All images have alt text');
    }

    // Check for aria labels on interactive elements
    const buttons = content.match(/<button[^>]*>/gi) || [];
    const buttonsWithoutLabel = buttons.filter(btn =>
      !btn.includes('aria-label') && !btn.includes('>')
    );

    if (buttonsWithoutLabel.length > 0) {
      result.warnings.push({
        type: 'MISSING_ARIA_LABEL',
        severity: 'warning',
        message: 'Some buttons may need aria-label for screen readers'
      });
    }

    // Check for semantic HTML
    const hasSemanticElements = /(<header|<nav|<main|<footer|<article|<section|<aside)/i.test(content);
    if (hasSemanticElements) {
      result.passed.push('Using semantic HTML elements');
    } else if (content.includes('<div') && content.length > 500) {
      result.warnings.push({
        type: 'SEMANTIC_HTML',
        severity: 'info',
        message: 'Consider using semantic HTML elements (header, nav, main, footer)'
      });
    }

    // Check for focus visible styles
    if (content.includes(':focus') || content.includes('focus:') || content.includes('focus-visible')) {
      result.passed.push('Focus styles defined');
    } else if (content.includes('button') || content.includes('input') || content.includes('a ')) {
      result.warnings.push({
        type: 'FOCUS_STYLES',
        severity: 'warning',
        message: 'Add focus styles for keyboard navigation'
      });
    }

    // Check for heading hierarchy
    const headings = content.match(/<h[1-6][^>]*>/gi) || [];
    if (headings.length > 0) {
      const levels = headings.map(h => parseInt(h.match(/h([1-6])/i)[1]));
      const hasSkippedLevel = levels.some((level, i) => i > 0 && level - levels[i-1] > 1);

      if (hasSkippedLevel) {
        result.score -= 10;
        result.issues.push({
          type: 'HEADING_HIERARCHY',
          severity: 'warning',
          message: 'Heading levels should not skip (e.g., h1 → h3)',
          wcag: 'WCAG 2.1 - 1.3.1 Info and Relationships'
        });
      } else {
        result.passed.push('Proper heading hierarchy');
      }
    }

    return result;
  }

  /**
   * Check responsive design
   */
  checkResponsiveDesign(content) {
    const result = { score: 100, issues: [], passed: [] };

    // Check for responsive breakpoints
    const hasBreakpoints = /sm:|md:|lg:|xl:|@media/.test(content);
    if (hasBreakpoints) {
      result.passed.push('Responsive breakpoints detected');
    } else if (content.length > 200) {
      result.score -= 15;
      result.issues.push({
        type: 'NO_RESPONSIVE_DESIGN',
        severity: 'warning',
        message: 'No responsive breakpoints found',
        recommendation: 'Use Tailwind breakpoints: sm:, md:, lg:, xl:'
      });
    }

    // Check for mobile-first approach
    const mobileFirstPatterns = /flex-col|grid-cols-1|w-full|px-4|py-2/.test(content);
    if (mobileFirstPatterns) {
      result.passed.push('Mobile-first patterns detected');
    }

    // Check for touch-friendly sizes
    if (content.includes('button') || content.includes('Button')) {
      const hasMinSize = /min-h-\[44px\]|h-11|h-12|p-3|p-4/.test(content);
      if (!hasMinSize) {
        result.issues.push({
          type: 'TOUCH_TARGET_SIZE',
          severity: 'info',
          message: "Touch targets should be at least 44x44px (Fitts' Law)"
        });
      }
    }

    return result;
  }

  /**
   * Check UX principles compliance
   */
  checkUXPrinciples(content) {
    const result = { score: 100, warnings: [], passed: [] };

    // Miller's Law: Check for too many options
    const listItems = (content.match(/<li/gi) || []).length;
    const selectOptions = (content.match(/<option/gi) || []).length;
    const buttons = (content.match(/<button/gi) || []).length;

    if (listItems > UX_PRINCIPLES.MILLERS_LAW.maxItems) {
      result.score -= 10;
      result.warnings.push({
        type: 'MILLERS_LAW',
        message: `${listItems} list items may overwhelm users (max recommended: 7±2)`,
        recommendation: 'Consider grouping or paginating items'
      });
    }

    if (selectOptions > UX_PRINCIPLES.MILLERS_LAW.maxItems) {
      result.warnings.push({
        type: 'MILLERS_LAW',
        message: `${selectOptions} select options - consider grouping or search`
      });
    }

    // Hick's Law: Progressive disclosure
    if (buttons > UX_PRINCIPLES.HICKS_LAW.maxInitialOptions) {
      result.warnings.push({
        type: 'HICKS_LAW',
        message: `${buttons} buttons visible - consider progressive disclosure`
      });
    }

    // Check for loading states
    if (content.includes('fetch') || content.includes('async') || content.includes('await')) {
      if (!content.includes('loading') && !content.includes('Loading') && !content.includes('Spinner')) {
        result.warnings.push({
          type: 'LOADING_STATE',
          message: 'Async operations detected - ensure loading states are implemented'
        });
      } else {
        result.passed.push('Loading states implemented');
      }
    }

    // Check for error states
    if (content.includes('form') || content.includes('Form') || content.includes('input')) {
      if (!content.includes('error') && !content.includes('Error')) {
        result.warnings.push({
          type: 'ERROR_STATES',
          message: 'Form detected - ensure error states are handled'
        });
      } else {
        result.passed.push('Error handling detected');
      }
    }

    return result;
  }

  /**
   * Get brand colors reference (destination-aware)
   */
  getBrandColors(destination = null) {
    if (destination && DESTINATION_BRAND_COLORS[destination]) {
      return DESTINATION_BRAND_COLORS[destination];
    }
    return BRAND_COLORS;
  }

  /**
   * Get UX principles reference
   */
  getUXPrinciples() {
    return UX_PRINCIPLES;
  }

  /**
   * Get WCAG checks reference
   */
  getWCAGChecks() {
    return WCAG_CHECKS;
  }

  /**
   * Scheduled execution: HTTP-based performance check on all domains
   * Called by dev-dependency-audit BullMQ job (weekly Sunday 03:00)
   */
  async execute() {
    const domains = [
      { name: 'Calpe Frontend', url: 'https://holidaibutler.com' },
      { name: 'Texel Frontend', url: 'https://texelmaps.nl' },
      { name: 'Admin Portal', url: 'https://admin.holidaibutler.com' },
      { name: 'API Health', url: 'https://api.holidaibutler.com/health' }
    ];

    const results = {
      timestamp: new Date().toISOString(),
      checks: [],
      error: null
    };

    for (const domain of domains) {
      const start = Date.now();
      try {
        const res = await new Promise((resolve, reject) => {
          const req = https.get(domain.url, { timeout: 10000 }, (response) => {
            const ttfb = Date.now() - start;
            let body = '';
            response.on('data', chunk => { body += chunk; });
            response.on('end', () => {
              resolve({
                name: domain.name,
                url: domain.url,
                status: response.statusCode,
                ttfb: ttfb,
                contentLength: parseInt(response.headers['content-length']) || body.length,
                headers: {
                  server: response.headers['server'] || 'hidden',
                  xFrameOptions: response.headers['x-frame-options'] || 'MISSING',
                  xContentTypeOptions: response.headers['x-content-type-options'] || 'MISSING',
                  referrerPolicy: response.headers['referrer-policy'] || 'MISSING'
                }
              });
            });
          });
          req.on('error', reject);
          req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        });
        results.checks.push(res);
      } catch (e) {
        results.checks.push({
          name: domain.name,
          url: domain.url,
          status: 0,
          error: e.message,
          ttfb: Date.now() - start
        });
      }
    }

    // Summary
    const allOk = results.checks.every(c => c.status >= 200 && c.status < 400);
    const avgTtfb = Math.round(results.checks.reduce((s, c) => s + (c.ttfb || 0), 0) / results.checks.length);
    const missingHeaders = results.checks.filter(c =>
      c.headers && (c.headers.xFrameOptions === 'MISSING' || c.headers.xContentTypeOptions === 'MISSING')
    ).length;

    // Trending: compare with previous scan
    const prevScan = await getPreviousScan('ux-ui-reviewer', 'performance_check');
    const trend = calculatePerformanceTrend(results.checks, prevScan?.checks);
    results.trend = trend;

    try {
      await logAgent('ux-ui-reviewer', 'performance_check', {
        description: `Performance check: ${results.checks.length} domains, avg TTFB ${avgTtfb}ms, ${missingHeaders} missing headers [${trend.direction}]`,
        status: allOk ? 'completed' : 'failed',
        metadata: results
      });
    } catch (logErr) {
      console.error('[UXReviewer] Failed to log performance check:', logErr.message);
    }

    // Fase 11B: Raise/auto-close issues
    try {
      const activeFingerprints = [];
      for (const check of results.checks) {
        const ttfb = parseInt(check.ttfb) || 0;
        if (ttfb > 2000) {
          const fp = 'perf-slow-' + check.name.toLowerCase().replace(/\s/g, '-');
          activeFingerprints.push(fp);
          await raiseIssue({
            agentName: 'ux-ui-reviewer', agentLabel: 'De Stylist',
            severity: ttfb > 5000 ? 'high' : 'medium', category: 'performance',
            title: `${check.name} TTFB ${ttfb}ms (> 2s drempel)`,
            description: 'Time To First Byte overschrijdt acceptabele drempel',
            details: check, fingerprint: fp
          });
        }
        if (check.headers?.xFrameOptions === 'MISSING') {
          const fp = 'perf-header-missing-' + check.name.toLowerCase().replace(/\s/g, '-');
          activeFingerprints.push(fp);
          await raiseIssue({
            agentName: 'ux-ui-reviewer', agentLabel: 'De Stylist',
            severity: 'medium', category: 'performance',
            title: `${check.name}: X-Frame-Options header ontbreekt`,
            details: check, fingerprint: fp
          });
        }
      }
      await autoCloseIssues('ux-ui-reviewer', 'performance', activeFingerprints);
    } catch (issueErr) {
      console.error('[UXReviewer] Issue tracking error:', issueErr.message);
    }

    console.log(`[UXReviewer] Performance check: ${results.checks.length} domains, avg TTFB ${avgTtfb}ms, all OK: ${allOk} [${trend.direction}]`);
    return results;
  }
}

export { BRAND_COLORS, DESTINATION_BRAND_COLORS, UX_PRINCIPLES, WCAG_CHECKS };
export default new UXReviewer();
