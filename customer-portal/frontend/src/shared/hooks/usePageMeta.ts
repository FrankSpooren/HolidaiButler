/**
 * usePageMeta - Dynamic page metadata hook (Fase II-D.2)
 *
 * Updates document.title and Open Graph meta tags per page.
 * Supports multi-destination branding.
 */

import { useEffect } from 'react';
import { useDestination } from '../contexts/DestinationContext';

interface PageMeta {
  /** Page title (will be appended with " | {destination}") */
  title?: string;
  /** Meta description for SEO */
  description?: string;
  /** Canonical URL path (e.g., "/pois/123") */
  path?: string;
  /** Open Graph image URL */
  image?: string;
  /** Open Graph type (default: "website") */
  type?: 'website' | 'article' | 'place';
}

/**
 * Sets document.title and updates OG meta tags.
 * Cleans up on unmount (restores default title).
 */
export function usePageMeta({ title, description, path, image, type = 'website' }: PageMeta) {
  const destination = useDestination();
  const siteName = destination.name;
  const baseUrl = `https://${destination.domain}`;

  useEffect(() => {
    // Title
    const fullTitle = title ? `${title} | ${siteName}` : siteName;
    document.title = fullTitle;

    // Helper to set or create a meta tag
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const setNameMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // OG tags
    setMeta('og:title', fullTitle);
    setMeta('og:site_name', siteName);
    setMeta('og:type', type);

    if (description) {
      setNameMeta('description', description);
      setMeta('og:description', description);
    }

    if (path) {
      setMeta('og:url', `${baseUrl}${path}`);
    }

    if (image) {
      setMeta('og:image', image);
    }

    // Cleanup: restore default title
    return () => {
      document.title = siteName;
    };
  }, [title, description, path, image, type, siteName, baseUrl]);
}
