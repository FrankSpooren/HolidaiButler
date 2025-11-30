import { Router } from 'express';
import { HealthController } from '../controllers/healthController';
import { healthRateLimit } from '../middleware/rateLimitMiddleware';

const router = Router();
const healthController = new HealthController();

router.get('/',
  healthRateLimit,
  healthController.healthCheck.bind(healthController)
);

export { router as healthRoutes };
