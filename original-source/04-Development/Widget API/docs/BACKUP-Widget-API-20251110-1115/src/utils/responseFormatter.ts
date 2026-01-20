import { SearchResponse, ErrorResponse, POIResult } from '../models';

export class ResponseFormatter {
  static formatSearchResponse(
    results: POIResult[],
    searchType: string,
    queryInterpretation: any,
    sessionContext: any,
    metadata: any
  ): SearchResponse {
    return {
      success: true,
      data: {
        results,
        searchType,
        queryInterpretation,
        context: sessionContext
      },
      metadata
    };
  }

  static formatErrorResponse(
    code: string,
    message: string,
    details?: string,
    suggestions?: string[],
    sessionId?: string
  ): ErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
        ...(suggestions && { suggestions })
      },
      ...(sessionId && { context: { sessionId, preserved: true } })
    };
  }

  static formatHealthResponse(
    status: string,
    services: any,
    metrics: any
  ): any {
    return {
      success: true,
      data: {
        status,
        timestamp: new Date().toISOString(),
        services,
        metrics
      }
    };
  }

  static formatContextResponse(sessionContext: any): any {
    return {
      success: true,
      data: sessionContext
    };
  }

  static formatSuccessMessage(message: string): any {
    return {
      success: true,
      message
    };
  }
}
