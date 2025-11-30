import { DietaryIntent } from '../models/ScoringModels';
export declare class DietaryIntentService {
    detectDietaryIntent(query: string): DietaryIntent;
    extractDietaryKeywords(query: string): string[];
    checkPOIDietaryMatch(poi: any, dietaryIntent: DietaryIntent): boolean;
    private getPOIText;
}
//# sourceMappingURL=dietaryIntentService.d.ts.map