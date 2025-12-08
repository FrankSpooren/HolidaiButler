"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const search_1 = require("./routes/search");
const context_1 = require("./routes/context");
const health_1 = require("./routes/health");
const authMiddleware_1 = require("./middleware/authMiddleware");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use(authMiddleware_1.optionalAuth);
app.use('/api/search', search_1.searchRoutes);
app.use('/api/context', context_1.contextRoutes);
app.use('/api/health', health_1.healthRoutes);
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Context-Aware Chat API',
        version: '1.0.0',
        endpoints: {
            search: '/api/search',
            context: '/api/context',
            health: '/api/health'
        }
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found',
            details: `The requested endpoint ${req.originalUrl} does not exist`
        }
    });
});
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map