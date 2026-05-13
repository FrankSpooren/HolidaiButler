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

  // Blog content — should be HTML. If AI returned markdown instead, convert to HTML.
  if (contentType === 'blog') {
    let clean = rawContent;
    // Strip AI artifacts
    clean = clean.replace(/^```html\s*\n?/i, '');  // strip opening ```html
    clean = clean.replace(/\n?```\s*$/g, '');       // strip closing ```
    clean = clean.replace(/\s*[•◦▪▫▸▹⦁⬤·∙⋅⁃]\s*/g, ', ');  // inline bullets → comma
    clean = clean.replace(/,\s*,/g, ',');
    clean = clean.replace(/^\s*,\s*/gm, '');
    clean = clean.replace(/\s*—\s*/g, ', ');
    clean = clean.replace(/\s*–\s*/g, ', ');
    clean = clean.replace(/\n*\((?:Picture this|Image suggestion|Visual|Photo)[^)]{20,}\)\s*$/gi, '');
    clean = clean.replace(/^(META_TITLE|META_DESCRIPTION|SLUG)\s*:.+$/gm, '');

    // If content has NO HTML tags, convert markdown to HTML
    if (!/<h[23456]|<p>|<\/p>/.test(clean)) {
      // Convert markdown headers to HTML
      clean = clean.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
      clean = clean.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
      clean = clean.replace(/^#\s+(.+)$/gm, '<h2>$1</h2>');
      // Convert bold/italic
      clean = clean.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      clean = clean.replace(/\*(.+?)\*/g, '<em>$1</em>');
      // Convert markdown links [text](url) to <a href>
      clean = clean.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      // Wrap paragraphs: split on double newline, wrap each in <p>
      const parts = clean.split(/\n{2,}/);
      clean = parts.map(p => {
        p = p.trim();
        if (!p) return '';
        if (/^<h[23456]>/.test(p)) return p; // already a heading
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
      }).filter(Boolean).join('\n\n');
    }
    return clean.trim();
  }

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
  clean = clean.replace(/\s*–\s*/g, ', ');    // en-dash → comma

  // Strip AI artifacts: bullet dots, smart quotes, special Unicode
  clean = clean.replace(/\s*[•◦▪▫▸▹⦁⬤·∙⋅⁃]\s*/g, ', ');  // inline bullets → comma
  clean = clean.replace(/,\s*,/g, ',');           // cleanup double commas
  clean = clean.replace(/^\s*,\s*/gm, '');        // comma at start of line
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
      // Separate hashtags from body before truncating
      const hashtagMatch = clean.match(/(\n\n?)(#[a-zA-Z0-9\u00C0-\u024F][\s#a-zA-Z0-9\u00C0-\u024F]*)\s*$/);
      let bodyPart = clean;
      let hashtagPart = '';
      if (hashtagMatch) {
        bodyPart = clean.substring(0, hashtagMatch.index).trim();
        hashtagPart = hashtagMatch[2].trim();
      }

      // Clean incomplete hashtags (e.g., "#...", "#Mediter...", "#Medit...")
      // Remove any hashtag followed by dots, or any hashtag that's clearly truncated (no matching full word)
      hashtagPart = hashtagPart
        .replace(/#[a-zA-Z0-9]*\.{2,}\s*/g, '')   // #anything... → remove
        .replace(/#[a-zA-Z]{1,6}\s*$/g, '')         // trailing short fragment like "#Medit" at end → remove
        .trim();

      // Truncate body at sentence boundary if needed
      const maxBody = limits.maxChars - (hashtagPart ? hashtagPart.length + 2 : 0); // 2 for \n\n
      if (bodyPart.length > maxBody) {
        const truncated = bodyPart.substring(0, maxBody - 3);
        const lastSentence = Math.max(truncated.lastIndexOf('. '), truncated.lastIndexOf('! '), truncated.lastIndexOf('? '));
        if (lastSentence > maxBody * 0.5) {
          bodyPart = truncated.substring(0, lastSentence + 1);
        } else {
          const lastSpace = truncated.lastIndexOf(' ');
          bodyPart = (lastSpace > maxBody * 0.6 ? truncated.substring(0, lastSpace) : truncated).trim();
        }
      }

      // Reassemble: body + hashtags (drop hashtags if still too long)
      if (hashtagPart && (bodyPart.length + hashtagPart.length + 2) <= limits.maxChars) {
        clean = bodyPart + '\n\n' + hashtagPart;
      } else {
        clean = bodyPart;
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

/**
 * sanitizeAIText - Gateway-level sanitizer for ALL Mistral AI output.
 * Lightweight: strips formatting artifacts without platform-specific logic.
 * Applied at the AI client level so every code path is automatically protected.
 * @param {string} text - Raw AI-generated text
 * @returns {string} Clean text without bullets, dashes, markdown, smart quotes
 */
export function sanitizeAIText(text) {
  if (!text || typeof text !== 'string') return text;

  let clean = text;

  // Bullet characters -> comma
  clean = clean.replace(/\s*[•◦▪▫▸▹⦁⬤·∙⋅⁃]\s*/g, ', ');

  // Em-dash and en-dash -> comma
  clean = clean.replace(/\s*—\s*/g, ', ');
  clean = clean.replace(/\s*–\s*/g, ', ');

  // Smart quotes -> regular
  clean = clean.replace(/["\u201C\u201D]/g, '"');
  clean = clean.replace(/['\u2018\u2019]/g, "'");

  // Markdown: bold, italic, headers, code, blockquotes, links
  clean = clean.replace(/\*\*(.+?)\*\*/g, '$1');
  clean = clean.replace(/__(.+?)__/g, '$1');
  clean = clean.replace(/(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)/g, '$1');
  clean = clean.replace(/^#{1,6}\s+/gm, '');
  clean = clean.replace(/`([^`]+)`/g, '$1');
  clean = clean.replace(/^>\s*/gm, '');
  clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // List markers at start of line
  clean = clean.replace(/^[-*+]\s+/gm, '');
  clean = clean.replace(/^\s*\d+\.\s+/gm, '');

  // Cleanup: double commas, leading commas, excess whitespace
  clean = clean.replace(/,\s*,/g, ',');
  clean = clean.replace(/^\s*,\s*/gm, '');
  clean = clean.replace(/\n{3,}/g, '\n\n');

  return clean.trim();
}

export { PLATFORM_RULES };

export default { sanitizeContent, sanitizeAIText, detectMarkdownArtifacts, PLATFORM_RULES };
