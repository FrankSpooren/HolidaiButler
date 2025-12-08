"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
const searchService_1 = require("../services/searchService");
const responseFormatter_1 = require("../utils/responseFormatter");
const logger_1 = require("../config/logger");
class SearchController {
    constructor() {
        this.searchService = null;
    }
    getSearchService() {
        if (!this.searchService) {
            this.searchService = new searchService_1.SearchService();
        }
        return this.searchService;
    }
    async search(req, res) {
        try {
            const searchRequest = req.body;
            logger_1.logger.info(`Search request received: ${searchRequest.query} for session: ${searchRequest.sessionId}`);
            const result = await this.getSearchService().search(searchRequest.query, searchRequest.sessionId, searchRequest.userId, {
                ...searchRequest.options,
                clientContext: searchRequest.clientContext
            });
            if (result.success) {
                logger_1.logger.info(`Search completed successfully: ${result.data.results.length} results found`);
                res.json(result);
            }
            else {
                logger_1.logger.error('Search failed:', result);
                res.status(500).json(result);
            }
        }
        catch (error) {
            logger_1.logger.error('Search controller error:', error);
            res.status(500).json(responseFormatter_1.ResponseFormatter.formatErrorResponse('SERVER_ERROR', 'An unexpected error occurred during search', error.message, [], req.body.sessionId));
        }
    }
}
exports.SearchController = SearchController;
//# sourceMappingURL=searchController.js.map