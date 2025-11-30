"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextRoutes = void 0;
const express_1 = require("express");
const contextController_1 = require("../controllers/contextController");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const rateLimitMiddleware_1 = require("../middleware/rateLimitMiddleware");
const router = (0, express_1.Router)();
exports.contextRoutes = router;
const contextController = new contextController_1.ContextController();
router.get('/:sessionId', rateLimitMiddleware_1.contextRateLimit, validationMiddleware_1.validateContextRequest, contextController.getContext.bind(contextController));
router.delete('/:sessionId', rateLimitMiddleware_1.contextRateLimit, validationMiddleware_1.validateContextRequest, contextController.deleteContext.bind(contextController));
//# sourceMappingURL=context.js.map