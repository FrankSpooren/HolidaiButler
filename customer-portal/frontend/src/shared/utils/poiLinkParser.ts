/**
 * POI Link Parser Utility
 * Phase 7: POI Clickability in HoliBot Chat ✅
 *
 * Parses message content to detect POI names and make them clickable
 */

import type { POI } from '../types/chat.types';

export interface ParsedTextSegment {
  type: 'text' | 'poi-link';
  content: string;
  poi?: POI;
}

/**
 * Parses message content to identify POI names and convert them to clickable links
 *
 * @param content - The message content to parse
 * @param pois - Array of POIs associated with the message
 * @returns Array of text segments (plain text and POI links)
 */
export function parseMessageForPOILinks(
  content: string,
  pois: POI[] | undefined
): ParsedTextSegment[] {
  if (!pois || pois.length === 0) {
    // No POIs, return plain text
    return [{ type: 'text', content }];
  }

  const segments: ParsedTextSegment[] = [];
  let remainingText = content;

  // Sort POIs by name length (longest first) to avoid partial matches
  const sortedPOIs = [...pois].sort((a, b) => b.name.length - a.name.length);

  // Find all POI name occurrences
  const matches: Array<{ poi: POI; start: number; end: number }> = [];

  for (const poi of sortedPOIs) {
    // Create case-insensitive regex with word boundaries
    // Escape special regex characters in POI name
    const escapedName = poi.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');

    let match;
    while ((match = regex.exec(remainingText)) !== null) {
      matches.push({
        poi,
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);

  // Remove overlapping matches (keep first occurrence)
  const filteredMatches = matches.filter((match, index) => {
    if (index === 0) return true;
    const prevMatch = matches[index - 1];
    return match.start >= prevMatch.end;
  });

  // Build segments
  let currentIndex = 0;

  for (const match of filteredMatches) {
    // Add text before the POI link
    if (match.start > currentIndex) {
      segments.push({
        type: 'text',
        content: remainingText.substring(currentIndex, match.start)
      });
    }

    // Add POI link
    segments.push({
      type: 'poi-link',
      content: remainingText.substring(match.start, match.end),
      poi: match.poi
    });

    currentIndex = match.end;
  }

  // Add remaining text after last match
  if (currentIndex < remainingText.length) {
    segments.push({
      type: 'text',
      content: remainingText.substring(currentIndex)
    });
  }

  return segments;
}
