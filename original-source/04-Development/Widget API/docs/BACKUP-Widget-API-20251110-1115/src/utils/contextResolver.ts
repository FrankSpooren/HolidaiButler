import { POIReference } from '../models';

export class ContextResolver {
  static resolvePositionalReference(query: string, previousResults: POIReference[]): POIReference | null {
    const queryLower = query.toLowerCase();
    
    const patterns = [
      { regex: /(?:the\s+)?(?:first|1st|1)\s+(?:one|place|restaurant|hotel)/i, index: 0 },
      { regex: /(?:the\s+)?(?:second|2nd|2)\s+(?:one|place|restaurant|hotel)/i, index: 1 },
      { regex: /(?:the\s+)?(?:third|3rd|3)\s+(?:one|place|restaurant|hotel)/i, index: 2 },
      { regex: /(?:the\s+)?(?:fourth|4th|4)\s+(?:one|place|restaurant|hotel)/i, index: 3 },
      { regex: /(?:the\s+)?(?:fifth|5th|5)\s+(?:one|place|restaurant|hotel)/i, index: 4 },
      { regex: /(?:the\s+)?(?:last|final)\s+(?:one|place|restaurant|hotel)/i, index: -1 }
    ];
    
    for (const pattern of patterns) {
      if (pattern.regex.test(queryLower)) {
        const targetIndex = pattern.index === -1 ? previousResults.length - 1 : pattern.index;
        if (targetIndex >= 0 && targetIndex < previousResults.length) {
          return previousResults[targetIndex] || null;
        }
      }
    }
    
    return null;
  }

  static resolveSemanticReference(query: string, previousResults: POIReference[]): POIReference | null {
    const queryLower = query.toLowerCase();
    
    const semanticPatterns = [
      { keywords: ['mediterranean', 'mediterraneo'], poi: 'Casa Pepe' },
      { keywords: ['beach', 'playa', 'coastal'], poi: 'El Pescador' },
      { keywords: ['boutique', 'small', 'intimate'], poi: 'Boutique Casa Lapicida' },
      { keywords: ['pool', 'swimming', 'aqua'], poi: 'Aquasports' },
      { keywords: ['camper', 'camping', 'rv'], poi: 'Mediterranean Camper Area' }
    ];
    
    for (const pattern of semanticPatterns) {
      const hasKeyword = pattern.keywords.some(keyword => queryLower.includes(keyword));
      if (hasKeyword) {
        const foundPOI = previousResults.find(result => 
          result.title.toLowerCase().includes(pattern.poi.toLowerCase())
        );
        if (foundPOI) {
          return foundPOI;
        }
      }
    }
    
    return null;
  }

  static resolveDirectPOIMention(query: string, previousResults: POIReference[]): POIReference | null {
    const queryLower = query.toLowerCase();
    
    for (const result of previousResults) {
      const poiName = result.title.toLowerCase();
      if (queryLower.includes(poiName)) {
        return result;
      }
    }
    
    return null;
  }
}
