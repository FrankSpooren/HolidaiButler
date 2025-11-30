import { SearchResponse, ErrorResponse, POIResult } from '../models';
export declare class ResponseFormatter {
    static formatSearchResponse(results: POIResult[], searchType: string, queryInterpretation: any, sessionContext: any, metadata: any): SearchResponse;
    static formatErrorResponse(code: string, message: string, details?: string, suggestions?: string[], sessionId?: string): ErrorResponse;
    static formatHealthResponse(status: string, services: any, metrics: any): any;
    static formatContextResponse(sessionContext: any): any;
    static formatSuccessMessage(message: string): any;
}
//# sourceMappingURL=responseFormatter.d.ts.map