/**
 * Content Quality Checker Module
 *
 * Verantwoordelijkheid: Feitelijke juistheid en completeness van POI content
 * Oorsprong: Content & Branding Agent (IMPLEMENTATIEPLAN A.7 — niet geimplementeerd)
 * Geintegreerd in: De Koerier (Agent #4, Data Sync)
 *
 * ACHTERGROND: De Fase R1-R6 content repair crisis bewees dat quality checks
 * op stijl ALLEEN onvoldoende zijn. Deze module monitort content COMPLETENESS
 * en CONSISTENCY — niet stijl.
 *
 * @module dataSync/contentQualityChecker
 */

import mongoose from 'mongoose';
import { logAgent, logError } from '../../orchestrator/auditTrail/index.js';

// MongoDB schema for content quality audits
const contentQualityAuditSchema = new mongoose.Schema({
  destination_id: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  completeness: { type: mongoose.Schema.Types.Mixed },
  consistency: { type: mongoose.Schema.Types.Mixed },
  overall_score: { type: Number, min: 0, max: 10 }
}, { collection: 'content_quality_audits' });

let ContentQualityAudit;
try {
  ContentQualityAudit = mongoose.model('ContentQualityAudit');
} catch {
  ContentQualityAudit = mongoose.model('ContentQualityAudit', contentQualityAuditSchema);
}

class ContentQualityChecker {
  /**
   * Check description completeness for a destination
   * @param {number} destinationId - 1=Calpe, 2=Texel
   * @returns {Promise<Object>} Completeness report
   */
  async checkDescriptionCompleteness(destinationId) {
    console.log(`[De Koerier] Content completeness check for destination ${destinationId}...`);

    try {
      const { mysqlSequelize } = await import('../../../config/database.js');

      const [rows] = await mysqlSequelize.query(`
        SELECT p.id, p.name, p.destination_id,
               CHAR_LENGTH(p.enriched_detail_description) as en_length,
               CHAR_LENGTH(p.enriched_detail_description_nl) as nl_length,
               CHAR_LENGTH(p.enriched_detail_description_de) as de_length,
               CHAR_LENGTH(p.enriched_detail_description_es) as es_length,
               p.last_updated
        FROM POI p
        WHERE p.destination_id = ?
          AND (p.is_active = 1 OR p.is_active IS NULL)
          AND (p.is_excluded_from_enrichment = 0 OR p.is_excluded_from_enrichment IS NULL)
      `, { replacements: [destinationId] });

      const now = new Date();
      const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

      let complete = 0;
      let missingEn = 0;
      let missingNl = 0;
      let missingDe = 0;
      let missingEs = 0;
      let lengthAnomalies = 0;
      let stale = 0;
      const details = [];

      for (const row of rows) {
        const enWords = row.en_length ? Math.round(row.en_length / 6) : 0; // rough word estimate
        const hasEn = row.en_length && row.en_length > 0;
        const hasNl = row.nl_length && row.nl_length > 0;
        const hasDe = row.de_length && row.de_length > 0;
        const hasEs = row.es_length && row.es_length > 0;

        if (!hasEn) {
          missingEn++;
          if (details.length < 50) {
            details.push({ poi_id: row.id, name: row.name, flag: 'missing_en' });
          }
        }
        if (!hasNl) missingNl++;
        if (!hasDe) missingDe++;
        if (!hasEs) missingEs++;

        // Check EN >= 50 words
        if (hasEn && enWords < 50) {
          if (details.length < 50) {
            details.push({ poi_id: row.id, name: row.name, flag: 'short_en', words: enWords });
          }
        }

        // Check translation length anomalies (50-150% of EN length)
        if (hasEn && row.en_length > 0) {
          const checkLang = (langLen, langName) => {
            if (langLen && (langLen < row.en_length * 0.5 || langLen > row.en_length * 1.5)) {
              lengthAnomalies++;
              if (details.length < 50) {
                const ratio = Math.round((langLen / row.en_length) * 100);
                details.push({ poi_id: row.id, name: row.name, flag: `length_anomaly_${langName}`, ratio: `${ratio}%` });
              }
            }
          };
          checkLang(row.nl_length, 'nl');
          checkLang(row.de_length, 'de');
          checkLang(row.es_length, 'es');
        }

        // Check staleness
        if (row.last_updated && new Date(row.last_updated) < sixMonthsAgo) {
          stale++;
        }

        // Complete = EN + all 3 translations present
        if (hasEn && hasNl && hasDe && hasEs) {
          complete++;
        }
      }

      const totalPois = rows.length;
      const completenessPct = totalPois > 0 ? Math.round((complete / totalPois) * 100) : 0;

      const result = {
        destination_id: destinationId,
        total_pois: totalPois,
        complete,
        missing_en: missingEn,
        missing_nl: missingNl,
        missing_de: missingDe,
        missing_es: missingEs,
        length_anomalies: lengthAnomalies,
        stale,
        completeness_pct: completenessPct,
        details
      };

      console.log(`[De Koerier] Completeness dest=${destinationId}: ${completenessPct}% complete, ${missingEn} missing EN, ${totalPois} total`);
      return result;
    } catch (error) {
      console.error(`[De Koerier] Completeness check failed for dest ${destinationId}:`, error.message);
      return {
        destination_id: destinationId,
        total_pois: 0,
        complete: 0,
        missing_en: 0,
        missing_nl: 0,
        missing_de: 0,
        missing_es: 0,
        length_anomalies: 0,
        stale: 0,
        completeness_pct: 0,
        details: [],
        error: error.message
      };
    }
  }

  /**
   * Check factual consistency using heuristic checks (NO AI calls, NO external API calls)
   * @param {number} destinationId - 1=Calpe, 2=Texel
   * @returns {Promise<Object>} Consistency report
   */
  async checkFactualConsistency(destinationId) {
    console.log(`[De Koerier] Factual consistency check for destination ${destinationId}...`);

    try {
      const { mysqlSequelize } = await import('../../../config/database.js');

      const [rows] = await mysqlSequelize.query(`
        SELECT p.id, p.name, p.enriched_detail_description,
               p.category, p.subcategory, p.address, p.website
        FROM POI p
        WHERE p.destination_id = ?
          AND (p.is_active = 1 OR p.is_active IS NULL)
          AND p.enriched_detail_description IS NOT NULL
          AND p.enriched_detail_description != ''
        LIMIT 500
      `, { replacements: [destinationId] });

      const flags = [];
      const flagSummary = { markdown: 0, language_mix: 0, suspicious_claim: 0 };

      // Dutch words that should NOT appear in English descriptions
      const dutchWords = /\b(het|een|van|straat|weg|plein|gracht|kerk|haven|dorp|stad|winkel|strand|bos|duin)\b/gi;

      // Markdown artifacts
      const markdownPatterns = /\[([^\]]+)\]\(http[^)]+\)|\*\*[^*]+\*\*|^#{1,3}\s/m;

      for (const row of rows) {
        const desc = row.enriched_detail_description || '';

        // Check 1: Markdown artifacts (CRITICAL — should be 0 after R6d fix)
        if (markdownPatterns.test(desc)) {
          flags.push({
            poi_id: row.id,
            poi_name: row.name,
            flag_type: 'markdown',
            detail: 'Markdown artifacts found in description'
          });
          flagSummary.markdown++;
        }

        // Check 2: Dutch words in EN description
        const dutchMatches = desc.match(dutchWords);
        if (dutchMatches && dutchMatches.length >= 2) {
          // Allow single occurrences (could be place names), flag 2+
          flags.push({
            poi_id: row.id,
            poi_name: row.name,
            flag_type: 'language_mix',
            detail: `Dutch words in EN: ${[...new Set(dutchMatches)].slice(0, 5).join(', ')}`
          });
          flagSummary.language_mix++;
        }

        // Check 3: Suspicious claims — "open daily"/"7 days"/"every day"
        if (/\b(open daily|7 days a week|every day|open year[- ]round)\b/i.test(desc)) {
          flags.push({
            poi_id: row.id,
            poi_name: row.name,
            flag_type: 'suspicious_claim',
            detail: 'Claims open daily/year-round (unverifiable without external data)'
          });
          flagSummary.suspicious_claim++;
        }

        // Check 4: Address mismatch — street name in description not in address
        if (row.address) {
          const streetPattern = /\b(\d+\s+(?:Calle|Avenida|Carrer|Straat|Weg|Plein|Dorpsstraat|Kerkstraat|Pontweg|Nikadel)\s+[A-Z][a-z]+)\b/i;
          const descStreet = desc.match(streetPattern);
          if (descStreet && !row.address.toLowerCase().includes(descStreet[1].toLowerCase().split(' ').pop())) {
            flags.push({
              poi_id: row.id,
              poi_name: row.name,
              flag_type: 'suspicious_claim',
              detail: `Street name "${descStreet[1]}" not found in address "${row.address}"`
            });
            flagSummary.suspicious_claim++;
          }
        }
      }

      const result = {
        destination_id: destinationId,
        checked: rows.length,
        flagged: flags.length,
        flags: flags.slice(0, 100), // Cap at 100 flags
        flag_types_summary: flagSummary
      };

      console.log(`[De Koerier] Consistency dest=${destinationId}: ${rows.length} checked, ${flags.length} flagged (${flagSummary.markdown} markdown, ${flagSummary.language_mix} lang mix, ${flagSummary.suspicious_claim} suspicious)`);
      return result;
    } catch (error) {
      console.error(`[De Koerier] Consistency check failed for dest ${destinationId}:`, error.message);
      return {
        destination_id: destinationId,
        checked: 0,
        flagged: 0,
        flags: [],
        flag_types_summary: { markdown: 0, language_mix: 0, suspicious_claim: 0 },
        error: error.message
      };
    }
  }

  /**
   * Run full content audit combining completeness + consistency
   * @param {number} destinationId - 1=Calpe, 2=Texel
   * @returns {Promise<Object>} Combined audit report with score
   */
  async runContentAudit(destinationId) {
    console.log(`[De Koerier] Running content audit for destination ${destinationId}...`);

    try {
      const completeness = await this.checkDescriptionCompleteness(destinationId);
      const consistency = await this.checkFactualConsistency(destinationId);

      // Score calculation (start at 10)
      let score = 10;
      if (completeness.missing_en > 0) score -= 3;         // CRITICAL
      if (completeness.completeness_pct < 95) score -= 2;
      if (completeness.completeness_pct < 80) score -= 3;   // extra
      if (consistency.flagged > 10) score -= 1;
      if (consistency.flagged > 50) score -= 2;              // extra
      if (consistency.flag_types_summary.markdown > 0) score -= 2; // CRITICAL
      score = Math.max(0, Math.min(10, score));

      const audit = {
        destination_id: destinationId,
        timestamp: new Date(),
        completeness,
        consistency,
        overall_score: score
      };

      // Persist to MongoDB
      await ContentQualityAudit.create(audit);

      await logAgent('data-sync', 'content_audit_completed', {
        description: `Content audit dest=${destinationId}: score ${score}/10, ${completeness.completeness_pct}% complete, ${consistency.flagged} flags`,
        metadata: { destination_id: destinationId, score, completeness_pct: completeness.completeness_pct, flagged: consistency.flagged }
      });

      console.log(`[De Koerier] Audit dest=${destinationId}: Score ${score}/10`);
      return audit;
    } catch (error) {
      await logError('data-sync', error, { action: 'content_audit', destination_id: destinationId });
      console.error(`[De Koerier] Content audit failed for dest ${destinationId}:`, error.message);
      return {
        destination_id: destinationId,
        timestamp: new Date(),
        completeness: {},
        consistency: {},
        overall_score: 0,
        error: error.message
      };
    }
  }

  /**
   * Get the most recent audit for a destination
   * @param {number} destinationId
   * @returns {Promise<Object|null>}
   */
  async getLatestAudit(destinationId) {
    try {
      return await ContentQualityAudit.findOne(
        { destination_id: destinationId }
      ).sort({ timestamp: -1 }).lean();
    } catch {
      return null;
    }
  }
}

export default new ContentQualityChecker();
