/**
 * RAG Service v2.4 - Anti-Hallucination Layer
 * 
 * Key improvements:
 * 1. Entity existence validation before responding
 * 2. Higher similarity threshold for Q&A entries (0.55 vs 0.45)
 * 3. Filter out irrelevant Q&A that dont mention queried entity
 * 4. Explicit LLM instructions to deny unknown entities
 * 5. Named entity extraction and validation
 */
import { chromaService } from "./chromaService.js";
import { embeddingService } from "./embeddingService.js";
import logger from "../../utils/logger.js";

class RAGService {
  constructor() {
    this.isInitialized = false;
    this.poiNameCache = [];
    this.poiNameCacheExpiry = 0;
    this.CACHE_TTL_MS = 3600000;
    this.POI_SIMILARITY_THRESHOLD = 0.50;
    this.QA_SIMILARITY_THRESHOLD = 0.58;
  }

  levenshteinDistance(a, b) {
    const aL = a.toLowerCase(), bL = b.toLowerCase();
    if (aL === bL) return 0;
    if (!aL.length) return bL.length;
    if (!bL.length) return aL.length;
    const m = [];
    for (let i = 0; i <= bL.length; i++) m[i] = [i];
    for (let j = 0; j <= aL.length; j++) m[0][j] = j;
    for (let i = 1; i <= bL.length; i++) {
      for (let j = 1; j <= aL.length; j++) {
        m[i][j] = Math.min(m[i-1][j]+1, m[i][j-1]+1, m[i-1][j-1]+(aL[j-1]===bL[i-1]?0:1));
      }
    }
    return m[bL.length][aL.length];
  }

  calculateSimilarity(a, b) {
    const d = this.levenshteinDistance(a, b);
    const max = Math.max(a.length, b.length);
    return max === 0 ? 1 : 1 - (d / max);
  }

  async loadPOINameCache() {
    const now = Date.now();
    if (this.poiNameCache.length > 0 && now < this.poiNameCacheExpiry) return;
    try {
      const results = await chromaService.search(await embeddingService.generateEmbedding("poi restaurant beach museum attraction"), 300, null);
      this.poiNameCache = results.map(r => ({
        name: r.metadata?.name || r.metadata?.title || "",
        id: r.metadata?.id || r.id,
        category: r.metadata?.category || "",
        type: r.metadata?.type || "poi"
      })).filter(item => item.name && item.name.length > 2 && item.name !== "Unknown");
      this.poiNameCacheExpiry = now + this.CACHE_TTL_MS;
      logger.info("POI cache loaded: " + this.poiNameCache.length + " items");
    } catch (e) {
      logger.warn("POI cache failed:", e.message);
      this.poiNameCache = [];
    }
  }

  extractMainName(fullName) {
    if (!fullName) return "";
    const parts = fullName.split(/\s*[|–—-]\s*/);
    return parts[0].trim();
  }

  async findFuzzyMatch(term, opts = {}) {
    await this.loadPOINameCache();
    const threshold = opts.threshold || 0.65;
    const tL = term.toLowerCase();
    const matches = this.poiNameCache.map(poi => {
      const mainName = this.extractMainName(poi.name);
      const nL = mainName.toLowerCase();
      if (nL === tL) return {...poi, similarity: 1.0, matchType: "exact"};
      if (nL.includes(tL) || tL.includes(nL)) {
        return {...poi, similarity: 0.85 + (Math.min(tL.length, nL.length)/Math.max(tL.length, nL.length)*0.1), matchType: "contains"};
      }
      return {...poi, similarity: this.calculateSimilarity(tL, nL), matchType: "fuzzy"};
    }).filter(m => m.similarity >= threshold).sort((a,b) => b.similarity - a.similarity).slice(0, opts.maxResults || 3);
    if (matches.length > 0) logger.info("Fuzzy match", {query: term, top: matches[0]?.name});
    return matches;
  }

  // NEW: Extract named entities from query (places, restaurants, museums, etc.)
  extractNamedEntities(query) {
    const entities = [];
    const lq = query.toLowerCase();
    
    // Patterns for named entities
    const patterns = [
      /(?:restaurant|restaurante)\s+([A-Z][a-zA-Z\s]+?)(?:\s+in|\s+Calpe|\?|$)/gi,
      /(?:museum|museu)\s+([A-Z][a-zA-Z\s]+?)(?:\s+in|\s+Calpe|\?|$)/gi,
      /(?:beach|strand|playa)\s+([A-Z][a-zA-Z\s]+?)(?:\s+in|\s+Calpe|\?|$)/gi,
      /(?:hotel)\s+([A-Z][a-zA-Z\s]+?)(?:\s+in|\s+Calpe|\?|$)/gi,
      /(?:bar|cafe|café)\s+([A-Z][a-zA-Z\s]+?)(?:\s+in|\s+Calpe|\?|$)/gi,
      /(?:over|about|naar|to|van|of)\s+(?:het|de|the)?\s*([A-Z][a-zA-Z\s]{3,}?)(?:\s+in|\s+Calpe|\?|$)/gi,
      /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)\s+(?:museum|restaurant|beach|hotel)/gi,
    ];
    
    for (const pattern of patterns) {
      let match;
      const testStr = query;
      while ((match = pattern.exec(testStr)) !== null) {
        const entity = (match[1] || match[0]).trim();
        if (entity.length > 3 && entity.length < 50) {
          entities.push(entity);
        }
      }
    }
    
    // Also check for capitalized multi-word names
    const capPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
    let match;
    while ((match = capPattern.exec(query)) !== null) {
      const entity = match[1].trim();
      const exclude = ["Calpe", "Costa Blanca", "Alicante", "Spain", "Spanish", "Dutch", "English"];
      if (entity.length > 4 && !exclude.includes(entity) && !entities.includes(entity)) {
        entities.push(entity);
      }
    }
    
    return [...new Set(entities)];
  }

  // NEW: Check if a specific named entity exists in our database
  async validateEntityExists(entityName) {
    if (!entityName || entityName.length < 3) return { exists: false };
    
    try {
      // First try fuzzy match
      const fuzzyMatches = await this.findFuzzyMatch(entityName, { threshold: 0.60, maxResults: 3 });
      if (fuzzyMatches.length > 0 && fuzzyMatches[0].similarity >= 0.60) {
        return { exists: true, match: fuzzyMatches[0], confidence: fuzzyMatches[0].similarity };
      }
      
      // Try direct search
      const emb = await embeddingService.generateEmbedding(entityName);
      const results = await chromaService.search(emb, 5, null);
      
      // Check if any result actually contains the entity name
      const entityLower = entityName.toLowerCase();
      for (const r of results) {
        const fullName = r.metadata?.name || r.metadata?.title || "";
        const name = this.extractMainName(fullName).toLowerCase();
        const desc = (r.document || r.metadata?.description || "").toLowerCase();
        
        if (name.includes(entityLower) || this.calculateSimilarity(entityLower, name) >= 0.65) {
          return { exists: true, match: r, confidence: r.similarity };
        }
        if (desc.includes(entityLower)) {
          return { exists: true, match: r, confidence: r.similarity * 0.8 };
        }
      }
      
      return { exists: false, topResult: results[0] };
    } catch (e) {
      logger.warn("Entity validation failed:", e.message);
      return { exists: false };
    }
  }

  // NEW: Filter results to remove irrelevant Q&A entries
  filterRelevantResults(results, query, namedEntities = []) {
    if (!results?.length) return [];
    
    const queryLower = query.toLowerCase();
    const entityTerms = namedEntities.map(e => e.toLowerCase());
    
    return results.filter(r => {
      const name = (r.name || "").toLowerCase();
      const desc = (r.description || "").toLowerCase();
      const isQA = r.type === "qa" || r.type === "legacy" || name === "unknown";
      
      // For Q&A entries, require higher relevance
      if (isQA) {
        // Must have higher similarity for Q&A
        if ((r.similarity || 0) < this.QA_SIMILARITY_THRESHOLD) {
          logger.debug("Filtering low-sim QA", { name, sim: r.similarity });
          return false;
        }
        
        // If user asked about specific entity, Q&A must mention it
        if (entityTerms.length > 0) {
          const qaText = (name + " " + desc).toLowerCase();
          const mentionsEntity = entityTerms.some(e => qaText.includes(e) || this.calculateSimilarity(e, name) > 0.6);
          if (!mentionsEntity) {
            logger.debug("Filtering QA not mentioning entity", { entity: entityTerms, qa: name });
            return false;
          }
        }
      }
      
      // POIs need standard threshold
      if (!isQA && (r.similarity || 0) < this.POI_SIMILARITY_THRESHOLD) {
        return false;
      }
      
      return true;
    });
  }

  extractPotentialPOINames(query) {
    const names = [];
    const stopWords = new Set(["de","het","een","van","in","the","a","an","to","of","for","is","Vertel","Wat","Waar","Hoe","naar","over","gaat","open","museum","restaurant","beach","strand","hotel"]);
    const words = query.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      if (words[i].length > 3 && !stopWords.has(words[i]) && !stopWords.has(words[i].toLowerCase())) {
        for (let len = 1; len <= 3 && i+len <= words.length; len++) {
          const phrase = words.slice(i, i+len).join(" ");
          if (phrase.length > 4 && !names.includes(phrase)) names.push(phrase);
        }
      }
    }
    return [...new Set(names)];
  }

  async correctQueryWithFuzzyMatch(query, lang = "nl") {
    const names = this.extractPotentialPOINames(query);
    let corrected = query;
    const corrections = [];
    for (const name of names) {
      const matches = await this.findFuzzyMatch(name, {threshold: 0.65, maxResults: 1});
      if (matches.length > 0 && matches[0].matchType !== "exact" && matches[0].similarity >= 0.55) {
        if (this.calculateSimilarity(name.toLowerCase(), matches[0].name.toLowerCase()) >= 0.6) {
          corrected = corrected.replace(new RegExp(name, "gi"), matches[0].name);
          corrections.push({original: name, corrected: matches[0].name, similarity: matches[0].similarity});
          logger.info("Fuzzy correction", {original: name, corrected: matches[0].name});
        }
      }
    }
    const templates = {nl: c=>"Bedoelde je \""+c+"\"?", en: c=>"Did you mean \""+c+"\"?", de: c=>"Meinten Sie \""+c+"\"?", es: c=>"Quisiste decir \""+c+"\"?"};
    const suggestion = corrections.length > 0 ? corrections.map(c => (templates[lang]||templates.nl)(c.corrected)).join("; ") : null;
    return {originalQuery: query, correctedQuery: corrected, corrections, suggestionMessage: suggestion, wasCorrection: corrections.length > 0};
  }

  async initialize() {
    if (this.isInitialized) return true;
    try {
      embeddingService.initialize();
      await chromaService.connect();
      this.isInitialized = true;
      logger.info("RAG service v2.4 initialized");
      return true;
    } catch (e) {
      logger.error("RAG init failed:", e);
      throw e;
    }
  }

  async search(query, opts = {}) {
    if (!this.isInitialized) await this.initialize();
    try {
      const start = Date.now();
      const n = opts.limit || 50;
      const thresh = opts.similarityThreshold || this.POI_SIMILARITY_THRESHOLD;
      const emb = await embeddingService.generateEmbedding(query);
      const results = await chromaService.search(emb, n, opts.filter);
      const enriched = this.enrichResults(results);
      const filtered = enriched.filter(r => (r.similarity||0) >= thresh);
      logger.info("RAG search: " + filtered.length + " results in " + (Date.now()-start) + "ms");
      return {success: true, query, results: filtered, totalResults: filtered.length, searchTimeMs: Date.now()-start};
    } catch (e) {
      logger.error("RAG search error:", e);
      throw e;
    }
  }

  isEventQuery(query) {
    const lq = query.toLowerCase();
    return [/\b(event|events|evenement|activiteit|festival|concert|markt|agenda)\b/, /\bwat\s+is\s+er\s+te\s+doen\b/].some(p => p.test(lq));
  }

  async searchEvents(query, limit = 10) {
    try {
      const emb = await embeddingService.generateEmbedding(query);
      const results = await chromaService.search(emb, limit * 2, {where: {type: "agenda"}});
      const enriched = this.enrichResults(results).filter(r => (r.similarity||0) >= 0.35);
      return enriched.slice(0, limit);
    } catch (e) {
      logger.warn("Event search failed:", e.message);
      return [];
    }
  }

  // IMPROVED: Stronger anti-hallucination instructions
  getContextInstructions(lang, hasResults = true, unknownEntity = null) {
    const instr = {
      nl: {
        useContext: "Gebruik UITSLUITEND deze database-informatie:",
        baseOnContext: "KRITIEKE REGELS:\n1. Noem ALLEEN plaatsen die EXPLICIET in bovenstaande info staan\n2. VERZIN NOOIT namen van restaurants, musea, stranden of attracties\n3. Als een plek NIET in de info staat, zeg dan eerlijk: \"Ik heb geen informatie over [naam]\"\n4. Combineer NOOIT woorden uit de vraag met woorden uit de database om nieuwe namen te maken",
        noInfo: "Geen informatie gevonden.",
        unknownEntity: (name) => `BELANGRIJK: "${name}" staat NIET in mijn database. Zeg dit eerlijk aan de gebruiker. Verzin GEEN informatie over "${name}".`,
        category: "Categorie",
        description: "Beschrijving", 
        address: "Adres",
        rating: "Beoordeling"
      },
      en: {
        useContext: "Use EXCLUSIVELY this database info:",
        baseOnContext: "CRITICAL RULES:\n1. ONLY mention places EXPLICITLY listed above\n2. NEVER invent names of restaurants, museums, beaches or attractions\n3. If a place is NOT in the info, honestly say: \"I have no information about [name]\"\n4. NEVER combine words from the question with database words to create new names",
        noInfo: "No info found.",
        unknownEntity: (name) => `IMPORTANT: "${name}" is NOT in my database. Tell the user honestly. Do NOT invent info about "${name}".`,
        category: "Category",
        description: "Description",
        address: "Address", 
        rating: "Rating"
      },
      de: {
        useContext: "Verwende NUR diese Datenbank-Infos:",
        baseOnContext: "KRITISCHE REGELN:\n1. Nenne NUR Orte die EXPLIZIT oben stehen\n2. ERFINDE NIE Namen\n3. Wenn ein Ort NICHT in den Infos steht, sage ehrlich: \"Ich habe keine Informationen uber [Name]\"",
        noInfo: "Keine Info.",
        unknownEntity: (name) => `WICHTIG: "${name}" ist NICHT in meiner Datenbank. Sage dies ehrlich.`,
        category: "Kategorie",
        description: "Beschreibung",
        address: "Adresse",
        rating: "Bewertung"
      },
      es: {
        useContext: "Usa SOLO esta info de base de datos:",
        baseOnContext: "REGLAS CRITICAS:\n1. Menciona SOLO lugares EXPLICITAMENTE listados arriba\n2. NUNCA inventes nombres\n3. Si un lugar NO esta en la info, di honestamente: \"No tengo informacion sobre [nombre]\"",
        noInfo: "Sin info.",
        unknownEntity: (name) => `IMPORTANTE: "${name}" NO esta en mi base de datos. Di esto honestamente.`,
        category: "Categoria",
        description: "Descripcion",
        address: "Direccion",
        rating: "Valoracion"
      }
    };
    
    const r = instr[lang] || instr.nl;
    
    if (!hasResults) {
      r.baseOnContext += "\n\nBELANGRIJK: Er zijn GEEN resultaten gevonden. Zeg eerlijk dat je geen informatie hebt over wat de gebruiker vraagt.";
    }
    
    if (unknownEntity) {
      r.baseOnContext += "\n\n" + r.unknownEntity(unknownEntity);
    }
    
    return r;
  }

  async generateResponse(query, context, lang = "nl", prefs = {}, history = [], unknownEntity = null) {
    try {
      const hasResults = context && context.length > 0;
      const ctxStr = this.buildContextString(context, lang);
      const sysPrompt = embeddingService.buildSystemPrompt(lang, prefs);
      const ctxInstr = this.getContextInstructions(lang, hasResults, unknownEntity);
      const enhanced = sysPrompt + "\n\n" + ctxInstr.useContext + "\n\n" + ctxStr + "\n\n" + ctxInstr.baseOnContext;
      const msgs = [{role: "system", content: enhanced}];
      if (history && Array.isArray(history)) {
        for (const m of history.slice(-6)) {
          if (m && (m.role === "user" || m.role === "assistant") && (m.content || m.message)) {
            msgs.push({role: m.role, content: (m.content || m.message).trim()});
          }
        }
      }
      msgs.push({role: "user", content: query});
      return await embeddingService.generateChatCompletion(msgs, {temperature: 0.4, maxTokens: 500});
    } catch (e) {
      logger.error("RAG response failed:", e);
      return this.getFallbackResponse(query, lang);
    }
  }

  async *generateStreamingResponse(query, context, lang = "nl", prefs = {}, history = [], unknownEntity = null) {
    try {
      const hasResults = context && context.length > 0;
      const ctxStr = this.buildContextString(context, lang);
      const sysPrompt = embeddingService.buildSystemPrompt(lang, prefs);
      const ctxInstr = this.getContextInstructions(lang, hasResults, unknownEntity);
      const enhanced = sysPrompt + "\n\n" + ctxInstr.useContext + "\n\n" + ctxStr + "\n\n" + ctxInstr.baseOnContext;
      const msgs = [{role: "system", content: enhanced}];
      if (history && Array.isArray(history)) {
        for (const m of history.slice(-6)) {
          if (m && (m.role === "user" || m.role === "assistant") && (m.content || m.message)) {
            msgs.push({role: m.role, content: (m.content || m.message).trim()});
          }
        }
      }
      msgs.push({role: "user", content: query});
      const gen = embeddingService.generateStreamingChatCompletion(msgs, {temperature: 0.4, maxTokens: 500});
      for await (const chunk of gen) yield chunk;
    } catch (e) {
      logger.error("Streaming failed:", e);
      yield this.getFallbackResponse(query, lang);
    }
  }

  extractPOINamesFromHistory(history) {
    if (!history || !Array.isArray(history)) return [];
    const exclude = new Set(["de","het","een","van","the","a","is","tip","calpe","restaurant","beach","strand"]);
    const names = [];
    for (const m of history) {
      if (m?.role !== "assistant") continue;
      const c = m.content || m.message || "";
      let match;
      const pat1 = /\b([A-Z][A-Za-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
      while ((match = pat1.exec(c)) !== null) {
        const n = match[1].trim();
        if (n.length > 4 && n.length < 50 && !exclude.has(n.toLowerCase().split(/\s+/)[0])) names.push(n);
      }
    }
    return [...new Set(names)];
  }

  async validatePOIName(name) {
    try {
      const r = await this.search(name, {limit: 3, similarityThreshold: 0.55});
      return r.results.some(x => x.similarity >= 0.6 || (x.name||"").toLowerCase().includes(name.toLowerCase()));
    } catch { return false; }
  }

  hasPronounReference(query) {
    const lq = query.toLowerCase();
    return [/\b(dat|die|deze|dit)\s+(restaurant|plek|strand)\b/, /\b(daar|erover|hierover)\b/, /\bmeer\s+(over|info)\b/, /\bopeningstijden\b/, /\b(that|this)\s+(restaurant|place|beach)\b/, /\bmore\s+(about|info)\b/].some(p => p.test(lq));
  }

  async buildEnhancedSearchQuery(query, history, ctx = {}) {
    if (!history?.length) return query;
    if (!ctx.isFollowUp && !this.hasPronounReference(query)) return query;
    const names = this.extractPOINamesFromHistory(history.slice(-6));
    for (const n of names) {
      if (await this.validatePOIName(n)) {
        logger.info("Enhanced query", {original: query, added: n});
        return query + " " + n + " Calpe";
      }
    }
    return query;
  }

  async chatStream(query, lang = "nl", opts = {}) {
    if (!this.isInitialized) await this.initialize();
    try {
      const start = Date.now();
      const history = opts.conversationHistory || [];
      // Extract entities from ORIGINAL query (before any corrections that might change capitalization)
      const namedEntities = this.extractNamedEntities(opts.originalQuery || query);
      logger.info("Named entities extracted", { entities: namedEntities, originalQuery: opts.originalQuery || query });
      let unknownEntity = null;
      if (namedEntities.length > 0) {
        for (const entity of namedEntities) {
          const validation = await this.validateEntityExists(entity);
          if (!validation.exists) {
            unknownEntity = entity;
            logger.info("Unknown entity detected", { entity, query });
            break;
          }
        }
      }
      const fuzzy = await this.correctQueryWithFuzzyMatch(query, lang);
      const base = fuzzy.correctedQuery;
      const isEvent = this.isEventQuery(base);
      let events = [];
      if (isEvent) events = await this.searchEvents(base, 5);
      const sq = await this.buildEnhancedSearchQuery(base, history, opts.intentContext || {});
      const sr = await this.search(sq, {limit: 10});
      const filteredResults = this.filterRelevantResults(sr.results, query, namedEntities);
      const combined = isEvent ? [...events, ...filteredResults].slice(0, 5) : filteredResults.slice(0, 5);
      // Clear unknownEntity if we found a good fuzzy match in results
      if (unknownEntity && combined.length > 0) {
        for (const r of combined) {
          const mainName = this.extractMainName(r.name || "");
          if (this.calculateSimilarity(unknownEntity.toLowerCase(), mainName.toLowerCase()) >= 0.60) {
            unknownEntity = null;
            break;
          }
        }
      }
      return {
        success: true, searchTimeMs: Date.now()-start, pois: this.extractPOICards(combined),
        source: isEvent ? "rag-events-stream" : "rag-stream", hasEvents: events.length > 0,
        fuzzyCorrection: fuzzy.wasCorrection ? fuzzy.suggestionMessage : null, unknownEntity,
        stream: this.generateStreamingResponse(base, combined, lang, opts.userPreferences || {}, history, unknownEntity)
      };
    } catch (e) {
      logger.error("chatStream error:", e);
      return {success: false, error: e.message, pois: [], source: "fallback"};
    }
  }

  async chat(query, lang = "nl", opts = {}) {
    if (!this.isInitialized) await this.initialize();
    try {
      const start = Date.now();
      const history = opts.conversationHistory || [];
      // Extract entities from ORIGINAL query (before any corrections that might change capitalization)
      const namedEntities = this.extractNamedEntities(opts.originalQuery || query);
      logger.info("Named entities extracted", { entities: namedEntities, originalQuery: opts.originalQuery || query });
      let unknownEntity = null;
      if (namedEntities.length > 0) {
        for (const entity of namedEntities) {
          const validation = await this.validateEntityExists(entity);
          if (!validation.exists) {
            unknownEntity = entity;
            logger.info("Unknown entity detected", { entity, query });
            break;
          }
        }
      }
      const fuzzy = await this.correctQueryWithFuzzyMatch(query, lang);
      const base = fuzzy.correctedQuery;
      const isEvent = this.isEventQuery(base);
      let events = [];
      if (isEvent) events = await this.searchEvents(base, 5);
      const sq = await this.buildEnhancedSearchQuery(base, history, opts.intentContext || {});
      const sr = await this.search(sq, {limit: 10});
      const filteredResults = this.filterRelevantResults(sr.results, query, namedEntities);
      const combined = isEvent ? [...events, ...filteredResults].slice(0, 5) : filteredResults.slice(0, 5);
      // If we found results with a close fuzzy match, rewrite the query to use correct name
      let queryForLLM = base;
      if (combined.length > 0) {
        const originalQuery = opts.originalQuery || query;
        for (const r of combined) {
          const mainName = this.extractMainName(r.name || "");
          // Check if originalQuery contains something close to this result
          for (const entity of namedEntities) {
            const sim = this.calculateSimilarity(entity.toLowerCase(), mainName.toLowerCase());
            if (sim >= 0.60 && sim < 1.0) {
              logger.info("Rewriting query with correct name", {original: entity, correct: mainName, sim});
              queryForLLM = base.replace(new RegExp(entity, "gi"), mainName);
              unknownEntity = null;
              break;
            }
          }
          if (queryForLLM !== base) break;
        }
      }
      const response = await this.generateResponse(queryForLLM, combined, lang, opts.userPreferences || {}, history, unknownEntity);
      return {
        success: true, message: response, pois: this.extractPOICards(combined),
        source: isEvent ? "rag-events" : "rag", hasEvents: events.length > 0, searchTimeMs: Date.now()-start,
        fuzzyCorrection: fuzzy.wasCorrection ? fuzzy.suggestionMessage : null,
        spellCorrection: fuzzy.wasCorrection ? {original: fuzzy.originalQuery, corrected: fuzzy.correctedQuery} : null,
        unknownEntity
      };
    } catch (e) {
      logger.error("chat error:", e);
      return {success: true, message: this.getFallbackResponse(query, lang), pois: [], source: "fallback"};
    }
  }

  enrichResults(results) {
    return results.map(r => {
      const m = r.metadata || {};
      return {
        id: m.id || r.id,
        name: m.name || m.title || "Unknown",
        category: m.category || m.type || "General",
        subcategory: m.subcategory || null,
        description: r.document || m.description || "",
        address: m.address || m.location_address || null,
        latitude: parseFloat(m.latitude) || null,
        longitude: parseFloat(m.longitude) || null,
        rating: parseFloat(m.rating) || null,
        reviewCount: parseInt(m.review_count) || 0,
        priceLevel: m.price_level || null,
        thumbnailUrl: m.thumbnail_url || null,
        openingHours: m.opening_hours || null,
        phone: m.phone || null,
        website: m.website || null,
        eventDates: m.event_dates || null,
        locationName: m.location_name || null,
        type: m.type || "poi",
        similarity: r.similarity,
        distance: r.distance
      };
    });
  }

  buildContextString(results, lang = "nl") {
    const labels = this.getContextInstructions(lang);
    if (!results?.length) return labels.noInfo;
    return results.slice(0, 5).map((item, i) => {
      const parts = [(i+1) + ". " + item.name];
      if (item.category) parts.push(labels.category + ": " + item.category);
      if (item.type === "agenda" && item.eventDates) parts.push("Dates: " + item.eventDates);
      if (item.description) parts.push(labels.description + ": " + item.description.substring(0, 200) + "...");
      if (item.address || item.locationName) parts.push(labels.address + ": " + (item.address || item.locationName));
      if (item.rating) parts.push(labels.rating + ": " + item.rating + "/5");
      return parts.join("\n   ");
    }).join("\n\n");
  }

  extractPOICards(results) {
    if (!results?.length) return [];
    return results.slice(0, 5).map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description?.substring(0, 100) + "...",
      rating: item.rating,
      thumbnailUrl: item.thumbnailUrl,
      address: item.address || item.locationName,
      similarity: item.similarity,
      type: item.type || "poi",
      eventDates: item.eventDates
    }));
  }

  getFallbackResponse(query, lang) {
    const fb = {
      nl: "Ik ben HoliBot, je gids voor Calpe! Waar kan ik je mee helpen?",
      en: "I am HoliBot, your Calpe guide! How can I help you?",
      de: "Ich bin HoliBot, dein Calpe-Guide! Wie kann ich helfen?",
      es: "Soy HoliBot, tu guia de Calpe! Como puedo ayudarte?",
      sv: "Jag ar HoliBot, din Calpe-guide! Hur kan jag hjalpa?",
      pl: "Jestem HoliBot, Twoj przewodnik po Calpe! Jak moge pomoc?"
    };
    return fb[lang] || fb.nl;
  }

  isReady() { return this.isInitialized && chromaService.isReady() && embeddingService.isReady(); }
  
  async getStats() {
    return {
      isInitialized: this.isInitialized,
      version: "2.4",
      antiHallucination: true,
      chromaDb: await chromaService.getStats(),
      mistral: {isConfigured: embeddingService.isReady()}
    };
  }
}

export const ragService = new RAGService();
export default ragService;
