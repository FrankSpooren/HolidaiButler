/**
 * Text Highlighting Utility
 * =========================
 * Highlights matched search terms in text strings
 * Used for search result highlighting in frontend
 *
 * Features:
 * - Case-insensitive matching
 * - Multiple search terms support
 * - HTML-safe output (escapes special characters)
 * - Customizable highlight markers
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';

  const htmlEscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return text.replace(/[&<>"']/g, char => htmlEscapeMap[char]);
}

/**
 * Highlight matched terms in text
 * @param {string} text - Text to highlight
 * @param {string|Array<string>} searchTerms - Search term(s) to highlight
 * @param {Object} options - Highlighting options
 * @param {string} options.openTag - Opening tag for highlights (default: '<mark>')
 * @param {string} options.closeTag - Closing tag for highlights (default: '</mark>')
 * @param {boolean} options.escapeHtml - Escape HTML in text (default: true)
 * @param {boolean} options.caseSensitive - Case sensitive matching (default: false)
 * @returns {string} - Text with highlighted terms
 */
function highlightText(text, searchTerms, options = {}) {
  if (!text || !searchTerms) {
    return text || '';
  }

  const {
    openTag = '<mark>',
    closeTag = '</mark>',
    escapeHtml: shouldEscape = true,
    caseSensitive = false
  } = options;

  // Normalize search terms to array
  const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms];

  // Filter out empty terms
  const validTerms = terms.filter(term => term && term.trim().length > 0);

  if (validTerms.length === 0) {
    return shouldEscape ? escapeHtml(text) : text;
  }

  // Escape HTML first if requested
  let processedText = shouldEscape ? escapeHtml(text) : text;

  // Sort terms by length (longest first) to avoid partial matches
  const sortedTerms = validTerms.sort((a, b) => b.length - a.length);

  // Build regex pattern from search terms
  // Escape special regex characters in search terms
  const escapedTerms = sortedTerms.map(term =>
    term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );

  // Create regex pattern with word boundaries for better matching
  const pattern = escapedTerms.join('|');
  const flags = caseSensitive ? 'g' : 'gi';
  const regex = new RegExp(`(${pattern})`, flags);

  // Replace matches with highlighted version
  processedText = processedText.replace(regex, `${openTag}$1${closeTag}`);

  return processedText;
}

/**
 * Extract search terms from query string
 * Handles quoted phrases and individual words
 * @param {string} query - Search query
 * @returns {Array<string>} - Array of search terms
 */
function extractSearchTerms(query) {
  if (!query || typeof query !== 'string') {
    return [];
  }

  const terms = [];

  // Match quoted phrases first: "beach restaurant"
  const quotedRegex = /"([^"]+)"/g;
  let match;
  while ((match = quotedRegex.exec(query)) !== null) {
    terms.push(match[1]);
  }

  // Remove quoted phrases from query
  const remainingQuery = query.replace(quotedRegex, '');

  // Split remaining query into words
  const words = remainingQuery
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length > 1); // Filter out single characters

  terms.push(...words);

  return terms;
}

/**
 * Highlight search results
 * Adds highlighted versions of specified fields
 * @param {Array<Object>} results - Search results
 * @param {string} query - Search query
 * @param {Array<string>} fields - Fields to highlight (default: ['name', 'description'])
 * @param {Object} options - Highlighting options
 * @returns {Array<Object>} - Results with highlighted fields
 */
function highlightSearchResults(results, query, fields = ['name', 'description'], options = {}) {
  if (!results || !Array.isArray(results) || results.length === 0) {
    return results;
  }

  if (!query) {
    return results;
  }

  const searchTerms = extractSearchTerms(query);

  if (searchTerms.length === 0) {
    return results;
  }

  return results.map(result => {
    const highlighted = { ...result };

    fields.forEach(field => {
      if (result[field]) {
        const fieldValue = String(result[field]);
        const highlightedValue = highlightText(fieldValue, searchTerms, options);

        // Add highlighted version as {field}_highlighted
        highlighted[`${field}_highlighted`] = highlightedValue;
      }
    });

    return highlighted;
  });
}

/**
 * Truncate text and add highlights
 * Useful for showing context around matches
 * @param {string} text - Text to truncate
 * @param {string} searchTerm - Search term
 * @param {number} contextLength - Characters to show before/after match (default: 50)
 * @param {Object} options - Highlighting options
 * @returns {string} - Truncated and highlighted text
 */
function highlightWithContext(text, searchTerm, contextLength = 50, options = {}) {
  if (!text || !searchTerm) {
    return text || '';
  }

  const { escapeHtml: shouldEscape = true } = options;
  const processedText = shouldEscape ? escapeHtml(text) : text;

  // Find first occurrence of search term (case-insensitive)
  const lowerText = processedText.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerTerm);

  if (matchIndex === -1) {
    // No match found, return truncated text
    return processedText.length > contextLength * 2
      ? processedText.substring(0, contextLength * 2) + '...'
      : processedText;
  }

  // Calculate start and end positions
  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(processedText.length, matchIndex + searchTerm.length + contextLength);

  // Extract context
  let context = processedText.substring(start, end);

  // Add ellipsis if truncated
  if (start > 0) context = '...' + context;
  if (end < processedText.length) context = context + '...';

  // Highlight the match in the context
  return highlightText(context, searchTerm, { ...options, escapeHtml: false });
}

module.exports = {
  escapeHtml,
  highlightText,
  extractSearchTerms,
  highlightSearchResults,
  highlightWithContext
};
