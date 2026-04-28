import BaseAgent from '../base/BaseAgent.js';
import { logAgent } from '../../orchestrator/auditTrail/index.js';
import { raiseIssue } from '../base/agentIssues.js';
import { mysqlSequelize } from '../../../config/database.js';
import { QueryTypes } from 'sequelize';
import { translateWithDeepL, isConfigured as deeplConfigured } from '../contentRedacteur/deeplTranslator.js';
import mongoose from 'mongoose';
import costTracker from '../../orchestrator/costController/costTracker.js';

const LANGS = ['nl', 'de', 'es'];
const SAMPLE_SIZE = 30;
const SIMILARITY_THRESHOLD = 0.75;

// Mongoose model for translation quality results
const TQSchema = new mongoose.Schema({
  destination_id: { type: Number, index: true },
  entity_type: { type: String, enum: ['poi', 'content_item'] },
  entity_id: Number,
  language: String,
  similarity_score: Number,
  flags: [String],
  checked_at: { type: Date, default: Date.now }
}, { collection: 'translation_quality', timestamps: true });
TQSchema.index({ destination_id: 1, entity_type: 1, entity_id: 1, language: 1 });
const TranslationQuality = mongoose.models.TranslationQuality || mongoose.model('TranslationQuality', TQSchema);

function tokenSimilarity(textA, textB) {
  const tokenize = s => new Set(s.toLowerCase().replace(/[^a-z\u00C0-\u00FF\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const a = tokenize(textA);
  const b = tokenize(textB);
  const intersection = new Set([...a].filter(t => b.has(t)));
  const union = new Set([...a, ...b]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

class VertalerAgent extends BaseAgent {
  constructor() {
    super({ name: 'De Vertaler', version: '2.0.0', category: 'content', destinationAware: true });
  }

  async runForDestination(destinationId) {
    const startTime = Date.now();
    const result = { destination_id: destinationId, checked: 0, flagged: 0, backtranslated: 0, scores: [], coverage: {}, issues: [] };
    const useDeepL = deeplConfigured();

    // 1. Coverage per taal
    for (const lang of LANGS) {
      const col = `enriched_detail_description_${lang}`;
      const [stats] = await mysqlSequelize.query(`
        SELECT COUNT(*) as total,
          SUM(CASE WHEN ${col} IS NOT NULL AND ${col} != '' THEN 1 ELSE 0 END) as translated
        FROM POI WHERE destination_id = :destId AND is_active = 1
          AND enriched_detail_description IS NOT NULL AND enriched_detail_description != ''
      `, { replacements: { destId: destinationId }, type: QueryTypes.SELECT });
      const pct = stats.total > 0 ? Math.round(stats.translated / stats.total * 1000) / 10 : 0;
      result.coverage[lang] = { total: stats.total, translated: stats.translated, percent: pct };
    }

    // 2. DeepL backtranslate steekproef (als geconfigureerd)
    if (useDeepL) {
      const pois = await mysqlSequelize.query(`
        SELECT id, enriched_detail_description as en_text,
          enriched_detail_description_nl as nl_text,
          enriched_detail_description_de as de_text,
          enriched_detail_description_es as es_text
        FROM POI WHERE destination_id = :destId AND is_active = 1
          AND enriched_detail_description IS NOT NULL AND LENGTH(enriched_detail_description) > 100
        ORDER BY RAND() LIMIT :limit
      `, { replacements: { destId: destinationId, limit: SAMPLE_SIZE }, type: QueryTypes.SELECT });

      for (const poi of pois) {
        for (const lang of LANGS) {
          const targetText = poi[`${lang}_text`];
          if (!targetText || targetText.length < 50) {
            await this._saveResult(destinationId, 'poi', poi.id, lang, null, ['untranslated']);
            result.flagged++;
            result.checked++;
            continue;
          }

          const flags = [];
          let similarity = null;

          // Word count ratio check
          const srcWords = poi.en_text.split(/\s+/).length;
          const tgtWords = targetText.split(/\s+/).length;
          const ratio = tgtWords / srcWords;
          if (ratio > 2.5 || ratio < 0.4) flags.push('word_count_mismatch');

          // DeepL backtranslate (cost-controlled)
          if (flags.length === 0) {
            try {
              const backtranslated = await translateWithDeepL(
                targetText.substring(0, 500),
                'EN-GB',
                { sourceLang: lang.toUpperCase(), timeout: 15000 }
              );
              await costTracker.logCost('deepl', 'backtranslate', targetText.length * 0.00002, { agent: 'vertaler', lang });
              similarity = tokenSimilarity(poi.en_text, backtranslated);
              if (similarity < SIMILARITY_THRESHOLD) flags.push('low_similarity');
              result.backtranslated++;
            } catch (err) {
              console.warn(`[vertaler] DeepL failed POI ${poi.id} ${lang}:`, err.message);
            }
          }

          await this._saveResult(destinationId, 'poi', poi.id, lang, similarity, flags);
          result.checked++;
          if (flags.length > 0) result.flagged++;
          if (similarity !== null) result.scores.push(similarity);
        }
      }
    }

    // 3. Metrics
    const avgSim = result.scores.length > 0 ? result.scores.reduce((a, b) => a + b, 0) / result.scores.length : null;
    const flagRate = result.checked > 0 ? result.flagged / result.checked : 0;

    // 4. Issues
    if (avgSim !== null && avgSim < SIMILARITY_THRESHOLD && result.scores.length > 10) {
      result.issues.push({ severity: 'medium', category: 'other',
        title: `Translation quality drop: avg similarity ${avgSim.toFixed(2)} (<${SIMILARITY_THRESHOLD})` });
    }
    if (flagRate > 0.20 && result.checked > 20) {
      result.issues.push({ severity: 'medium', category: 'other',
        title: `High translation flag rate: ${(flagRate * 100).toFixed(1)}%` });
    }
    for (const lang of LANGS) {
      if (result.coverage[lang].percent < 90 && result.coverage[lang].total > 50) {
        result.issues.push({ severity: 'medium', category: 'other',
          title: `${lang.toUpperCase()} coverage ${result.coverage[lang].percent}% (<90%)` });
      }
    }

    await logAgent('vertaler', 'translation_quality_check', {
      agentId: 'vertaler',
      description: `Translation: checked=${result.checked} flagged=${result.flagged} backtranslated=${result.backtranslated} avgSim=${avgSim?.toFixed(2) || 'N/A'} NL=${result.coverage.nl?.percent}% DE=${result.coverage.de?.percent}% ES=${result.coverage.es?.percent}%`,
      status: 'completed', metadata: { ...result, avgSimilarity: avgSim, flagRate, durationMs: Date.now() - startTime }
    });

    for (const issue of result.issues) {
      await raiseIssue({ agentName: 'vertaler', agentLabel: 'De Vertaler',
        severity: issue.severity, category: issue.category, title: issue.title,
        details: result, fingerprint: `vertaler-${destinationId}-${issue.title.substring(0, 25)}` });
    }
    return result;
  }

  async _saveResult(destId, type, entityId, lang, similarity, flags) {
    try {
      await TranslationQuality.findOneAndUpdate(
        { destination_id: destId, entity_type: type, entity_id: entityId, language: lang },
        { similarity_score: similarity, flags, checked_at: new Date() },
        { upsert: true }
      );
    } catch (err) {
      console.warn('[vertaler] Save result failed:', err.message);
    }
  }
}
export default new VertalerAgent();
