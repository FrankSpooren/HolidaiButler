/**
 * Content Formatter — Platform-specific formatting for social media and blog content.
 * Handles character limits, hashtag generation, and platform constraints.
 *
 * @version 1.0.0
 */

const PLATFORM_LIMITS = {
  website: { maxChars: null, supportsMarkdown: true, supportsHashtags: false },
  facebook: { maxChars: 500, supportsMarkdown: false, supportsHashtags: true, maxHashtags: 5 },
  instagram: { maxChars: 2200, supportsMarkdown: false, supportsHashtags: true, maxHashtags: 15 },
  linkedin: { maxChars: 3000, supportsMarkdown: false, supportsHashtags: true, maxHashtags: 5 },
  x: { maxChars: 280, supportsMarkdown: false, supportsHashtags: true, maxHashtags: 2 },
  tiktok: { maxChars: 150, supportsMarkdown: false, supportsHashtags: true, maxHashtags: 5 },
  youtube: { maxChars: 5000, supportsMarkdown: false, supportsHashtags: true, maxHashtags: 15 },
  pinterest: { maxChars: 500, supportsMarkdown: false, supportsHashtags: true, maxHashtags: 5 },
};

const CONTENT_TYPE_SPECS = {
  blog: { minWords: 800, maxWords: 1500, headingStructure: 'H2/H3', seoOptimized: true },
  social_post: { minWords: 20, maxWords: 400, headingStructure: null, seoOptimized: false },
  video_script: { minWords: 200, maxWords: 800, headingStructure: 'scenes', seoOptimized: false },
};

/**
 * Format content for a specific platform
 */
export function formatForPlatform(content, platform) {
  const limits = PLATFORM_LIMITS[platform] || PLATFORM_LIMITS.website;

  let formatted = content;

  // Strip markdown for non-markdown platforms
  if (!limits.supportsMarkdown) {
    formatted = stripMarkdown(formatted);
  }

  // Truncate if over char limit
  if (limits.maxChars && formatted.length > limits.maxChars) {
    formatted = formatted.substring(0, limits.maxChars - 3) + '...';
  }

  return formatted;
}

/**
 * Generate hashtags from keywords
 */
export function generateHashtags(keywords, platform) {
  const limits = PLATFORM_LIMITS[platform] || {};
  const maxTags = limits.maxHashtags || 10;

  return keywords
    .slice(0, maxTags)
    .map(kw => '#' + kw.replace(/[^a-zA-Z0-9àáâãäåèéêëìíîïòóôõöùúûüñçÀ-ÿ]/g, ''))
    .filter(tag => tag.length > 1);
}

/**
 * Get content type specification
 */
export function getContentSpec(contentType) {
  return CONTENT_TYPE_SPECS[contentType] || CONTENT_TYPE_SPECS.blog;
}

/**
 * Build formatting instruction for Mistral AI prompt
 */
export function buildFormatInstruction(contentType, platform) {
  const spec = getContentSpec(contentType);
  const limits = PLATFORM_LIMITS[platform] || PLATFORM_LIMITS.website;

  let instruction = `FORMAT REQUIREMENTS:\n`;
  instruction += `- Content type: ${contentType}\n`;
  instruction += `- Word count: ${spec.minWords}-${spec.maxWords} words\n`;

  if (spec.headingStructure === 'H2/H3') {
    instruction += `- Use H2 and H3 headings for structure (markdown format)\n`;
    instruction += `- Include an engaging introduction and conclusion\n`;
  } else if (spec.headingStructure === 'scenes') {
    instruction += `- Structure as storyboard scenes: [Scene N: description] + text + visual + duration\n`;
  }

  if (limits.maxChars) {
    instruction += `- Maximum ${limits.maxChars} characters (platform: ${platform})\n`;
  }

  if (spec.seoOptimized) {
    instruction += `- SEO-optimized: use target keywords naturally in headings and first paragraph\n`;
    instruction += `- Include a compelling meta description (150-160 characters)\n`;
  }

  if (limits.supportsHashtags) {
    instruction += `- Include relevant hashtags at the end (max ${limits.maxHashtags || 10})\n`;
  }

  return instruction;
}

/**
 * Strip markdown formatting from text
 */
function stripMarkdown(text) {
  return text
    .replace(/#{1,6}\s+/g, '')       // headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1')     // italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/`(.+?)`/g, '$1')       // code
    .replace(/>\s+/g, '')            // blockquotes
    .replace(/[-*+]\s+/g, '• ')      // list items
    .trim();
}

export default {
  formatForPlatform,
  generateHashtags,
  getContentSpec,
  buildFormatInstruction,
  PLATFORM_LIMITS,
  CONTENT_TYPE_SPECS,
};
