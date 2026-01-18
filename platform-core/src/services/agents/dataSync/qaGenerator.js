/**
 * Q&A Generator
 * Enterprise-level AI-powered Q&A generation for POIs
 *
 * Features:
 * - AI generation of top 20 questions per POI
 * - Multi-language support (NL, EN, ES)
 * - Source attribution (Google Q&A / Generated)
 * - Periodic refresh based on review themes
 * - Owner approval workflow for generated Q&A
 *
 * @module agents/dataSync/qaGenerator
 * @version 1.0.0
 */

import { logAgent, logError } from "../../orchestrator/auditTrail/index.js";
import apifyIntegration from "./apifyIntegration.js";

// Configuration
const MAX_QA_PER_POI_PER_LANGUAGE = 20;
const SUPPORTED_LANGUAGES = ["nl", "en", "es"];

// Q&A status constants
const QA_STATUS = {
  PENDING_APPROVAL: "pending_approval",
  APPROVED: "approved",
  REJECTED: "rejected",
  AUTO_APPROVED: "auto_approved"
};

// Q&A source types
const QA_SOURCE = {
  GOOGLE: "google",
  GENERATED: "ai_generated",
  MANUAL: "manual"
};

// Question templates per category (for AI-assisted generation)
const QUESTION_TEMPLATES = {
  food: {
    nl: [
      "Wat zijn de openingstijden van {name}?",
      "Moet ik reserveren bij {name}?",
      "Is {name} geschikt voor kinderen?",
      "Heeft {name} vegetarische opties?",
      "Wat is de prijsklasse van {name}?",
      "Is er een terras bij {name}?",
      "Accepteert {name} creditcards?",
      "Is er parkeergelegenheid bij {name}?",
      "Wat is het specialiteit van {name}?",
      "Is {name} rolstoeltoegankelijk?"
    ],
    en: [
      "What are the opening hours of {name}?",
      "Do I need to make a reservation at {name}?",
      "Is {name} suitable for children?",
      "Does {name} have vegetarian options?",
      "What is the price range at {name}?",
      "Is there an outdoor terrace at {name}?",
      "Does {name} accept credit cards?",
      "Is there parking available at {name}?",
      "What is the specialty of {name}?",
      "Is {name} wheelchair accessible?"
    ],
    es: [
      "¿Cuál es el horario de {name}?",
      "¿Necesito reservar en {name}?",
      "¿Es {name} adecuado para niños?",
      "¿Tiene {name} opciones vegetarianas?",
      "¿Cuál es el rango de precios en {name}?",
      "¿Hay terraza en {name}?",
      "¿Acepta {name} tarjetas de crédito?",
      "¿Hay aparcamiento en {name}?",
      "¿Cuál es la especialidad de {name}?",
      "¿Es {name} accesible para sillas de ruedas?"
    ]
  },
  culture: {
    nl: [
      "Wat zijn de openingstijden van {name}?",
      "Wat is de toegangsprijs voor {name}?",
      "Hoelang duurt een bezoek aan {name}?",
      "Is er een audiotour beschikbaar bij {name}?",
      "Is {name} geschikt voor kinderen?",
      "Mag ik fotograferen in {name}?",
      "Is er een cadeauwinkel bij {name}?",
      "Is {name} rolstoeltoegankelijk?",
      "Zijn er rondleidingen bij {name}?",
      "Wat is de beste tijd om {name} te bezoeken?"
    ],
    en: [
      "What are the opening hours of {name}?",
      "What is the entrance fee for {name}?",
      "How long does a visit to {name} take?",
      "Is there an audio tour available at {name}?",
      "Is {name} suitable for children?",
      "Can I take photos inside {name}?",
      "Is there a gift shop at {name}?",
      "Is {name} wheelchair accessible?",
      "Are there guided tours at {name}?",
      "What is the best time to visit {name}?"
    ],
    es: [
      "¿Cuál es el horario de {name}?",
      "¿Cuál es el precio de entrada para {name}?",
      "¿Cuánto tiempo dura una visita a {name}?",
      "¿Hay audioguía disponible en {name}?",
      "¿Es {name} adecuado para niños?",
      "¿Puedo tomar fotos dentro de {name}?",
      "¿Hay tienda de regalos en {name}?",
      "¿Es {name} accesible para sillas de ruedas?",
      "¿Hay visitas guiadas en {name}?",
      "¿Cuál es el mejor momento para visitar {name}?"
    ]
  },
  nature: {
    nl: [
      "Is {name} gratis toegankelijk?",
      "Wat is de beste route door {name}?",
      "Hoelang is de wandeling door {name}?",
      "Is {name} geschikt voor kinderen?",
      "Mag ik mijn hond meenemen naar {name}?",
      "Is er parkeergelegenheid bij {name}?",
      "Welke faciliteiten zijn er bij {name}?",
      "Wat is het beste seizoen voor {name}?",
      "Is {name} toegankelijk voor mindervaliden?",
      "Zijn er toiletten bij {name}?"
    ],
    en: [
      "Is {name} free to access?",
      "What is the best route through {name}?",
      "How long is the walk through {name}?",
      "Is {name} suitable for children?",
      "Can I bring my dog to {name}?",
      "Is there parking available at {name}?",
      "What facilities are there at {name}?",
      "What is the best season for {name}?",
      "Is {name} accessible for disabled visitors?",
      "Are there toilets at {name}?"
    ],
    es: [
      "¿Es {name} de acceso gratuito?",
      "¿Cuál es la mejor ruta por {name}?",
      "¿Cuánto dura el paseo por {name}?",
      "¿Es {name} adecuado para niños?",
      "¿Puedo llevar mi perro a {name}?",
      "¿Hay aparcamiento en {name}?",
      "¿Qué instalaciones hay en {name}?",
      "¿Cuál es la mejor temporada para {name}?",
      "¿Es {name} accesible para discapacitados?",
      "¿Hay baños en {name}?"
    ]
  },
  active: {
    nl: [
      "Wat zijn de openingstijden van {name}?",
      "Moet ik vooraf boeken bij {name}?",
      "Wat kost een activiteit bij {name}?",
      "Is {name} geschikt voor beginners?",
      "Welke leeftijd is geschikt voor {name}?",
      "Wat moet ik meenemen naar {name}?",
      "Is materiaal inbegrepen bij {name}?",
      "Zijn er instructeurs bij {name}?",
      "Hoelang duurt een sessie bij {name}?",
      "Is er parkeergelegenheid bij {name}?"
    ],
    en: [
      "What are the opening hours of {name}?",
      "Do I need to book in advance at {name}?",
      "What does an activity cost at {name}?",
      "Is {name} suitable for beginners?",
      "What age is suitable for {name}?",
      "What should I bring to {name}?",
      "Is equipment included at {name}?",
      "Are there instructors at {name}?",
      "How long does a session at {name} last?",
      "Is there parking available at {name}?"
    ],
    es: [
      "¿Cuál es el horario de {name}?",
      "¿Necesito reservar con antelación en {name}?",
      "¿Cuánto cuesta una actividad en {name}?",
      "¿Es {name} adecuado para principiantes?",
      "¿Qué edad es adecuada para {name}?",
      "¿Qué debo llevar a {name}?",
      "¿Está incluido el equipo en {name}?",
      "¿Hay instructores en {name}?",
      "¿Cuánto dura una sesión en {name}?",
      "¿Hay aparcamiento en {name}?"
    ]
  },
  practical: {
    nl: [
      "Wat zijn de openingstijden van {name}?",
      "Wat is het adres van {name}?",
      "Wat is het telefoonnummer van {name}?",
      "Spreekt het personeel van {name} Engels?",
      "Moet ik een afspraak maken bij {name}?",
      "Wat zijn de wachttijden bij {name}?",
      "Accepteert {name} verzekeringen?",
      "Is er parkeergelegenheid bij {name}?",
      "Is {name} geopend in het weekend?",
      "Wat is de dichtstbijzijnde {name}?"
    ],
    en: [
      "What are the opening hours of {name}?",
      "What is the address of {name}?",
      "What is the phone number of {name}?",
      "Does the staff at {name} speak English?",
      "Do I need an appointment at {name}?",
      "What are the waiting times at {name}?",
      "Does {name} accept insurance?",
      "Is there parking available at {name}?",
      "Is {name} open on weekends?",
      "What is the nearest {name}?"
    ],
    es: [
      "¿Cuál es el horario de {name}?",
      "¿Cuál es la dirección de {name}?",
      "¿Cuál es el teléfono de {name}?",
      "¿El personal de {name} habla inglés?",
      "¿Necesito cita previa en {name}?",
      "¿Cuáles son los tiempos de espera en {name}?",
      "¿Acepta {name} seguros?",
      "¿Hay aparcamiento en {name}?",
      "¿Está {name} abierto los fines de semana?",
      "¿Cuál es el {name} más cercano?"
    ]
  }
};

// Default answer templates
const ANSWER_TEMPLATES = {
  opening_hours: {
    nl: "De openingstijden van {name} zijn: {hours}. Controleer altijd de actuele tijden op hun website of bel vooraf.",
    en: "The opening hours of {name} are: {hours}. Always check the current times on their website or call ahead.",
    es: "El horario de {name} es: {hours}. Siempre verifique los horarios actuales en su sitio web o llame antes."
  },
  no_info: {
    nl: "Helaas hebben we deze informatie momenteel niet beschikbaar. Neem contact op met {name} voor meer details.",
    en: "Unfortunately, we don't have this information available at the moment. Please contact {name} for more details.",
    es: "Lamentablemente, no tenemos esta información disponible en este momento. Por favor contacte a {name} para más detalles."
  }
};

class QAGenerator {
  constructor() {
    this.sequelize = null;
    this.mistralClient = null;
  }

  setSequelize(sequelize) {
    this.sequelize = sequelize;
  }

  setMistralClient(client) {
    this.mistralClient = client;
  }

  /**
   * Fetch existing Google Q&A for a POI
   * @param {string} googlePlaceId - Google Place ID
   * @returns {Array} Google Q&A pairs
   */
  async fetchGoogleQA(googlePlaceId) {
    try {
      const qa = await apifyIntegration.getPlaceQA(googlePlaceId);
      return qa || [];
    } catch (error) {
      console.log(`[QAGenerator] No Google Q&A found for ${googlePlaceId}`);
      return [];
    }
  }

  /**
   * Generate Q&A from templates based on POI category
   * @param {Object} poi - POI data
   * @param {string} language - Target language
   * @returns {Array} Generated Q&A pairs
   */
  generateTemplateQA(poi, language) {
    const category = poi.category || "practical";
    const templates = QUESTION_TEMPLATES[category] || QUESTION_TEMPLATES.practical;
    const questions = templates[language] || templates.en;

    return questions.map((question, index) => {
      const formattedQuestion = question.replace(/{name}/g, poi.name);

      // Generate basic answer based on available data
      let answer = ANSWER_TEMPLATES.no_info[language].replace(/{name}/g, poi.name);

      // If we have opening hours and question is about hours
      if (question.toLowerCase().includes("openingstijd") ||
          question.toLowerCase().includes("opening hours") ||
          question.toLowerCase().includes("horario")) {
        if (poi.opening_hours) {
          answer = ANSWER_TEMPLATES.opening_hours[language]
            .replace(/{name}/g, poi.name)
            .replace(/{hours}/g, poi.opening_hours);
        }
      }

      return {
        question: formattedQuestion,
        answer,
        source: QA_SOURCE.GENERATED,
        priority: index + 1
      };
    });
  }

  /**
   * Generate AI-powered answers using Mistral
   * @param {Object} poi - POI data
   * @param {Array} questions - Questions to answer
   * @param {string} language - Target language
   * @returns {Array} Q&A with AI answers
   */
  async generateAIAnswers(poi, questions, language) {
    if (!this.mistralClient) {
      console.log("[QAGenerator] Mistral client not available, using template answers");
      return questions;
    }

    const languageNames = { nl: "Dutch", en: "English", es: "Spanish" };
    const enhanced = [];

    for (const qa of questions.slice(0, 10)) { // Limit to 10 for cost control
      try {
        const prompt = `You are a helpful tourism assistant. Answer the following question about "${poi.name}" (a ${poi.category} in ${poi.city || "Spain"}) in ${languageNames[language] || "English"}. Keep the answer concise (2-3 sentences max).

Question: ${qa.question}

Available information:
- Address: ${poi.address || "Not available"}
- Phone: ${poi.phone || "Not available"}
- Opening hours: ${poi.opening_hours || "Not available"}
- Rating: ${poi.rating || "Not available"}/5
- Category: ${poi.category || "general"}

Answer:`;

        const response = await this.mistralClient.chat({
          model: "mistral-small-latest",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 150
        });

        enhanced.push({
          ...qa,
          answer: response.choices[0]?.message?.content || qa.answer,
          source: QA_SOURCE.GENERATED
        });
      } catch (error) {
        console.log(`[QAGenerator] AI generation failed for question: ${qa.question.substring(0, 50)}...`);
        enhanced.push(qa);
      }
    }

    // Add remaining questions with template answers
    for (const qa of questions.slice(10)) {
      enhanced.push(qa);
    }

    return enhanced;
  }

  /**
   * Sync Q&A for a POI
   * @param {number} poiId - POI ID
   * @param {Object} options - Options
   * @returns {Object} Sync result
   */
  async syncQAForPOI(poiId, options = {}) {
    if (!this.sequelize) {
      throw new Error("Sequelize not initialized");
    }

    const { languages = SUPPORTED_LANGUAGES, useAI = true, autoApprove = false } = options;

    // Get POI data
    const [pois] = await this.sequelize.query(
      "SELECT * FROM POI WHERE id = ?",
      { replacements: [poiId] }
    );

    if (pois.length === 0) {
      return { success: false, reason: "poi_not_found" };
    }

    const poi = pois[0];
    console.log(`[QAGenerator] Syncing Q&A for POI ${poiId}: ${poi.name}`);

    const results = {
      poiId,
      poiName: poi.name,
      languages: {},
      totalGenerated: 0,
      googleQA: 0
    };

    // Fetch Google Q&A first
    let googleQA = [];
    if (poi.google_placeid) {
      googleQA = await this.fetchGoogleQA(poi.google_placeid);
      results.googleQA = googleQA.length;
    }

    // Process each language
    for (const language of languages) {
      const languageResults = {
        generated: 0,
        fromGoogle: 0,
        status: autoApprove ? QA_STATUS.AUTO_APPROVED : QA_STATUS.PENDING_APPROVAL
      };

      // Get existing Q&A count for this POI and language
      const [existing] = await this.sequelize.query(
        "SELECT COUNT(*) as count FROM QA WHERE poi_id = ? AND language = ?",
        { replacements: [poiId, language] }
      );

      const existingCount = existing[0]?.count || 0;
      const neededCount = MAX_QA_PER_POI_PER_LANGUAGE - existingCount;

      if (neededCount <= 0) {
        languageResults.skipped = true;
        languageResults.reason = "already_has_max";
        results.languages[language] = languageResults;
        continue;
      }

      // Generate Q&A from templates
      let generatedQA = this.generateTemplateQA(poi, language);

      // Enhance with AI if available
      if (useAI && this.mistralClient) {
        generatedQA = await this.generateAIAnswers(poi, generatedQA, language);
      }

      // Add Google Q&A (prioritize these)
      for (const gqa of googleQA.slice(0, 5)) {
        const translated = await this.translateQA(gqa, language);
        if (translated) {
          // Insert Google Q&A
          await this.insertQA(poiId, translated.question, translated.answer, language, {
            source: QA_SOURCE.GOOGLE,
            status: QA_STATUS.AUTO_APPROVED,
            priority: 0
          });
          languageResults.fromGoogle++;
        }
      }

      // Insert generated Q&A
      const toInsert = generatedQA.slice(0, neededCount - languageResults.fromGoogle);
      for (const qa of toInsert) {
        await this.insertQA(poiId, qa.question, qa.answer, language, {
          source: qa.source,
          status: autoApprove ? QA_STATUS.AUTO_APPROVED : QA_STATUS.PENDING_APPROVAL,
          priority: qa.priority
        });
        languageResults.generated++;
      }

      results.languages[language] = languageResults;
      results.totalGenerated += languageResults.generated + languageResults.fromGoogle;
    }

    await logAgent("data-sync", "qa_sync_complete", {
      description: `Q&A sync for ${poi.name}: ${results.totalGenerated} items`,
      metadata: results
    });

    return results;
  }

  /**
   * Insert Q&A into database
   * @param {number} poiId - POI ID
   * @param {string} question - Question
   * @param {string} answer - Answer
   * @param {string} language - Language code
   * @param {Object} options - Additional options
   */
  async insertQA(poiId, question, answer, language, options = {}) {
    const { source = QA_SOURCE.GENERATED, status = QA_STATUS.PENDING_APPROVAL, priority = 10 } = options;

    // Check for duplicate
    const [existing] = await this.sequelize.query(
      "SELECT id FROM QA WHERE poi_id = ? AND language = ? AND question = ?",
      { replacements: [poiId, language, question] }
    );

    if (existing.length > 0) {
      return { inserted: false, reason: "duplicate" };
    }

    await this.sequelize.query(`
      INSERT INTO QA (
        poi_id, question, answer, language, source, status, priority,
        created_at, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, {
      replacements: [poiId, question, answer, language, source, status, priority]
    });

    return { inserted: true };
  }

  /**
   * Translate Q&A to target language (basic implementation)
   * @param {Object} qa - Q&A object
   * @param {string} targetLang - Target language
   * @returns {Object|null} Translated Q&A
   */
  async translateQA(qa, targetLang) {
    // For now, return as-is if it's English or if we don't have Mistral
    // In production, this would use a translation API
    if (!this.mistralClient) {
      return {
        question: qa.question,
        answer: qa.answer
      };
    }

    // Use Mistral for translation
    try {
      const languageNames = { nl: "Dutch", en: "English", es: "Spanish" };
      const prompt = `Translate the following Q&A to ${languageNames[targetLang]}:

Question: ${qa.question}
Answer: ${qa.answer}

Respond in JSON format: {"question": "...", "answer": "..."}`;

      const response = await this.mistralClient.chat({
        model: "mistral-small-latest",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300
      });

      const content = response.choices[0]?.message?.content;
      return JSON.parse(content);
    } catch (error) {
      return { question: qa.question, answer: qa.answer };
    }
  }

  /**
   * Get pending approvals for owner review
   * @returns {Array} Pending Q&A items
   */
  async getPendingApprovals() {
    if (!this.sequelize) {
      throw new Error("Sequelize not initialized");
    }

    const [pending] = await this.sequelize.query(`
      SELECT qa.*, poi.name as poi_name, poi.category as poi_category
      FROM QA qa
      JOIN POI poi ON qa.poi_id = poi.id
      WHERE qa.status = ?
      ORDER BY qa.created_at DESC
      LIMIT 100
    `, { replacements: [QA_STATUS.PENDING_APPROVAL] });

    return pending;
  }

  /**
   * Approve Q&A item
   * @param {number} qaId - Q&A ID
   * @param {string} editedAnswer - Optional edited answer
   * @returns {Object} Result
   */
  async approveQA(qaId, editedAnswer = null) {
    const updates = editedAnswer
      ? "status = ?, answer = ?, approved_at = NOW(), last_updated = NOW()"
      : "status = ?, approved_at = NOW(), last_updated = NOW()";

    const replacements = editedAnswer
      ? [QA_STATUS.APPROVED, editedAnswer, qaId]
      : [QA_STATUS.APPROVED, qaId];

    await this.sequelize.query(
      `UPDATE QA SET ${updates} WHERE id = ?`,
      { replacements }
    );

    await logAgent("data-sync", "qa_approved", {
      description: `Q&A ${qaId} approved`,
      metadata: { qaId, edited: !!editedAnswer }
    });

    return { success: true, action: "approved" };
  }

  /**
   * Reject Q&A item
   * @param {number} qaId - Q&A ID
   * @param {string} reason - Rejection reason
   * @returns {Object} Result
   */
  async rejectQA(qaId, reason = "") {
    await this.sequelize.query(`
      UPDATE QA SET
        status = ?,
        rejection_reason = ?,
        last_updated = NOW()
      WHERE id = ?
    `, { replacements: [QA_STATUS.REJECTED, reason, qaId] });

    return { success: true, action: "rejected" };
  }

  /**
   * Batch sync Q&A for multiple POIs
   * @param {Array} poiIds - Array of POI IDs
   * @param {Object} options - Options
   * @returns {Object} Batch result
   */
  async batchSyncQA(poiIds, options = {}) {
    const results = {
      total: poiIds.length,
      processed: 0,
      failed: 0,
      details: []
    };

    for (const poiId of poiIds) {
      try {
        const result = await this.syncQAForPOI(poiId, options);
        results.processed++;
        results.details.push(result);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        results.failed++;
        results.details.push({ poiId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get Q&A statistics
   * @returns {Object} Statistics
   */
  async getStats() {
    if (!this.sequelize) {
      return { initialized: false };
    }

    const [totalResult] = await this.sequelize.query(
      "SELECT COUNT(*) as count FROM QA"
    );

    const [byStatus] = await this.sequelize.query(`
      SELECT status, COUNT(*) as count
      FROM QA
      GROUP BY status
    `);

    const [byLanguage] = await this.sequelize.query(`
      SELECT language, COUNT(*) as count
      FROM QA
      GROUP BY language
    `);

    const [bySource] = await this.sequelize.query(`
      SELECT source, COUNT(*) as count
      FROM QA
      GROUP BY source
    `);

    return {
      total: totalResult[0]?.count || 0,
      byStatus,
      byLanguage,
      bySource,
      maxPerPOI: MAX_QA_PER_POI_PER_LANGUAGE,
      supportedLanguages: SUPPORTED_LANGUAGES,
      timestamp: new Date().toISOString()
    };
  }
}

export default new QAGenerator();
export { QA_STATUS, QA_SOURCE, SUPPORTED_LANGUAGES, MAX_QA_PER_POI_PER_LANGUAGE };
