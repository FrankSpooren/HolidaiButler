/**
 * SchemaInjector — Shared JSON-LD schema.org utilities
 * Blocks render their own <script type="application/ld+json"> using these generators.
 * Multiple JSON-LD scripts per page is valid HTML5 and supported by Google.
 *
 * @module lib/schema
 * @version 1.0.0 — Fase VII-B1.C
 */

interface SchemaGeo {
  latitude: number | null;
  longitude: number | null;
}

interface SchemaPOI {
  id: number;
  name: string;
  description?: string;
  category?: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
  review_count?: number;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  phone?: string;
  website?: string;
  opening_hours?: { periods?: Array<{ open: string; close: string }> } | null;
}

interface SchemaDestination {
  name: string;
  description?: string;
  image?: string;
  geo?: SchemaGeo;
  touristTypes?: string[];
}

/**
 * Generate TouristDestination schema for Hero blocks
 */
export function generateTouristDestinationSchema(destination: SchemaDestination): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: destination.name,
    ...(destination.description && { description: destination.description }),
    ...(destination.image && { image: destination.image }),
    ...(destination.geo?.latitude && destination.geo?.longitude && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: destination.geo.latitude,
        longitude: destination.geo.longitude,
      },
    }),
    ...(destination.touristTypes && destination.touristTypes.length > 0 && {
      touristType: destination.touristTypes,
    }),
  };
}

/**
 * Generate ItemList schema with TouristAttraction items for PoiGrid blocks
 */
export function generatePoiGridSchema(pois: SchemaPOI[], baseUrl?: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: pois.length,
    itemListElement: pois.map((poi, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: generateTouristAttractionSchema(poi, baseUrl),
    })),
  };
}

/**
 * Generate TouristAttraction schema for a single POI
 */
export function generateTouristAttractionSchema(poi: SchemaPOI, baseUrl?: string): object {
  const reviewCount = poi.reviewCount ?? poi.review_count ?? 0;
  const url = baseUrl ? `${baseUrl}/poi/${poi.id}` : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': ['TouristAttraction', 'LocalBusiness'],
    name: poi.name,
    ...(poi.description && { description: poi.description }),
    ...(poi.images?.[0] && { image: poi.images[0] }),
    ...(url && { url }),
    ...(poi.latitude && poi.longitude && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: poi.latitude,
        longitude: poi.longitude,
      },
    }),
    ...(poi.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: poi.address,
      },
    }),
    ...(poi.phone && { telephone: poi.phone }),
    ...(poi.website && { url: poi.website }),
    ...(poi.rating && reviewCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: poi.rating,
        bestRating: 5,
        reviewCount: reviewCount,
      },
    }),
  };
}


interface SchemaEvent {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  image?: string;
  location?: {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  category?: string;
  url?: string;
}

/**
 * Generate Event schema for a single event
 */
export function generateEventSchema(event: SchemaEvent, baseUrl?: string): object {
  const url = baseUrl ? `${baseUrl}/event/${event.id}` : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    startDate: event.startDate,
    ...(event.endDate && { endDate: event.endDate }),
    ...(event.description && { description: event.description }),
    ...(event.image && { image: event.image }),
    ...(url && { url }),
    ...(event.location && {
      location: {
        '@type': 'Place',
        ...(event.location.name && { name: event.location.name }),
        ...(event.location.address && {
          address: {
            '@type': 'PostalAddress',
            streetAddress: event.location.address,
          },
        }),
        ...(event.location.latitude && event.location.longitude && {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: event.location.latitude,
            longitude: event.location.longitude,
          },
        }),
      },
    }),
    ...(event.category && {
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    }),
  };
}

/**
 * Generate ItemList schema with Event items for EventCalendar blocks
 */
export function generateEventListSchema(events: SchemaEvent[], baseUrl?: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: events.length,
    itemListElement: events.map((event, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: generateEventSchema(event, baseUrl),
    })),
  };
}

// ====================================================================
// E3 Template-level Schema Generators
// ====================================================================

const CATEGORY_SCHEMA_MAP: Record<string, string[]> = {
  'restaurants': ['Restaurant', 'FoodEstablishment'],
  'food & drinks': ['Restaurant', 'FoodEstablishment'],
  'eten & drinken': ['Restaurant', 'FoodEstablishment'],
  'museum': ['Museum', 'TouristAttraction'],
  'musea': ['Museum', 'TouristAttraction'],
  'culture & history': ['Museum', 'TouristAttraction'],
  'cultuur & historie': ['Museum', 'TouristAttraction'],
  'accommodation': ['LodgingBusiness', 'Hotel'],
  'shopping': ['Store', 'LocalBusiness'],
  'winkelen': ['Store', 'LocalBusiness'],
  'health & wellbeing': ['HealthAndBeautyBusiness', 'LocalBusiness'],
  'gezondheid & verzorging': ['HealthAndBeautyBusiness', 'LocalBusiness'],
};

function mapCategoryToSchemaType(category?: string): string[] {
  if (!category) return ['TouristAttraction', 'LocalBusiness'];
  return CATEGORY_SCHEMA_MAP[category.toLowerCase()] ?? ['TouristAttraction', 'LocalBusiness'];
}

/**
 * Event Detail page schema — full Event with location, offers, organizer
 */
export function generateEventDetailSchema(event: {
  title?: string; description?: string; startDate?: string; endDate?: string;
  image?: string; location?: { name?: string; address?: string; lat?: number; lon?: number };
  ticketPrice?: number; currency?: string; organizerName?: string; organizerUrl?: string;
  status?: string;
}, baseUrl?: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    ...(event.description && { description: event.description }),
    ...(event.startDate && { startDate: event.startDate }),
    ...(event.endDate && { endDate: event.endDate }),
    ...(event.image && { image: event.image }),
    eventStatus: `https://schema.org/${event.status || 'EventScheduled'}`,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(event.location && {
      location: {
        '@type': 'Place',
        name: event.location.name,
        ...(event.location.address && { address: event.location.address }),
        ...(event.location.lat && event.location.lon && {
          geo: { '@type': 'GeoCoordinates', latitude: event.location.lat, longitude: event.location.lon },
        }),
      },
    }),
    ...(event.ticketPrice != null && {
      offers: {
        '@type': 'Offer',
        price: event.ticketPrice,
        priceCurrency: event.currency || 'EUR',
        availability: 'https://schema.org/InStock',
        ...(baseUrl && { url: baseUrl }),
      },
    }),
    ...(event.organizerName && {
      organizer: {
        '@type': 'Organization',
        name: event.organizerName,
        ...(event.organizerUrl && { url: event.organizerUrl }),
      },
    }),
  };
}

/**
 * POI Detail page schema — TouristAttraction with category-aware subtype
 */
export function generatePoiDetailSchema(poi: {
  name?: string; description?: string; category?: string; images?: string[];
  rating?: number; reviewCount?: number; address?: string; city?: string;
  postalCode?: string; country?: string; lat?: number; lon?: number;
  phone?: string; website?: string; openingHours?: object;
}, baseUrl?: string): object {
  const schemaTypes = mapCategoryToSchemaType(poi.category);
  return {
    '@context': 'https://schema.org',
    '@type': schemaTypes,
    name: poi.name,
    ...(poi.description && { description: poi.description }),
    ...(poi.images?.[0] && { image: poi.images[0] }),
    ...(poi.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: poi.address,
        ...(poi.city && { addressLocality: poi.city }),
        ...(poi.postalCode && { postalCode: poi.postalCode }),
        ...(poi.country && { addressCountry: poi.country }),
      },
    }),
    ...(poi.lat && poi.lon && {
      geo: { '@type': 'GeoCoordinates', latitude: poi.lat, longitude: poi.lon },
    }),
    ...(poi.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: poi.rating,
        reviewCount: poi.reviewCount || 1,
        bestRating: 5,
      },
    }),
    ...(poi.phone && { telephone: poi.phone }),
    ...(poi.website && { url: poi.website }),
    ...(baseUrl && { url: baseUrl }),
  };
}

/**
 * Article/Guide page schema
 */
export function generateArticleSchema(article: {
  title?: string; description?: string; image?: string;
  publishedAt?: string; updatedAt?: string; authorName?: string;
}, baseUrl?: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    ...(article.description && { description: article.description }),
    ...(article.image && { image: article.image }),
    ...(article.publishedAt && { datePublished: article.publishedAt }),
    ...(article.updatedAt && { dateModified: article.updatedAt }),
    ...(article.authorName && { author: { '@type': 'Person', name: article.authorName } }),
    ...(baseUrl && { url: baseUrl }),
  };
}

/**
 * CollectionPage schema (for food guide, deals, etc.)
 */
export function generateCollectionPageSchema(title: string, items: Array<{ name: string; url?: string }>, baseUrl?: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    ...(baseUrl && { url: baseUrl }),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        ...(item.url && { url: item.url }),
      })),
    },
  };
}

/**
 * TouristTrip schema (for itinerary/route pages)
 */
export function generateTouristTripSchema(trip: {
  name?: string; description?: string; stops?: Array<{ name: string; lat?: number; lon?: number }>;
}, baseUrl?: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: trip.name,
    ...(trip.description && { description: trip.description }),
    ...(baseUrl && { url: baseUrl }),
    ...(trip.stops && {
      itinerary: {
        '@type': 'ItemList',
        itemListElement: trip.stops.map((stop, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Place',
            name: stop.name,
            ...(stop.lat && stop.lon && {
              geo: { '@type': 'GeoCoordinates', latitude: stop.lat, longitude: stop.lon },
            }),
          },
        })),
      },
    }),
  };
}

/**
 * Render a JSON-LD script tag content string (for use in dangerouslySetInnerHTML)
 */
export function schemaToJsonLd(schema: object): string {
  return JSON.stringify(schema);
}
