"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRoutes = void 0;
const express_1 = require("express");
const searchController_1 = require("../controllers/searchController");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const rateLimitMiddleware_1 = require("../middleware/rateLimitMiddleware");
const router = (0, express_1.Router)();
exports.searchRoutes = router;
const searchController = new searchController_1.SearchController();
router.post('/', rateLimitMiddleware_1.searchRateLimit, validationMiddleware_1.validateSearchRequest, searchController.search.bind(searchController));
//# sourceMappingURL=search.js.map