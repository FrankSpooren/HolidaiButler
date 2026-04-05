/**
 * Content Sanitizer — strips ALL markdown/formatting artifacts
 * Safety net: runs on EVERY content output, even if prompts are correct.
 * EU AI Act: preserves ai_model and ai_generated metadata.
 *
 * @version 1.0.0
 */

const PLATFORM_RULES = {
  facebook: {
    maxChars: 500,
    emojiCount: '2-4',
    hashtagPosition: 'end',
    maxHashtags: 5,
  },
  instagram: {
    maxChars: 2200,
    emojiCount: '3-6',
    hashtagPosition: 'end_separated',
    maxHashtags: 15,
  },
  linkedin: {
    maxChars: 3000,
    emojiCount: '0-2',
    hashtagPosition: 'end',
    maxHashtags: 5,
  },
  x: {
    maxChars: 280,
    emojiCount: '0-1',
    hashtagPosition: 'inline',
    maxHashtags: 2,
  },
  tiktok: {
    maxChars: 150,
    emojiCount: '1-3',
    hashtagPosition: 'end',
    maxHashtags: 5,
  },
  youtube: {
    maxChars: 5000,
    emojiCount: '1-3',
    hashtagPosition: 'end',
    maxHashtags: 15,
  },
  pinterest: {
    maxChars: 500,
    emojiCount: '0-2',
    hashtagPosition: 'end',
    maxHashtags: 5,
  },
  snapchat: {
    maxChars: 80,
    emojiCount: '1-2',
    hashtagPosition: 'none',
    maxHashtags: 0,
  },
  website: {
    maxChars: null,
    emojiCount: '0',
    hashtagPosition: 'none',
    maxHashtags: 0,
  },
};

/**
 * Sanitize content — strips all markdown/formatting artifacts.
 * @param {string} rawContent - Raw AI-generated content
 * @param {string} contentType - 'blog' | 'social_post' | 'video_script'
 * @param {string} targetPlatform - Target platform key
 * @returns {string} Clean content ready for display/publish
 */
export function sanitizeContent(rawContent, contentType, targetPlatform) {
  if (!rawContent || typeof rawContent !== 'string') return '';

  let clean = rawContent;

  // === PHASE 1: Strip structural markdown ===
  // Headers (# ## ### etc.)
  clean = clean.replace(/^#{1,6}\s+/gm, '');
  // Horizontal rules (--- ___ ***)
  clean = clean.replace(/^[-_*]{3,}\s*$/gm, '');
  // Blockquotes (>)
  clean = clean.replace(/^>\s*/gm, '');
  // Code blocks (```)
  clean = clean.replace(/```[\s\S]*?```/g, '');
  // Inline code (`text`)
  clean = clean.replace(/`([^`]+)`/g, '$1');

  // === PHASE 2: Strip inline formatting + AI artifacts ===
  // Bold (**text** or __text__)
  clean = clean.replace(/\*\*(.+?)\*\*/g, '$1');
  clean = clean.replace(/__(.+?)__/g, '$1');
  // Italic (*text* or _text_) — careful with legitimate underscores/asterisks
  clean = clean.replace(/(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, '$1');

  // Em-dashes and en-dashes → comma or regular dash (AI artifact)
  clean = clean.replace(/\s*—\s*/g, ', ');   // em-dash → comma
  clean = clean.replace(/\s*–\s*/g, ' - ');  // en-dash → hyphen

  // Strip AI artifacts: bullet dots, smart quotes, special Unicode
  clean = clean.replace(/•/g, '');            // bullet character
  clean = clean.replace(/[""]/g, '"');         // smart double quotes → regular
  clean = clean.replace(/['']/g, "'");         // smart apostrophes → regular

  // Strip AI instruction brackets: [Link in Bio], [Image: ...], [Image recommendation: ...]
  clean = clean.replace(/\[(?:Link in Bio|Image(?:\s+recommendation)?:\s*[^\]]*)\]/gi, '');
  // Strip AI image suggestion paragraphs in parentheses at end of content
  clean = clean.replace(/\n*\((?:Picture this|Image suggestion|Visual|Photo)[^)]{20,}\)\s*$/gi, '');

  // Fix trailing ellipsis from truncation (incomplete sentences)
  clean = clean.replace(/,?\s*and\s+\w*\.{3}\s*$/, '.');    // "and eveni..." → "."
  clean = clean.replace(/[,\s]+\.{3}\s*$/, '.');              // trailing "..." → "."
  clean = clean.replace(/\s+\w{1,4}\.{3}\s*$/, '.');          // single truncated word → "."

  // === PHASE 3: Strip metadata labels ===
  const LABELS = [
    'TITLE', 'META', 'DESCRIPTION', 'INTRODUCTION', 'CONCLUSION',
    'BODY', 'CAPTION', 'POST', 'HOOK', 'CTA', 'HASHTAGS',
    'OPENING', 'CLOSING', 'SECTION', 'PARAGRAPH', 'SUMMARY',
    'KEY TAKEAWAY', 'KEY POINTS', 'CALL TO ACTION', 'SOCIAL COPY',
  ];
  const labelRegex = new RegExp(`^(${LABELS.join('|')})\\s*[:：]\\s*`, 'gim');
  clean = clean.replace(labelRegex, '');

  // === PHASE 4: Strip markdown links/images ===
  // Links [text](url) → text
  clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Images ![alt](url) → remove entirely
  clean = clean.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

  // === PHASE 5: Strip list markers ===
  // Bullet lists (- * +) at start of line
  clean = clean.replace(/^[\s]*[-*+]\s+/gm, '');
  // Numbered lists (1. 2. etc.) at start of line
  clean = clean.replace(/^\s*\d+\.\s+/gm, '');

  // === PHASE 6: Clean up whitespace ===
  // Collapse 3+ newlines to 2
  clean = clean.replace(/\n{3,}/g, '\n\n');
  // Remove leading/trailing whitespace per line
  clean = clean.split('\n').map(l => l.trim()).join('\n');
  // Trim entire string
  clean = clean.trim();

  // === PHASE 7: Platform-specific enforcement ===
  const limits = PLATFORM_RULES[targetPlatform];
  if (limits && limits.maxChars) {
    if (clean.length > limits.maxChars) {
      // Find last sentence boundary before limit
      const truncated = clean.substring(0, limits.maxChars - 3);
      const lastSentence = truncated.lastIndexOf('. ');
      if (lastSentence > limits.maxChars * 0.5) {
        clean = truncated.substring(0, lastSentence + 1);
      } else {
        clean = truncated + '...';
      }
    }
  }

  return clean;
}

/**
 * Check if content contains markdown artifacts
 * @param {string} content
 * @returns {{ isDirty: boolean, issues: string[] }}
 */
export function detectMarkdownArtifacts(content) {
  if (!content || typeof content !== 'string') return { isDirty: false, issues: [] };

  const issues = [];

  if (/\*\*.+?\*\*/.test(content)) issues.push('BOLD_MARKERS');
  if (/^#{1,6}\s+/m.test(content)) issues.push('HEADER_MARKERS');
  if (/^[-_*]{3,}\s*$/m.test(content)) issues.push('HORIZONTAL_RULES');
  if (/^(TITLE|META|DESCRIPTION|INTRODUCTION|CONCLUSION|CAPTION|POST|HOOK|CTA)\s*[:：]/im.test(content)) {
    issues.push('METADATA_LABELS');
  }
  if (/`[^`]+`/.test(content)) issues.push('CODE_MARKERS');
  if (/\[.+?\]\(.+?\)/.test(content)) issues.push('MARKDOWN_LINKS');
  if (/^>\s/m.test(content)) issues.push('BLOCKQUOTES');

  return { isDirty: issues.length > 0, issues };
}

export { PLATFORM_RULES };

export default { sanitizeContent, detectMarkdownArtifacts, PLATFORM_RULES };
