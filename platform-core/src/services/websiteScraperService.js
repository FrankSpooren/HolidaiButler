/**
 * Website Scraper Service — Curated brand-source ingestion
 *
 * Scrapes destination-approved websites (Merk Profiel "Vertrouwde Bronnen") and
 * upserts cleaned markdown content into brand_knowledge for AI consumption.
 *
 * Pipeline:
 *   robots.txt check → fetch HTML → Readability extract → turndown markdown
 *   → SHA-256 hash → upsert brand_knowledge (skip if hash unchanged)
 *
 * Compliance:
 *   - Honors robots.txt
 *   - User-Agent transparent: HolidaiButler-Brand-Bot/1.0 (+contact URL)
 *   - Rate-limited per domain (1 req / 2s)
 *   - Max content size 500KB (anti-abuse)
 *   - 15s timeout
 *
 * @module websiteScraperService
 * @version 1.0.0
 */

import crypto from 'crypto';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { mysqlSequelize } from '../config/database.js';
import logger from '../utils/logger.js';

const USER_AGENT = 'HolidaiButler-Brand-Bot/1.0 (+https://holidaibutler.com/bot)';
const FETCH_TIMEOUT_MS = 15000;
const MAX_CONTENT_BYTES = 3 * 1024 * 1024; // 3MB raw HTML (Wix sites can be 500KB-2MB)
const MIN_REQ_INTERVAL_MS = 2000;

// In-memory per-domain throttle
const _lastRequestPerDomain = new Map();

// Turndown singleton (configured)
const _turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});
_turndown.remove(['script', 'style', 'noscript', 'iframe']);

// -------------------------------------------------------------------
// Public API
// -------------------------------------------------------------------

/**
 * Scrape a single URL — returns cleaned markdown + metadata.
 *
 * @param {string} url
 * @param {Object} [opts]
 * @param {number} [opts.timeoutMs]
 * @param {boolean} [opts.respectRobots=true]
 * @returns {Promise<{markdown: string, title: string, hash: string, fetchedAt: Date, contentLength: number, sourceUrl: string}>}
 */
export async function scrapeUrl(url, opts = {}) {
  const { timeoutMs = FETCH_TIMEOUT_MS, respectRobots = true } = opts;
  const parsedUrl = _validateUrl(url);

  if (respectRobots) {
    const allowed = await _checkRobotsTxt(parsedUrl);
    if (!allowed) {
      throw new Error(`Robots.txt disallows scraping of ${url}`);
    }
  }

  await _enforceDomainThrottle(parsedUrl.hostname);

  const html = await _fetchHtml(url, timeoutMs);
  const { markdown, title } = _extractMarkdown(html, url);

  if (!markdown || markdown.trim().length === 0) {
    throw new Error(`No extractable content from ${url}`);
  }

  const hash = crypto.createHash('sha256').update(markdown).digest('hex');

  return {
    markdown,
    title: title || _extractTitleFallback(html) || parsedUrl.hostname,
    hash,
    fetchedAt: new Date(),
    contentLength: markdown.length,
    sourceUrl: url,
  };
}

/**
 * Scrape + upsert into brand_knowledge for a destination.
 * Skips upsert if content_hash unchanged (avoids re-embedding cost).
 *
 * @param {number} destinationId
 * @param {string} url
 * @param {Object} [opts]
 * @returns {Promise<{action: 'created'|'updated'|'unchanged', knowledgeId: number|null, hash: string, contentLength: number}>}
 */
export async function scrapeAndStore(destinationId, url, opts = {}) {
  if (!destinationId) throw new Error('destinationId required');

  const scraped = await scrapeUrl(url, opts);

  // Check existing row for this URL + destination
  const [[existing]] = await mysqlSequelize.query(
    `SELECT id, content_hash FROM brand_knowledge
     WHERE destination_id = :destId AND source_url = :url AND source_type = 'website_scrape'
     LIMIT 1`,
    { replacements: { destId: Number(destinationId), url } }
  );

  if (existing && existing.content_hash === scraped.hash) {
    // Only update last_scanned_at — content unchanged
    await mysqlSequelize.query(
      `UPDATE brand_knowledge SET last_scanned_at = NOW() WHERE id = :id`,
      { replacements: { id: existing.id } }
    );
    logger.info(`[Scraper] Unchanged: ${url} (destination ${destinationId})`);
    return {
      action: 'unchanged',
      knowledgeId: existing.id,
      hash: scraped.hash,
      contentLength: scraped.contentLength,
    };
  }

  const wordCount = scraped.markdown.split(/\s+/).filter(Boolean).length;

  if (existing) {
    await mysqlSequelize.query(
      `UPDATE brand_knowledge
       SET content_text = :content,
           content_hash = :hash,
           word_count = :wc,
           source_name = :name,
           last_scanned_at = NOW(),
           is_active = 1
       WHERE id = :id`,
      {
        replacements: {
          content: scraped.markdown,
          hash: scraped.hash,
          wc: wordCount,
          name: scraped.title,
          id: existing.id,
        },
      }
    );
    logger.info(`[Scraper] Updated: ${url} → KB#${existing.id} (${wordCount} words)`);
    return {
      action: 'updated',
      knowledgeId: existing.id,
      hash: scraped.hash,
      contentLength: scraped.contentLength,
    };
  }

  // INSERT new
  const [result] = await mysqlSequelize.query(
    `INSERT INTO brand_knowledge
      (destination_id, source_type, source_name, source_url, content_text, content_hash,
       word_count, last_scanned_at, is_active, created_at)
     VALUES
      (:destId, 'website_scrape', :name, :url, :content, :hash, :wc, NOW(), 1, NOW())`,
    {
      replacements: {
        destId: Number(destinationId),
        name: scraped.title,
        url,
        content: scraped.markdown,
        hash: scraped.hash,
        wc: wordCount,
      },
    }
  );

  const insertId = result;
  logger.info(`[Scraper] Created: ${url} → KB#${insertId} (${wordCount} words, destination ${destinationId})`);
  return {
    action: 'created',
    knowledgeId: insertId,
    hash: scraped.hash,
    contentLength: scraped.contentLength,
  };
}

/**
 * Fetch sitemap.xml lastmod entries for change-detection.
 * Returns Map of URL → lastmod date.
 *
 * @param {string} siteRootUrl - e.g. https://www.butefair.nl
 * @returns {Promise<Map<string, Date>>}
 */
export async function fetchSitemapLastmod(siteRootUrl) {
  const parsedUrl = _validateUrl(siteRootUrl);
  const sitemapUrl = `${parsedUrl.protocol}//${parsedUrl.host}/sitemap.xml`;

  await _enforceDomainThrottle(parsedUrl.hostname);

  try {
    const xml = await _fetchHtml(sitemapUrl, FETCH_TIMEOUT_MS);
    const result = new Map();
    // Simple regex parse — sitemap.xml is well-structured XML
    const urlRegex = /<url>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?(?:<lastmod>([^<]+)<\/lastmod>)?[\s\S]*?<\/url>/g;
    let m;
    while ((m = urlRegex.exec(xml)) !== null) {
      const url = m[1].trim();
      const lastmod = m[2] ? new Date(m[2].trim()) : null;
      result.set(url, lastmod);
    }
    return result;
  } catch (err) {
    logger.warn(`[Scraper] sitemap.xml unavailable for ${siteRootUrl}: ${err.message}`);
    return new Map();
  }
}

// -------------------------------------------------------------------
// Internal helpers
// -------------------------------------------------------------------

function _validateUrl(url) {
  if (typeof url !== 'string' || !url) throw new Error('URL required');
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Unsupported protocol: ${parsed.protocol}`);
  }
  return parsed;
}

async function _enforceDomainThrottle(hostname) {
  const last = _lastRequestPerDomain.get(hostname) || 0;
  const wait = MIN_REQ_INTERVAL_MS - (Date.now() - last);
  if (wait > 0) {
    await new Promise(r => setTimeout(r, wait));
  }
  _lastRequestPerDomain.set(hostname, Date.now());
}

async function _checkRobotsTxt(parsedUrl) {
  const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
  try {
    const text = await _fetchHtml(robotsUrl, 5000);
    // Simple parse: find User-agent: * block, check Disallow rules vs our path
    const ourPath = parsedUrl.pathname || '/';
    const lines = text.split('\n').map(l => l.trim());
    let inUaStar = false;
    for (const line of lines) {
      if (/^user-agent:\s*\*/i.test(line)) {
        inUaStar = true;
        continue;
      }
      if (/^user-agent:/i.test(line)) {
        inUaStar = false;
        continue;
      }
      if (!inUaStar) continue;
      const m = line.match(/^disallow:\s*(.*)/i);
      if (m) {
        const rule = m[1].trim();
        if (rule === '/') return false; // entire site blocked
        if (rule && ourPath.startsWith(rule)) return false;
      }
    }
    return true;
  } catch {
    // No robots.txt or fetch failed → assume allowed (per RFC 9309)
    return true;
  }
}

async function _fetchHtml(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nl,en;q=0.9',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_CONTENT_BYTES) {
      throw new Error(`Content too large: ${contentLength} bytes (max ${MAX_CONTENT_BYTES})`);
    }
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_CONTENT_BYTES) {
      throw new Error(`Content too large: ${buffer.byteLength} bytes (max ${MAX_CONTENT_BYTES})`);
    }
    return new TextDecoder('utf-8').decode(buffer);
  } finally {
    clearTimeout(timer);
  }
}

function _extractMarkdown(html, baseUrl) {
  try {
    const dom = new JSDOM(html, { url: baseUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (article && article.content) {
      const markdown = _turndown.turndown(article.content);
      return { markdown: _cleanMarkdown(markdown), title: article.title || null };
    }
    // Fallback: turndown entire body
    const body = dom.window.document.body?.innerHTML || html;
    const markdown = _turndown.turndown(body);
    return { markdown: _cleanMarkdown(markdown), title: dom.window.document.title || null };
  } catch (err) {
    logger.warn(`[Scraper] Extract failed: ${err.message}`);
    // Last resort: raw text strip
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { markdown: text, title: null };
  }
}

function _cleanMarkdown(md) {
  return md
    .replace(/\n{3,}/g, '\n\n')           // collapse excessive blank lines
    .replace(/^\s*\n/gm, '\n')             // strip whitespace-only lines
    .replace(/[ \t]+$/gm, '')              // strip trailing spaces
    .trim();
}

function _extractTitleFallback(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

export default {
  scrapeUrl,
  scrapeAndStore,
  fetchSitemapLastmod,
};
