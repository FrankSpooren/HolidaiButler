export interface IntentContextConfig {
  [key: string]: {
    description: string;
    keywords: string[];
    relatedIntents: string[];
  };
}

export const INTENT_CONTEXT_CONFIG: IntentContextConfig = {
  // Core context types (existing)
  timeRelated: {
    description: "Queries related to time, schedules, or temporal information",
    keywords: ['when', 'time', 'open', 'closed', 'today', 'now', 'schedule', 'available', 'operating'],
    relatedIntents: ['opening_hours', 'time_sensitive']
  },
  locationRelated: {
    description: "Queries about locations, addresses, or geographical information",
    keywords: ['where', 'address', 'location', 'directions', 'map', 'find', 'located'],
    relatedIntents: ['contact_info', 'proximity_nearme']
  },
  proximityRelated: {
    description: "Queries about proximity, distance, or nearby places",
    keywords: ['near', 'close', 'closest', 'beach', 'walking distance', 'nearby', 'around'],
    relatedIntents: ['proximity_beach', 'proximity_nearme']
  },
  openingHoursRelated: {
    description: "Queries about business hours and availability",
    keywords: ['open', 'closed', 'hours', 'available', 'operating', 'schedule', 'when open'],
    relatedIntents: ['opening_hours', 'time_sensitive']
  },
  contactRelated: {
    description: "Queries about contact information",
    keywords: ['phone', 'contact', 'call', 'email', 'website', 'number', 'reach'],
    relatedIntents: ['contact_info']
  },
  comparisonRelated: {
    description: "Queries about comparing or evaluating options",
    keywords: ['compare', 'better', 'vs', 'which', 'best', 'recommend', 'prefer', 'choice'],
    relatedIntents: ['comparison']
  },
  
  // Enhanced context types
  accessibilityRelated: {
    description: "Queries about accessibility features and accommodations",
    keywords: ['wheelchair', 'accessible', 'disabled', 'ramp', 'elevator', 'handicap', 'mobility', 'barrier-free'],
    relatedIntents: ['amenities', 'accessibility']
  },
  priceRelated: {
    description: "Queries about pricing, cost, and budget considerations",
    keywords: ['price', 'cost', 'cheap', 'expensive', 'budget', 'affordable', 'money', 'pay', 'fee', 'charge'],
    relatedIntents: ['price_range', 'budget_friendly']
  },
  amenityRelated: {
    description: "Queries about specific amenities and features",
    keywords: ['wifi', 'parking', 'pool', 'garden', 'terrace', 'air conditioning', 'heating', 'kitchen', 'bathroom', 'shower'],
    relatedIntents: ['amenities', 'facilities']
  },
  foodRelated: {
    description: "Queries about food, dining, and culinary aspects",
    keywords: ['menu', 'food', 'dining', 'restaurant', 'kitchen', 'chef', 'cuisine', 'meal', 'eat', 'drink'],
    relatedIntents: ['dining', 'culinary']
  },
  familyRelated: {
    description: "Queries about family-friendliness and suitability for children",
    keywords: ['family', 'children', 'kids', 'child-friendly', 'baby', 'stroller', 'playground', 'safe'],
    relatedIntents: ['family_friendly', 'suitability']
  },
  petRelated: {
    description: "Queries about pet policies and pet-friendly features",
    keywords: ['pet', 'dog', 'cat', 'animal', 'pet-friendly', 'pets allowed', 'no pets'],
    relatedIntents: ['pet_policy']
  },
  reviewRelated: {
    description: "Queries about reviews, ratings, and user experiences",
    keywords: ['review', 'rating', 'stars', 'feedback', 'experience', 'opinion', 'recommendation'],
    relatedIntents: ['reviews', 'ratings']
  },
  availabilityRelated: {
    description: "Queries about availability, booking, and reservations",
    keywords: ['available', 'book', 'reserve', 'reservation', 'booking', 'free', 'busy', 'full'],
    relatedIntents: ['availability', 'booking']
  },
  qualityRelated: {
    description: "Queries about quality, standards, and service level",
    keywords: ['quality', 'good', 'excellent', 'poor', 'service', 'clean', 'dirty', 'modern', 'old'],
    relatedIntents: ['quality', 'service_level']
  },
  specificPOIQuestions: {
    description: "Specific questions about a particular POI's details",
    keywords: ['what', 'how', 'tell me about', 'details', 'information', 'about this', 'about that'],
    relatedIntents: ['detailed_info', 'specific_questions']
  }
};

export function generateIntentContextInterface(): string {
  const keys = Object.keys(INTENT_CONTEXT_CONFIG);
  return `export interface IntentContext {
${keys.map(key => `  ${key}: boolean;`).join('\n')}
}`;
}

export function detectContextFlags(query: string): Record<string, boolean> {
  const queryLower = query.toLowerCase();
  const context: Record<string, boolean> = {};
  
  for (const [key, config] of Object.entries(INTENT_CONTEXT_CONFIG)) {
    context[key] = config.keywords.some(keyword => queryLower.includes(keyword));
  }
  
  return context;
}
