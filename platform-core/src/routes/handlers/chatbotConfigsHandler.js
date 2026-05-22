/**
 * Chatbot Configs Handler
 *
 * GET /api/v1/admin-portal/chatbot-configs?destinationId=X
 *
 * Retourneert chatbot configuratie voor destinatie: leest
 * destinations.branding.chatbotConfig + .chatbotName JSON. Gebruikt voor
 * ChatbotWidgetEditor preview/inherit-flow in Page Builder.
 *
 * Schema chatbotConfig:
 *   { name: string, welcomeMessage: i18nObject, quickActions: Array, color?: string }
 *
 * @version BLOK E3 (22-05-2026)
 */

import { mysqlSequelize } from '../../config/database.js';
import logger from '../../utils/logger.js';

export async function handleChatbotConfigs(req, res) {
  const destId = Number(req.query.destinationId || 0);
  if (!destId) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_DESTINATION', message: 'destinationId required' } });
  }

  try {
    const [[dest]] = await mysqlSequelize.query(
      `SELECT id, name, display_name, branding, default_language, supported_languages
       FROM destinations WHERE id = :id`,
      { replacements: { id: destId } }
    );
    if (!dest) {
      return res.status(404).json({ success: false, error: { code: 'DESTINATION_NOT_FOUND', message: 'Destination not found' } });
    }

    let branding = {};
    try { branding = typeof dest.branding === 'string' ? JSON.parse(dest.branding) : (dest.branding || {}); } catch { /* empty */ }

    const config = branding.chatbotConfig || {};
    const chatbotName = branding.chatbotName || config.name || null;

    return res.json({
      success: true,
      data: {
        destination_id: destId,
        destination_name: dest.display_name || dest.name,
        chatbot: {
          name: chatbotName,
          welcomeMessage: config.welcomeMessage || null,
          quickActions: Array.isArray(config.quickActions) ? config.quickActions : [],
          color: config.color || null,
          avatar: config.avatar || null,
          personality: config.personality || null,
        },
        default_language: dest.default_language || 'en',
        supported_languages: (() => {
          try { return typeof dest.supported_languages === 'string' ? JSON.parse(dest.supported_languages) : (dest.supported_languages || []); }
          catch { return []; }
        })(),
      }
    });
  } catch (error) {
    logger.error('[chatbot-configs] error:', error);
    return res.status(500).json({ success: false, error: { code: 'CHATBOT_CONFIGS_ERROR', message: error.message } });
  }
}
