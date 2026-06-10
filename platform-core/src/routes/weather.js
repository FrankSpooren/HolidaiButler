/**
 * Public Weather Route
 *
 * GET /api/v1/weather/public?destinationId=X&locale=Y&withTip=true
 *
 * Auth-less proxy naar dezelfde handler als /admin-portal/weather-preview.
 * Bedoeld voor hb-websites runtime block (publieke pagina's). Geen
 * admin-rechten vereist — read-only weather + optional brand-tip i18n.
 *
 * Rate-limiting: leunt op Cache-Control header (30min) + Apache caching.
 *
 * @version BLOK F UX-feedback v3 (2026-05-24)
 */

import { Router } from 'express';
import { handleWeatherPreview } from './handlers/weatherPreviewHandler.js';

const router = Router();

router.get('/public', handleWeatherPreview);

export default router;
