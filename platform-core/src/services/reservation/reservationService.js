/**
 * Reservation Service (Fase III — Blok C)
 *
 * Business logic for restaurant/activity reservations.
 * Hergebruikt patterns uit Blok A (paymentService) en Blok B (ticketing).
 *
 * Core functions:
 * 1. getAvailableSlots — Browse slots with availability
 * 2. createReservation — Book + reserve seats + QR + guest profile
 * 3. confirmReservation — After deposit payment
 * 4. cancelReservation — Cancel + release seats + refund
 * 5. markNoShow — Track no-shows, auto-blacklist at 3
 * 6. markCompleted — Complete + update guest stats
 * 7. getGuestProfile — Lookup guest history
 *
 * Additional:
 * - getReservationDetails — Full reservation info (public, by UUID)
 * - releaseExpiredDeposits — BullMQ job: cleanup expired deposit_pending
 * - sendReminders — BullMQ jobs: 24h and 1h reminders
 * - cleanupGuestData — BullMQ job: GDPR retention cleanup
 *
 * All amounts in CENTS (integers, never floats).
 * Multi-destination: destination_id on every query.
 */

import crypto from 'crypto';
import QRCode from 'qrcode';
import { mysqlSequelize } from '../../config/database.js';
import redis from '../../config/redis.js';
import logger from '../../utils/logger.js';

const { QueryTypes } = (await import('sequelize')).default;

// QR secret — SEPARATE from ticket QR secret
const RESERVATION_QR_SECRET = process.env.RESERVATION_QR_SECRET || process.env.QR_SECRET_KEY || 'dev-reservation-secret';

// Redis lock prefix
const LOCK_PREFIX = 'reservation:lock:';
const LOCK_TTL_SECONDS = 5;

// Deposit checkout window: 30 minutes
const DEPOSIT_TTL_SECONDS = 1800;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate reservation number: HB-R-YYMMDD-XXXX
 */
async function generateReservationNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
  const [result] = await mysqlSequelize.query(
    `SELECT COUNT(*) as cnt FROM reservations WHERE reservation_number LIKE :prefix`,
    { replacements: { prefix: `HB-R-${dateStr}-%` }, type: QueryTypes.SELECT }
  );
  const seq = (result?.cnt || 0) + 1;
  return `HB-R-${dateStr}-${seq.toString().padStart(4, '0')}`;
}

/**
 * Generate QR code data with HMAC. Format: HB-R:{uuid}:{hmac8}
 */
function generateQRData(reservationUuid) {
  const hmac = crypto.createHmac('sha256', RESERVATION_QR_SECRET)
    .update(reservationUuid)
    .digest('hex')
    .substring(0, 8);
  return `HB-R:${reservationUuid}:${hmac}`;
}

/**
 * Generate QR image as data URL.
 */
async function generateQRImage(qrData) {
  return QRCode.toDataURL(qrData, { errorCorrectionLevel: 'H', width: 300, margin: 2 });
}

/**
 * Verify QR HMAC signature.
 */
function verifyQRSignature(reservationUuid, signature) {
  const expected = crypto.createHmac('sha256', RESERVATION_QR_SECRET)
    .update(reservationUuid)
    .digest('hex')
    .substring(0, 8);
  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));
}

// ============================================================================
// 1. GET AVAILABLE SLOTS
// ============================================================================

/**
 * Get available slots for a POI on a date.
 *
 * @param {number} poiId - POI ID (restaurant/activity)
 * @param {string} date - YYYY-MM-DD
 * @param {number} partySize - Number of guests
 * @param {number} destinationId
 * @returns {Promise<Object>} { poi, slots }
 */
export async function getAvailableSlots(poiId, date, partySize, destinationId) {
  // Get POI info
  const [poi] = await mysqlSequelize.query(
    `SELECT id, name, address, category, destination_id
     FROM POI WHERE id = :poiId AND destination_id = :destinationId AND has_reservations = TRUE`,
    { replacements: { poiId, destinationId }, type: QueryTypes.SELECT }
  );

  if (!poi) {
    throw new Error('POI_NOT_FOUND');
  }

  // Get available slots
  const slots = await mysqlSequelize.query(
    `SELECT id, slot_date, slot_time_start, slot_time_end, slot_duration_minutes,
            total_tables, total_seats, reserved_seats, is_available
     FROM reservation_slots
     WHERE poi_id = :poiId AND destination_id = :destinationId
       AND slot_date = :date AND is_available = TRUE`,
    { replacements: { poiId, destinationId, date }, type: QueryTypes.SELECT }
  );

  // Filter by party size and calculate availability
  const availableSlots = slots
    .map(s => ({
      id: s.id,
      slotDate: s.slot_date,
      timeStart: s.slot_time_start,
      timeEnd: s.slot_time_end,
      durationMinutes: s.slot_duration_minutes,
      totalSeats: s.total_seats,
      availableSeats: s.total_seats - s.reserved_seats,
      totalTables: s.total_tables,
    }))
    .filter(s => s.availableSeats >= partySize);

  return { poi, slots: availableSlots };
}

// ============================================================================
// 2. CREATE RESERVATION
// ============================================================================

/**
 * Create a reservation with seat locking.
 *
 * @param {Object} params
 * @returns {Promise<Object>} Reservation details + QR
 */
export async function createReservation(params) {
  const {
    destinationId, poiId, slotId, partySize,
    guestName, guestEmail, guestPhone,
    specialRequests, depositRequired, consentDataStorage,
  } = params;

  // 1. Check blacklist
  const [blacklisted] = await mysqlSequelize.query(
    `SELECT id FROM guest_profiles
     WHERE email = :email AND destination_id = :destinationId AND is_blacklisted = TRUE`,
    { replacements: { email: guestEmail, destinationId }, type: QueryTypes.SELECT }
  );

  if (blacklisted) {
    throw new Error('GUEST_BLACKLISTED');
  }

  // 2. Redis lock on slot
  const lockKey = `${LOCK_PREFIX}${slotId}`;
  let lockAcquired = false;

  try {
    if (redis.isConnected()) {
      const client = redis.getClient();
      const result = await client.set(lockKey, 'lock', 'EX', LOCK_TTL_SECONDS, 'NX');
      lockAcquired = result === 'OK';
      if (!lockAcquired) {
        await new Promise(r => setTimeout(r, 500));
        const retry = await client.set(lockKey, 'lock', 'EX', LOCK_TTL_SECONDS, 'NX');
        lockAcquired = retry === 'OK';
        if (!lockAcquired) throw new Error('SLOT_LOCK_TIMEOUT');
      }
    }

    // 3. MySQL transaction: check + reserve
    const reservationData = await mysqlSequelize.transaction(async (t) => {
      const [slot] = await mysqlSequelize.query(
        `SELECT total_seats, reserved_seats FROM reservation_slots
         WHERE id = :slotId AND destination_id = :destinationId AND is_available = TRUE
         FOR UPDATE`,
        { replacements: { slotId, destinationId }, type: QueryTypes.SELECT, transaction: t }
      );

      if (!slot) throw new Error('SLOT_NOT_FOUND');
      if (slot.total_seats - slot.reserved_seats < partySize) throw new Error('INSUFFICIENT_SEATS');

      // Reserve seats
      await mysqlSequelize.query(
        `UPDATE reservation_slots SET reserved_seats = reserved_seats + :partySize, updated_at = NOW()
         WHERE id = :slotId`,
        { replacements: { partySize, slotId }, type: QueryTypes.UPDATE, transaction: t }
      );

      return { reserved: true };
    });

    // 4. Generate identifiers
    const reservationUuid = crypto.randomUUID();
    const reservationNumber = await generateReservationNumber();
    const qrData = generateQRData(reservationUuid);

    // 5. Determine status
    const status = depositRequired ? 'deposit_pending' : 'confirmed';

    // 6. Insert reservation
    await mysqlSequelize.query(
      `INSERT INTO reservations
       (destination_id, reservation_uuid, reservation_number, slot_id, poi_id,
        party_size, deposit_required, deposit_status, status,
        guest_name, guest_email, guest_phone, special_requests, qr_code_data, created_at)
       VALUES
       (:destinationId, :reservationUuid, :reservationNumber, :slotId, :poiId,
        :partySize, :depositRequired, :depositStatus, :status,
        :guestName, :guestEmail, :guestPhone, :specialRequests, :qrData, NOW())`,
      {
        replacements: {
          destinationId, reservationUuid, reservationNumber, slotId, poiId,
          partySize,
          depositRequired: depositRequired ? 1 : 0,
          depositStatus: depositRequired ? 'pending' : 'not_required',
          status,
          guestName, guestEmail, guestPhone: guestPhone || null,
          specialRequests: specialRequests || null, qrData,
        },
        type: QueryTypes.INSERT,
      }
    );

    // Get reservation ID
    const [resRow] = await mysqlSequelize.query(
      `SELECT id FROM reservations WHERE reservation_uuid = :reservationUuid`,
      { replacements: { reservationUuid }, type: QueryTypes.SELECT }
    );
    const reservationId = resRow.id;

    // 7. Upsert guest profile
    await upsertGuestProfile(destinationId, guestEmail, guestName, guestPhone, specialRequests, consentDataStorage);

    // Link guest profile to reservation
    const [profile] = await mysqlSequelize.query(
      `SELECT id FROM guest_profiles WHERE email = :email AND destination_id = :destinationId`,
      { replacements: { email: guestEmail, destinationId }, type: QueryTypes.SELECT }
    );
    if (profile) {
      await mysqlSequelize.query(
        `UPDATE reservations SET guest_profile_id = :profileId WHERE id = :reservationId`,
        { replacements: { profileId: profile.id, reservationId }, type: QueryTypes.UPDATE }
      );
    }

    // 8. Generate QR image
    const qrImage = await generateQRImage(qrData);

    logger.info(`[Reservation] Created ${reservationNumber}: ${partySize} guests, POI ${poiId}, status=${status}`);

    return {
      reservationId,
      reservationUuid,
      reservationNumber,
      status,
      partySize,
      qrCodeData: qrData,
      qrCodeImage: qrImage,
      depositRequired,
    };
  } finally {
    if (lockAcquired && redis.isConnected()) {
      await redis.del(lockKey);
    }
  }
}

// ============================================================================
// 3. CONFIRM RESERVATION
// ============================================================================

/**
 * Confirm reservation after deposit payment.
 */
export async function confirmReservation(reservationId) {
  const [reservation] = await mysqlSequelize.query(
    `SELECT id, status, deposit_required FROM reservations WHERE id = :reservationId`,
    { replacements: { reservationId }, type: QueryTypes.SELECT }
  );

  if (!reservation) throw new Error('RESERVATION_NOT_FOUND');
  if (reservation.status !== 'deposit_pending' && reservation.status !== 'pending') {
    throw new Error('RESERVATION_CANNOT_CONFIRM');
  }

  await mysqlSequelize.query(
    `UPDATE reservations
     SET status = 'confirmed', deposit_status = CASE WHEN deposit_required THEN 'paid' ELSE deposit_status END,
         confirmation_sent = TRUE, updated_at = NOW()
     WHERE id = :reservationId`,
    { replacements: { reservationId }, type: QueryTypes.UPDATE }
  );

  logger.info(`[Reservation] Confirmed reservation ${reservationId}`);
  return { success: true, status: 'confirmed' };
}

// ============================================================================
// 4. CANCEL RESERVATION
// ============================================================================

/**
 * Cancel reservation, release seats, refund deposit if paid.
 */
export async function cancelReservation(reservationId, cancelledBy, reason) {
  const [reservation] = await mysqlSequelize.query(
    `SELECT id, slot_id, party_size, status, deposit_cents, deposit_status, payment_transaction_id
     FROM reservations WHERE id = :reservationId`,
    { replacements: { reservationId }, type: QueryTypes.SELECT }
  );

  if (!reservation) throw new Error('RESERVATION_NOT_FOUND');
  if (['cancelled_by_guest', 'cancelled_by_venue', 'no_show', 'completed', 'expired'].includes(reservation.status)) {
    throw new Error('RESERVATION_ALREADY_FINAL');
  }

  const statusField = cancelledBy === 'venue' ? 'cancelled_by_venue' : 'cancelled_by_guest';

  // Release seats
  await mysqlSequelize.query(
    `UPDATE reservation_slots SET reserved_seats = GREATEST(reserved_seats - :partySize, 0), updated_at = NOW()
     WHERE id = :slotId`,
    { replacements: { partySize: reservation.party_size, slotId: reservation.slot_id }, type: QueryTypes.UPDATE }
  );

  // Update reservation
  await mysqlSequelize.query(
    `UPDATE reservations SET status = :status, cancelled_at = NOW(), cancellation_reason = :reason, updated_at = NOW()
     WHERE id = :reservationId`,
    { replacements: { status: statusField, reason: reason || null, reservationId }, type: QueryTypes.UPDATE }
  );

  // Refund deposit if paid
  let refundInitiated = false;
  if (reservation.deposit_status === 'paid' && reservation.deposit_cents > 0) {
    try {
      const { initiateRefund } = await import('../payment/paymentService.js');
      if (reservation.payment_transaction_id) {
        await initiateRefund(reservation.payment_transaction_id, reservation.deposit_cents, reason || 'cancellation', 'system');
        await mysqlSequelize.query(
          `UPDATE reservations SET deposit_status = 'refunded' WHERE id = :reservationId`,
          { replacements: { reservationId }, type: QueryTypes.UPDATE }
        );
        refundInitiated = true;
      }
    } catch (err) {
      logger.error(`[Reservation] Refund failed for reservation ${reservationId}:`, err.message);
    }
  }

  logger.info(`[Reservation] Cancelled reservation ${reservationId} by ${cancelledBy}, refund=${refundInitiated}`);
  return { success: true, status: statusField, refundInitiated };
}

// ============================================================================
// 5. MARK NO-SHOW
// ============================================================================

/**
 * Mark reservation as no-show. Auto-blacklist after 3 no-shows.
 */
export async function markNoShow(reservationId) {
  const [reservation] = await mysqlSequelize.query(
    `SELECT id, slot_id, party_size, status, guest_email, destination_id, guest_profile_id
     FROM reservations WHERE id = :reservationId`,
    { replacements: { reservationId }, type: QueryTypes.SELECT }
  );

  if (!reservation) throw new Error('RESERVATION_NOT_FOUND');
  if (reservation.status !== 'confirmed') throw new Error('RESERVATION_NOT_CONFIRMED');

  // Update reservation status
  await mysqlSequelize.query(
    `UPDATE reservations SET status = 'no_show', updated_at = NOW() WHERE id = :reservationId`,
    { replacements: { reservationId }, type: QueryTypes.UPDATE }
  );

  // Release seats
  await mysqlSequelize.query(
    `UPDATE reservation_slots SET reserved_seats = GREATEST(reserved_seats - :partySize, 0), updated_at = NOW()
     WHERE id = :slotId`,
    { replacements: { partySize: reservation.party_size, slotId: reservation.slot_id }, type: QueryTypes.UPDATE }
  );

  // Update guest profile no-show count
  let blacklisted = false;
  if (reservation.guest_profile_id) {
    await mysqlSequelize.query(
      `UPDATE guest_profiles SET no_show_count = no_show_count + 1, updated_at = NOW()
       WHERE id = :profileId`,
      { replacements: { profileId: reservation.guest_profile_id }, type: QueryTypes.UPDATE }
    );

    // Auto-blacklist at 3 no-shows
    const [profile] = await mysqlSequelize.query(
      `SELECT no_show_count FROM guest_profiles WHERE id = :profileId`,
      { replacements: { profileId: reservation.guest_profile_id }, type: QueryTypes.SELECT }
    );
    if (profile && profile.no_show_count >= 3) {
      await mysqlSequelize.query(
        `UPDATE guest_profiles SET is_blacklisted = TRUE, blacklist_reason = 'auto: 3 no-shows', updated_at = NOW()
         WHERE id = :profileId`,
        { replacements: { profileId: reservation.guest_profile_id }, type: QueryTypes.UPDATE }
      );
      blacklisted = true;
    }
  }

  // No deposit refund on no-show (forfait)
  logger.info(`[Reservation] No-show: reservation ${reservationId}, blacklisted=${blacklisted}`);
  return { success: true, status: 'no_show', blacklisted };
}

// ============================================================================
// 6. MARK COMPLETED
// ============================================================================

/**
 * Mark reservation as completed.
 */
export async function markCompleted(reservationId) {
  const [reservation] = await mysqlSequelize.query(
    `SELECT id, status, guest_profile_id FROM reservations WHERE id = :reservationId`,
    { replacements: { reservationId }, type: QueryTypes.SELECT }
  );

  if (!reservation) throw new Error('RESERVATION_NOT_FOUND');
  if (reservation.status !== 'confirmed') throw new Error('RESERVATION_NOT_CONFIRMED');

  await mysqlSequelize.query(
    `UPDATE reservations SET status = 'completed', updated_at = NOW() WHERE id = :reservationId`,
    { replacements: { reservationId }, type: QueryTypes.UPDATE }
  );

  // Update guest profile stats
  if (reservation.guest_profile_id) {
    await mysqlSequelize.query(
      `UPDATE guest_profiles SET total_reservations = total_reservations + 1, updated_at = NOW()
       WHERE id = :profileId`,
      { replacements: { profileId: reservation.guest_profile_id }, type: QueryTypes.UPDATE }
    );
  }

  logger.info(`[Reservation] Completed reservation ${reservationId}`);
  return { success: true, status: 'completed' };
}

// ============================================================================
// 7. GET GUEST PROFILE
// ============================================================================

/**
 * Get guest profile by email.
 */
export async function getGuestProfile(email, destinationId) {
  const [profile] = await mysqlSequelize.query(
    `SELECT * FROM guest_profiles WHERE email = :email AND destination_id = :destinationId`,
    { replacements: { email, destinationId }, type: QueryTypes.SELECT }
  );
  if (!profile) return null;

  // Parse JSON fields
  if (typeof profile.dietary_preferences === 'string') {
    try { profile.dietary_preferences = JSON.parse(profile.dietary_preferences); } catch { /* keep */ }
  }
  if (typeof profile.allergies === 'string') {
    try { profile.allergies = JSON.parse(profile.allergies); } catch { /* keep */ }
  }

  return profile;
}

// ============================================================================
// GET RESERVATION DETAILS (public, by UUID)
// ============================================================================

/**
 * Get full reservation details by UUID.
 */
export async function getReservationDetails(reservationUuid) {
  const [reservation] = await mysqlSequelize.query(
    `SELECT r.*, rs.slot_date, rs.slot_time_start, rs.slot_time_end,
            p.name as poi_name, p.address as poi_address
     FROM reservations r
     JOIN reservation_slots rs ON rs.id = r.slot_id
     JOIN POI p ON p.id = r.poi_id
     WHERE r.reservation_uuid = :reservationUuid`,
    { replacements: { reservationUuid }, type: QueryTypes.SELECT }
  );

  if (!reservation) throw new Error('RESERVATION_NOT_FOUND');

  // Generate QR image if confirmed
  let qrCodeImage = null;
  if (reservation.qr_code_data) {
    qrCodeImage = await generateQRImage(reservation.qr_code_data);
  }

  return {
    id: reservation.id,
    reservationUuid: reservation.reservation_uuid,
    reservationNumber: reservation.reservation_number,
    status: reservation.status,
    partySize: reservation.party_size,
    guest: {
      name: reservation.guest_name,
      email: reservation.guest_email,
      phone: reservation.guest_phone,
    },
    specialRequests: reservation.special_requests,
    poi: {
      id: reservation.poi_id,
      name: reservation.poi_name,
      address: reservation.poi_address,
    },
    slot: {
      date: reservation.slot_date,
      timeStart: reservation.slot_time_start,
      timeEnd: reservation.slot_time_end,
    },
    deposit: {
      required: reservation.deposit_required,
      cents: reservation.deposit_cents,
      status: reservation.deposit_status,
    },
    qrCode: {
      data: reservation.qr_code_data,
      image: qrCodeImage,
    },
    createdAt: reservation.created_at,
  };
}

// ============================================================================
// VALIDATE QR (admin scanner)
// ============================================================================

/**
 * Validate a reservation QR code.
 */
export async function validateReservationQR(qrData, validatedBy) {
  const parts = qrData.split(':');
  if (parts.length !== 3 || parts[0] !== 'HB-R') {
    return { valid: false, message: 'Invalid reservation QR format' };
  }

  const [, reservationUuid, signature] = parts;

  try {
    if (!verifyQRSignature(reservationUuid, signature)) {
      return { valid: false, message: 'Invalid QR signature' };
    }
  } catch {
    return { valid: false, message: 'QR verification error' };
  }

  const [reservation] = await mysqlSequelize.query(
    `SELECT r.id, r.reservation_number, r.status, r.guest_name, r.party_size,
            rs.slot_date, rs.slot_time_start,
            p.name as poi_name
     FROM reservations r
     JOIN reservation_slots rs ON rs.id = r.slot_id
     JOIN POI p ON p.id = r.poi_id
     WHERE r.reservation_uuid = :reservationUuid`,
    { replacements: { reservationUuid }, type: QueryTypes.SELECT }
  );

  if (!reservation) return { valid: false, message: 'Reservation not found' };
  if (reservation.status !== 'confirmed') {
    return { valid: false, message: `Reservation status: ${reservation.status}`, reservationNumber: reservation.reservation_number };
  }

  logger.info(`[Reservation] QR validated: ${reservation.reservation_number} by ${validatedBy}`);

  return {
    valid: true,
    reservationNumber: reservation.reservation_number,
    guestName: reservation.guest_name,
    partySize: reservation.party_size,
    poiName: reservation.poi_name,
    slotDate: reservation.slot_date,
    slotTime: reservation.slot_time_start,
    message: 'Reservation validated successfully',
  };
}

// ============================================================================
// GUEST PROFILE UPSERT (internal)
// ============================================================================

async function upsertGuestProfile(destinationId, email, name, phone, specialRequests, consentDataStorage) {
  const [existing] = await mysqlSequelize.query(
    `SELECT id FROM guest_profiles WHERE email = :email AND destination_id = :destinationId`,
    { replacements: { email, destinationId }, type: QueryTypes.SELECT }
  );

  const nameParts = (name || '').trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  if (existing) {
    // Update stats
    await mysqlSequelize.query(
      `UPDATE guest_profiles SET
       first_name = COALESCE(NULLIF(:firstName, ''), first_name),
       last_name = COALESCE(NULLIF(:lastName, ''), last_name),
       phone = COALESCE(:phone, phone),
       consent_data_storage = :consent,
       consent_given_at = IF(:consent, NOW(), consent_given_at),
       data_retention_until = DATE_ADD(NOW(), INTERVAL 24 MONTH),
       updated_at = NOW()
       WHERE id = :profileId`,
      {
        replacements: {
          firstName, lastName, phone: phone || null,
          consent: consentDataStorage ? 1 : 0,
          profileId: existing.id,
        },
        type: QueryTypes.UPDATE,
      }
    );
  } else {
    // Create new profile
    await mysqlSequelize.query(
      `INSERT INTO guest_profiles
       (destination_id, email, phone, first_name, last_name,
        consent_data_storage, consent_given_at, data_retention_until, created_at)
       VALUES
       (:destinationId, :email, :phone, :firstName, :lastName,
        :consent, IF(:consent, NOW(), NULL), DATE_ADD(NOW(), INTERVAL 24 MONTH), NOW())`,
      {
        replacements: {
          destinationId, email, phone: phone || null, firstName, lastName,
          consent: consentDataStorage ? 1 : 0,
        },
        type: QueryTypes.INSERT,
      }
    );
  }
}

// ============================================================================
// BullMQ JOBS
// ============================================================================

/**
 * Release expired deposit_pending reservations (30 min timeout).
 */
export async function releaseExpiredDeposits() {
  let releasedCount = 0;

  const expired = await mysqlSequelize.query(
    `SELECT id, slot_id, party_size FROM reservations
     WHERE status = 'deposit_pending' AND created_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)`,
    { type: QueryTypes.SELECT }
  );

  for (const res of expired) {
    await mysqlSequelize.query(
      `UPDATE reservations SET status = 'expired', updated_at = NOW() WHERE id = :id`,
      { replacements: { id: res.id }, type: QueryTypes.UPDATE }
    );
    await mysqlSequelize.query(
      `UPDATE reservation_slots SET reserved_seats = GREATEST(reserved_seats - :partySize, 0), updated_at = NOW()
       WHERE id = :slotId`,
      { replacements: { partySize: res.party_size, slotId: res.slot_id }, type: QueryTypes.UPDATE }
    );
    releasedCount++;
  }

  if (releasedCount > 0) {
    logger.info(`[Reservation] Released ${releasedCount} expired deposit reservations`);
  }
  return { releasedCount };
}

/**
 * Send 24h reminder for tomorrow's reservations.
 */
export async function sendReminders24h() {
  const upcoming = await mysqlSequelize.query(
    `SELECT r.id, r.guest_name, r.guest_email, r.reservation_number,
            rs.slot_date, rs.slot_time_start,
            p.name as poi_name
     FROM reservations r
     JOIN reservation_slots rs ON rs.id = r.slot_id
     JOIN POI p ON p.id = r.poi_id
     WHERE r.status = 'confirmed'
       AND r.reminder_24h_sent = FALSE
       AND CONCAT(rs.slot_date, ' ', rs.slot_time_start) BETWEEN DATE_ADD(NOW(), INTERVAL 23 HOUR) AND DATE_ADD(NOW(), INTERVAL 25 HOUR)`,
    { type: QueryTypes.SELECT }
  );

  let sentCount = 0;
  for (const res of upcoming) {
    await mysqlSequelize.query(
      `UPDATE reservations SET reminder_24h_sent = TRUE, updated_at = NOW() WHERE id = :id`,
      { replacements: { id: res.id }, type: QueryTypes.UPDATE }
    );
    sentCount++;
    // Email sending would go here via emailService
    logger.info(`[Reservation] 24h reminder: ${res.reservation_number} for ${res.guest_email}`);
  }

  return { sentCount };
}

/**
 * Send 1h reminder for upcoming reservations.
 */
export async function sendReminders1h() {
  const upcoming = await mysqlSequelize.query(
    `SELECT r.id, r.guest_name, r.guest_email, r.reservation_number,
            rs.slot_date, rs.slot_time_start,
            p.name as poi_name
     FROM reservations r
     JOIN reservation_slots rs ON rs.id = r.slot_id
     JOIN POI p ON p.id = r.poi_id
     WHERE r.status = 'confirmed'
       AND r.reminder_1h_sent = FALSE
       AND CONCAT(rs.slot_date, ' ', rs.slot_time_start) BETWEEN DATE_ADD(NOW(), INTERVAL 30 MINUTE) AND DATE_ADD(NOW(), INTERVAL 90 MINUTE)`,
    { type: QueryTypes.SELECT }
  );

  let sentCount = 0;
  for (const res of upcoming) {
    await mysqlSequelize.query(
      `UPDATE reservations SET reminder_1h_sent = TRUE, updated_at = NOW() WHERE id = :id`,
      { replacements: { id: res.id }, type: QueryTypes.UPDATE }
    );
    sentCount++;
    logger.info(`[Reservation] 1h reminder: ${res.reservation_number} for ${res.guest_email}`);
  }

  return { sentCount };
}

/**
 * GDPR: Clean up expired guest data.
 */
export async function cleanupGuestData() {
  const expired = await mysqlSequelize.query(
    `SELECT id, email FROM guest_profiles
     WHERE data_retention_until IS NOT NULL AND data_retention_until < NOW()
       AND consent_data_storage = FALSE`,
    { type: QueryTypes.SELECT }
  );

  let deletedCount = 0;
  for (const profile of expired) {
    // Anonymize linked reservations
    await mysqlSequelize.query(
      `UPDATE reservations SET guest_name = 'DELETED', guest_email = :hash, guest_phone = NULL, guest_profile_id = NULL
       WHERE guest_profile_id = :profileId`,
      {
        replacements: {
          hash: crypto.createHash('sha256').update(profile.email).digest('hex').substring(0, 16),
          profileId: profile.id,
        },
        type: QueryTypes.UPDATE,
      }
    );

    // Delete profile
    await mysqlSequelize.query(
      `DELETE FROM guest_profiles WHERE id = :profileId`,
      { replacements: { profileId: profile.id }, type: QueryTypes.DELETE }
    );
    deletedCount++;
  }

  if (deletedCount > 0) {
    logger.info(`[Reservation] GDPR cleanup: deleted ${deletedCount} expired guest profiles`);
  }
  return { deletedCount };
}

export default {
  getAvailableSlots,
  createReservation,
  confirmReservation,
  cancelReservation,
  markNoShow,
  markCompleted,
  getGuestProfile,
  getReservationDetails,
  validateReservationQR,
  releaseExpiredDeposits,
  sendReminders24h,
  sendReminders1h,
  cleanupGuestData,
};
