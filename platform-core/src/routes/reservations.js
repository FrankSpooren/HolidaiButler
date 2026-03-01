/**
 * Reservation Routes (Fase III — Blok C)
 *
 * Customer-facing reservation endpoints:
 * - GET  /reservations/health                   → Health check
 * - GET  /reservations/slots/:poiId             → Browse available slots
 * - POST /reservations                          → Create reservation
 * - GET  /reservations/:uuid                    → Reservation details + QR
 * - PUT  /reservations/:uuid/cancel             → Cancel reservation
 *
 * IMPORTANT: Specific routes (health, slots) MUST come before
 * parameterized routes (/:uuid) to avoid route capture.
 *
 * Multi-destination: X-Destination-ID header.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';
import {
  getAvailableSlots,
  createReservation,
  cancelReservation,
  getReservationDetails,
} from '../services/reservation/reservationService.js';

const router = express.Router();

// ============================================================================
// DESTINATION ROUTING (same pattern as ticketing.js)
// ============================================================================

function getDestinationId(req) {
  const headerValue = req.headers['x-destination-id'];
  if (!headerValue) return 1; // default: Calpe

  const numericId = parseInt(headerValue);
  if (!isNaN(numericId) && numericId > 0) return numericId;

  const codeToId = { calpe: 1, texel: 2, alicante: 3, warrewijzer: 4 };
  return codeToId[headerValue.toLowerCase()] || 1;
}

// ============================================================================
// RATE LIMITERS
// ============================================================================

const slotsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: false,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
});

const createRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: false,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many reservation requests' } },
});

// ============================================================================
// HEALTH CHECK (must be BEFORE parameterized routes)
// ============================================================================

router.get('/health', (req, res) => {
  res.json({ success: true, module: 'reservations', status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// GET /slots/:poiId — Browse available slots
// ============================================================================

router.get('/slots/:poiId', slotsRateLimit, async (req, res) => {
  try {
    const destinationId = getDestinationId(req);
    const poiId = parseInt(req.params.poiId);
    const { date, partySize } = req.query;

    if (!poiId || isNaN(poiId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_POI', message: 'Valid poiId required' } });
    }
    if (!date) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_DATE', message: 'date query parameter required (YYYY-MM-DD)' } });
    }

    const result = await getAvailableSlots(poiId, date, parseInt(partySize) || 2, destinationId);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[Reservations] Get slots error:', error);
    res.status(500).json({ success: false, error: { code: 'GET_SLOTS_ERROR', message: error.message } });
  }
});

// ============================================================================
// POST / — Create reservation
// ============================================================================

router.post('/', createRateLimit, async (req, res) => {
  try {
    const destinationId = getDestinationId(req);
    const {
      poiId, slotId, partySize, guestName, guestEmail,
      guestPhone, specialRequests, consentDataStorage,
    } = req.body;

    // Validation
    if (!poiId || !slotId || !partySize || !guestName || !guestEmail) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'poiId, slotId, partySize, guestName, guestEmail required' },
      });
    }

    if (consentDataStorage === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'CONSENT_REQUIRED', message: 'consentDataStorage field is required (GDPR)' },
      });
    }

    const result = await createReservation({
      destinationId,
      poiId: parseInt(poiId),
      slotId: parseInt(slotId),
      partySize: parseInt(partySize),
      guestName,
      guestEmail,
      guestPhone: guestPhone || null,
      specialRequests: specialRequests || null,
      consentDataStorage: !!consentDataStorage,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'GUEST_BLACKLISTED') {
      return res.status(403).json({ success: false, error: { code: 'GUEST_BLACKLISTED', message: 'Guest is blacklisted due to repeated no-shows' } });
    }
    if (error.message === 'SLOT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'SLOT_NOT_FOUND', message: 'Reservation slot not found' } });
    }
    if (error.message === 'INSUFFICIENT_SEATS') {
      return res.status(409).json({ success: false, error: { code: 'INSUFFICIENT_SEATS', message: 'Not enough seats available for this slot' } });
    }
    logger.error('[Reservations] Create reservation error:', error);
    res.status(500).json({ success: false, error: { code: 'CREATE_RESERVATION_ERROR', message: error.message } });
  }
});

// ============================================================================
// GET /:uuid — Reservation details (public, UUID is unguessable)
// ============================================================================

router.get('/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;

    // Basic UUID format check
    if (!uuid || uuid.length < 32) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_UUID', message: 'Valid reservation UUID required' } });
    }

    const result = await getReservationDetails(uuid);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'RESERVATION_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } });
    }
    logger.error('[Reservations] Get details error:', error);
    res.status(500).json({ success: false, error: { code: 'GET_RESERVATION_ERROR', message: error.message } });
  }
});

// ============================================================================
// PUT /:uuid/cancel — Cancel reservation
// ============================================================================

router.put('/:uuid/cancel', async (req, res) => {
  try {
    const { uuid } = req.params;
    const { reason } = req.body || {};

    if (!uuid || uuid.length < 32) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_UUID', message: 'Valid reservation UUID required' } });
    }

    // Lookup reservation by UUID to get ID
    const details = await getReservationDetails(uuid);

    // Check cancellable status
    const cancellable = ['pending', 'confirmed', 'deposit_pending'];
    if (!cancellable.includes(details.status)) {
      return res.status(409).json({
        success: false,
        error: { code: 'NOT_CANCELLABLE', message: `Cannot cancel reservation with status: ${details.status}` },
      });
    }

    const result = await cancelReservation(details.id, 'guest', reason || null);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'RESERVATION_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Reservation not found' } });
    }
    logger.error('[Reservations] Cancel error:', error);
    res.status(500).json({ success: false, error: { code: 'CANCEL_ERROR', message: error.message } });
  }
});

export default router;
