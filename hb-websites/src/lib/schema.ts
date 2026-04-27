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
/**
 * Render a JSON-LD script tag content string (for use in dangerouslySetInnerHTML)
 */
export function schemaToJsonLd(schema: object): string {
  return JSON.stringify(schema);
}
