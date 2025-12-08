"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionConfig = void 0;
exports.sessionConfig = {
    storage: 'memory',
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        enabled: process.env.USE_REDIS === 'true'
    },
    sessionTimeout: 86400000,
    maxHistoryLength: 50,
    cleanupInterval: 3600000
};
//# sourceMappingURL=session.js.map