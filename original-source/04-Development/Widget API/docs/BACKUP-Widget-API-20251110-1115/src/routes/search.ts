import { Router } from 'express';
import { SearchController } from '../controllers/searchController';
import { validateSearchRequest } from '../middleware/validationMiddleware';
import { searchRateLimit } from '../middleware/rateLimitMiddleware';

const router = Router();
const searchController = new SearchController();

router.post('/', 
  searchRateLimit,
  validateSearchRequest,
  searchController.search.bind(searchController)
);

export { router as searchRoutes };
