export interface POIReference {
  id: string;
  title: string;
  category?: string;
  // Preserve key metadata for follow-up questions
  metadata?: {
    openingHours?: any;
    phone?: string;
    website?: string;
    rating?: number;
    location?: string;
    coordinates?: { lat: number, lng: number };
    amenities?: string[];
    // Preserve raw metadata for opening hours parser
    rawMetadata?: any;
  };
}
