import { logger } from '../config/logger';

export interface IntentBoost {
  type: string;
  confidence: number;
  boostFactor: number;
  keywords: string[];
  description: string;
}

export interface IntentRecognitionResult {
  primaryIntent: string;
  secondaryIntents: string[];
  confidence: number;
  boosts: IntentBoost[];
  extractedEntities: string[];
  suggestedActions: string[];
}

export class GeneralIntentService {
  
  // Define all possible intent types with their detection patterns
  private intentPatterns = {
    // Dietary preferences
    'dietary': {
      'vegetarian': {
        keywords: ['vegetarian', 'veggie', 'plant-based', 'plant', 'herbivore', 'meat-free', 'vegetable', 'salad', 'green'],
        phrases: ['vegetarian place', 'vegetarian restaurant', 'veggie food', 'plant based', 'meat free'],
        boostFactor: 0.7,
        description: 'Vegetarian-friendly establishment'
      },
      'vegan': {
        keywords: ['vegan', 'plant-based', 'dairy-free', 'egg-free', 'animal-free', 'cruelty-free'],
        phrases: ['vegan place', 'vegan restaurant', 'dairy free', 'egg free', 'animal free'],
        boostFactor: 0.7,
        description: 'Vegan-friendly establishment'
      },
      'gluten-free': {
        keywords: ['gluten-free', 'gluten free', 'celiac', 'wheat-free', 'gf'],
        phrases: ['gluten free', 'celiac friendly', 'wheat free'],
        boostFactor: 0.6,
        description: 'Gluten-free options available'
      },
      'halal': {
        keywords: ['halal', 'muslim', 'islamic', 'permissible'],
        phrases: ['halal food', 'halal restaurant', 'muslim food'],
        boostFactor: 0.6,
        description: 'Halal-certified establishment'
      },
      'kosher': {
        keywords: ['kosher', 'jewish', 'hechsher'],
        phrases: ['kosher food', 'kosher restaurant', 'jewish food'],
        boostFactor: 0.6,
        description: 'Kosher-certified establishment'
      }
    },
    
    // Accessibility
    'accessibility': {
      'wheelchair': {
        keywords: ['wheelchair', 'accessible', 'disability', 'handicap', 'mobility'],
        phrases: ['wheelchair accessible', 'disabled access', 'mobility friendly'],
        boostFactor: 0.6,
        description: 'Wheelchair accessible'
      },
      'hearing': {
        keywords: ['deaf', 'hearing', 'sign language', 'audio'],
        phrases: ['hearing impaired', 'sign language', 'audio description'],
        boostFactor: 0.5,
        description: 'Hearing accessibility features'
      },
      'visual': {
        keywords: ['blind', 'visual', 'braille', 'large print'],
        phrases: ['visually impaired', 'braille menu', 'large print'],
        boostFactor: 0.5,
        description: 'Visual accessibility features'
      }
    },
    
    // Family and children
    'family': {
      'kids': {
        keywords: ['kids', 'children', 'family', 'child-friendly', 'baby', 'toddler'],
        phrases: ['family friendly', 'kids menu', 'children welcome', 'baby friendly'],
        boostFactor: 0.6,
        description: 'Family and children friendly'
      },
      'playground': {
        keywords: ['playground', 'play area', 'kids zone', 'children area'],
        phrases: ['playground nearby', 'kids play area', 'children playground'],
        boostFactor: 0.7,
        description: 'Has playground or play area'
      },
      'highchair': {
        keywords: ['highchair', 'high chair', 'baby seat', 'child seat'],
        phrases: ['highchair available', 'baby seating', 'child seating'],
        boostFactor: 0.4,
        description: 'Highchair available'
      }
    },
    
    // Pet-related
    'pets': {
      'pet-friendly': {
        keywords: ['pet', 'dog', 'cat', 'animal', 'pets allowed', 'pet friendly'],
        phrases: ['pets welcome', 'dog friendly', 'pet friendly', 'animals allowed'],
        boostFactor: 0.6,
        description: 'Pet-friendly establishment'
      },
      'dog-park': {
        keywords: ['dog park', 'dog area', 'puppy', 'canine'],
        phrases: ['dog park nearby', 'dog exercise area', 'puppy friendly'],
        boostFactor: 0.7,
        description: 'Dog park or dog exercise area'
      }
    },
    
    // Distance and location
    'proximity': {
      'beach': {
        keywords: ['beach', 'seaside', 'coast', 'shore', 'waterfront', 'ocean'],
        phrases: ['near beach', 'beachfront', 'seaside location', 'coastal'],
        boostFactor: 0.7,
        description: 'Near the beach'
      },
      'downtown': {
        keywords: ['downtown', 'city center', 'centre', 'main street', 'central'],
        phrases: ['downtown location', 'city center', 'central location'],
        boostFactor: 0.5,
        description: 'Downtown or central location'
      },
      'parking': {
        keywords: ['parking', 'car park', 'garage', 'valet'],
        phrases: ['free parking', 'parking available', 'car parking'],
        boostFactor: 0.4,
        description: 'Parking available'
      },
      'public-transport': {
        keywords: ['bus', 'train', 'metro', 'subway', 'public transport', 'transit'],
        phrases: ['bus stop nearby', 'train station', 'public transport', 'metro access'],
        boostFactor: 0.4,
        description: 'Public transport accessible'
      }
    },
    
    // Time and availability
    'time': {
      'open-now': {
        keywords: ['open now', 'currently open', 'open today', 'now'],
        phrases: ['open right now', 'currently open', 'open today'],
        boostFactor: 0.5,
        description: 'Currently open'
      },
      'late-night': {
        keywords: ['late night', 'night', 'evening', 'after hours'],
        phrases: ['late night', 'open late', 'night hours'],
        boostFactor: 0.4,
        description: 'Late night hours'
      },
      'weekend': {
        keywords: ['weekend', 'saturday', 'sunday', 'weekends'],
        phrases: ['weekend hours', 'saturday', 'sunday'],
        boostFactor: 0.3,
        description: 'Weekend availability'
      }
    },
    
    // Amenities and features
    'amenities': {
      'wifi': {
        keywords: ['wifi', 'internet', 'wireless', 'free wifi'],
        phrases: ['free wifi', 'internet access', 'wireless internet'],
        boostFactor: 0.4,
        description: 'Free WiFi available'
      },
      'outdoor': {
        keywords: ['outdoor', 'terrace', 'patio', 'garden', 'al fresco'],
        phrases: ['outdoor seating', 'terrace', 'garden area', 'al fresco'],
        boostFactor: 0.5,
        description: 'Outdoor seating or terrace'
      },
      'live-music': {
        keywords: ['music', 'live music', 'entertainment', 'band', 'concert'],
        phrases: ['live music', 'entertainment', 'music venue'],
        boostFactor: 0.5,
        description: 'Live music or entertainment'
      },
      'sports': {
        keywords: ['sports', 'football', 'soccer', 'basketball', 'tennis', 'gym'],
        phrases: ['sports bar', 'sports viewing', 'gym nearby'],
        boostFactor: 0.4,
        description: 'Sports-related amenities'
      }
    },
    
    // Price and budget
    'price': {
      'budget': {
        keywords: ['cheap', 'budget', 'affordable', 'inexpensive', 'low cost'],
        phrases: ['budget friendly', 'cheap eats', 'affordable prices'],
        boostFactor: 0.5,
        description: 'Budget-friendly pricing'
      },
      'luxury': {
        keywords: ['luxury', 'expensive', 'high-end', 'premium', 'upscale'],
        phrases: ['luxury dining', 'high-end', 'premium experience'],
        boostFactor: 0.5,
        description: 'Luxury or high-end establishment'
      },
      'happy-hour': {
        keywords: ['happy hour', 'discount', 'special offer', 'deal'],
        phrases: ['happy hour', 'special offers', 'discounts'],
        boostFactor: 0.3,
        description: 'Happy hour or special offers'
      }
    },
    
    // Reviews and ratings
    'quality': {
      'highly-rated': {
        keywords: ['highly rated', 'best', 'top rated', 'excellent', 'outstanding'],
        phrases: ['highly rated', 'best restaurant', 'top rated', 'excellent reviews'],
        boostFactor: 0.5,
        description: 'Highly rated establishment'
      },
      'popular': {
        keywords: ['popular', 'trending', 'famous', 'well-known', 'busy'],
        phrases: ['popular place', 'trending', 'famous restaurant'],
        boostFactor: 0.4,
        description: 'Popular or trending establishment'
      }
    }
  };

  detectIntent(query: string): IntentRecognitionResult {
    const queryLower = query.toLowerCase();
    logger.info(`🧠 GENERAL INTENT DETECTION: "${query}"`);
    
    const detectedBoosts: IntentBoost[] = [];
    const secondaryIntents: string[] = [];
    const extractedEntities: string[] = [];
    
    let primaryIntent = 'search_poi';
    let maxConfidence = 0;
    
    // Check each intent category
    for (const [category, intents] of Object.entries(this.intentPatterns)) {
      for (const [intentType, pattern] of Object.entries(intents)) {
        let matchScore = 0;
        let totalChecks = 0;
        
        // Check keywords
        for (const keyword of pattern.keywords) {
          totalChecks++;
          if (queryLower.includes(keyword)) {
            matchScore++;
            extractedEntities.push(keyword);
          }
        }
        
        // Check phrases
        for (const phrase of pattern.phrases) {
          totalChecks++;
          if (queryLower.includes(phrase)) {
            matchScore += 2; // Phrases are worth more
            extractedEntities.push(phrase);
          }
        }
        
        // Calculate confidence
        const confidence = matchScore > 0 ? 0.9 : 0; // High confidence if any matches
        
        if (confidence > 0) {
          const boost: IntentBoost = {
            type: `${category}:${intentType}`,
            confidence,
            boostFactor: pattern.boostFactor,
            keywords: pattern.keywords,
            description: pattern.description
          };
          
          detectedBoosts.push(boost);
          secondaryIntents.push(intentType);
          
          // Update primary intent if this has higher confidence
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
            primaryIntent = intentType;
          }
          
          logger.info(`   ✅ Detected: ${intentType} (confidence: ${confidence.toFixed(2)}, boost: ${pattern.boostFactor})`);
        }
      }
    }
    
    // Generate suggested actions based on detected intents
    const suggestedActions = this.generateSuggestedActions(detectedBoosts);
    
    const result: IntentRecognitionResult = {
      primaryIntent,
      secondaryIntents,
      confidence: maxConfidence,
      boosts: detectedBoosts,
      extractedEntities,
      suggestedActions
    };
    
    logger.info(`🎯 INTENT RESULT: ${primaryIntent} (${detectedBoosts.length} boosts detected)`);
    
    return result;
  }
  
  private generateSuggestedActions(boosts: IntentBoost[]): string[] {
    const actions: string[] = [];
    
    for (const boost of boosts) {
      const [category, intentType] = boost.type.split(':');
      
      switch (category) {
        case 'dietary':
          actions.push(`Find ${intentType}-friendly places`);
          break;
        case 'accessibility':
          actions.push(`Check ${intentType} accessibility features`);
          break;
        case 'family':
          actions.push(`Look for ${intentType}-friendly amenities`);
          break;
        case 'pets':
          actions.push(`Find ${intentType} establishments`);
          break;
        case 'proximity':
          actions.push(`Search for places near ${intentType}`);
          break;
        case 'time':
          actions.push(`Check ${intentType} availability`);
          break;
        case 'amenities':
          actions.push(`Look for ${intentType} features`);
          break;
        case 'price':
          actions.push(`Filter by ${intentType} pricing`);
          break;
        case 'quality':
          actions.push(`Find ${intentType} establishments`);
          break;
      }
    }
    
    return actions.length > 0 ? actions : ['Search for places'];
  }
  
  // Method to calculate intent-based score boost for a POI
  calculateIntentBoost(poi: any, intentResult: IntentRecognitionResult): number {
    if (intentResult.boosts.length === 0) return 0.5; // Neutral score
    
    let totalBoost = 0;
    let boostCount = 0;
    
    for (const boost of intentResult.boosts) {
      const poiText = this.getPOIText(poi).toLowerCase();
      let matchScore = 0;
      
      // Check if POI matches the intent
      for (const keyword of boost.keywords) {
        if (poiText.includes(keyword)) {
          matchScore++;
        }
      }
      
      // Calculate boost based on matches and confidence
      const baseBoost = matchScore > 0 ? boost.boostFactor : 0.1; // Small boost even without direct matches
      const confidenceBoost = baseBoost * boost.confidence;
      
      totalBoost += confidenceBoost;
      boostCount++;
    }
    
    return boostCount > 0 ? totalBoost / boostCount : 0.5;
  }
  
  private getPOIText(poi: any): string {
    const parts = [
      poi.title || '',
      poi.subtitle || '',
      poi.category || '',
      poi.metadata?.description || '',
      poi.metadata?.amenities?.join(' ') || ''
    ];
    return parts.join(' ').toLowerCase();
  }
}
