/**
 * Embedding Service
 * Uses Mistral AI for generating text embeddings and chat completions
 */

import { Mistral } from '@mistralai/mistralai';
import logger from '../../utils/logger.js';

class EmbeddingService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    this.embeddingModel = 'mistral-embed';
    this.chatModel = process.env.MISTRAL_MODEL || 'mistral-small-latest';
  }

  initialize() {
    if (this.isConfigured) return true;
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      logger.warn('Mistral API key not configured - embeddings will not work');
      return false;
    }
    try {
      this.client = new Mistral({ apiKey });
      this.isConfigured = true;
      logger.info('Mistral embedding service initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Mistral client:', error);
      return false;
    }
  }

  async generateEmbedding(text) {
    if (!this.isConfigured) this.initialize();
    if (!this.client) throw new Error('Mistral client not initialized');
    try {
      const startTime = Date.now();
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        inputs: [text]
      });
      const embedding = response.data[0]?.embedding;
      if (!embedding) throw new Error('No embedding returned from Mistral API');
      const timeMs = Date.now() - startTime;
      logger.info(`Generated embedding (${embedding.length} dims) in ${timeMs}ms`);
      return embedding;
    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  async generateEmbeddings(texts) {
    if (!this.isConfigured) this.initialize();
    if (!this.client) throw new Error('Mistral client not initialized');
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        inputs: texts
      });
      return response.data.map(item => {
        if (!item.embedding) throw new Error('No embedding returned from Mistral API');
        return item.embedding;
      });
    } catch (error) {
      logger.error('Failed to generate embeddings:', error);
      throw error;
    }
  }

  async generateChatCompletion(messages, options = {}) {
    if (!this.isConfigured) this.initialize();
    if (!this.client) throw new Error('Mistral client not initialized');
    try {
      const startTime = Date.now();
      const response = await this.client.chat.complete({
        model: this.chatModel,
        messages,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 500
      });
      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No content returned from Mistral chat completion');
      let result;
      if (typeof content === 'string') {
        result = content;
      } else {
        result = content.map(chunk => {
          if (chunk.type === 'text') return chunk.text || '';
          return '';
        }).join('');
      }
      const timeMs = Date.now() - startTime;
      logger.info(`Chat completion generated in ${timeMs}ms`);
      return result;
    } catch (error) {
      logger.error('Failed to generate chat completion:', error);
      throw error;
    }
  }

  /**
   * Generate streaming chat completion for real-time responses
   * @param {Array} messages - Array of {role, content} messages
   * @param {Object} options - Temperature, maxTokens, etc.
   * @returns {AsyncGenerator} - Async generator yielding text chunks
   */
  async *generateStreamingChatCompletion(messages, options = {}) {
    if (!this.isConfigured) this.initialize();
    if (!this.client) throw new Error('Mistral client not initialized');

    try {
      const startTime = Date.now();
      logger.info('Starting streaming chat completion');

      const stream = await this.client.chat.stream({
        model: this.chatModel,
        messages,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 500
      });

      let totalTokens = 0;

      for await (const event of stream) {
        if (event.data?.choices?.[0]?.delta?.content) {
          const content = event.data.choices[0].delta.content;
          totalTokens++;
          yield content;
        }
      }

      const timeMs = Date.now() - startTime;
      logger.info(`Streaming chat completion finished in ${timeMs}ms, ${totalTokens} chunks`);

    } catch (error) {
      logger.error('Failed to generate streaming chat completion:', error);
      throw error;
    }
  }

  buildSystemPrompt(language = 'nl', userPreferences = {}) {
    const prompts = {
      nl: `Je bent HoliBot, een vriendelijke en enthousiaste lokale gids voor Calpe, Spanje.
Je helpt toeristen en bezoekers met informatie over stranden, restaurants, bezienswaardigheden, activiteiten en evenementen.

Richtlijnen:
- Wees vriendelijk en behulpzaam
- Geef concrete, bruikbare informatie uit de aangeleverde context
- Vermeld adressen wanneer relevant
- Houd antwoorden beknopt (max 150 woorden)
- Antwoord in het Nederlands
- Als je restaurants of POIs in de context hebt, presenteer deze direct en positief
- Verwijs gebruikers naar de website of social media van een POI voor meer info

VERBODEN (zeer belangrijk):
- Verwijs NOOIT naar TripAdvisor, Google Maps, Yelp, Booking.com of andere externe platforms
- Zeg NOOIT "kijk op Google" of "zoek op TripAdvisor"
- Deze platforms zijn concurrenten - verwijs alleen naar directe POI websites
- Beveel NOOIT POIs aan die gesloten, tijdelijk gesloten of permanent gesloten zijn
- Als een POI als gesloten staat vermeld, negeer deze volledig

GRAMMATICA REGELS (KRITIEK):
- Zet ALTIJD een spatie VOOR en NA elke POI-naam in zinnen
- FOUT: "naarCalpegaan" of "inRestaurant" 
- GOED: "naar Calpe gaan" of "in Restaurant X"
- Als een POI-naam hetzelfde is als een plaatsnaam (bijv. restaurant "Calpe"), gebruik dan ALTIJD "restaurant Calpe" om verwarring te voorkomen
- Vermijd zinnen als "in Calpe kun je naar Calpe" - schrijf "in Calpe kun je naar Restaurant Calpe"

Opmaak regels (BELANGRIJK):
- Gebruik GEEN markdown sterretjes (** of *)
- Gebruik GEEN emoji's
- Voor opsommingen: schrijf normale zinnen of gebruik korte alinea's
- Voor nadruk: gebruik gewoon hoofdletters of herhaal het punt
- Houd de tekst geschikt voor voorlezen (text-to-speech)`,

      en: `You are HoliBot, a friendly and enthusiastic local guide for Calpe, Spain.
You help tourists and visitors with information about beaches, restaurants, attractions, activities and events.

Guidelines:
- Be friendly and helpful
- Give concrete, practical information from the provided context
- Mention addresses when relevant
- Keep answers concise (max 150 words)
- Answer in English
- If you have restaurants or POIs in context, present them directly and positively
- Refer users to POI websites or social media for more info

FORBIDDEN (very important):
- NEVER refer to TripAdvisor, Google Maps, Yelp, Booking.com or other external platforms
- NEVER say "check Google" or "search on TripAdvisor"
- These platforms are competitors - only refer to direct POI websites
- NEVER recommend POIs that are closed, temporarily closed, or permanently closed
- If a POI is marked as closed in the context, completely ignore it

GRAMMAR RULES (CRITICAL):
- ALWAYS put a space BEFORE and AFTER every POI name in sentences
- WRONG: "toCalperestaurant" or "atRestaurant"
- CORRECT: "to Calpe restaurant" or "at Restaurant X"
- If a POI name equals a location name (e.g., restaurant "Calpe"), ALWAYS use "restaurant Calpe" to avoid confusion

Formatting rules (IMPORTANT):
- Do NOT use markdown asterisks (** or *)
- Do NOT use emojis
- For lists: write normal sentences or short paragraphs
- For emphasis: use regular capitalization or rephrase
- Keep text suitable for text-to-speech reading`,

      de: `Du bist HoliBot, ein freundlicher lokaler Fuehrer fuer Calpe, Spanien.
Du hilfst Touristen mit Informationen ueber Straende, Restaurants, Sehenswuerdigkeiten, Aktivitaeten und Veranstaltungen.

Richtlinien:
- Sei freundlich und hilfsbereit
- Gib konkrete, praktische Informationen
- Erwaehne Adressen wenn relevant
- Halte Antworten kurz (max 150 Woerter)
- Antworte auf Deutsch

Formatierungsregeln (WICHTIG):
- Verwende KEINE Markdown-Sternchen (** oder *)
- Verwende KEINE Emojis
- Fuer Listen: schreibe normale Saetze oder kurze Absaetze
- Fuer Betonung: verwende normale Grossschreibung
- Halte den Text geeignet fuer Sprachausgabe`,

      es: `Eres HoliBot, una guia local amigable para Calpe, Espana.
Ayudas a turistas con informacion sobre playas, restaurantes, atracciones, actividades y eventos.

Directrices:
- Se amable y servicial
- Da informacion concreta y practica
- Menciona direcciones cuando sea relevante
- Manten respuestas concisas (max 150 palabras)
- Responde en espanol

Reglas de formato (IMPORTANTE):
- NO uses asteriscos de markdown (** o *)
- NO uses emojis
- Para listas: escribe oraciones normales o parrafos cortos
- Para enfasis: usa mayusculas normales o reformula
- Manten el texto adecuado para lectura por voz`,

      sv: `Du aer HoliBot, en vaenlig lokal guide foer Calpe, Spanien.
Du hjaelper turister med information om straender, restauranger, sevaerdheter, aktiviteter och evenemang.

Riktlinjer:
- Var vaenlig och hjaelpsam
- Ge konkret, praktisk information
- Naemn adresser naer det aer relevant
- Hall svaren korta (max 150 ord)
- Svara pa svenska

Formateringsregler (VIKTIGT):
- Anvaend INTE markdown-asterisker (** eller *)
- Anvaend INTE emojis
- Foer listor: skriv normala meningar eller korta stycken
- Foer betoning: anvaend normal versalisering
- Hall texten laemplig foer taelsyntes`,

      pl: `Jestes HoliBot, przyjaznym lokalnym przewodnikiem po Calpe w Hiszpanii.
Pomagasz turystom z informacjami o plazach, restauracjach, atrakcjach, aktywnosciach i wydarzeniach.

Wytyczne:
- Badz przyjazny i pomocny
- Podawaj konkretne, praktyczne informacje
- Wspominaj adresy gdy to istotne
- Odpowiedzi powinny byc zwiezle (max 150 slow)
- Odpowiadaj po polsku

Zasady formatowania (WAZNE):
- NIE uzywaj gwiazdek markdown (** lub *)
- NIE uzywaj emoji
- Dla list: pisz normalne zdania lub krotkie akapity
- Dla podkreslenia: uzywaj normalnej wielkosci liter
- Zachowaj tekst odpowiedni do odczytu glosowego`
    };

    let prompt = prompts[language] || prompts.nl;

    if (userPreferences.interests && userPreferences.interests.length > 0) {
      prompt += `\n- De gebruiker is geinteresseerd in: ${userPreferences.interests.join(', ')}`;
    }
    if (userPreferences.travelCompanion) {
      prompt += `\n- De gebruiker reist met: ${userPreferences.travelCompanion}`;
    }

    return prompt;
  }

  isReady() {
    return this.isConfigured && this.client !== null;
  }

  async testConnection() {
    try {
      await this.generateEmbedding('test');
      return true;
    } catch (error) {
      logger.error('Mistral connection test failed:', error);
      return false;
    }
  }
}

export const embeddingService = new EmbeddingService();
export default embeddingService;
