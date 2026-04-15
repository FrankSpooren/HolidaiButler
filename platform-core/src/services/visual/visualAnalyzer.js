/**
 * Visual Analyzer Service — AI-powered image/video analysis using Mistral Medium Vision
 * Three-layer analysis: metadata → thumbnail → video frames
 */
import { mysqlSequelize } from '../../config/database.js';
import { QueryTypes } from 'sequelize';
import logger from '../../utils/logger.js';
import videoFrameExtractor from './videoFrameExtractor.js';
import visualDiscoveryConfig from '../../config/visualDiscoveryConfig.js';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = process.env.MISTRAL_API_URL || 'https://api.mistral.ai/v1';
const VISION_MODEL = process.env.MISTRAL_VISION_MODEL || 'mistral-medium-latest';

const ANALYSIS_PROMPT = `Analyze this image for a tourism content platform. Return a raw JSON object (NO markdown, NO code blocks, NO backticks). Keep descriptions concise.

{"description":"2-3 sentences about tourism relevance","mood":"one word","themes":["3-5 tourism themes"],"objects":["5-10 visible elements"],"setting":"brief setting","content_suggestions":["2-3 post ideas"]}

CRITICAL: Output raw JSON only. No \`\`\`json blocks. No explanation before or after.`;

const visualAnalyzer = {

  /**
   * Analyze a visual (image or video) from URL
   * Three-layer approach:
   * 1. Metadata analysis (title, description, hashtags)
   * 2. Thumbnail/image analysis via Mistral Vision
   * 3. Video frame analysis (if video, extract key frames)
   *
   * @param {string} url - Image or video URL to analyze
   * @param {object} options - { thumbnailUrl, title, description, visualType }
   * @returns {object} AI analysis result
   */
  async analyzeUrl(url, { thumbnailUrl, title, description, visualType = 'image' } = {}) {
    if (!MISTRAL_API_KEY) {
      throw new Error('MISTRAL_API_KEY not configured');
    }

    let imageBuffer = null;

    // Layer 1: Try to get an image to analyze
    if (visualType === 'video') {
      // For videos: try thumbnail first (fast), then frame extraction (slow)
      if (thumbnailUrl) {
        imageBuffer = await videoFrameExtractor.downloadThumbnail(thumbnailUrl);
      }
      if (!imageBuffer) {
        const frames = await videoFrameExtractor.extractFrames(url, { maxFrames: 1 });
        if (frames.length > 0) imageBuffer = frames[0];
      }
    } else {
      // For images: download directly
      imageBuffer = await this._downloadImage(url);
    }

    if (!imageBuffer) {
      // Layer 1 fallback: metadata-only analysis
      logger.warn('[VisualAnalyzer] No image available, using metadata-only analysis');
      return this._analyzeMetadataOnly({ title, description });
    }

    // Layer 2: Vision analysis via Mistral
    const analysis = await this._analyzeWithVision(imageBuffer, { title, description });
    return analysis;
  },

  /**
   * Analyze a trending_visuals record by ID
   * Updates the record with AI analysis results
   */
  async analyzeTrendingVisual(id, destinationId) {
    const [visual] = await mysqlSequelize.query(
      'SELECT * FROM trending_visuals WHERE id = :id AND destination_id = :destId',
      { replacements: { id, destId: destinationId }, type: QueryTypes.SELECT }
    );

    if (!visual) return null;

    const analysis = await this.analyzeUrl(
      visual.source_url,
      {
        thumbnailUrl: visual.thumbnail_url,
        title: visual.title,
        description: visual.description,
        visualType: visual.visual_type
      }
    );

    // Calculate trend_score based on analysis quality + engagement
    const trendScore = this._calculateTrendScore(analysis, visual);

    // Update the record
    await mysqlSequelize.query(
      `UPDATE trending_visuals SET
        ai_description = :desc,
        ai_mood = :mood,
        ai_themes = :themes,
        ai_objects = :objects,
        ai_setting = :setting,
        ai_content_suggestions = :suggestions,
        trend_score = :score,
        relevance_category = :relevance,
        status = 'analyzed',
        analyzed_at = NOW()
       WHERE id = :id AND destination_id = :destId`,
      {
        replacements: {
          desc: analysis.description || null,
          mood: analysis.mood || null,
          themes: JSON.stringify(analysis.themes || []),
          objects: JSON.stringify(analysis.objects || []),
          setting: analysis.setting || null,
          suggestions: JSON.stringify(analysis.content_suggestions || []),
          score: trendScore,
          relevance: trendScore >= 7 ? 'high' : trendScore >= 4 ? 'medium' : 'low',
          id,
          destId: destinationId
        },
        type: QueryTypes.UPDATE
      }
    );

    return { ...analysis, trend_score: trendScore, id };
  },

  /**
   * Batch analyze discovered visuals for a destination
   * @param {number} destinationId
   * @param {number} batchSize - Number of visuals to analyze per run
   */
  async batchAnalyze(destinationId, batchSize = null) {
    const limit = batchSize || visualDiscoveryConfig.analysis.batchSize;

    const visuals = await mysqlSequelize.query(
      `SELECT id FROM trending_visuals
       WHERE destination_id = :destId AND status = 'discovered'
       ORDER BY engagement_score DESC, discovered_at ASC
       LIMIT :limit`,
      { replacements: { destId: destinationId, limit }, type: QueryTypes.SELECT }
    );

    const results = { analyzed: 0, failed: 0, skipped: 0 };

    for (const visual of visuals) {
      try {
        await this.analyzeTrendingVisual(visual.id, destinationId);
        results.analyzed++;
        logger.info(`[VisualAnalyzer] Analyzed visual ${visual.id} for dest ${destinationId}`);
      } catch (err) {
        results.failed++;
        logger.error(`[VisualAnalyzer] Failed to analyze visual ${visual.id}:`, err.message);
      }
    }

    return results;
  },

  /**
   * Send image to Mistral Vision API for analysis
   */
  async _analyzeWithVision(imageBuffer, { title, description } = {}) {
    const base64 = imageBuffer.toString('base64');
    const mimeType = this._detectMimeType(imageBuffer);

    // Build context from metadata
    let contextText = ANALYSIS_PROMPT;
    if (title) contextText += `\n\nContext — Title: ${title}`;
    if (description) contextText += `\nDescription: ${(description || '').substring(0, 500)}`;

    const response = await fetch(`${MISTRAL_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: 'text', text: contextText }
          ]
        }],
        max_tokens: visualDiscoveryConfig.analysis.maxTokens,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Mistral Vision API error ${response.status}: ${errText}`);
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content || '{}';

    // Parse JSON from response (handle markdown code blocks)
    return this._parseJsonResponse(text);
  },

  /**
   * Fallback: analyze using only metadata (no image available)
   */
  async _analyzeMetadataOnly({ title, description }) {
    if (!title && !description) {
      return { description: null, mood: null, themes: [], objects: [], setting: null, content_suggestions: [] };
    }

    const response = await fetch(`${MISTRAL_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [{
          role: 'user',
          content: `Based on this content metadata, suggest tourism-relevant analysis:\n\nTitle: ${title || 'N/A'}\nDescription: ${(description || '').substring(0, 1000)}\n\n${ANALYSIS_PROMPT}`
        }],
        max_tokens: visualDiscoveryConfig.analysis.maxTokens,
        temperature: 0.3
      })
    });

    if (!response.ok) throw new Error(`Mistral API error: ${response.status}`);
    const result = await response.json();
    const text = result.choices?.[0]?.message?.content || '{}';
    return this._parseJsonResponse(text);
  },

  /**
   * Download image from URL to Buffer
   */
  async _downloadImage(url) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) return null;
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) return null;
      const arrayBuffer = await resp.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      logger.warn('[VisualAnalyzer] Image download failed:', err.message);
      return null;
    }
  },

  /**
   * Detect MIME type from buffer magic bytes
   */
  _detectMimeType(buffer) {
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
    if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif';
    if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp';
    return 'image/jpeg'; // default
  },

  /**
   * Parse JSON from Mistral response, handling markdown code blocks
   */
  _parseJsonResponse(text) {
    try {
      // Try direct parse
      return JSON.parse(text);
    } catch {
      // Try extracting from markdown code block
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try { return JSON.parse(match[1].trim()); } catch { /* fall through */ }
      }
      // Try finding JSON object
      const objMatch = text.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try { return JSON.parse(objMatch[0]); } catch { /* fall through */ }
      }
      logger.warn('[VisualAnalyzer] Could not parse JSON from response:', text.substring(0, 200));
      return { description: text.substring(0, 500), mood: null, themes: [], objects: [], setting: null, content_suggestions: [] };
    }
  },

  /**
   * Calculate trend score (0-10) based on analysis + engagement
   */
  _calculateTrendScore(analysis, visual) {
    let score = 0;

    // Themes relevance (0-3)
    const tourismThemes = ['beach', 'dining', 'nature', 'architecture', 'culture', 'sports', 'family', 'nightlife', 'shopping', 'adventure', 'wellness', 'history'];
    const matchingThemes = (analysis.themes || []).filter(t => tourismThemes.some(tt => t.toLowerCase().includes(tt)));
    score += Math.min(3, matchingThemes.length);

    // Content suggestions quality (0-2)
    score += Math.min(2, (analysis.content_suggestions || []).length * 0.7);

    // Mood presence (0-1)
    if (analysis.mood) score += 1;

    // Description quality (0-2)
    if (analysis.description && analysis.description.length > 50) score += 2;
    else if (analysis.description) score += 1;

    // Engagement bonus (0-2)
    const engagement = parseFloat(visual.engagement_score) || 0;
    if (engagement > 100) score += 2;
    else if (engagement > 10) score += 1;

    return Math.min(10, Math.round(score * 10) / 10);
  }
};

export default visualAnalyzer;
