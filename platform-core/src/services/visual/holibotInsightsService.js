/**
 * HoliBot Insights Service
 * Analyzes chatbot conversations to extract trending themes, popular POIs,
 * top activities, and frequently asked questions per destination.
 * Runs weekly (Sunday 06:00) via BullMQ.
 */
import { mysqlSequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';
import logger from '../../utils/logger.js';
import { sanitizeAIText } from '../agents/contentRedacteur/contentSanitizer.js';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1';
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-medium-latest';

const holibotInsightsService = {

  /**
   * Analyze chatbot conversations for a destination and extract insights.
   * @param {number} destinationId
   * @param {number} weekNumber - ISO week number (default: current week)
   * @param {number} year - Year (default: current year)
   */
  async analyzeWeek(destinationId, weekNumber = null, year = null) {
    const now = new Date();
    const wk = weekNumber || this._getISOWeek(now);
    const yr = year || now.getFullYear();

    // 1. Get user messages from the past 7 days
    const messages = await mysqlSequelize.query(
      `SELECT hm.message, hm.created_at, hm.poi_ids, hm.quick_action
       FROM holibot_messages hm
       JOIN holibot_sessions hs ON hm.session_id = hs.id
       WHERE hs.destination_id = :destId
         AND hm.role = 'user'
         AND hm.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       ORDER BY hm.created_at DESC
       LIMIT 500`,
      { replacements: { destId: destinationId }, type: QueryTypes.SELECT }
    );

    if (messages.length === 0) {
      logger.info('[HolibotInsights] No messages found for dest ' + destinationId + ' in the past 7 days');
      return { destination_id: destinationId, week: wk, year: yr, insights: 0 };
    }

    // 2. Use Mistral to cluster messages into themes
    const insights = await this._clusterWithAI(messages, destinationId);

    // 3. Check which themes already have content
    for (const insight of insights) {
      const [existing] = await mysqlSequelize.query(
        `SELECT COUNT(*) AS cnt FROM content_items
         WHERE destination_id = :destId
           AND (title LIKE :kw OR title_en LIKE :kw)
           AND approval_status NOT IN ('deleted','rejected')`,
        { replacements: { destId: destinationId, kw: '%' + insight.keyword + '%' }, type: QueryTypes.SELECT }
      );
      insight.has_content = (existing.cnt || 0) > 0;
    }

    // 4. Upsert into holibot_insights
    let saved = 0;
    for (const insight of insights) {
      try {
        await mysqlSequelize.query(
          `INSERT INTO holibot_insights (destination_id, insight_type, keyword, mention_count, sample_messages, has_content, week_number, year)
           VALUES (:destId, :type, :keyword, :count, :samples, :hasContent, :week, :year)
           ON DUPLICATE KEY UPDATE mention_count = :count, sample_messages = :samples, has_content = :hasContent`,
          {
            replacements: {
              destId: destinationId,
              type: insight.insight_type,
              keyword: insight.keyword,
              count: insight.mention_count,
              samples: JSON.stringify(insight.sample_messages || []),
              hasContent: insight.has_content ? 1 : 0,
              week: wk,
              year: yr
            },
            type: QueryTypes.INSERT
          }
        );
        saved++;
      } catch (err) {
        logger.error('[HolibotInsights] Upsert error for "' + insight.keyword + '":', err.message);
      }
    }

    logger.info('[HolibotInsights] Dest ' + destinationId + ' week ' + wk + ': ' + saved + ' insights saved from ' + messages.length + ' messages');
    return { destination_id: destinationId, week: wk, year: yr, insights: saved, messages_analyzed: messages.length };
  },

  /**
   * Use Mistral AI to cluster user messages into themes
   */
  async _clusterWithAI(messages, destinationId) {
    if (!MISTRAL_API_KEY) {
      // Fallback: simple keyword frequency analysis
      return this._simpleFrequencyAnalysis(messages);
    }

    const sampleMessages = messages.slice(0, 100).map(function(m) { return m.message; });
    const prompt = 'Analyze these tourist chatbot questions and categorize them. Return a JSON array of the top 15 recurring themes/topics.\n\n' +
      'Each item: {"insight_type":"top_theme"|"top_poi"|"top_activity"|"top_question", "keyword":"short theme name", "mention_count":N, "sample_messages":["example1","example2"]}\n\n' +
      'Categories:\n- top_theme: general topics (beaches, restaurants, weather, transport)\n- top_poi: specific places asked about\n- top_activity: activities/experiences (hiking, diving, boat trips)\n- top_question: frequently asked questions\n\n' +
      'Messages:\n' + sampleMessages.join('\n') + '\n\nReturn ONLY a JSON array, no markdown.';

    try {
      const response = await fetch(MISTRAL_API_URL + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + MISTRAL_API_KEY },
        body: JSON.stringify({
          model: MISTRAL_MODEL,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2048,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        logger.warn('[HolibotInsights] Mistral API error: ' + response.status);
        return this._simpleFrequencyAnalysis(messages);
      }

      const result = await response.json();
      const text = result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content || '[]';

      // Parse JSON
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed.slice(0, 15).map(item => ({
          ...item,
          keyword: sanitizeAIText(item.keyword),
          sample_messages: Array.isArray(item.sample_messages) ? item.sample_messages.map(sanitizeAIText) : item.sample_messages,
        }));
      } catch (e) {
        // Try extracting from markdown
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          try { return JSON.parse(match[0]).slice(0, 15); } catch (e2) { /* fallback */ }
        }
      }
    } catch (err) {
      logger.error('[HolibotInsights] AI clustering error:', err.message);
    }

    return this._simpleFrequencyAnalysis(messages);
  },

  /**
   * Fallback: simple word frequency analysis (no AI)
   */
  _simpleFrequencyAnalysis(messages) {
    const stopWords = new Set(['the','a','an','is','are','in','on','at','to','for','of','and','or','i','we','can','you','what','where','how','do','does','any','with','there','this','that','it','my','me']);
    const wordCounts = {};
    const samples = {};

    for (const msg of messages) {
      const words = (msg.message || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(function(w) { return w.length > 3 && !stopWords.has(w); });
      for (const word of words) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
        if (!samples[word]) samples[word] = [];
        if (samples[word].length < 2) samples[word].push(msg.message.substring(0, 200));
      }
    }

    return Object.entries(wordCounts)
      .sort(function(a, b) { return b[1] - a[1]; })
      .slice(0, 15)
      .map(function(entry) {
        return {
          insight_type: 'top_theme',
          keyword: entry[0],
          mention_count: entry[1],
          sample_messages: samples[entry[0]] || []
        };
      });
  },

  /**
   * List insights for a destination (latest week or specific week)
   */
  async listInsights(destinationId, { week, year, insight_type, limit = 20, date_from, date_to } = {}) {
    const replacements = { destId: destinationId };
    let where = 'WHERE hi.destination_id = :destId';

    if (date_from) {
      where += ' AND hi.created_at >= :dateFrom';
      replacements.dateFrom = date_from;
    }
    if (date_to) {
      where += ' AND hi.created_at <= :dateTo';
      replacements.dateTo = date_to + ' 23:59:59';
    }

    if (week && year) {
      where += ' AND hi.week_number = :week AND hi.year = :year';
      replacements.week = parseInt(week);
      replacements.year = parseInt(year);
    } else if (!date_from && !date_to) {
      // Latest week only when no date filter is active
      where += ' AND (hi.year, hi.week_number) = (SELECT year, week_number FROM holibot_insights WHERE destination_id = :destId ORDER BY year DESC, week_number DESC LIMIT 1)';
    }

    if (insight_type) {
      where += ' AND hi.insight_type = :type';
      replacements.type = insight_type;
    }

    replacements.limit = Math.min(parseInt(limit) || 20, 50);

    const items = await mysqlSequelize.query(
      'SELECT hi.* FROM holibot_insights hi ' + where + ' ORDER BY hi.mention_count DESC LIMIT :limit',
      { replacements, type: QueryTypes.SELECT }
    );

    // Get available weeks
    const weeks = await mysqlSequelize.query(
      'SELECT DISTINCT year, week_number FROM holibot_insights WHERE destination_id = :destId ORDER BY year DESC, week_number DESC LIMIT 12',
      { replacements: { destId: destinationId }, type: QueryTypes.SELECT }
    );

    return { items, available_weeks: weeks };
  },

  /**
   * Get ISO week number
   */
  _getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }
};

export default holibotInsightsService;
