/**
 * Lightweight server-safe HTML sanitizer.
 * Strips dangerous elements (script, iframe, object, embed, form)
 * and event handler attributes (on*) to prevent XSS.
 * Works without DOM dependency (safe for Next.js Server Components).
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  return html
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove dangerous tags (keep content)
    .replace(/<\/?(iframe|object|embed|form|base|meta|link)\b[^>]*>/gi, '')
    // Remove event handlers (onclick, onerror, onload, etc.)
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Remove javascript: protocol URLs
    .replace(/\b(href|src|action)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1=""')
    // Remove data: URLs in src attributes (potential XSS vector)
    .replace(/\bsrc\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi, 'src=""');
}
