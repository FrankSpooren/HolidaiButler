/**
 * Pre-flight validator for social publishing
 *
 * Centralised "is this content_item actually ready to publish" check.
 * Runs AFTER media_ids resolution and link normalisation, BEFORE the
 * platform client.publish() call.
 *
 * Motivation (BUTE incident 2026-05-16):
 * - Facebook silently published item 248 as text-only with the wrong
 *   fallback link because media_ids was [] and no check failed loudly.
 * - Instagram threw a low-level "image_url in social_metadata" error
 *   for item 249 deep inside metaClient, after partial state changes.
 *
 * This validator makes the contract uniform across FB/IG/LinkedIn/X/
 * Pinterest/TikTok/Threads: a social_post MUST carry a resolvable image
 * and a domain-correct link, or it fails fast with a clear reason that
 * lands in content_items.publish_error.
 */

const SOCIAL_POST_PLATFORMS = new Set([
  'facebook',
  'instagram',
  'linkedin',
  'x',
  'pinterest',
  'tiktok',
  'threads',
  'snapchat',
]);

const MIN_BODY_CHARS = 10;

export class PrePublishValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'PrePublishValidationError';
    this.code = 'PRE_PUBLISH_VALIDATION_FAILED';
    this.details = details;
    this.alreadyHandled = true;
  }
}

function parseMaybeJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function resolveBodyForPlatform(item) {
  const candidates = [
    item.body_en,
    item.body_nl,
    item.body_de,
    item.body_es,
    item.body_fr,
  ];
  return candidates.find(b => typeof b === 'string' && b.trim().length > 0) || '';
}

function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

/**
 * Validate a content_item is ready for social publishing.
 * Throws PrePublishValidationError with a specific reason on failure.
 *
 * @param {Object} item content_item row (with resolved social_metadata)
 * @param {Object} [opts]
 * @param {string} [opts.expectedDomain] destinations.domain — when present,
 *   social_metadata.link is checked to match this host. Mismatch is a hard
 *   fail because publisher/index.js is responsible for correcting links
 *   BEFORE calling the validator.
 */
export function validateSocialPostReadiness(item, opts = {}) {
  if (!item || typeof item !== 'object') {
    throw new PrePublishValidationError('content_item is null or not an object');
  }

  const platform = item.target_platform;
  if (!SOCIAL_POST_PLATFORMS.has(platform)) return;
  if (item.content_type && item.content_type !== 'social_post') return;

  const body = resolveBodyForPlatform(item);
  if (body.trim().length < MIN_BODY_CHARS) {
    throw new PrePublishValidationError(
      `${platform} post body is empty or too short (<${MIN_BODY_CHARS} chars)`,
      { platform, bodyLength: body.trim().length }
    );
  }

  const meta = parseMaybeJson(item.social_metadata, {}) || {};

  if (!meta.link || !isHttpUrl(meta.link)) {
    throw new PrePublishValidationError(
      `${platform} post is missing a valid social_metadata.link`,
      { platform, link: meta.link ?? null }
    );
  }

  if (opts.expectedDomain) {
    try {
      const host = new URL(meta.link).hostname.replace(/^www\./, '');
      const expected = String(opts.expectedDomain).replace(/^www\./, '').toLowerCase();
      if (host.toLowerCase() !== expected) {
        throw new PrePublishValidationError(
          `${platform} post link host "${host}" does not match destination domain "${expected}"`,
          { platform, linkHost: host, expectedDomain: expected }
        );
      }
    } catch (err) {
      if (err instanceof PrePublishValidationError) throw err;
      throw new PrePublishValidationError(
        `${platform} post link is not parseable as URL: ${meta.link}`,
        { platform, link: meta.link }
      );
    }
  }

  const imageUrls = Array.isArray(meta.image_urls) ? meta.image_urls.filter(isHttpUrl) : [];
  if (meta.image_url && isHttpUrl(meta.image_url) && !imageUrls.includes(meta.image_url)) {
    imageUrls.unshift(meta.image_url);
  }

  const mediaIds = parseMaybeJson(item.media_ids, []);
  const mediaIdsCount = Array.isArray(mediaIds) ? mediaIds.length : 0;

  if (imageUrls.length === 0) {
    const reason = mediaIdsCount > 0
      ? `media_ids set (${mediaIdsCount}) but none resolved to a public image URL — check imageDownloader/media storage`
      : 'no media_ids attached and no image_url in social_metadata';
    throw new PrePublishValidationError(
      `${platform} social post requires at least one image (${reason})`,
      { platform, mediaIdsCount, imageUrlsCount: 0 }
    );
  }
}

export default { validateSocialPostReadiness, PrePublishValidationError };
