import { logger } from '../config/logger';
import { POIResult } from '../models/POIResult';
import { IntentRecognitionResult } from './intentRecognitionService';
import { OpeningHoursParser } from '../utils/openingHoursParser';

export interface TextResponseOptions {
  userQuery: string;
  intentResult: IntentRecognitionResult;
  pois: POIResult[];
  userLocation?: { lat: number, lng: number } | undefined;
  currentTime?: Date;
}

export class TextResponseService {
  
  /**
   * Generate a helpful text response based on user query, intent, and POI data
   */
  async generateTextResponse(options: TextResponseOptions): Promise<string> {
    const { userQuery, intentResult, pois, userLocation, currentTime } = options;
    
    if (!pois || pois.length === 0) {
      return this.generateNoResultsResponse(userQuery, intentResult);
    }

    // Determine the type of response needed based on intent
    if (intentResult.intentContext.openingHoursRelated) {
      return this.generateOpeningHoursResponse(pois, currentTime);
    }
    
    if (intentResult.intentContext.contactRelated) {
      return this.generateContactInfoResponse(pois);
    }
    
    if (intentResult.intentContext.timeRelated && intentResult.secondaryIntents.includes('time_sensitive')) {
      return this.generateTimeSensitiveResponse(pois, currentTime);
    }
    
    if (intentResult.intentContext.comparisonRelated) {
      return this.generateComparisonResponse(pois);
    }
    
    if (intentResult.primaryIntent === 'get_info' && pois.length === 1) {
      return this.generateSinglePOIInfoResponse(pois[0]!, userQuery);
    }
    
    // Default response for search results
    return this.generateSearchResultsResponse(pois, userQuery);
  }

  private generateNoResultsResponse(userQuery: string, intentResult: IntentRecognitionResult): string {
    const query = userQuery.toLowerCase();
    
    if (query.includes('open') || query.includes('hours')) {
      return "I couldn't find any places matching your search. Try searching for a specific business name or type of place.";
    }
    
    if (query.includes('near') || query.includes('close')) {
      return "I couldn't find any places near your location. Try expanding your search area or being more specific about what you're looking for.";
    }
    
    return "I couldn't find any places matching your search. Try being more specific or using different keywords.";
  }

  private generateOpeningHoursResponse(pois: POIResult[], currentTime?: Date): string {
    const now = currentTime || new Date();
    
    // For single POI (common in follow-up questions), provide concise response
    if (pois.length === 1) {
      const poi = pois[0]!;
      const isOpen = this.isCurrentlyOpen(poi, now);
      const openingStatus = this.getOpeningStatus(poi, now);
      
      if (isOpen) {
        const isClosingSoon = this.isClosingSoon(poi, now);
        if (isClosingSoon) {
          return `Yes, ${poi.title} is currently open, but closing soon.`;
        }
        return `Yes, ${poi.title} is currently open.`;
      } else {
        const nextOpening = this.getNextOpeningTime(poi, now);
        if (nextOpening) {
          return `No, ${poi.title} is currently closed. It opens ${nextOpening}.`;
        }
        return `No, ${poi.title} is currently closed.`;
      }
    }
    
    // For multiple POIs
    const responses: string[] = [];
    for (const poi of pois.slice(0, 3)) {
      const openingStatus = this.getOpeningStatus(poi, now);
      responses.push(`${poi.title}: ${openingStatus}`);
    }
    
    if (responses.length === 1) {
      return responses[0]!;
    }
    
    return `Here are the opening hours for the places I found:\n${responses.join('\n')}`;
  }

  private generateContactInfoResponse(pois: POIResult[]): string {
    const responses: string[] = [];
    
    for (const poi of pois.slice(0, 3)) {
      const contactInfo = this.getContactInfo(poi);
      if (contactInfo) {
        responses.push(`${poi.title}: ${contactInfo}`);
      }
    }
    
    if (responses.length === 0) {
      return "I couldn't find contact information for these places.";
    }
    
    if (responses.length === 1) {
      return responses[0]!;
    }
    
    return `Here's the contact information:\n${responses.join('\n')}`;
  }

  private generateTimeSensitiveResponse(pois: POIResult[], currentTime?: Date): string {
    const now = currentTime || new Date();
    const openPlaces = pois.filter(poi => this.isCurrentlyOpen(poi, now));
    const closingSoon = pois.filter(poi => this.isClosingSoon(poi, now));
    
    if (openPlaces.length > 0) {
      const placeNames = openPlaces.slice(0, 3).map(p => p.title).join(', ');
      return `Yes, ${placeNames} ${openPlaces.length === 1 ? 'is' : 'are'} currently open.`;
    }
    
    if (closingSoon.length > 0) {
      const placeNames = closingSoon.slice(0, 3).map(p => p.title).join(', ');
      return `${placeNames} ${closingSoon.length === 1 ? 'is' : 'are'} closing soon.`;
    }
    
    const nextOpen = pois.find(poi => this.getNextOpeningTime(poi, now));
    if (nextOpen) {
      const nextTime = this.getNextOpeningTime(nextOpen, now);
      return `${nextOpen.title} is currently closed. It will open ${nextTime}.`;
    }
    
    return "None of these places are currently open.";
  }

  private generateComparisonResponse(pois: POIResult[]): string {
    if (pois.length < 2) {
      return this.generateSearchResultsResponse(pois, "");
    }
    
    const top3 = pois.slice(0, 3);
    const comparisons = top3.map((poi, index) => {
      const rating = poi.metadata.rating ? `${poi.metadata.rating}/5 stars` : 'No rating';
      const location = poi.metadata.location || 'Location not specified';
      return `${index + 1}. ${poi.title} - ${rating}, ${location}`;
    });
    
    return `Here are the top options:\n${comparisons.join('\n')}`;
  }

  private generateSinglePOIInfoResponse(poi: POIResult, userQuery: string): string {
    const query = userQuery.toLowerCase();
    const currentTime = new Date();
    const responses: string[] = [];
    
    // Opening hours queries (most common follow-up)
    if (query.includes('open') || query.includes('hours') || query.includes('closed')) {
      const isOpen = this.isCurrentlyOpen(poi, currentTime);
      const openingStatus = this.getOpeningStatus(poi, currentTime);
      
      if (query.includes('open') && !query.includes('closed')) {
        // Direct "is it open?" question
        if (isOpen) {
          const isClosingSoon = this.isClosingSoon(poi, currentTime);
          if (isClosingSoon) {
            responses.push(`Yes, ${poi.title} is currently open, but closing soon.`);
          } else {
            responses.push(`Yes, ${poi.title} is currently open.`);
          }
        } else {
          const nextOpening = this.getNextOpeningTime(poi, currentTime);
          if (nextOpening) {
            responses.push(`No, ${poi.title} is currently closed. It opens ${nextOpening}.`);
          } else {
            responses.push(`No, ${poi.title} is currently closed.`);
          }
        }
      } else {
        // General opening hours question
        responses.push(openingStatus);
      }
    }
    
    // Contact information
    if (query.includes('phone') || query.includes('contact') || query.includes('call')) {
      const contactInfo = this.getContactInfo(poi);
      if (contactInfo) {
        responses.push(contactInfo);
      } else {
        responses.push(`I don't have contact information for ${poi.title}.`);
      }
    }
    
    // Address/location
    if (query.includes('address') || query.includes('where') || query.includes('location')) {
      if (poi.metadata.location) {
        responses.push(`${poi.title} is located at ${poi.metadata.location}.`);
      } else {
        responses.push(`I don't have the address for ${poi.title}.`);
      }
    }
    
    // Rating
    if (query.includes('rating') || query.includes('review')) {
      if (poi.metadata.rating) {
        responses.push(`${poi.title} has a rating of ${poi.metadata.rating}/5 stars.`);
      } else {
        responses.push(`I don't have rating information for ${poi.title}.`);
      }
    }
    
    // If no specific query matched, provide general info
    if (responses.length === 0) {
      const parts = [poi.title];
      if (poi.metadata.rating) parts.push(`${poi.metadata.rating}/5 stars`);
      if (poi.metadata.location) parts.push(`at ${poi.metadata.location}`);
      return parts.join(' - ');
    }
    
    return responses.join(' ');
  }

  private generateSearchResultsResponse(pois: POIResult[], userQuery: string): string {
    const top3 = pois.slice(0, 3);
    
    if (top3.length === 1) {
      const poi = top3[0]!;
      const parts = [poi.title];
      if (poi.metadata.rating) parts.push(`${poi.metadata.rating}/5 stars`);
      if (poi.metadata.location) parts.push(`at ${poi.metadata.location}`);
      return parts.join(' - ');
    }
    
    const results = top3.map((poi, index) => {
      const rating = poi.metadata.rating ? `${poi.metadata.rating}/5 stars` : 'No rating';
      return `${index + 1}. ${poi.title} (${rating})`;
    });
    
    return `I found ${pois.length} places. Here are the top results:\n${results.join('\n')}`;
  }

  private getOpeningStatus(poi: POIResult, currentTime: Date): string {
    // Pass poi.metadata which should contain rawMetadata
    return OpeningHoursParser.getOpeningStatus(poi.metadata, currentTime);
  }

  private getContactInfo(poi: POIResult): string | null {
    // Note: The current POIResult model doesn't include phone/website fields
    // This would need to be updated to include these fields from the metadata
    const phone = (poi as any).phone || (poi as any).metadata?.phone;
    const website = (poi as any).website || (poi as any).metadata?.website;
    
    if (phone && website) {
      return `Phone: ${phone}, Website: ${website}`;
    } else if (phone) {
      return `Phone: ${phone}`;
    } else if (website) {
      return `Website: ${website}`;
    }
    
    return null;
  }

  private isCurrentlyOpen(poi: POIResult, currentTime: Date): boolean {
    return OpeningHoursParser.isCurrentlyOpen(poi.metadata, currentTime);
  }

  private isClosingSoon(poi: POIResult, currentTime: Date): boolean {
    return OpeningHoursParser.isClosingSoon(poi.metadata, currentTime);
  }

  private getNextOpeningTime(poi: POIResult, currentTime: Date): string | null {
    return OpeningHoursParser.getNextOpeningTime(poi.metadata, currentTime);
  }
}
