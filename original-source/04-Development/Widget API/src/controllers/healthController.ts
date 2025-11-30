import { Request, Response } from 'express';
import { SearchService } from '../services/searchService';
import { ResponseFormatter } from '../utils/responseFormatter';
import { logger } from '../config/logger';

export class HealthController {
  private searchService: SearchService | null = null;

  private getSearchService(): SearchService {
    if (!this.searchService) {
      this.searchService = new SearchService();
    }
    return this.searchService;
  }

  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Health check requested');
      
      // Initialize the search service if not already done
      const searchService = this.getSearchService();
      await searchService.initialize();
      
      // Get service status from our integrated services
      const serviceStatus = await searchService.getServiceStatus();
      
      // Determine overall health status
      const isHealthy = serviceStatus.database && serviceStatus.mistral;
      const status = isHealthy ? 'healthy' : 'degraded';
      
      const services = {
        database: serviceStatus.database ? 'connected' : 'disconnected',
        mistral: serviceStatus.mistral ? 'connected' : 'disconnected',
        session: serviceStatus.session
      };

      const metrics = {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };

      const response = ResponseFormatter.formatHealthResponse(status, services, metrics);
      
      if (isHealthy) {
        res.json(response);
      } else {
        res.status(503).json(response);
      }
      
    } catch (error: any) {
      logger.error('Health check failed:', error);
      res.status(500).json(ResponseFormatter.formatErrorResponse(
        'HEALTH_CHECK_FAILED',
        'Health check failed',
        error.message
      ));
    }
  }
}
