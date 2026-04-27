import { headers } from 'next/headers';
import { fetchPois } from '@/lib/api';
import type { RichTextProps } from '@/types/blocks';
import { sanitizeHtml } from '@/lib/sanitize';
import RichTextPoiLinks from '@/components/ui/RichTextPoiLinks';

interface LinkablePOI {
  id: number;
  name: string;
}

/**
 * Auto-link POI names in HTML content.
 * Replaces POI name occurrences with clickable links (data-poi-id attribute).
 * Only matches names >= 4 chars, avoids matching inside existing <a> tags.
 */
function autoLinkPOIs(html: string, pois: LinkablePOI[]): string {
  if (!html || pois.length === 0) return html;

  // Sort by name length desc (longest first to avoid partial matches)
  const sorted = [...pois].sort((a, b) => b.name.length - a.name.length);

  let result = html;

  for (const poi of sorted) {
    if (poi.name.length < 4) continue;

    // Escape special regex characters in POI name
    const escaped = poi.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Match whole word, case-insensitive, but NOT inside existing <a> tags or HTML attributes
    // Strategy: split by <a>...</a> tags, only replace in non-link segments
    const parts = result.split(/(<a\b[^>]*>.*?<\/a>|<[^>]+>)/gi);

    result = parts.map(part => {
      // Skip HTML tags and existing links
      if (part.startsWith('<')) return part;

      // Replace POI name with link (first occurrence only per segment)
      const regex = new RegExp(`\\b(${escaped})\\b`, 'i');
      return part.replace(regex, `<a href="/poi/${poi.id}" data-poi-id="${poi.id}" class="poi-auto-link">$1</a>`);
    }).join('');
  }

  return result;
}

export default async function RichText({ content, enablePoiLinks = true }: RichTextProps) {
  const sanitized = sanitizeHtml(content);

  let processedHtml = sanitized;

  if (enablePoiLinks) {
    try {
      const headersList = await headers();
      const tenantSlug = headersList.get('x-tenant-slug') ?? 'calpe';
      const locale = headersList.get('x-tenant-locale') ?? 'en';

      // Fetch T1-T3 POIs only (notable places worth auto-linking)
      const pois = await fetchPois(tenantSlug, {
        limit: 200,
        locale,
        min_rating: 4.0,
        sort: 'rating:desc',
      });

      const linkable: LinkablePOI[] = pois
        .filter(p => p.name && p.name.length >= 4)
        .map(p => ({ id: p.id, name: p.name }));

      processedHtml = autoLinkPOIs(sanitized, linkable);
    } catch {
      // Silently fall back to un-linked content
    }
  }

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12" style={{ containerType: 'inline-size' }}>
      <article
        className="prose prose-lg max-w-none rich-text-content
          prose-headings:font-heading prose-headings:text-foreground
          prose-p:text-foreground/80 prose-a:text-primary hover:prose-a:text-primary-dark
          prose-strong:text-foreground prose-img:rounded-tenant"
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
      {enablePoiLinks && <RichTextPoiLinks />}
      {/* Container query responsive typography */}
      <style dangerouslySetInnerHTML={{ __html: `
        .poi-auto-link {
          text-decoration-style: dotted;
          text-underline-offset: 3px;
          cursor: pointer;
        }
        .poi-auto-link:hover {
          text-decoration-style: solid;
        }
        @container (max-width: 500px) {
          .rich-text-content { font-size: 0.95rem; }
          .rich-text-content h1 { font-size: 1.75rem; }
          .rich-text-content h2 { font-size: 1.4rem; }
          .rich-text-content h3 { font-size: 1.15rem; }
        }
      `}} />
    </section>
  );
}
