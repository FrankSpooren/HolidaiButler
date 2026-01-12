import { Request, Response } from 'express';
import { SearchRequest } from '../models';
import { SearchService } from '../services/searchService';
import { ResponseFormatter } from '../utils/responseFormatter';
import { logger } from '../config/logger';

export class SearchController {
  private searchService: SearchService | null = null;

  private getSearchService(): SearchService {
    if (!this.searchService) {
      this.searchService = new SearchService();
    }
    return this.searchService;
  }

  async search(req: Request, res: Response): Promise<void> {
    try {
      const searchRequest: SearchRequest = req.body;
      logger.info(`Search request received: ${searchRequest.query} for session: ${searchRequest.sessionId}`);

      // Perform the actual search using our integrated search service
      const result = await this.getSearchService().search(
        searchRequest.query,
        searchRequest.sessionId,
        searchRequest.userId,
        {
          ...searchRequest.options,
          clientContext: searchRequest.clientContext
        }
      );

      if (result.success) {
        logger.info(`Search completed successfully: ${result.data.results.length} results found`);
        res.json(result);
      } else {
        logger.error('Search failed:', result);
        res.status(500).json(result);
      }
      
    } catch (error: any) {
      logger.error('Search controller error:', error);
      res.status(500).json(ResponseFormatter.formatErrorResponse(
        'SERVER_ERROR',
        'An unexpected error occurred during search',
        error.message,
        [],
        req.body.sessionId
      ));
    }
  }
}
