/**
 * Sentiment Analysis Utilities
 * Sprint 7.6 - Personalized Reviews System
 *
 * Utilities for sentiment badges, travel party badges, and keyword extraction
 */

import type {
  SentimentType,
  TravelPartyType,
  SentimentBadgeConfig,
  TravelPartyBadgeConfig
} from '../types/review.types';

/**
 * Get sentiment badge configuration
 * Returns color, icon, and label for sentiment display
 */
export function getSentimentBadge(sentiment: SentimentType): SentimentBadgeConfig {
  const configs: Record<SentimentType, SentimentBadgeConfig> = {
    positive: {
      type: 'positive',
      label: 'Positive',
      color: '#10b981', // Green
      icon: '✓'
    },
    neutral: {
      type: 'neutral',
      label: 'Neutral',
      color: '#6b7280', // Gray
      icon: '−'
    },
    negative: {
      type: 'negative',
      label: 'Negative',
      color: '#ef4444', // Red
      icon: '!'
    }
  };

  return configs[sentiment];
}

/**
 * Get travel party badge configuration
 * Returns color, icon, and label for travel party display
 */
export function getTravelPartyBadge(partyType: TravelPartyType): TravelPartyBadgeConfig {
  const configs: Record<TravelPartyType, TravelPartyBadgeConfig> = {
    couples: {
      type: 'couples',
      label: 'Couples',
      color: '#ec4899', // Pink
      icon: '❤️'
    },
    families: {
      type: 'families',
      label: 'Families',
      color: '#3b82f6', // Blue
      icon: '👨‍👩‍👧‍👦'
    },
    solo: {
      type: 'solo',
      label: 'Solo Traveler',
      color: '#8b5cf6', // Purple
      icon: '🧳'
    },
    friends: {
      type: 'friends',
      label: 'Friends',
      color: '#10b981', // Green
      icon: '👥'
    },
    business: {
      type: 'business',
      label: 'Business',
      color: '#6b7280', // Gray
      icon: '💼'
    }
  };

  return configs[partyType];
}

/**
 * Simple sentiment detection from text
 * Returns detected sentiment based on keyword analysis
 */
export function detectSentiment(text: string): SentimentType {
  const lowerText = text.toLowerCase();

  // Positive keywords
  const positiveKeywords = [
    'excellent', 'amazing', 'great', 'fantastic', 'wonderful',
    'beautiful', 'perfect', 'loved', 'love', 'recommend',
    'best', 'delicious', 'friendly', 'professional', 'clean',
    'authentic', 'stunning', 'breathtaking', 'unique', 'fun',
    'romantic', 'incredible', 'outstanding', 'exceptional'
  ];

  // Negative keywords
  const negativeKeywords = [
    'disappointing', 'disappointed', 'poor', 'avoid', 'bad',
    'terrible', 'worst', 'awful', 'horrible', 'overpriced',
    'rude', 'dirty', 'slow', 'cold', 'waited', 'never',
    'waste', 'not recommended', 'unfortunately', 'bland'
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  // Count positive keywords
  positiveKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      positiveCount += matches.length;
    }
  });

  // Count negative keywords
  negativeKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      negativeCount += matches.length;
    }
  });

  // Determine sentiment based on keyword counts
  if (positiveCount > negativeCount) {
    return 'positive';
  } else if (negativeCount > positiveCount) {
    return 'negative';
  } else {
    return 'neutral';
  }
}

/** Locale mapping for date formatting */
const localeMap: Record<string, string> = {
  nl: 'nl-NL', en: 'en-US', de: 'de-DE', es: 'es-ES', sv: 'sv-SE', pl: 'pl-PL'
};

/** Relative time translation strings */
export interface RelativeTimeStrings {
  today: string;
  yesterday: string;
  daysAgo: string;
  weeksAgo: string;
  weekAgo: string;
  monthsAgo: string;
  monthAgo: string;
  yearsAgo: string;
  yearAgo: string;
}

/**
 * Format date for display (e.g., "Bezocht okt. 2024")
 */
export function formatVisitDate(dateString: string, visitedLabel?: string, language?: string): string {
  const date = new Date(dateString);
  const locale = localeMap[language || 'en'] || 'en-US';
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short' };
  const prefix = visitedLabel || 'Visited';
  return `${prefix} ${date.toLocaleDateString(locale, options)}`;
}

/**
 * Format relative time (e.g., "2 weken geleden")
 */
export function formatRelativeTime(dateString: string, timeStrings?: RelativeTimeStrings): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const t = timeStrings || {
    today: 'Today', yesterday: 'Yesterday', daysAgo: '{n} days ago',
    weeksAgo: '{n} weeks ago', weekAgo: '1 week ago',
    monthsAgo: '{n} months ago', monthAgo: '1 month ago',
    yearsAgo: '{n} years ago', yearAgo: '1 year ago',
  };

  if (diffDays === 0) {
    return t.today;
  } else if (diffDays === 1) {
    return t.yesterday;
  } else if (diffDays < 7) {
    return t.daysAgo.replace('{n}', String(diffDays));
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? t.weekAgo : t.weeksAgo.replace('{n}', String(weeks));
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? t.monthAgo : t.monthsAgo.replace('{n}', String(months));
  } else {
    const years = Math.floor(diffDays / 365);
    return years === 1 ? t.yearAgo : t.yearsAgo.replace('{n}', String(years));
  }
}

/**
 * Truncate long review text with ellipsis
 * @param text - Review text
 * @param maxLength - Maximum length before truncation (default: 200)
 * @returns Truncated text
 */
export function truncateReviewText(text: string, maxLength: number = 200): {
  truncated: string;
  isTruncated: boolean;
} {
  if (text.length <= maxLength) {
    return { truncated: text, isTruncated: false };
  }

  // Try to break at sentence or word boundary
  const truncated = text.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');

  let finalText = truncated;
  if (lastPeriod > maxLength - 50) {
    finalText = truncated.substring(0, lastPeriod + 1);
  } else if (lastSpace > maxLength - 20) {
    finalText = truncated.substring(0, lastSpace);
  }

  return { truncated: finalText + '...', isTruncated: true };
}

/**
 * Get star rating as array for rendering
 * @param rating - Rating value (1-5)
 * @returns Array of 5 booleans indicating filled/empty stars
 */
export function getStarRating(rating: number): boolean[] {
  return Array.from({ length: 5 }, (_, index) => index < rating);
}

/**
 * Calculate percentage for sentiment/party breakdown bars
 */
export function calculatePercentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}
