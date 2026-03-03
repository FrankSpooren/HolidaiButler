/**
 * Partner Service — Fase IV Blok A
 *
 * CRUD operaties voor partners (POI-eigenaars in het intermediair-programma).
 * Partners worden per destination beheerd met commissie-afspraken.
 *
 * Functies:
 *   getPartners — Lijst met pagination, search, status filter
 *   getPartnerById — Detail incl. POIs + onboarding stappen
 *   createPartner — INSERT + automatische onboarding stappen
 *   updatePartner — UPDATE met validatie
 *   updateContractStatus — Status transitie met validatie + audit
 *   getPartnerTransactions — Placeholder voor Blok B
 *   getPartnerStats — Dashboard KPIs
 *   addPartnerPOI — Link partner aan POI
 *   removePartnerPOI — Soft-unlink (is_active=false)
 *   updateOnboardingStep — Onboarding stap bijwerken
 *
 * @version 1.0.0
 */

import { mysqlSequelize } from '../../config/database.js';

const { QueryTypes } = (await import('sequelize')).default;

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_ONBOARDING_STEPS = [
  'company_info',
  'poi_linking',
  'commission_setup',
  'contract_review',
  'activation'
];

const ALLOWED_CONTRACT_TRANSITIONS = {
  draft: ['pending', 'terminated'],
  pending: ['active', 'terminated'],
  active: ['suspended', 'terminated'],
  suspended: ['active', 'terminated'],
  terminated: []
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Basic IBAN format validation for NL/BE/ES
 */
function validateIBAN(iban) {
  if (!iban) return true; // Optional field
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  // NL: NLkk BBBB 0000 0000 00 (18 chars)
  // BE: BEkk 0000 0000 0000 (16 chars)
  // ES: ESkk 0000 0000 0000 0000 0000 (24 chars)
  const patterns = {
    NL: /^NL\d{2}[A-Z]{4}\d{10}$/,
    BE: /^BE\d{14}$/,
    ES: /^ES\d{22}$/
  };
  const country = cleaned.substring(0, 2);
  if (!patterns[country]) return false;
  return patterns[country].test(cleaned);
}

/**
 * Basic EU VAT number validation for NL/BE/ES
 */
function validateVAT(vat) {
  if (!vat) return true; // Optional field
  const cleaned = vat.replace(/[\s.-]/g, '').toUpperCase();
  const patterns = {
    NL: /^NL\d{9}B\d{2}$/,
    BE: /^BE[01]\d{9}$/,
    ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/
  };
  const country = cleaned.substring(0, 2);
  if (!patterns[country]) return false;
  return patterns[country].test(cleaned);
}

/**
 * Validate contract status transition
 */
function validateContractTransition(currentStatus, newStatus) {
  const allowed = ALLOWED_CONTRACT_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(newStatus);
}

// ============================================================================
// 1. GET PARTNERS (LIST)
// ============================================================================

async function getPartners(destinationId, filters = {}) {
  const { status, search, page = 1, limit = 25 } = filters;
  const offset = (page - 1) * limit;

  let where = 'WHERE p.destination_id = :destinationId';
  const replacements = { destinationId, limit, offset };

  if (status) {
    where += ' AND p.contract_status = :status';
    replacements.status = status;
  }

  if (search) {
    where += ' AND (p.company_name LIKE :search OR p.contact_name LIKE :search OR p.contact_email LIKE :search)';
    replacements.search = `%${search}%`;
  }

  const [countResult] = await mysqlSequelize.query(
    `SELECT COUNT(*) as total FROM partners p ${where}`,
    { replacements, type: QueryTypes.SELECT }
  );
  const total = countResult.total;

  const items = await mysqlSequelize.query(
    `SELECT p.*,
       (SELECT COUNT(*) FROM partner_pois pp WHERE pp.partner_id = p.id AND pp.is_active = 1) as poi_count
     FROM partners p
     ${where}
     ORDER BY p.created_at DESC
     LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT }
  );

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

// ============================================================================
// 2. GET PARTNER BY ID (DETAIL)
// ============================================================================

async function getPartnerById(id, destinationId) {
  const [partner] = await mysqlSequelize.query(
    `SELECT p.* FROM partners p
     WHERE p.id = :id AND p.destination_id = :destinationId`,
    { replacements: { id, destinationId }, type: QueryTypes.SELECT }
  );

  if (!partner) return null;

  // Get linked POIs
  const pois = await mysqlSequelize.query(
    `SELECT pp.*, poi.name as poi_name, poi.category as poi_category,
            poi.rating as poi_rating, poi.review_count as poi_review_count
     FROM partner_pois pp
     LEFT JOIN POI poi ON poi.id = pp.poi_id
     WHERE pp.partner_id = :partnerId
     ORDER BY pp.is_active DESC, poi.name ASC`,
    { replacements: { partnerId: id }, type: QueryTypes.SELECT }
  );

  // Get onboarding steps
  const onboarding = await mysqlSequelize.query(
    `SELECT * FROM partner_onboarding
     WHERE partner_id = :partnerId
     ORDER BY FIELD(step_name, 'company_info', 'poi_linking', 'commission_setup', 'contract_review', 'activation')`,
    { replacements: { partnerId: id }, type: QueryTypes.SELECT }
  );

  return { ...partner, pois, onboarding };
}

// ============================================================================
// 3. CREATE PARTNER
// ============================================================================

async function createPartner(data) {
  const {
    destinationId, companyName, contactName, contactEmail, contactPhone,
    iban, kvkNumber, vatNumber, commissionRate, commissionType,
    poiId, notes
  } = data;

  // Validate IBAN if provided
  if (iban && !validateIBAN(iban)) {
    throw new Error('Invalid IBAN format. Supported: NL, BE, ES');
  }

  // Validate VAT if provided
  if (vatNumber && !validateVAT(vatNumber)) {
    throw new Error('Invalid VAT number format. Supported: NL, BE, ES');
  }

  const t = await mysqlSequelize.transaction();

  try {
    // Insert partner
    const [result] = await mysqlSequelize.query(
      `INSERT INTO partners (destination_id, poi_id, company_name, contact_name, contact_email,
         contact_phone, iban, kvk_number, vat_number, commission_rate, commission_type, notes)
       VALUES (:destinationId, :poiId, :companyName, :contactName, :contactEmail,
         :contactPhone, :iban, :kvkNumber, :vatNumber, :commissionRate, :commissionType, :notes)`,
      {
        replacements: {
          destinationId,
          poiId: poiId || null,
          companyName,
          contactName,
          contactEmail,
          contactPhone: contactPhone || null,
          iban: iban ? iban.replace(/\s/g, '').toUpperCase() : null,
          kvkNumber: kvkNumber || null,
          vatNumber: vatNumber ? vatNumber.replace(/[\s.-]/g, '').toUpperCase() : null,
          commissionRate: commissionRate || 15.00,
          commissionType: commissionType || 'percentage',
          notes: notes || null
        },
        transaction: t
      }
    );

    const partnerId = result;

    // Create default onboarding steps
    for (const stepName of DEFAULT_ONBOARDING_STEPS) {
      await mysqlSequelize.query(
        `INSERT INTO partner_onboarding (partner_id, step_name)
         VALUES (:partnerId, :stepName)`,
        { replacements: { partnerId, stepName }, transaction: t }
      );
    }

    await t.commit();

    // Return the created partner
    return await getPartnerById(partnerId, destinationId);
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

// ============================================================================
// 4. UPDATE PARTNER
// ============================================================================

async function updatePartner(id, destinationId, data) {
  const {
    companyName, contactName, contactEmail, contactPhone,
    iban, kvkNumber, vatNumber, commissionRate, commissionType, notes
  } = data;

  // Validate IBAN if provided
  if (iban && !validateIBAN(iban)) {
    throw new Error('Invalid IBAN format. Supported: NL, BE, ES');
  }

  // Validate VAT if provided
  if (vatNumber && !validateVAT(vatNumber)) {
    throw new Error('Invalid VAT number format. Supported: NL, BE, ES');
  }

  // Build dynamic SET clause
  const fields = [];
  const replacements = { id, destinationId };

  if (companyName !== undefined) { fields.push('company_name = :companyName'); replacements.companyName = companyName; }
  if (contactName !== undefined) { fields.push('contact_name = :contactName'); replacements.contactName = contactName; }
  if (contactEmail !== undefined) { fields.push('contact_email = :contactEmail'); replacements.contactEmail = contactEmail; }
  if (contactPhone !== undefined) { fields.push('contact_phone = :contactPhone'); replacements.contactPhone = contactPhone; }
  if (iban !== undefined) { fields.push('iban = :iban'); replacements.iban = iban ? iban.replace(/\s/g, '').toUpperCase() : null; }
  if (kvkNumber !== undefined) { fields.push('kvk_number = :kvkNumber'); replacements.kvkNumber = kvkNumber; }
  if (vatNumber !== undefined) { fields.push('vat_number = :vatNumber'); replacements.vatNumber = vatNumber ? vatNumber.replace(/[\s.-]/g, '').toUpperCase() : null; }
  if (commissionRate !== undefined) { fields.push('commission_rate = :commissionRate'); replacements.commissionRate = commissionRate; }
  if (commissionType !== undefined) { fields.push('commission_type = :commissionType'); replacements.commissionType = commissionType; }
  if (notes !== undefined) { fields.push('notes = :notes'); replacements.notes = notes; }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  await mysqlSequelize.query(
    `UPDATE partners SET ${fields.join(', ')}
     WHERE id = :id AND destination_id = :destinationId`,
    { replacements }
  );

  return await getPartnerById(id, destinationId);
}

// ============================================================================
// 5. UPDATE CONTRACT STATUS
// ============================================================================

async function updateContractStatus(id, destinationId, newStatus, actor) {
  const [partner] = await mysqlSequelize.query(
    'SELECT id, contract_status FROM partners WHERE id = :id AND destination_id = :destinationId',
    { replacements: { id, destinationId }, type: QueryTypes.SELECT }
  );

  if (!partner) {
    throw new Error('Partner not found');
  }

  // Idempotent: if already in target status, return success
  if (partner.contract_status === newStatus) {
    return await getPartnerById(id, destinationId);
  }

  if (!validateContractTransition(partner.contract_status, newStatus)) {
    throw new Error(`Invalid transition: ${partner.contract_status} → ${newStatus}`);
  }

  const updates = { id, destinationId, newStatus };

  // Set contract_start_date when activating
  let extraFields = '';
  if (newStatus === 'active' && !partner.contract_start_date) {
    extraFields = ', contract_start_date = CURDATE()';
  }
  if (newStatus === 'terminated') {
    extraFields = ', contract_end_date = CURDATE()';
  }

  await mysqlSequelize.query(
    `UPDATE partners SET contract_status = :newStatus${extraFields}
     WHERE id = :id AND destination_id = :destinationId`,
    { replacements: updates }
  );

  return await getPartnerById(id, destinationId);
}

// ============================================================================
// 6. GET PARTNER TRANSACTIONS (PLACEHOLDER — Blok B)
// ============================================================================

async function getPartnerTransactions(partnerId, destinationId, filters = {}) {
  const { page = 1, limit = 25 } = filters;
  // Placeholder: intermediary_transactions table will be created in Blok B
  return {
    items: [],
    pagination: {
      page,
      limit,
      total: 0,
      totalPages: 0
    }
  };
}

// ============================================================================
// 7. GET PARTNER STATS (DASHBOARD KPIs)
// ============================================================================

async function getPartnerStats(destinationId) {
  let where = 'WHERE 1=1';
  const replacements = {};

  if (destinationId) {
    where += ' AND destination_id = :destinationId';
    replacements.destinationId = destinationId;
  }

  const stats = await mysqlSequelize.query(
    `SELECT
       COUNT(*) as total_partners,
       SUM(CASE WHEN contract_status = 'active' THEN 1 ELSE 0 END) as active_partners,
       SUM(CASE WHEN contract_status = 'draft' THEN 1 ELSE 0 END) as draft_partners,
       SUM(CASE WHEN contract_status = 'pending' THEN 1 ELSE 0 END) as pending_partners,
       SUM(CASE WHEN contract_status = 'suspended' THEN 1 ELSE 0 END) as suspended_partners,
       SUM(CASE WHEN contract_status = 'terminated' THEN 1 ELSE 0 END) as terminated_partners,
       AVG(commission_rate) as avg_commission_rate
     FROM partners
     ${where}`,
    { replacements, type: QueryTypes.SELECT }
  );

  const [poiStats] = await mysqlSequelize.query(
    `SELECT COUNT(DISTINCT pp.poi_id) as linked_pois
     FROM partner_pois pp
     JOIN partners p ON p.id = pp.partner_id
     WHERE pp.is_active = 1
     ${destinationId ? 'AND p.destination_id = :destinationId' : ''}`,
    { replacements, type: QueryTypes.SELECT }
  );

  return {
    ...stats[0],
    linked_pois: poiStats.linked_pois || 0
  };
}

// ============================================================================
// 8. ADD PARTNER POI
// ============================================================================

async function addPartnerPOI(partnerId, poiId, data = {}) {
  const { commissionOverride, servicesOffered } = data;

  await mysqlSequelize.query(
    `INSERT INTO partner_pois (partner_id, poi_id, commission_override, services_offered)
     VALUES (:partnerId, :poiId, :commissionOverride, :servicesOffered)
     ON DUPLICATE KEY UPDATE
       commission_override = :commissionOverride,
       services_offered = :servicesOffered,
       is_active = 1`,
    {
      replacements: {
        partnerId,
        poiId,
        commissionOverride: commissionOverride || null,
        servicesOffered: servicesOffered ? JSON.stringify(servicesOffered) : null
      }
    }
  );
}

// ============================================================================
// 9. REMOVE PARTNER POI (SOFT)
// ============================================================================

async function removePartnerPOI(partnerId, poiId) {
  await mysqlSequelize.query(
    'UPDATE partner_pois SET is_active = 0 WHERE partner_id = :partnerId AND poi_id = :poiId',
    { replacements: { partnerId, poiId } }
  );
}

// ============================================================================
// 10. UPDATE ONBOARDING STEP
// ============================================================================

async function updateOnboardingStep(partnerId, stepName, status, completedBy) {
  const updates = { partnerId, stepName, status };
  let extraFields = '';

  if (status === 'completed') {
    extraFields = ', completed_at = NOW(), completed_by = :completedBy';
    updates.completedBy = completedBy;
  }

  await mysqlSequelize.query(
    `UPDATE partner_onboarding
     SET step_status = :status${extraFields}
     WHERE partner_id = :partnerId AND step_name = :stepName`,
    { replacements: updates }
  );

  // Check if all steps completed → set onboarding_completed_at on partner
  const [incomplete] = await mysqlSequelize.query(
    `SELECT COUNT(*) as count FROM partner_onboarding
     WHERE partner_id = :partnerId AND step_status = 'pending'`,
    { replacements: { partnerId }, type: QueryTypes.SELECT }
  );

  if (incomplete.count === 0) {
    await mysqlSequelize.query(
      'UPDATE partners SET onboarding_completed_at = NOW() WHERE id = :partnerId AND onboarding_completed_at IS NULL',
      { replacements: { partnerId } }
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getPartners,
  getPartnerById,
  createPartner,
  updatePartner,
  updateContractStatus,
  getPartnerTransactions,
  getPartnerStats,
  addPartnerPOI,
  removePartnerPOI,
  updateOnboardingStep,
  validateIBAN,
  validateVAT,
  validateContractTransition
};
