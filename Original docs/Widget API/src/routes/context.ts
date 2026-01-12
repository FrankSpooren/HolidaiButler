import { Router } from 'express';
import { ContextController } from '../controllers/contextController';
import { validateContextRequest } from '../middleware/validationMiddleware';
import { contextRateLimit } from '../middleware/rateLimitMiddleware';

const router = Router();
const contextController = new ContextController();

router.get('/:sessionId',
  contextRateLimit,
  validateContextRequest,
  contextController.getContext.bind(contextController)
);

router.delete('/:sessionId',
  contextRateLimit,
  validateContextRequest,
  contextController.deleteContext.bind(contextController)
);

export { router as contextRoutes };
