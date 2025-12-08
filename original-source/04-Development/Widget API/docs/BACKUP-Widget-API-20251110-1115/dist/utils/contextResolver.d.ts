import { POIReference } from '../models';
export declare class ContextResolver {
    static resolvePositionalReference(query: string, previousResults: POIReference[]): POIReference | null;
    static resolveSemanticReference(query: string, previousResults: POIReference[]): POIReference | null;
    static resolveDirectPOIMention(query: string, previousResults: POIReference[]): POIReference | null;
}
//# sourceMappingURL=contextResolver.d.ts.map