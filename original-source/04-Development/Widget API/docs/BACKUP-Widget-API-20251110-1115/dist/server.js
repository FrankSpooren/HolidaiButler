"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const logger_1 = require("./config/logger");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const server = app_1.default.listen(PORT, HOST, () => {
    logger_1.logger.info(`🚀 Context-Aware Chat API server running on ${HOST}:${PORT}`);
    logger_1.logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger_1.logger.info(`🔗 Health check: http://${HOST}:${PORT}/api/health`);
});
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger_1.logger.info('Process terminated');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    logger_1.logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger_1.logger.info('Process terminated');
        process.exit(0);
    });
});
exports.default = server;
//# sourceMappingURL=server.js.map