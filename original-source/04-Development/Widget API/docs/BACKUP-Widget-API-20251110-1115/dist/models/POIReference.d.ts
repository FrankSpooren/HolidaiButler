export interface POIReference {
    id: string;
    title: string;
    category?: string;
    metadata?: {
        openingHours?: any;
        phone?: string;
        website?: string;
        rating?: number;
        location?: string;
        coordinates?: {
            lat: number;
            lng: number;
        };
        amenities?: string[];
        rawMetadata?: any;
    };
}
//# sourceMappingURL=POIReference.d.ts.map