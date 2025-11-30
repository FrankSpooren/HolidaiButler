"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const searchService_1 = require("../services/searchService");
const responseFormatter_1 = require("../utils/responseFormatter");
const logger_1 = require("../config/logger");
class HealthController {
    constructor() {
        this.searchService = null;
    }
    getSearchService() {
        if (!this.searchService) {
            this.searchService = new searchService_1.SearchService();
        }
        return this.searchService;
    }
    async healthCheck(req, res) {
        try {
            logger_1.logger.info('Health check requested');
            const searchService = this.getSearchService();
            await searchService.initialize();
            const serviceStatus = await searchService.getServiceStatus();
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
            const response = responseFormatter_1.ResponseFormatter.formatHealthResponse(status, services, metrics);
            if (isHealthy) {
                res.json(response);
            }
            else {
                res.status(503).json(response);
            }
        }
        catch (error) {
            logger_1.logger.error('Health check failed:', error);
            res.status(500).json(responseFormatter_1.ResponseFormatter.formatErrorResponse('HEALTH_CHECK_FAILED', 'Health check failed', error.message));
        }
    }
}
exports.HealthController = HealthController;
//# sourceMappingURL=healthController.js.map