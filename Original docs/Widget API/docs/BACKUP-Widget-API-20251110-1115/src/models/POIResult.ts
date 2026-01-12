import { QAContent } from './QAContent';

export interface POIResult {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  relevanceScore: number;
  searchType: string;
  // Add new scoring fields
  smartScore?: number;
  scoringBreakdown?: {
    semantic: number;
    rating: number;
    distance: number;
    freshness: number;
    popularity: number;
  };
  metadata: {
    amenities: string[];
    location: string;
    rating?: number;
    description?: string;
    qaContent?: QAContent[];
    // Add new metadata fields
    coordinates?: { lat: number, lng: number };
    openingHours?: any;
    openingHoursMonday?: string;
    openingHoursTuesday?: string;
    openingHoursWednesday?: string;
    openingHoursThursday?: string;
    openingHoursFriday?: string;
    openingHoursSaturday?: string;
    openingHoursSunday?: string;
    lastReviewDate?: Date;
    visitCount?: number;
    // Add contact and opening hours fields
    phone?: string;
    website?: string;
    isCurrentlyOpen?: boolean;
    nextOpeningTime?: string;
    allOpeningHours?: any;
    // Preserve raw metadata for opening hours parser
    rawMetadata?: any;
  };
  // Add text response field
  textResponse?: string;
  // Display flags for frontend
  displayAsCard: boolean;
  displayReason?: 'requested' | 'alternative' | 'search_result' | 'relevant';
  previouslyDisplayed?: boolean;
}
