/**
 * HoliBot Routes v2.9
 * API endpoints for HoliBot AI Assistant Widget
 *
 * Features:
 * - RAG-based semantic search with ChromaDB Cloud
 * - Mistral AI for embeddings and chat
 * - Multi-language support (nl, en, de, es, sv, pl)
 * - 4 Quick Actions: Itinerary, Location Info, Directions, Daily Tip
 * - SSE Streaming for real-time chat responses
 * - Category hierarchy browser (3 levels)
 * - Enhanced sync with multi-language POIs, Q&A, and review sentiment
 * - Spell correction with "Did you mean?" suggestions
 * - Multi-fallback system for improved response quality
 * - Fallback logging for analytics and continuous improvement
 * - Conversation logging with session tracking
 * - POI click tracking for engagement analytics
 * - Intent detection for smarter query understanding
 * - Context-aware responses with conversation memory
 * - Smart follow-up suggestions per language
 * - User preference storage and learning
 * - Personalized recommendations based on behavior
 * - Proactive time-based and seasonal suggestions
 * - Trending POIs based on user activity
 * - Context-aware quick actions
 *
 * Endpoints:
 * - POST /holibot/chat - RAG-powered chat with spell correction + logging
 * - POST /holibot/chat/stream - SSE streaming chat
 * - POST /holibot/search - Semantic search
 * - POST /holibot/itinerary - Build day program
 * - GET /holibot/location/:id - Location details with Q&A
 * - POST /holibot/directions - Get directions to POI
 * - GET /holibot/daily-tip - Personalized daily tip
 * - GET /holibot/categories - POI categories
 * - GET /holibot/categories/hierarchy - 3-level category tree
 * - GET /holibot/categories/:category/pois - POIs by category filter
 * - GET /holibot/session/:id/history - Get conversation history
 * - POST /holibot/session/:id/end - End session with rating
 * - POST /holibot/poi-click - Track POI interactions + preference learning
 * - GET /holibot/preferences - Get user preferences
 * - POST /holibot/preferences - Save user preferences
 * - POST /holibot/poi-rating - Rate a POI
 * - GET /holibot/recommended-categories - Personalized category list
 * - GET /holibot/suggestions - Proactive context-aware suggestions
 * - GET /holibot/trending - Trending POIs this week
 * - GET /holibot/quick-actions - Time-based quick action buttons
 * - POST /holibot/admin/sync - Legacy sync MySQL to ChromaDB
 * - POST /holibot/admin/resync - Enhanced multi-language sync with Q&A
 * - POST /holibot/admin/sync-single/:poiId - Sync single POI (all languages)
 * - GET /holibot/admin/stats - Service statistics
 * - GET /holibot/admin/fallback-stats - Fallback analytics dashboard
 * - GET /holibot/admin/conversation-analytics - Session & engagement metrics
 */

import express from 'express';
import { ragService, syncService, chromaService, embeddingService, ttsService, spellService, conversationService, intentService, preferenceService, suggestionService } from '../services/holibot/index.js';
import { getDestinationById } from '../../config/destinations/index.js';
import logger from '../utils/logger.js';


// ============================================================================
// DESTINATION EXTRACTION HELPER
// ============================================================================

/**
 * Extract destination config from request headers
 * Uses X-Destination-ID header set by Apache VHost, defaults to Calpe (1)
 */
function getDestinationFromRequest(req) {
  const destinationId = parseInt(req.headers['x-destination-id']) || 1;
  const destinationConfig = getDestinationById(destinationId);
  const collectionName = destinationConfig?.holibot?.chromaCollection || 'calpe_pois';
  return { destinationId, destinationConfig, collectionName };
}

// ============================================================================
// ENTERPRISE QUALITY FILTERS & SESSION TRACKING
// ============================================================================

// Session-based POI tracking for 80-90% refresh variation
const sessionPoiHistory = new Map();
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Quality configuration
const QUALITY_CONFIG = {
  minRating: 4.0,
  maxReviewAge: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years in ms
  minImages: 2,
  requireLocation: true
};

// Icon mapping for diversity - using icon names that match the frontend
const categoryIcons = {
  'Beaches & Nature': ['beach', 'waves', 'palm-tree', 'sun', 'mountain'],
  'Food & Drinks': ['utensils', 'coffee', 'wine-glass', 'pizza', 'restaurant'],
  'Shopping': ['shopping-bag', 'store', 'gift', 'tag'],
  'Culture & History': ['landmark', 'museum', 'book', 'castle'],
  'Recreation': ['film', 'music', 'gamepad', 'ticket'],
  'Active': ['bike', 'swimmer', 'hiking', 'sailboat', 'dumbbell'],
  'Nightlife': ['cocktail', 'music', 'moon', 'sparkles']
};

// Subcategory to icon mapping for more accurate icons
const subcategoryIcons = {
  'Restaurants': 'utensils',
  'Bars': 'wine-glass',
  'Bar Restaurants': 'utensils',
  'Breakfast & Coffee': 'coffee',
  'Fastfood': 'pizza',
  'Public beach': 'beach',
  'Beach': 'beach',
  'Park': 'tree',
  'Hiking': 'hiking',
  'Museum': 'museum',
  'Viewpoint': 'binoculars',
  'Old Town': 'landmark',
  'Market': 'store',
  'Shopping center': 'shopping-bag',
  'Supermarket': 'store'
};

// Get or create session history
function getSessionHistory(sessionId) {
  if (!sessionId) return { pois: new Set(), lastAccess: Date.now() };
  let history = sessionPoiHistory.get(sessionId);
  if (!history || Date.now() - history.lastAccess > SESSION_TTL) {
    history = { pois: new Set(), lastAccess: Date.now() };
    sessionPoiHistory.set(sessionId, history);
  }
  history.lastAccess = Date.now();
  return history;
}

// Add POIs to session history
function addToSessionHistory(sessionId, poiIds) {
  if (!sessionId) return;
  const history = getSessionHistory(sessionId);
  poiIds.forEach(id => history.pois.add(id));
  // Limit history size to prevent memory bloat
  if (history.pois.size > 500) {
    const arr = [...history.pois];
    history.pois = new Set(arr.slice(-300));
  }
}

// Check POI quality against MySQL data
async function checkPOIQuality(poi, mysqlPoi) {
  const issues = [];
  const data = mysqlPoi || poi;
  
  // Rating check (>= 4.0)
  const rating = parseFloat(data.rating) || 0;
  if (rating > 0 && rating < QUALITY_CONFIG.minRating) {
    issues.push('rating_below_4.0:' + rating);
  }
  
  // Review check (must have reviews)
  const reviewCount = parseInt(data.review_count || data.reviewCount) || 0;
  if (reviewCount === 0) {
    issues.push('no_reviews');
  }
  
  // Image check - use thumbnail_url as primary (images array is empty in DB)
  const hasThumbnail = !!(data.thumbnail_url || poi.thumbnailUrl);
  let enhancedCount = 0;
  if (data.enhanced_images) {
    try {
      const parsed = typeof data.enhanced_images === 'string' ? JSON.parse(data.enhanced_images) : data.enhanced_images;
      enhancedCount = Array.isArray(parsed) ? parsed.length : 0;
    } catch (e) {}
  }
  const imageCount = (hasThumbnail ? 1 : 0) + enhancedCount;
  // Require at least thumbnail (1 image)
  if (!hasThumbnail) {
    issues.push('no_thumbnail');
  }
  
  // Location check (address or GPS)
  const hasAddress = (data.address || '').trim().length > 5;
  const hasGPS = parseFloat(data.latitude) !== 0 && parseFloat(data.longitude) !== 0;
  if (!hasAddress && !hasGPS) {
    issues.push('no_location');
  }
  
  // Opening hours check - must have opening hours data
  const hasOpeningHours = !!(data.opening_hours && data.opening_hours !== '{}' && data.opening_hours !== '[]');
  if (!hasOpeningHours) {
    issues.push('no_opening_hours');
  }
  
  // Permanently closed check (all 7 days closed)
  if (hasOpeningHours && isPermanentlyClosedFromHours(data.opening_hours)) {
    issues.push('permanently_closed');
  }
  
  // Currently closed check (realtime)
  if (hasOpeningHours && isCurrentlyClosedFromHours(data.opening_hours)) {
    issues.push('currently_closed');
  }
  
  return {
    passes: issues.length === 0,
    issues,
    rating,
    reviewCount,
    imageCount,
    hasLocation: hasAddress || hasGPS,
    hasOpeningHours
  };
}

// Check if POI is permanently closed (all 7 days have empty arrays or no data)
function isPermanentlyClosedFromHours(openingHours) {
  if (!openingHours) return false;
  try {
    const hours = typeof openingHours === 'string' ? JSON.parse(openingHours) : openingHours;
    if (typeof hours !== 'object' || !hours) return false;
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let closedDays = 0;
    
    for (const day of days) {
      const dayData = hours[day];
      // Check for closed: empty array [], null, undefined, 'Closed', or empty string
      const isClosed = !dayData || 
                       (Array.isArray(dayData) && dayData.length === 0) ||
                       dayData === 'Closed' || 
                       dayData === 'closed' || 
                       dayData === '';
      if (isClosed) closedDays++;
    }
    
    const isPermanentlyClosed = closedDays === 7;
    if (isPermanentlyClosed) {
      logger.info('POI permanently closed detected (all 7 days empty)');
    }
    return isPermanentlyClosed;
  } catch (e) { 
    logger.warn('Error parsing opening_hours for permanent closed check:', e.message);
    return false; 
  }
}

// Check if POI is currently closed (realtime check for today)
function isCurrentlyClosedFromHours(openingHours) {
  if (!openingHours) return false;
  try {
    const hours = typeof openingHours === 'string' ? JSON.parse(openingHours) : openingHours;
    if (typeof hours !== 'object' || !hours) return false;
    
    // Get current time in Spain timezone (CET/CEST)
    const now = new Date();
    const spainTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayNames[spainTime.getDay()];
    const currentHour = spainTime.getHours();
    const currentMinute = spainTime.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    const todayHours = hours[today];
    
    // Check if closed today: empty array, null, 'Closed', etc.
    if (!todayHours || 
        (Array.isArray(todayHours) && todayHours.length === 0) ||
        todayHours === 'Closed' || 
        todayHours === 'closed' || 
        todayHours === '') {
      logger.info('POI currently closed: no hours for ' + today);
      return true;
    }
    
    // If todayHours is an array of time slots [{open: 10:00, close: 23:00}]
    if (Array.isArray(todayHours) && todayHours.length > 0) {
      // Check if current time falls within ANY open slot
      for (const slot of todayHours) {
        if (slot.open && slot.close) {
          const [openH, openM] = slot.open.split(':').map(Number);
          const [closeH, closeM] = slot.close.split(':').map(Number);
          const openTime = openH * 60 + openM;
          const closeTime = closeH * 60 + closeM;
          
          // Handle overnight hours
          if (closeTime < openTime) {
            if (currentTime >= openTime || currentTime < closeTime) return false; // Open
          } else {
            if (currentTime >= openTime && currentTime < closeTime) return false; // Open
          }
        }
      }
      // Not within any open slot
      return true;
    }
    
    // Legacy string format HH:MM - HH:MM
    if (typeof todayHours === 'string') {
      const match = todayHours.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
      if (match) {
        const openTime = parseInt(match[1]) * 60 + parseInt(match[2]);
        const closeTime = parseInt(match[3]) * 60 + parseInt(match[4]);
        if (closeTime < openTime) {
          return currentTime >= closeTime && currentTime < openTime;
        }
        return currentTime < openTime || currentTime >= closeTime;
      }
    }
    
    return false; // If can't parse, assume open
  } catch (e) { 
    logger.warn('Error parsing opening_hours for current closed check:', e.message);
    return false; 
  }
}

// Assign icons with diversity (avoid same icon repeated)
function assignDiverseIcons(pois) {
  const iconUsage = new Map();
  return pois.map(poi => {
    const category = poi.category || 'General';
    const subcategory = poi.subcategory || '';
    
    // Try subcategory-specific icon first
    let selectedIcon = subcategoryIcons[subcategory];
    
    if (!selectedIcon) {
      // Fall back to category icons with diversity
      const icons = categoryIcons[category] || ['location'];
      
      // Find least-used icon from category
      selectedIcon = icons[0];
      let minUsage = Infinity;
      for (const icon of icons) {
        const usage = iconUsage.get(icon) || 0;
        if (usage < minUsage) {
          minUsage = usage;
          selectedIcon = icon;
        }
      }
    }
    
    iconUsage.set(selectedIcon, (iconUsage.get(selectedIcon) || 0) + 1);
    
    return { ...poi, icon: selectedIcon };
  });
}

// Select POIs ensuring 80-90% are new compared to previous requests
function selectWithVariation(availablePois, count, sessionId) {
  const history = getSessionHistory(sessionId);
  const refreshPct = count <= 4 ? 0.80 : (count <= 6 ? 0.85 : 0.90);
  const minNewCount = Math.ceil(count * refreshPct);
  
  // Check both id AND name (normalized) to prevent duplicates
  const isInHistory = (poi) => {
    const normalizedName = (poi.name || '').toLowerCase().trim();
    return history.pois.has(String(poi.id)) || 
           history.pois.has(normalizedName) ||
           history.pois.has(poi.id);
  };
  
  const newPois = availablePois.filter(p => !isInHistory(p));
  const previousPois = availablePois.filter(p => isInHistory(p));
  
  logger.info('Refresh variation check:', {
    sessionId: sessionId?.substring?.(0, 8) || 'none',
    historySize: history.pois.size,
    availableTotal: availablePois.length,
    newPoisCount: newPois.length,
    previousPoisCount: previousPois.length,
    targetCount: count,
    minNewRequired: minNewCount,
    refreshPct: refreshPct
  });
  
  // Shuffle function
  const shuffle = arr => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  
  const shuffledNew = shuffle(newPois);
  const shuffledPrevious = shuffle(previousPois);
  
  const selected = [];
  
  // PRIORITY 1: Add new POIs first (up to minNewCount or all available new)
  const newToAdd = Math.min(minNewCount, shuffledNew.length);
  selected.push(...shuffledNew.slice(0, newToAdd));
  
  // PRIORITY 2: If we need more, prefer remaining new POIs over previous
  const remaining = count - selected.length;
  if (remaining > 0) {
    const remainingNew = shuffledNew.slice(newToAdd);
    const maxPrevious = Math.floor(count * (1 - refreshPct)); // Max 10-20% from previous
    
    // Add remaining new first
    const moreNew = Math.min(remaining, remainingNew.length);
    selected.push(...remainingNew.slice(0, moreNew));
    
    // Only add previous if absolutely needed and within limit
    const stillNeeded = count - selected.length;
    if (stillNeeded > 0) {
      const prevToAdd = Math.min(stillNeeded, maxPrevious, shuffledPrevious.length);
      selected.push(...shuffledPrevious.slice(0, prevToAdd));
    }
  }
  
  logger.info('Refresh variation result:', {
    selectedTotal: selected.length,
    newInSelection: selected.filter(p => !isInHistory(p)).length,
    previousInSelection: selected.filter(p => isInHistory(p)).length
  });
  
  return shuffle(selected);
}

// Cleanup old sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, history] of sessionPoiHistory.entries()) {
    if (now - history.lastAccess > SESSION_TTL) {
      sessionPoiHistory.delete(id);
    }
  }
}, 60 * 60 * 1000); // Every hour

const router = express.Router();

let POI = null;
const getPOIModel = async () => {
  if (!POI) {
    try {
      const module = await import('../models/POI.js');
      POI = module.default;
    } catch (error) {
      logger.warn('POI model not available');
      return null;
    }
  }
  return POI;
};

/**
 * ============================================
 * SHARED HELPER FUNCTIONS (used by all Quick Actions)
 * ============================================
 */

/**
 * Check if POI is permanently closed (all 7 days marked "Closed")
 * CRITICAL: Never show POIs that are closed 7 days/week in any Quick Action
 * @param {any} openingHours - Opening hours data (string JSON or parsed object)
 * @returns {boolean} - true if permanently closed
 */
const isPermanentlyClosed = (openingHours) => {
  if (!openingHours) return false; // No opening hours = assume open

  try {
    let hours = openingHours;
    if (typeof hours === 'string') {
      hours = JSON.parse(hours);
    }

    // Check if it's an object with day keys
    if (typeof hours === 'object' && hours !== null) {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
                   'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
                   'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

      let closedCount = 0;
      let totalDays = 0;

      for (const day of days) {
        if (hours[day] !== undefined) {
          totalDays++;
          const value = hours[day];
          // Check various "closed" formats including empty arrays
          if (value === 'Closed' || value === 'closed' || value === 'CLOSED' ||
              value === 'Gesloten' || value === 'gesloten' ||
              value === 'Cerrado' || value === 'cerrado' ||
              value === false || value === null || value === '' ||
              (Array.isArray(value) && value.length === 0)) { // Empty array = closed that day
            closedCount++;
          }
        }
      }

      // If we found day entries and ALL are closed, it's permanently closed
      if (totalDays >= 7 && closedCount >= 7) {
        return true;
      }

      // Also check for array format like [{day: "Monday", hours: "Closed"}, ...]
      if (Array.isArray(hours)) {
        const closedDays = hours.filter(h =>
          h.hours === 'Closed' || h.hours === 'closed' || h.hours === 'CLOSED' ||
          h.hours === 'Gesloten' || h.open === false
        ).length;
        if (hours.length >= 7 && closedDays >= 7) {
          return true;
        }
      }
    }

    return false;
  } catch (e) {
    return false; // If parsing fails, assume not permanently closed
  }
};

/**
 * Get translated description based on language
 * Uses enriched_tile_description_* fields, falls back to English then original
 * @param {object} poi - POI object with translation fields
 * @param {string} lang - Language code (nl, en, de, es, sv, pl)
 * @returns {string} - Translated description
 */
const getTranslatedDescription = (poi, lang) => {
  if (!poi) return '';

  // Language-specific field mapping
  const langFieldMap = {
    nl: poi.enriched_tile_description_nl,
    de: poi.enriched_tile_description_de,
    es: poi.enriched_tile_description_es,
    sv: poi.enriched_tile_description_sv,
    pl: poi.enriched_tile_description_pl,
    en: poi.enriched_tile_description // English is default
  };

  // Return translated version, fallback to English, then original description
  return langFieldMap[lang] || poi.enriched_tile_description || poi.description || '';
};

/**
 * Get translated event title based on language
 * Events have title_en, title_es fields; Dutch title is in main 'title' field
 * @param {object} event - Event object with translation fields
 * @param {string} lang - Language code (nl, en, de, es, sv, pl)
 * @returns {string} - Translated title
 */
const getTranslatedEventTitle = (event, lang) => {
  if (!event) return '';

  // Language-specific field mapping for events
  // Dutch is the default/main language, others have specific fields
  const langFieldMap = {
    en: event.title_en,
    es: event.title_es,
    de: event.title_de,  // May not exist yet
    sv: event.title_sv,  // May not exist yet
    pl: event.title_pl   // May not exist yet
  };

  // For Dutch (nl), use main title; for others, try translated field first
  if (lang === 'nl') {
    return event.title || '';
  }

  // Return translated version, fallback to main title
  return langFieldMap[lang] || event.title || '';
};

/**
 * Convert text to Title Case (first letter uppercase, rest lowercase)
 * Handles special cases for Dutch/Spanish articles and prepositions
 * @param {string} text - Text to convert
 * @returns {string} - Title cased text
 */
const toTitleCase = (text) => {
  if (!text) return '';

  // Words that should stay lowercase (unless at start)
  const lowercaseWords = new Set(['de', 'het', 'een', 'van', 'in', 'op', 'aan', 'bij', 'voor', 'met', 'el', 'la', 'los', 'las', 'del', 'al', 'y', 'the', 'a', 'an', 'of', 'in', 'on', 'at', 'for', 'with', 'and']);

  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      // Keep short words lowercase unless first word
      if (index > 0 && lowercaseWords.has(word)) {
        return word;
      }
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

/**
 * Check if text is ALL CAPS (more than 3 consecutive uppercase words)
 * @param {string} text - Text to check
 * @returns {boolean} - True if text appears to be ALL CAPS
 */
const isAllCaps = (text) => {
  if (!text || text.length < 4) return false;
  // Check if string is mostly uppercase letters
  const upperCount = (text.match(/[A-ZÁÉÍÓÚÑÇ]/g) || []).length;
  const lowerCount = (text.match(/[a-záéíóúñç]/g) || []).length;
  return upperCount > 3 && upperCount > lowerCount * 2;
};

/**
 * Clean AI-generated text: remove asterisks, quotes, fix spacing, and normalize POI names
 * @param {string} text - Raw AI text
 * @param {string[]} poiNames - Array of POI names to fix spacing around
 * @returns {string} - Cleaned text
 */
const cleanAIText = (text, poiNames = []) => {
  if (!text) return '';

  let cleaned = text
    // Remove asterisks (bold markers)
    .replace(/\*+/g, '')
    // Remove quotation marks around POI names
    .replace(/["„""'']/g, '')
    // Remove markdown headers
    .replace(/#+\s*/g, '')
    // Convert markdown links to plain text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove code backticks
    .replace(/`+/g, '')
    // Remove double underscores
    .replace(/_{2,}/g, '')
    // Remove strikethrough
    .replace(/~{2,}/g, '');

  // CRITICAL: Fix spacing after common Dutch/Spanish prepositions stuck to next word
  // Handles: "inCalpe" -> "in Calpe", "bijPort" -> "bij Port", "vanCalpe" -> "van Calpe"
  const prepositions = ["in", "bij", "van", "naar", "voor", "met", "op", "aan", "over", "uit", "door", "om", "tegen", "tot", "en", "of", "de", "het", "een", "la", "el", "the", "at", "to", "from", "with"];
  for (const prep of prepositions) {
    // Match preposition followed directly by uppercase letter (no space)
    // NOTE: \\b is required in template strings to get \b word boundary in regex
    // IMPORTANT: Do NOT use 'i' flag - we need case-sensitive matching for uppercase detection
    const regex = new RegExp(`(\\b${prep})([A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑÇ])`, "g");
    cleaned = cleaned.replace(regex, "$1 $2");
  }

  // Fix spacing before punctuation that got stuck to words
  cleaned = cleaned.replace(/([a-zA-ZáéíóúàèìòùäëïöüâêîôûñçÀÈÌÒÙÁÉÍÓÚÄËÏÖÜÂÊÎÔÛÑÇ])([.!?])([A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑÇ])/g, "$1$2 $3");

  // Fix common location names stuck to adjacent words
  // IMPORTANT: Only fix spacing when location is clearly a separate word
  // Use word boundary () to prevent breaking compound words like "Calpesa"
  const locationNames = ["Calpe", "Benidorm", "Altea", "Alicante", "Valencia", "Spain", "Spanje", "España", "Texel", "Den Burg", "De Koog", "Oudeschild", "Den Hoorn", "Nederland", "Netherlands"];
  for (const loc of locationNames) {
    // Add space BEFORE location if preceded by lowercase letter (e.g., "inCalpe" -> "in Calpe")
    // But only if location starts a new word (followed by word boundary or end)
    cleaned = cleaned.replace(new RegExp(`([a-záéíóúàèìòùäëïöüâêîôûñç])(${loc})\\b`, "g"), "$1 $2");
    // Add space AFTER location ONLY if followed by UPPERCASE letter (new word)
    // This prevents "Calpesa" -> "Calpe sa" but fixes "CalpeGeniet" -> "Calpe Geniet"
    cleaned = cleaned.replace(new RegExp(`\\b(${loc})([A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑÇ])`, "g"), "$1 $2");
  }

  // Fix spacing around POI names
  for (const poiName of poiNames) {
    if (!poiName || poiName.length < 3) continue;

    // Escape special regex characters in POI name
    const escapedName = poiName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Add space BEFORE POI name if preceded by a letter (not punctuation or space)
    cleaned = cleaned.replace(
      new RegExp(`([a-zA-ZáéíóúàèìòùäëïöüâêîôûñçÀÈÌÒÙÁÉÍÓÚÄËÏÖÜÂÊÎÔÛÑÇ])(?=${escapedName})`, 'g'),
      '$1 '
    );

    // Add space AFTER POI name if followed by a lowercase letter
    cleaned = cleaned.replace(
      new RegExp(`(${escapedName})([a-záéíóúàèìòùäëïöüâêîôûñç])`, 'g'),
      '$1 $2'
    );
  }

  // Fix common issues: period/comma stuck to next word
  cleaned = cleaned
    .replace(/\.([A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÑÇ])/g, '. $1')  // Period followed by capital
    .replace(/,([A-Za-záéíóúàèìòùäëïöüâêîôûñç])/g, ', $1') // Comma followed by letter
    .replace(/!([A-Za-záéíóúàèìòùäëïöüâêîôûñç])/g, '! $1') // Exclamation followed by letter
    .replace(/\?([A-Za-záéíóúàèìòùäëïöüâêîôûñç])/g, '? $1') // Question mark followed by letter
    .replace(/\s{2,}/g, ' ')  // Normalize multiple spaces
    .trim();

  // CRITICAL: Normalize ALL CAPS POI names to Title Case
  // Matches sequences of 2+ ALL CAPS words (like "INDIAN PALACE" or "INDIAN CURRY ORIGINAL")
  // and converts them to proper Title Case ("Indian Palace", "Indian Curry Original")
  cleaned = cleaned.replace(/\b([A-ZÁÉÍÓÚÑÇ]{2,}(?:\s+[A-ZÁÉÍÓÚÑÇ]{2,})+)\b/g, (match) => {
    return toTitleCase(match);
  });

  // Also fix standalone ALL CAPS POI names (at least 4 chars, all uppercase)
  // This handles cases like "CALPE" -> "Calpe" when appearing alone
  for (const poiName of poiNames) {
    if (poiName && isAllCaps(poiName)) {
      const titleCased = toTitleCase(poiName);
      // Replace ALL CAPS version with Title Case version
      cleaned = cleaned.replace(new RegExp(`\\b${poiName}\\b`, 'g'), titleCased);
    }
  }

  return cleaned;
};

/**
 * POST /api/v1/holibot/chat
 * RAG-powered chat with HoliBot (non-streaming)
 * Includes spell correction, multi-fallback system, and conversation logging
 */
router.post('/chat', async (req, res) => {
  const startTime = Date.now();

  try {
    const {
      message,
      conversationHistory = [],
      language = 'nl',
      userPreferences = {},
      sessionId = null,
      userAgent = null
    } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ success: false, error: 'Message too long (max 1000 characters)' });
    }

    // Extract destination from request
    const { destinationId, destinationConfig, collectionName } = getDestinationFromRequest(req);

    logger.info('HoliBot chat request', { message: message.substring(0, 100), language, hasHistory: conversationHistory.length > 0, destinationId });

    // Step 0: Check for vague queries BEFORE spell correction (to detect original language patterns)
    if (conversationHistory.length === 0) {
      const vagueCheck = ragService.detectVagueQuery(message);
      if (vagueCheck.isVague) {
        logger.info('Vague query detected in route', { category: vagueCheck.category, query: message });
        const clarifyingResponse = ragService.generateVagueQueryResponse(vagueCheck, language);
        return res.json({
          success: true,
          data: {
            success: true,
            message: clarifyingResponse,
            pois: [],
            source: 'clarification',
            hasEvents: false,
            searchTimeMs: Date.now() - startTime,
            isVagueQuery: true,
            vagueCategory: vagueCheck.category,
            fallbackApplied: true,
            fallbackType: 'category_suggestion',
            intent: { detected: 'vague_query', categories: [vagueCheck.category], isFollowUp: false }
          }
        });
      }
    }

    // Get or create session for conversation logging
    const activeSessionId = await conversationService.getOrCreateSession({
      sessionId,
      language,
      userAgent: userAgent || req.get('User-Agent'),
      destinationId
    });

    // Step 1: Spell correction and suggestion generation
    let processedMessage = message;
    let spellSuggestions = null;
    let wasSpellCorrected = false;

    try {
      const spellResult = await spellService.processQuery(message);
      if (spellResult.wasModified) {
        processedMessage = spellResult.correctedQuery;
        wasSpellCorrected = true;
        logger.info('Spell correction applied', { original: message, corrected: processedMessage });
      }
      if (spellResult.suggestions.length > 0) {
        spellSuggestions = spellService.formatSuggestionMessage(spellResult.suggestions, language);
      }
    } catch (spellError) {
      logger.warn('Spell service error (continuing without):', spellError.message);
    }

    // Log user message (async, non-blocking)
    conversationService.logUserMessage({
      sessionId: activeSessionId,
      message: processedMessage,
      originalMessage: wasSpellCorrected ? message : null,
      wasSpellCorrected
    }).catch(() => {});

    // Step 2: Intent detection for smarter responses
    const intentAnalysis = intentService.analyzeQuery(processedMessage, language, conversationHistory, destinationId);
    logger.debug('Intent analysis', { intent: intentAnalysis.primaryIntent, entities: intentAnalysis.entities });

    // Step 3: RAG chat with corrected message and intent context
    const response = await ragService.chat(processedMessage, language, {
      userPreferences,
      conversationHistory,
      originalQuery: message,  // Pass original for entity extraction
      collectionName,
      destinationConfig,
      intentContext: {
        primaryIntent: intentAnalysis.primaryIntent,
        categories: intentAnalysis.entities.categories,
        isFollowUp: intentAnalysis.context.isFollowUp
      }
    });

    // Step 4: Multi-fallback system
    const enhancedResponse = await applyMultiFallback(response, message, language, spellSuggestions);
    
    // Clean AI text: fix spacing around POI names and prepositions
    if (enhancedResponse.message) {
      const poiNames = enhancedResponse.pois?.map(p => p.name).filter(Boolean) || [];
      enhancedResponse.message = cleanAIText(enhancedResponse.message, poiNames);
    }

    // Calculate total response time
    const totalResponseTime = Date.now() - startTime;

    // Log assistant response (async, non-blocking)
    const poiIds = enhancedResponse.pois?.map(p => p.id).filter(Boolean) || [];
    conversationService.logAssistantMessage({
      sessionId: activeSessionId,
      message: enhancedResponse.message,
      source: enhancedResponse.source,
      poiCount: enhancedResponse.pois?.length || 0,
      hadFallback: enhancedResponse.fallbackApplied || false,
      searchTimeMs: enhancedResponse.searchTimeMs,
      totalResponseTimeMs: totalResponseTime,
      poiIds: poiIds.length > 0 ? poiIds : null
    }).catch(() => {});

    // Add spell correction info to response
    if (wasSpellCorrected || spellSuggestions) {
      enhancedResponse.spellCorrection = {
        wasModified: wasSpellCorrected,
        originalQuery: message,
        correctedQuery: wasSpellCorrected ? processedMessage : null,
        suggestion: spellSuggestions
      };
    }

    // Add intent analysis and follow-up suggestions to response
    enhancedResponse.intent = {
      detected: intentAnalysis.primaryIntent,
      categories: intentAnalysis.entities.categories,
      isFollowUp: intentAnalysis.context.isFollowUp
    };
    enhancedResponse.suggestedFollowUps = intentAnalysis.suggestedFollowUps;

    // Add session ID to response for client-side tracking
    enhancedResponse.sessionId = activeSessionId;

    res.json({ success: true, data: enhancedResponse });

  } catch (error) {
    logger.error('HoliBot chat error:', error);
    res.status(500).json({ success: false, error: 'Chat service temporarily unavailable' });
  }
});

/**
 * Log fallback events for analytics and improvement
 * Stores failed queries for later analysis
 */
async function logFallback(data) {
  try {
    const { mysqlSequelize } = await import('../config/database.js');
    const { QueryTypes } = (await import('sequelize')).default;

    await mysqlSequelize.query(`
      INSERT INTO holibot_fallbacks
      (query, corrected_query, language, fallback_type, original_source, poi_count,
       was_spell_corrected, spell_suggestions, suggested_categories, response_time_ms, session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, {
      replacements: [
        data.query?.substring(0, 5000) || '',
        data.correctedQuery?.substring(0, 5000) || null,
        data.language || 'nl',
        data.fallbackType || 'no_results',
        data.originalSource || null,
        data.poiCount || 0,
        data.wasSpellCorrected || false,
        data.spellSuggestions ? JSON.stringify(data.spellSuggestions) : null,
        data.suggestedCategories ? JSON.stringify(data.suggestedCategories) : null,
        data.responseTimeMs || null,
        data.sessionId || null
      ],
      type: QueryTypes.INSERT
    });

    logger.debug('Fallback logged', { query: data.query?.substring(0, 50), type: data.fallbackType });
  } catch (error) {
    // Don't fail the request if logging fails
    logger.warn('Could not log fallback:', error.message);
  }
}

/**
 * Multi-fallback system for improving response quality
 * Applies 4 strategies when RAG returns low-quality results:
 * 1. Add spell suggestion if available
 * 2. Suggest related categories
 * 3. Offer popular alternatives
 * 4. Provide helpful generic response
 */
async function applyMultiFallback(ragResponse, originalQuery, language, spellSuggestion) {
  const result = { ...ragResponse };

  // Check if response quality is low (no POIs found or generic fallback)
  const isLowQuality = !ragResponse.pois || ragResponse.pois.length === 0 || ragResponse.source === 'fallback';

  if (!isLowQuality) {
    return result; // Response is good, no fallback needed
  }

  logger.info('Applying multi-fallback for low quality response', { source: ragResponse.source, poiCount: ragResponse.pois?.length });

  // Fallback messages per language
  const fallbackMessages = {
    nl: {
      noResults: 'Ik kon geen exacte resultaten vinden voor je vraag.',
      tryAlternative: 'Probeer een van deze opties:',
      popularCategories: 'Of verken populaire categorieen:',
      categories: ['Restaurants', 'Stranden', 'Wandelen', 'Winkelen', 'Musea'],
      helpPrompt: 'Waar kan ik je mee helpen?'
    },
    en: {
      noResults: 'I could not find exact results for your question.',
      tryAlternative: 'Try one of these options:',
      popularCategories: 'Or explore popular categories:',
      categories: ['Restaurants', 'Beaches', 'Hiking', 'Shopping', 'Museums'],
      helpPrompt: 'What can I help you with?'
    },
    de: {
      noResults: 'Ich konnte keine genauen Ergebnisse fuer Ihre Frage finden.',
      tryAlternative: 'Versuchen Sie eine dieser Optionen:',
      popularCategories: 'Oder erkunden Sie beliebte Kategorien:',
      categories: ['Restaurants', 'Straende', 'Wandern', 'Einkaufen', 'Museen'],
      helpPrompt: 'Wie kann ich Ihnen helfen?'
    },
    es: {
      noResults: 'No pude encontrar resultados exactos para tu pregunta.',
      tryAlternative: 'Prueba una de estas opciones:',
      popularCategories: 'O explora categorias populares:',
      categories: ['Restaurantes', 'Playas', 'Senderismo', 'Compras', 'Museos'],
      helpPrompt: 'En que puedo ayudarte?'
    },
    sv: {
      noResults: 'Jag kunde inte hitta exakta resultat foer din fraaga.',
      tryAlternative: 'Proeva ett av dessa alternativ:',
      popularCategories: 'Eller utforska populaera kategorier:',
      categories: ['Restauranger', 'Straender', 'Vandring', 'Shopping', 'Museer'],
      helpPrompt: 'Vad kan jag hjaelpa dig med?'
    },
    pl: {
      noResults: 'Nie moglem znalezc dokladnych wynikow dla Twojego pytania.',
      tryAlternative: 'Sprobuj jednej z tych opcji:',
      popularCategories: 'Lub przegladaj popularne kategorie:',
      categories: ['Restauracje', 'Plaze', 'Piesze wedrówki', 'Zakupy', 'Muzea'],
      helpPrompt: 'W czym moge Ci pomoc?'
    }
  };

  const fb = fallbackMessages[language] || fallbackMessages.nl;

  // Build enhanced message
  let enhancedMessage = ragResponse.message || '';

  // Add spell suggestion if available
  if (spellSuggestion) {
    enhancedMessage = `${spellSuggestion}\n\n${enhancedMessage}`;
  }

  // If message is very generic or empty, provide better response
  if (!enhancedMessage || enhancedMessage.length < 50) {
    enhancedMessage = `${fb.noResults}\n\n${fb.popularCategories} ${fb.categories.join(', ')}.\n\n${fb.helpPrompt}`;
  }

  result.message = enhancedMessage;
  result.fallbackApplied = true;
  result.fallbackType = spellSuggestion ? 'spell_suggestion' : 'category_suggestion';

  // Log fallback for analytics (async, non-blocking)
  logFallback({
    query: originalQuery,
    language,
    fallbackType: result.fallbackType,
    originalSource: ragResponse.source,
    poiCount: ragResponse.pois?.length || 0,
    wasSpellCorrected: !!spellSuggestion,
    suggestedCategories: fb.categories
  }).catch(() => {}); // Ignore logging errors

  return result;
}

/**
 * POST /api/v1/holibot/chat/stream
 * SSE Streaming RAG-powered chat with HoliBot
 * Returns Server-Sent Events for real-time response streaming
 */
router.post('/chat/stream', async (req, res) => {
  try {
    const { message, conversationHistory = [], language = 'nl', userPreferences = {} } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ success: false, error: 'Message too long (max 1000 characters)' });
    }

    // Extract destination from request
    const { destinationId, destinationConfig, collectionName } = getDestinationFromRequest(req);

    logger.info('HoliBot streaming chat request', { message: message.substring(0, 100), language, destinationId });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Get streaming response from RAG service
    const streamResult = await ragService.chatStream(message, language, { userPreferences, conversationHistory, collectionName, destinationConfig });

    if (!streamResult.success) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: streamResult.error })}\n\n`);
      res.end();
      return;
    }

    // Send initial metadata (search results, POIs)
    res.write(`event: metadata\ndata: ${JSON.stringify({
      pois: streamResult.pois,
      searchTimeMs: streamResult.searchTimeMs,
      source: streamResult.source
    })}\n\n`);

    // Stream the response chunks
    let fullMessage = '';
    try {
      for await (const chunk of streamResult.stream) {
        fullMessage += chunk;
        res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
      }
    } catch (streamError) {
      logger.error('Streaming error:', streamError);
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Streaming interrupted' })}\n\n`);
    }

    // Send completion event
    res.write(`event: done\ndata: ${JSON.stringify({ fullMessage, totalLength: fullMessage.length })}\n\n`);
    res.end();

  } catch (error) {
    logger.error('HoliBot streaming chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Streaming chat service temporarily unavailable' });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/v1/holibot/search
 * Semantic search for POIs
 */
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 10, filter } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }
    const { collectionName } = getDestinationFromRequest(req);
    const results = await ragService.search(query, { limit, filter, collectionName });
    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('HoliBot search error:', error);
    res.status(500).json({ success: false, error: 'Search service temporarily unavailable' });
  }
});

/**
 * POST /api/v1/holibot/itinerary
 * Quick Action 1: Build personalized day program with Events
 *
 * Features:
 * - Duration choice: morning, afternoon, evening, full-day
 * - Interest-based POI selection
 * - Events integration from agenda
 * - Meal suggestions for appropriate time slots
 * - Time-of-day awareness (morning=cafes/bakeries, evening=restaurants/bars)
 * - Excludes permanently closed POIs (7 days/week "Closed")
 */
router.post('/itinerary', async (req, res) => {
  try {
    const { date, interests = [], duration = 'full-day', travelCompanion, language = 'nl', includeMeals = true, sessionId } = req.body;

    // Extract destination from request
    const { destinationId, destinationConfig, collectionName } = getDestinationFromRequest(req);
    const destName = destinationConfig?.destination?.name || 'Calpe';
    const destRegion = destinationConfig?.destination?.region || 'Costa Blanca';

    // Get or generate session ID for refresh variation tracking
    const effectiveSessionId = sessionId || req.headers['x-session-id'] || req.ip || 'anonymous';

    logger.info('HoliBot itinerary request', { date, interests, duration, includeMeals, destinationId });

    // Time-of-day appropriate POI types
    const timeOfDayTypes = {
      morning: ['bakery', 'cafe', 'coffee', 'breakfast', 'beach', 'nature', 'park', 'hiking', 'cycling'],
      afternoon: ['museum', 'shopping', 'market', 'viewpoint', 'culture', 'active', 'sport', 'beach'],
      evening: ['restaurant', 'tapas', 'bar', 'fine dining', 'seafood', 'pizzeria', 'nightlife', 'lounge']
    };
    // Query variation templates for diverse results (destination-aware)
    const queryTemplates = [
      `{interest} attractions ${destName}`,
      `best {interest} spots in ${destName} ${destRegion}`,
      `popular {interest} places ${destName} area`,
      `top rated {interest} ${destName}`,
      `{interest} things to do near ${destName}`
    ];
    const generalQueryTemplates = [
      `best things to do in ${destName}`,
      `top attractions ${destName} ${destRegion}`,
      `popular places to visit ${destName}`,
      `must see ${destName} vacation`
    ];
    const getRandomTemplate = (templates) => templates[Math.floor(Math.random() * templates.length)];


    // Note: isPermanentlyClosed() is now a shared helper at the top of this file

    // Step 1: Search POIs - do SEPARATE searches per interest for better variety
    let allSearchResults = [];
    if (interests.length > 0) {
      // Search each interest separately to ensure balanced results
      for (const interest of interests) {
        const queryTemplate = getRandomTemplate(queryTemplates).replace('{interest}', interest);
        const interestResults = await ragService.search(queryTemplate, { limit: 50, collectionName });
        allSearchResults = [...allSearchResults, ...interestResults.results];
      }
    }
    // Always add a general search for backup POIs
    const generalResults = await ragService.search(getRandomTemplate(generalQueryTemplates), { limit: 50, collectionName });
    allSearchResults = [...allSearchResults, ...generalResults.results];

    // Remove duplicates by id AND name, filter out permanently closed POIs
    const seenIds = new Set();
    const seenNames = new Set();
    const filteredResults = allSearchResults.filter(poi => {
      // Check for duplicate by ID
      if (poi.id && seenIds.has(poi.id)) return false;

      // Check for duplicate by normalized name (catches same POI with different IDs)
      const normalizedName = (poi.name || '').toLowerCase().trim();
      if (normalizedName && seenNames.has(normalizedName)) return false;

      // CRITICAL: Exclude permanently closed POIs
      if (isPermanentlyClosed(poi.opening_hours || poi.openingHours)) {
        logger.info('Excluding permanently closed POI from itinerary:', { id: poi.id, name: poi.name });
        return false;
      }

      // CRITICAL: Exclude currently closed POIs (e.g., closed on Mondays)
      if (isCurrentlyClosedFromHours(poi.opening_hours || poi.openingHours)) {
        logger.info('Excluding currently closed POI from itinerary:', { id: poi.id, name: poi.name });
        return false;
      }

      // Mark as seen
      if (poi.id) seenIds.add(poi.id);
      if (normalizedName) seenNames.add(normalizedName);
      return true;
    });

    // CRITICAL FIX: Enrich POI data with correct category/subcategory from MySQL
    // ChromaDB (RAG) returns Google Place IDs, not MySQL IDs, so lookup by google_place_id
    const model = await getPOIModel();
    let enrichedResults = filteredResults;
    if (model && filteredResults.length > 0) {
      // RAG POIs use Google Place ID as their 'id' field (e.g., "ChIJvUouKOP_nRIRLlLrjriGIDk")
      const googlePlaceIds = filteredResults.map(p => p.id).filter(id => id && typeof id === 'string' && id.startsWith('ChIJ'));
      if (googlePlaceIds.length > 0) {
        try {
          const { Op } = (await import('sequelize')).default;
          const mysqlPois = await model.findAll({
            where: { google_place_id: { [Op.in]: googlePlaceIds } },
            attributes: ['id', 'google_place_id', 'name', 'category', 'subcategory', 'opening_hours'],
            raw: true
          });
          // Create lookup by google_place_id
          const poiLookup = new Map(mysqlPois.map(p => [p.google_place_id, p]));

          // Also create name-based lookup for POIs without google_place_id match
          // This catches POIs like "Spasso Calpe" that exist in MySQL but without google_place_id
          const poiNames = filteredResults.map(p => p.name).filter(Boolean);
          const nameLookupPois = await model.findAll({
            where: { name: { [Op.in]: poiNames } },
            attributes: ['id', 'google_place_id', 'name', 'category', 'subcategory', 'opening_hours'],
            raw: true
          });
          const poiNameLookup = new Map(nameLookupPois.map(p => [p.name.toLowerCase(), p]));

          // CATEGORY FILTERING: Same rules as Daily Tip
          // Only tourist-friendly categories allowed (including RAG category variations)
          const allowedCategories = [
            'Beaches & Nature', 'Food & Drinks', 'Shopping',
            'Culture & History', 'Recreation', 'Active', 'Nightlife',
            // RAG/Google category variations that map to tourist categories
            'Restaurant', 'Bar', 'Cafe', 'Beach', 'Park', 'Museum',
            'Tourist attraction', 'Point of interest', 'Natural feature',
            'Public beach', 'Italian restaurant', 'Mediterranean restaurant',
            'Spanish restaurant', 'Seafood restaurant', 'Tapas restaurant',
            'General' // General often contains tourist POIs
          ];
          // Categories to EXCLUDE (not vacation-appropriate)
          const excludedCategories = [
            'Health & Wellbeing', 'Health & Wellness', 'Health',
            'Accommodations', 'Accommodation', 'Accommodation (do not communicate)',
            'Practical', 'Services', 'Government office', 'Pharmacy', 'Hospital',
            'Police', 'Fire station', 'Bank', 'ATM', 'Post office'
          ];

          enrichedResults = filteredResults.map(poi => {
            // Try google_place_id lookup first, then fallback to name lookup
            let mysqlData = poiLookup.get(poi.id);
            if (!mysqlData && poi.name) {
              mysqlData = poiNameLookup.get(poi.name.toLowerCase());
            }

            if (mysqlData) {
              // Check if permanently closed (all days empty/closed)
              if (isPermanentlyClosed(mysqlData.opening_hours)) {
                logger.info('Excluding permanently closed POI from itinerary:', { id: poi.id, name: poi.name });
                return null;
              }

              // Check if currently closed (closed today - e.g., Monday closure)
              if (isCurrentlyClosedFromHours(mysqlData.opening_hours)) {
                logger.info('Excluding currently closed POI from itinerary:', { id: poi.id, name: poi.name });
                return null;
              }

              // Check category filtering
              const poiCategory = (mysqlData.category || '').trim();
              const isAllowedCategory = allowedCategories.includes(poiCategory);
              const isExcludedCategory = excludedCategories.some(exc =>
                poiCategory.toLowerCase().includes(exc.toLowerCase()) ||
                exc.toLowerCase().includes(poiCategory.toLowerCase())
              );

              if (!isAllowedCategory || isExcludedCategory) {
                logger.info('Excluding non-tourist POI from itinerary:', { id: poi.id, name: poi.name, category: poiCategory });
                return null;
              }

              return {
                ...poi,
                mysqlId: mysqlData.id,
                category: mysqlData.category || poi.category,
                subcategory: mysqlData.subcategory || poi.subcategory
              };
            }

            // POI not found in MySQL by ID or name - still apply category filtering using RAG category
            const ragCategory = (poi.category || '').trim();
            const isAllowedRagCategory = allowedCategories.includes(ragCategory);
            const isExcludedRagCategory = excludedCategories.some(exc =>
              ragCategory.toLowerCase().includes(exc.toLowerCase()) ||
              exc.toLowerCase().includes(ragCategory.toLowerCase())
            );
            if (!isAllowedRagCategory || isExcludedRagCategory) {
              logger.info('Excluding non-tourist POI (no MySQL match):', { id: poi.id, name: poi.name, category: ragCategory });
              return null;
            }
            return poi;
          }).filter(Boolean); // Remove nulls (closed/excluded POIs)

          logger.info('POI category enrichment:', {
            original: filteredResults.length,
            enriched: enrichedResults.length,
            excluded: filteredResults.length - enrichedResults.length,
            googlePlaceIdsFound: googlePlaceIds.length,
            mysqlMatches: mysqlPois.length
          });
        } catch (enrichError) {
          logger.warn('POI enrichment failed, using RAG data:', enrichError.message);
        }
      } else {
        logger.info('No Google Place IDs found in POI results, skipping enrichment');
      }
    }

    // QUALITY FILTERING: Apply enterprise-level POI quality standards
    let qualityFilteredResults = enrichedResults;
    if (model && enrichedResults.length > 0) {
      try {
        // Get full POI data from MySQL for quality checks
        const poiNames = enrichedResults.map(p => p.name).filter(Boolean);
        const { Op } = (await import('sequelize')).default;
        const mysqlPoiData = await model.findAll({
          where: { name: { [Op.in]: poiNames } },
          attributes: ['id', 'name', 'rating', 'review_count', 'images', 'enhanced_images', 'thumbnail_url', 'opening_hours', 'category', 'subcategory', 
                       'address', 'latitude', 'longitude', 'last_updated'],
          raw: true
        });
        const mysqlLookup = new Map(mysqlPoiData.map(p => [p.name.toLowerCase().trim(), p]));
        
        logger.info('MySQL POI lookup:', { 
          ragPois: enrichedResults.length, 
          mysqlMatches: mysqlPoiData.length,
          mysqlNames: mysqlPoiData.slice(0, 5).map(p => p.name)
        });
        
        // Filter by quality criteria
        const qualityChecks = await Promise.all(enrichedResults.map(async poi => {
          const poiNameLower = (poi.name || '').toLowerCase().trim();
          const mysqlPoi = mysqlLookup.get(poiNameLower);
          
          // Log if no MySQL match found
          if (!mysqlPoi) {
            logger.warn('No MySQL match for POI:', { name: poi.name, searchedAs: poiNameLower });
          }
          
          const quality = await checkPOIQuality(poi, mysqlPoi);
          
          // Log failed POIs with their issues
          if (!quality.passes) {
            logger.info('POI failed quality:', { 
              name: poi.name, 
              rating: quality.rating,
              issues: quality.issues,
              hasMysqlData: !!mysqlPoi
            });
          }
          
          return { poi: { ...poi, ...quality, mysqlData: mysqlPoi }, passes: quality.passes, issues: quality.issues };
        }));
        
        qualityFilteredResults = qualityChecks
          .filter(q => q.passes)
          .map(q => q.poi);
        
        const failedCount = qualityChecks.filter(q => !q.passes).length;
        logger.info('POI quality filtering:', {
          input: enrichedResults.length,
          passed: qualityFilteredResults.length,
          failed: failedCount,
          criteria: 'rating>=4.0, has_reviews, reviews<2yr, images>=2, has_location'
        });
        
        // If too few POIs pass quality, relax RATING criteria only (keep closed filter strict!)
        if (qualityFilteredResults.length < 6) {
          logger.info('Relaxing quality filters due to insufficient POIs (keeping closed filter strict)');
          
          qualityFilteredResults = qualityChecks.filter(q => {
            // NEVER include permanently or currently closed POIs
            if (q.issues.includes('permanently_closed') || q.issues.includes('currently_closed')) {
              return false;
            }
            // Accept if already passed OR if only failed on rating (relax to 3.5)
            if (q.passes) return true;
            
            // Relax rating requirement to 3.5 but keep other requirements
            const nonRatingIssues = q.issues.filter(i => !i.startsWith('rating_below'));
            const hasGoodEnoughRating = q.poi.rating >= 3.5 || q.poi.rating === 0;
            return nonRatingIssues.length === 0 && hasGoodEnoughRating;
          }).map(q => q.poi);
          
          logger.info('After relaxed filtering:', { count: qualityFilteredResults.length });
        }
      } catch (qualityError) {
        logger.warn('Quality filtering failed, using unfiltered results:', qualityError.message);
        qualityFilteredResults = enrichedResults;
      }
    }
    
    // Apply 80-90% refresh variation using session history
    const variedResults = selectWithVariation(qualityFilteredResults, 
      Math.min(qualityFilteredResults.length, 30), effectiveSessionId);
    
    const searchResults = { results: variedResults };
    
    // Track shown POIs in session history
    addToSessionHistory(effectiveSessionId, variedResults.map(p => p.id || p.name));

    logger.info('Itinerary search results:', {
      totalPois: searchResults.results.length,
      interests,
      duration
    });

    // Step 2: Get Events for the selected date
    let events = [];
    const targetDate = date || new Date().toISOString().split('T')[0];
    try {
      const { mysqlSequelize } = await import('../config/database.js');
      const { QueryTypes } = (await import('sequelize')).default;

      const eventResults = await mysqlSequelize.query(
        "SELECT a.id, a.title, a.short_description as description, " +
        "a.image as thumbnailUrl, a.location_name as address, " +
        "d.event_date, d.start_time " +
        "FROM agenda a " +
        "INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash " +
        "WHERE d.event_date = ? " +
        "AND (a.calpe_distance IS NULL OR a.calpe_distance <= 25) " +
        "ORDER BY d.start_time ASC LIMIT 5",
        { replacements: [targetDate], type: QueryTypes.SELECT }
      );

      events = eventResults.map(e => ({
        ...e,
        type: 'event',
        name: e.title,
        category: 'Event'
      }));
    } catch (eventError) {
      logger.warn('Could not fetch events for itinerary:', eventError.message);
    }

    // Step 3: Get restaurant suggestions if meals included
    let restaurants = [];
    if (includeMeals) {
      const restaurantResults = await ragService.search(`restaurant ${destName} ` + (interests.includes('Food & Drinks') ? 'best rated' : ''), { limit: 25, collectionName });
      restaurants = restaurantResults.results.filter(p =>
        p.category?.toLowerCase().includes('food') ||
        p.category?.toLowerCase().includes('restaurant') ||
        p.subcategory?.toLowerCase().includes('restaurant')
      );
    }

    // Step 4: Build time slots with mixed content and time-of-day context
    const timeSlots = {
      'morning': [
        { time: '09:00', type: 'activity', timeContext: 'morning' },
        { time: '10:30', type: 'activity', timeContext: 'morning' },
        { time: '12:00', type: 'lunch', timeContext: 'morning' }
      ],
      'afternoon': [
        { time: '13:00', type: 'lunch', timeContext: 'afternoon' },
        { time: '14:30', type: 'activity', timeContext: 'afternoon' },
        { time: '16:30', type: 'activity', timeContext: 'afternoon' }
      ],
      'evening': [
        { time: '18:00', type: 'activity', timeContext: 'evening' },
        { time: '19:30', type: 'dinner', timeContext: 'evening' },
        { time: '21:00', type: 'activity', timeContext: 'evening' }
      ],
      'full-day': [
        { time: '09:30', type: 'activity', timeContext: 'morning' },
        { time: '11:00', type: 'activity', timeContext: 'morning' },
        { time: '13:00', type: 'lunch', timeContext: 'afternoon' },
        { time: '15:00', type: 'activity', timeContext: 'afternoon' },
        { time: '17:00', type: 'activity', timeContext: 'afternoon' },
        { time: '19:30', type: 'dinner', timeContext: 'evening' }
      ]
    };

    const slots = timeSlots[duration] || timeSlots['full-day'];
    const itinerary = [];
    let eventIndex = 0;

    // Shuffle POIs and restaurants for variety (Fisher-Yates shuffle)
    const shuffleArray = (arr) => {
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Categorize POIs by type for time-of-day selection
    const morningPois = searchResults.results.filter(p => {
      const subcat = (p.subcategory || p.poi_type || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return timeOfDayTypes.morning.some(t => subcat.includes(t) || cat.includes(t)) ||
             cat.includes('beach') || cat.includes('nature') || cat.includes('active');
    });

    const afternoonPois = searchResults.results.filter(p => {
      const subcat = (p.subcategory || p.poi_type || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return timeOfDayTypes.afternoon.some(t => subcat.includes(t) || cat.includes(t)) ||
             cat.includes('culture') || cat.includes('shopping') || cat.includes('recreation');
    });

    const eveningPois = searchResults.results.filter(p => {
      const subcat = (p.subcategory || p.poi_type || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return timeOfDayTypes.evening.some(t => subcat.includes(t) || cat.includes(t)) ||
             cat.includes('food') || cat.includes('nightlife');
    });

    // Combine restaurants from search + explicit restaurant search
    const allRestaurants = [...restaurants, ...searchResults.results.filter(p =>
      p.category?.toLowerCase().includes('food') ||
      p.subcategory?.toLowerCase().includes('restaurant')
    )];

    // Shuffle all lists for variety
    const shuffledMorning = shuffleArray(morningPois.length > 0 ? morningPois : searchResults.results);
    const shuffledAfternoon = shuffleArray(afternoonPois.length > 0 ? afternoonPois : searchResults.results);
    const shuffledEvening = shuffleArray(eveningPois.length > 0 ? eveningPois : searchResults.results);
    const shuffledRestaurants = shuffleArray(allRestaurants);
    const shuffledAllPois = shuffleArray(searchResults.results); // Fallback

    // Track used POIs to avoid duplicates in same program
    // Use both ID and normalized name to catch all duplicates
    const usedPoiIds = new Set();
    const usedPoiNames = new Set();
    let morningIndex = 0, afternoonIndex = 0, eveningIndex = 0, restaurantIndex = 0, allPoiIndex = 0;

    // Helper: Check if POI was already used (by ID or name)
    const isPoiUsed = (poi) => {
      if (!poi) return true;
      const normalizedName = (poi.name || '').toLowerCase().trim();
      return (poi.id && usedPoiIds.has(poi.id)) || (normalizedName && usedPoiNames.has(normalizedName));
    };

    // Helper: Mark POI as used
    const markPoiUsed = (poi) => {
      if (!poi) return;
      if (poi.id) usedPoiIds.add(poi.id);
      const normalizedName = (poi.name || '').toLowerCase().trim();
      if (normalizedName) usedPoiNames.add(normalizedName);
    };

    // Helper: Get POI based on time context with fallback
    const getNextPoiForTime = (timeContext) => {
      const lists = {
        morning: { arr: shuffledMorning, idx: () => morningIndex, inc: () => morningIndex++ },
        afternoon: { arr: shuffledAfternoon, idx: () => afternoonIndex, inc: () => afternoonIndex++ },
        evening: { arr: shuffledEvening, idx: () => eveningIndex, inc: () => eveningIndex++ }
      };

      // Try time-appropriate POIs first
      const list = lists[timeContext];
      if (list) {
        while (list.idx() < list.arr.length) {
          const poi = list.arr[list.idx()];
          list.inc();
          if (!isPoiUsed(poi)) {
            markPoiUsed(poi);
            return poi;
          }
        }
      }

      // Fallback to any unused POI
      while (allPoiIndex < shuffledAllPois.length) {
        const poi = shuffledAllPois[allPoiIndex];
        allPoiIndex++;
        if (!isPoiUsed(poi)) {
          markPoiUsed(poi);
          return poi;
        }
      }
      return null;
    };

    // Helper: Find next restaurant that hasn't been used
    const getNextUniqueRestaurant = () => {
      while (restaurantIndex < shuffledRestaurants.length) {
        const restaurant = shuffledRestaurants[restaurantIndex];
        restaurantIndex++;
        if (!isPoiUsed(restaurant)) {
          markPoiUsed(restaurant);
          return restaurant;
        }
      }
      return null;
    };

    logger.info('Itinerary building:', {
      totalPois: searchResults.results.length,
      morningPois: morningPois.length,
      afternoonPois: afternoonPois.length,
      eveningPois: eveningPois.length,
      restaurants: shuffledRestaurants.length,
      slots: slots.length
    });

    for (const slot of slots) {
      let item = null;

      if (slot.type === 'lunch' || slot.type === 'dinner') {
        // Add meal suggestion (unique restaurant type)
        const restaurant = includeMeals ? getNextUniqueRestaurant() : null;
        if (restaurant) {
          item = {
            time: slot.time,
            type: slot.type,
            poi: restaurant,
            label: slot.type === 'lunch' ? 'Lunch' : 'Diner'
          };
        }
      } else {
        // Try to add event first (if time matches), otherwise POI
        if (events[eventIndex] && events[eventIndex].start_time) {
          const eventHour = parseInt(events[eventIndex].start_time.split(':')[0]);
          const slotHour = parseInt(slot.time.split(':')[0]);
          if (Math.abs(eventHour - slotHour) <= 2) {
            item = {
              time: events[eventIndex].start_time || slot.time,
              type: 'event',
              event: events[eventIndex],
              poi: events[eventIndex]
            };
            eventIndex++;
          }
        }

        if (!item) {
          // Get next POI using time-of-day awareness (morning=cafes, evening=restaurants, etc.)
          const poi = getNextPoiForTime(slot.timeContext || 'afternoon');
          if (poi) {
            item = {
              time: slot.time,
              type: 'activity',
              poi
            };
          }
        }
      }

      if (item) {
        itinerary.push(item);
      }
    }

    logger.info('Itinerary built:', { itemCount: itinerary.length });

    // Step 5: Generate AI description with language-specific prompts
    // IMPORTANT: Include ACTUAL POI names from the itinerary for coherent intro
    const systemPrompt = embeddingService.buildSystemPrompt(language, {}, destinationConfig);

    // Extract actual POI names from the built itinerary (max 3 for intro)
    const selectedPoiNames = itinerary
      .filter(item => item.poi && item.poi.name)
      .map(item => item.poi.name)
      .slice(0, 3);

    const poiListText = selectedPoiNames.length > 0
      ? selectedPoiNames.join(', ')
      : '';

    // Build intro prompt that MUST reference the actual selected POIs
    // This ensures the intro matches the program output
    const durationLabels = {
      nl: { 'full-day': 'vol dagprogramma', 'morning': 'ochtendprogramma', 'afternoon': 'middagprogramma', 'evening': 'avondprogramma' },
      en: { 'full-day': 'full-day program', 'morning': 'morning program', 'afternoon': 'afternoon program', 'evening': 'evening program' },
      de: { 'full-day': 'Ganztagsprogramm', 'morning': 'Vormittagsprogramm', 'afternoon': 'Nachmittagsprogramm', 'evening': 'Abendprogramm' },
      es: { 'full-day': 'programa de día completo', 'morning': 'programa de mañana', 'afternoon': 'programa de tarde', 'evening': 'programa de noche' },
      sv: { 'full-day': 'heldagsprogram', 'morning': 'förmiddagsprogram', 'afternoon': 'eftermiddagsprogram', 'evening': 'kvällsprogram' },
      pl: { 'full-day': 'program całodniowy', 'morning': 'program poranny', 'afternoon': 'program popołudniowy', 'evening': 'program wieczorny' }
    };

    const durationLabel = (durationLabels[language] || durationLabels.nl)[duration] || duration;

    // Multi-language itinerary intro prompts - MUST reference actual POI names
    // CRITICAL: Require proper spacing around POI names for clickable links
    const itineraryPrompts = {
      nl: `Schrijf een enthousiaste, bondige introductie (max 50 woorden, in het Nederlands) voor dit ${durationLabel} in ${destName}.

GESELECTEERDE LOCATIES: ${poiListText || 'diverse toplocaties'}.

REGELS:
- Noem 1-2 van de geselecteerde locaties bij naam
- Wees kort en bondig, geen lange zinnen
- Eindig met een uitnodigende zin
- GEEN sterretjes, emoji's of markdown
- ALLEEN de locaties noemen die hierboven staan vermeld
- BELANGRIJK: Zorg voor een SPATIE voor EN na elke locatienaam`,
      en: `Write an enthusiastic, concise introduction (max 50 words, in English) for this ${durationLabel} in ${destName}.

SELECTED LOCATIONS: ${poiListText || 'various top attractions'}.

RULES:
- Mention 1-2 of the selected locations by name
- Be brief and concise, no long sentences
- End with an inviting sentence
- NO asterisks, emojis or markdown
- ONLY mention locations listed above
- IMPORTANT: Ensure a SPACE before AND after each location name`,
      de: `Schreibe eine begeisterte, kurze Einleitung (max 50 Wörter, auf Deutsch) für dieses ${durationLabel} in ${destName}.

AUSGEWÄHLTE ORTE: ${poiListText || 'verschiedene Top-Attraktionen'}.

REGELN:
- Nenne 1-2 der ausgewählten Orte beim Namen
- Sei kurz und prägnant, keine langen Sätze
- Ende mit einem einladenden Satz
- KEINE Sternchen, Emojis oder Markdown
- NUR die oben genannten Orte erwähnen
- WICHTIG: Stelle sicher, dass ein LEERZEICHEN vor UND nach jedem Ortsnamen steht`,
      es: `Escribe una introducción entusiasta y concisa (máx 50 palabras, en español) para este ${durationLabel} en ${destName}.

LUGARES SELECCIONADOS: ${poiListText || 'varias atracciones principales'}.

REGLAS:
- Menciona 1-2 de los lugares seleccionados por nombre
- Sé breve y conciso, sin oraciones largas
- Termina con una frase acogedora
- SIN asteriscos, emojis ni markdown
- SOLO mencionar los lugares listados arriba
- IMPORTANTE: Asegúrate de un ESPACIO antes Y después de cada nombre de lugar`,
      sv: `Skriv en entusiastisk, koncis introduktion (max 50 ord, på svenska) för detta ${durationLabel} i ${destName}.

VALDA PLATSER: ${poiListText || 'olika toppatraktioner'}.

REGLER:
- Nämn 1-2 av de valda platserna vid namn
- Var kort och koncis, inga långa meningar
- Avsluta med en inbjudande mening
- INGA asterisker, emojis eller markdown
- ENDAST nämna platser listade ovan
- VIKTIGT: Se till att det finns ett MELLANSLAG före OCH efter varje platsnamn`,
      pl: `Napisz entuzjastyczne, zwięzłe wprowadzenie (maks 50 słów, po polsku) do tego ${durationLabel} w ${destName}.

WYBRANE LOKALIZACJE: ${poiListText || 'różne topowe atrakcje'}.

ZASADY:
- Wymień 1-2 wybranych lokalizacji po nazwie
- Bądź krótki i zwięzły, bez długich zdań
- Zakończ zachęcającym zdaniem
- BEZ gwiazdek, emoji ani markdown
- TYLKO wymieniać lokalizacje podane powyżej
- WAŻNE: Upewnij się, że jest SPACJA przed I po każdej nazwie miejsca`
    };

    let description = await embeddingService.generateChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: itineraryPrompts[language] || itineraryPrompts.nl }
    ]);

    // Clean AI text: remove asterisks, quotes, fix spacing around POI names
    description = cleanAIText(description, selectedPoiNames);

    res.json({
      success: true,
      data: {
        date: targetDate,
        duration,
        description,
        itinerary,
        totalStops: itinerary.length,
        eventsIncluded: events.length,
        hasEvents: events.length > 0
      }
    });

  } catch (error) {
    logger.error('HoliBot itinerary error:', error);
    res.status(500).json({ success: false, error: 'Could not generate itinerary' });
  }
});

/**
 * GET /api/v1/holibot/location/:id
 * Quick Action 2: Detailed location info with Q&A context
 *
 * Supports both:
 * - MySQL primary key ID (numeric)
 * - Google Place ID (string starting with "ChIJ...")
 */
router.get('/location/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { language = 'nl' } = req.query;

    const model = await getPOIModel();
    if (!model) {
      return res.status(500).json({ success: false, error: 'POI service not available' });
    }

    let poi = null;

    // Try MySQL primary key first (numeric ID)
    if (/^\d+$/.test(id)) {
      poi = await model.findByPk(id);
    }

    // If not found, try Google Place ID lookup
    if (!poi) {
      poi = await model.findOne({ where: { google_place_id: id } });
    }

    // If still not found, try by name (in case id is a name string)
    if (!poi && id.length > 5 && !id.startsWith('ChIJ')) {
      const { Op } = await import('sequelize');
      poi = await model.findOne({
        where: {
          name: { [Op.like]: `%${id}%` }
        }
      });
    }

    if (!poi) {
      logger.warn('POI not found:', { id, type: typeof id });
      return res.status(404).json({ success: false, error: 'Location not found' });
    }

    const { destinationConfig, collectionName } = getDestinationFromRequest(req);
    const destName = destinationConfig?.destination?.name || 'Calpe';

    const contextResults = await ragService.search(poi.name, { limit: 3, collectionName });
    const systemPrompt = embeddingService.buildSystemPrompt(language, {}, destinationConfig);
    const enhancedDescription = await embeddingService.generateChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Geef een aantrekkelijke beschrijving (max 100 woorden) van ${poi.name} in ${destName}. Categorie: ${poi.category}. Originele beschrijving: ${poi.description || 'Geen beschrijving'}` }
    ]);

    res.json({
      success: true,
      data: {
        poi: {
          id: poi.id, name: poi.name, category: poi.category, subcategory: poi.subcategory,
          description: poi.description, enhancedDescription, address: poi.address,
          latitude: poi.latitude, longitude: poi.longitude, rating: poi.rating,
          reviewCount: poi.review_count, priceLevel: poi.price_level, phone: poi.phone,
          website: poi.website, openingHours: poi.opening_hours, thumbnailUrl: poi.thumbnail_url
        },
        relatedContext: contextResults.results.slice(0, 3)
      }
    });

  } catch (error) {
    logger.error('HoliBot location error:', error);
    res.status(500).json({ success: false, error: 'Could not fetch location details' });
  }
});

/**
 * POST /api/v1/holibot/directions
 * Quick Action 3: Get directions to POI
 *
 * Supports both MySQL ID and Google Place ID for toPoiId
 */
router.post('/directions', async (req, res) => {
  try {
    const { from, toPoiId, mode = 'walking', language = 'nl' } = req.body;

    const model = await getPOIModel();
    if (!model) {
      return res.status(500).json({ success: false, error: 'POI service not available' });
    }

    let poi = null;

    // Try MySQL primary key first (numeric ID)
    if (/^\d+$/.test(toPoiId)) {
      poi = await model.findByPk(toPoiId);
    }

    // If not found, try Google Place ID lookup
    if (!poi) {
      poi = await model.findOne({ where: { google_place_id: toPoiId } });
    }

    if (!poi) {
      logger.warn('Destination POI not found:', { toPoiId });
      return res.status(404).json({ success: false, error: 'Destination not found' });
    }

    const destination = { name: poi.name, address: poi.address, latitude: poi.latitude, longitude: poi.longitude };

    const { destinationConfig: dirDestConfig } = getDestinationFromRequest(req);
    const dirDestName = dirDestConfig?.destination?.name || 'Calpe';
    const tips = await embeddingService.generateChatCompletion([
      { role: 'system', content: embeddingService.buildSystemPrompt(language, {}, dirDestConfig) },
      { role: 'user', content: `Geef 2-3 korte tips voor ${mode === 'walking' ? 'wandelen' : 'rijden'} naar ${poi.name} in ${dirDestName}. Adres: ${poi.address || 'niet beschikbaar'}` }
    ]);

    res.json({
      success: true,
      data: {
        destination,
        mode,
        tips,
        mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${poi.latitude},${poi.longitude}&travelmode=${mode}`
      }
    });

  } catch (error) {
    logger.error('HoliBot directions error:', error);
    res.status(500).json({ success: false, error: 'Could not generate directions' });
  }
});

/**
 * GET /api/v1/holibot/daily-tip
 * Quick Action 4: Enhanced personalized daily tip
 *
 * Quality Requirements:
 * - POI rating minimum 4.4 stars (or no rating for new POIs)
 * - Include Events from agenda (upcoming 7 days)
 * - Filter POIs and Events within 5km radius of Calpe center
 * - Rotate daily between user interests
 * - Accept excludeIds to avoid repeating tips within session
 */
router.get('/daily-tip', async (req, res) => {
  try {
    const { language = 'nl', interests, excludeIds = '', userId } = req.query;

    // Extract destination from request
    const { destinationId, destinationConfig } = getDestinationFromRequest(req);

    // Parse excluded IDs (tips already shown this session)
    const excludedIdList = excludeIds ? excludeIds.split(',').filter(Boolean) : [];

    // ONLY tourist-friendly categories for daily tips
    const allowedCategories = [
      'Beaches & Nature', 'Food & Drinks', 'Shopping',
      'Culture & History', 'Recreation', 'Active', 'Nightlife'
    ];

    // Categories to EXCLUDE from daily tips (not vacation-appropriate)
    const excludedCategories = [
      'Health & Wellbeing', 'Health & Wellness', 'Health',
      'Accommodations', 'Accommodation', 'Accommodation (do not communicate)',
      'Practical', 'Services'
    ];

    // Destination center coordinates (for radius filter)
    const CALPE_CENTER_LAT = destinationConfig?.destination?.coordinates?.lat || 38.6447;
    const CALPE_CENTER_LNG = destinationConfig?.destination?.coordinates?.lng || 0.0445;
    const MAX_DISTANCE_KM = destinationId === 2 ? 15 : 5; // Texel is larger than Calpe

    // User interests or rotate through allowed categories
    const userInterests = interests ? interests.split(',').filter(c => allowedCategories.includes(c)) : allowedCategories;

    // Rotate interest based on day of year
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const todayInterestIndex = dayOfYear % userInterests.length;
    const selectedInterest = userInterests[todayInterestIndex];

    logger.info('Daily tip request', { language, selectedInterest, excludeCount: excludedIdList.length });

    // Step 1: Get POIs from database with distance filter (5km radius)
    // IMPORTANT: Include language-specific translated content fields
    let qualityPois = [];
    try {
      const { mysqlSequelize } = await import('../config/database.js');
      const { QueryTypes } = (await import('sequelize')).default;

      // Query POIs within 5km radius using Haversine formula
      // Include ALL translated description fields for proper language support
      const poiResults = await mysqlSequelize.query(`
        SELECT id, name, description, category, subcategory, poi_type,
               address, latitude, longitude, rating, review_count,
               thumbnail_url, price_level, opening_hours,
               enriched_tile_description,
               enriched_tile_description_nl,
               enriched_tile_description_de,
               enriched_tile_description_es,
               enriched_tile_description_sv,
               enriched_tile_description_pl,
               enriched_detail_description,
               enriched_detail_description_nl,
               enriched_detail_description_de,
               enriched_detail_description_es,
               enriched_detail_description_sv,
               enriched_detail_description_pl,
               (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) AS distance_km
        FROM POI
        WHERE is_active = 1
          AND destination_id = ?
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND (rating IS NULL OR rating >= 4.4)
          AND category IN (?, ?, ?, ?, ?, ?, ?)
        HAVING distance_km <= ?
        ORDER BY rating DESC, review_count DESC
        LIMIT 50
      `, {
        replacements: [
          CALPE_CENTER_LAT, CALPE_CENTER_LNG, CALPE_CENTER_LAT,
          destinationId,
          ...allowedCategories,
          MAX_DISTANCE_KM
        ],
        type: QueryTypes.SELECT
      });

      // Note: getTranslatedDescription() is now a shared helper at the top of this file

      // Filter by exclusions (IDs already shown), closed POIs, and add images array for POICard
      // CRITICAL: Use language-specific description and exclude closed POIs
      qualityPois = poiResults.filter(poi => {
        const notExcluded = !excludedIdList.includes(String(poi.id)) && !excludedIdList.includes('poi-' + poi.id);
        // CRITICAL: Filter out permanently closed POIs
        const notPermanentlyClosed = !isPermanentlyClosed(poi.opening_hours);
        if (isPermanentlyClosed(poi.opening_hours)) {
          logger.info('Excluding permanently closed POI from daily tip:', { id: poi.id, name: poi.name });
        }
        // CRITICAL: Filter out currently closed POIs (e.g., closed on Mondays)
        const notCurrentlyClosed = !isCurrentlyClosedFromHours(poi.opening_hours);
        if (isCurrentlyClosedFromHours(poi.opening_hours)) {
          logger.info('Excluding currently closed POI from daily tip:', { id: poi.id, name: poi.name });
        }
        return notExcluded && notPermanentlyClosed && notCurrentlyClosed;
      }).map(poi => ({
        ...poi,
        // Use translated description for the current language (shared helper)
        description: getTranslatedDescription(poi, language),
        // POICard expects 'images' array, backend returns 'thumbnail_url'
        images: poi.thumbnail_url ? [poi.thumbnail_url] : []
      }));

      logger.info('Daily tip POIs from DB:', { count: qualityPois.length, maxDistance: MAX_DISTANCE_KM });
    } catch (poiError) {
      logger.warn('Could not fetch POIs from database, falling back to search:', poiError.message);
      // Fallback to RAG search if database query fails
      const destNameFallback = destinationConfig?.destination?.name || 'Calpe';
      const poiSearchResults = await ragService.search(selectedInterest + ' ' + destNameFallback, { limit: 20 });
      qualityPois = poiSearchResults.results.filter(poi => {
        const rating = parseFloat(poi.rating);
        const hasGoodRating = !rating || isNaN(rating) || rating >= 4.4;
        // Strict category filtering - must be in allowed categories, not in excluded
        const poiCategory = (poi.category || '').trim();
        const isAllowedCategory = allowedCategories.includes(poiCategory);
        const isExcludedCategory = excludedCategories.some(exc =>
          poiCategory.toLowerCase().includes(exc.toLowerCase()) ||
          exc.toLowerCase().includes(poiCategory.toLowerCase())
        );
        const notExcluded = !excludedIdList.includes(String(poi.id)) && !excludedIdList.includes('poi-' + poi.id);
        // CRITICAL: Also filter out permanently closed POIs
        const notPermanentlyClosed = !isPermanentlyClosed(poi.opening_hours || poi.openingHours);
        return hasGoodRating && isAllowedCategory && !isExcludedCategory && notExcluded && notPermanentlyClosed;
      }).map(poi => ({
        ...poi,
        // POICard expects 'images' array
        images: poi.thumbnail_url ? [poi.thumbnail_url] : (poi.images || [])
      }));
    }

    // Step 2: Get upcoming events (next 7 days) within 5km radius
    // Include translated title fields (title_en, title_es) for multi-language support
    let events = [];
    try {
      const { mysqlSequelize } = await import('../config/database.js');
      const { QueryTypes } = (await import('sequelize')).default;

      const eventResults = await mysqlSequelize.query(
        "SELECT a.id, a.title, a.title_en, a.title_es, " +
        "a.short_description as description, " +
        "a.image as thumbnailUrl, a.location_name as address, " +
        "MIN(d.event_date) as event_date " +
        "FROM agenda a " +
        "INNER JOIN agenda_dates d ON a.provider_event_hash = d.provider_event_hash " +
        "WHERE d.event_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) " +
        "AND (a.calpe_distance IS NULL OR a.calpe_distance <= ?) " +
        "GROUP BY a.id ORDER BY d.event_date ASC LIMIT 10",
        { replacements: [MAX_DISTANCE_KM], type: QueryTypes.SELECT }
      );

      events = eventResults.filter(event =>
        !excludedIdList.includes('event-' + event.id) && !excludedIdList.includes(String(event.id))
      ).map(event => ({
        ...event,
        id: event.id,
        eventId: event.id,
        // Use translated title based on user's language
        name: getTranslatedEventTitle(event, language),
        type: 'event',
        isEvent: true,
        category: selectedInterest,
        rating: null
      }));
    } catch (eventError) {
      logger.warn('Could not fetch events for daily tip:', eventError.message);
    }

    // Combine quality POIs and Events
    const poisWithType = qualityPois
      .filter(poi => poi.id)
      .map(poi => ({ ...poi, type: 'poi' }));

    const validEvents = events.filter(event => event.id);

    logger.info('Daily tip candidates:', {
      qualityPois: poisWithType.length,
      events: validEvents.length,
      selectedInterest,
      maxDistanceKm: MAX_DISTANCE_KM
    });

    // Selection strategy: Always prefer POIs (60%), Events (40%)
    // This ensures POIs are shown more consistently
    let selectedItem = null;
    const random = Math.random();

    if (random < 0.6 && poisWithType.length > 0) {
      // 60% chance: Select random POI
      const randomIndex = Math.floor(Math.random() * poisWithType.length);
      selectedItem = poisWithType[randomIndex];
    } else if (validEvents.length > 0) {
      // 40% chance or fallback: Select random Event
      const randomIndex = Math.floor(Math.random() * validEvents.length);
      selectedItem = validEvents[randomIndex];
    } else if (poisWithType.length > 0) {
      // Final fallback to POI if no events
      const randomIndex = Math.floor(Math.random() * poisWithType.length);
      selectedItem = poisWithType[randomIndex];
    }

    // Generate tip labels
    const tipLabels = { nl: 'Tip van de Dag', en: 'Tip of the Day', de: 'Tipp des Tages', es: 'Consejo del Dia', sv: 'Dagens Tips', pl: 'Porada Dnia' };

    if (!selectedItem) {
      // When all tips are exhausted, return a friendly message instead of 404
      const noTipsMessages = {
        nl: 'Je hebt alle tips van vandaag gezien! Probeer het morgen opnieuw voor nieuwe suggesties.',
        en: 'You have seen all tips for today! Try again tomorrow for new suggestions.',
        de: 'Du hast alle Tipps für heute gesehen! Versuche es morgen wieder für neue Vorschläge.',
        es: '¡Has visto todos los consejos de hoy! Inténtalo mañana para nuevas sugerencias.',
        sv: 'Du har sett alla tips för idag! Försök igen imorgon för nya förslag.',
        pl: 'Widziałeś wszystkie porady na dziś! Spróbuj jutro, aby zobaczyć nowe sugestie.'
      };
      return res.json({
        success: true,
        data: {
          title: tipLabels[language] || tipLabels.nl,
          itemType: 'message',
          poi: null,
          event: null,
          item: null,
          tipDescription: noTipsMessages[language] || noTipsMessages.nl,
          category: selectedInterest,
          date: now.toISOString().split('T')[0],
          tipId: null,
          exhausted: true
        }
      });
    }

    const itemName = selectedItem.name || selectedItem.title || 'Unknown';
    const destNameForTip = destinationConfig?.destination?.name || 'Calpe';
    const itemDesc = selectedItem.description || `Een geweldige plek in ${destNameForTip}`;
    const ratingText = selectedItem.rating ? 'Beoordeling: ' + selectedItem.rating + ' sterren. ' : '';

    // Multi-language tip prompts - NO emojis or asterisks, clean text for TTS
    const tipPrompts = {
      nl: {
        event: `Schrijf een enthousiaste aanbeveling (max 80 woorden, in het Nederlands) voor het evenement "${itemName}". Het vindt plaats op ${selectedItem.event_date}. Beschrijving: ${itemDesc}. BELANGRIJK: Gebruik GEEN sterretjes, asterisken of emoji's. Schrijf vloeiende, correcte zinnen geschikt voor voorlezen.`,
        poi: `Schrijf een enthousiaste aanbeveling (max 80 woorden, in het Nederlands) voor ${itemName}. ${ratingText}Categorie: ${selectedItem.category}. Beschrijving: ${itemDesc}. BELANGRIJK: Gebruik GEEN sterretjes, asterisken of emoji's. Schrijf vloeiende, correcte zinnen geschikt voor voorlezen.`
      },
      en: {
        event: `Write an enthusiastic recommendation (max 80 words, in English) for the event "${itemName}". It takes place on ${selectedItem.event_date}. Description: ${itemDesc}. IMPORTANT: Do NOT use asterisks or emojis. Write fluent, correct sentences suitable for text-to-speech.`,
        poi: `Write an enthusiastic recommendation (max 80 words, in English) for ${itemName}. ${ratingText}Category: ${selectedItem.category}. Description: ${itemDesc}. IMPORTANT: Do NOT use asterisks or emojis. Write fluent, correct sentences suitable for text-to-speech.`
      },
      de: {
        event: `Schreibe eine begeisterte Empfehlung (max 80 Wörter, auf Deutsch) für das Event "${itemName}". Es findet am ${selectedItem.event_date} statt. Beschreibung: ${itemDesc}. WICHTIG: Verwende KEINE Sternchen oder Emojis. Schreibe flüssige, korrekte Sätze für Sprachausgabe.`,
        poi: `Schreibe eine begeisterte Empfehlung (max 80 Wörter, auf Deutsch) für ${itemName}. ${ratingText}Kategorie: ${selectedItem.category}. Beschreibung: ${itemDesc}. WICHTIG: Verwende KEINE Sternchen oder Emojis. Schreibe flüssige, korrekte Sätze für Sprachausgabe.`
      },
      es: {
        event: `Escribe una recomendación entusiasta (máx 80 palabras, en español) para el evento "${itemName}". Se celebra el ${selectedItem.event_date}. Descripción: ${itemDesc}. IMPORTANTE: NO uses asteriscos ni emojis. Escribe oraciones fluidas y correctas adecuadas para lectura por voz.`,
        poi: `Escribe una recomendación entusiasta (máx 80 palabras, en español) para ${itemName}. ${ratingText}Categoría: ${selectedItem.category}. Descripción: ${itemDesc}. IMPORTANTE: NO uses asteriscos ni emojis. Escribe oraciones fluidas y correctas adecuadas para lectura por voz.`
      },
      sv: {
        event: `Skriv en entusiastisk rekommendation (max 80 ord, på svenska) för evenemanget "${itemName}". Det äger rum den ${selectedItem.event_date}. Beskrivning: ${itemDesc}. VIKTIGT: Använd INTE asterisker eller emojis. Skriv flytande, korrekta meningar lämpliga för talsyntes.`,
        poi: `Skriv en entusiastisk rekommendation (max 80 ord, på svenska) för ${itemName}. ${ratingText}Kategori: ${selectedItem.category}. Beskrivning: ${itemDesc}. VIKTIGT: Använd INTE asterisker eller emojis. Skriv flytande, korrekta meningar lämpliga för talsyntes.`
      },
      pl: {
        event: `Napisz entuzjastyczną rekomendację (maks 80 słów, po polsku) dla wydarzenia "${itemName}". Odbywa się ${selectedItem.event_date}. Opis: ${itemDesc}. WAŻNE: NIE używaj gwiazdek ani emoji. Pisz płynne, poprawne zdania odpowiednie do odczytu głosowego.`,
        poi: `Napisz entuzjastyczną rekomendację (maks 80 słów, po polsku) dla ${itemName}. ${ratingText}Kategoria: ${selectedItem.category}. Opis: ${itemDesc}. WAŻNE: NIE używaj gwiazdek ani emoji. Pisz płynne, poprawne zdania odpowiednie do odczytu głosowego.`
      }
    };
    const langPrompts = tipPrompts[language] || tipPrompts.nl;
    const tipPrompt = selectedItem.type === 'event' ? langPrompts.event : langPrompts.poi;

    let tipDescription = await embeddingService.generateChatCompletion([
      { role: 'system', content: embeddingService.buildSystemPrompt(language, {}, destinationConfig) },
      { role: 'user', content: tipPrompt }
    ]);

    // Clean AI text: remove asterisks, quotes, fix spacing around item name
    tipDescription = cleanAIText(tipDescription, [itemName]);

    res.json({
      success: true,
      data: {
        title: tipLabels[language] || tipLabels.nl,
        itemType: selectedItem.type,
        poi: selectedItem.type === 'poi' ? selectedItem : null,
        event: selectedItem.type === 'event' ? selectedItem : null,
        item: selectedItem,
        tipDescription,
        category: selectedInterest,
        date: now.toISOString().split('T')[0],
        tipId: selectedItem.id
      }
    });

  } catch (error) {
    logger.error('HoliBot daily-tip error:', error);
    res.status(500).json({ success: false, error: 'Could not generate daily tip' });
  }
});

/**
 * GET /api/v1/holibot/categories
 * Get all categories with POI counts
 */
router.get('/categories', async (req, res) => {
  try {
    const model = await getPOIModel();

    if (!model) {
      return res.json({
        success: true,
        data: [
          { category: 'Beaches & Nature', count: 15 },
          { category: 'Food & Drinks', count: 42 },
          { category: 'Culture & History', count: 8 },
          { category: 'Active', count: 12 },
          { category: 'Shopping', count: 18 },
          { category: 'Recreation', count: 10 }
        ],
        count: 6
      });
    }

    const { Sequelize } = await import('sequelize');
    const results = await model.findAll({
      attributes: ['category', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      where: { category: { [Sequelize.Op.ne]: null }, is_active: true },
      group: ['category'],
      order: [[Sequelize.literal('count'), 'DESC']]
    });

    const categories = results.map(r => ({ category: r.get('category'), count: parseInt(r.get('count')) }));
    res.json({ success: true, data: categories, count: categories.length });

  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({ success: false, error: 'Could not fetch categories' });
  }
});

/**
 * GET /api/v1/holibot/categories/hierarchy
 * Returns 3-level category hierarchy from POI table
 * Level 1: category, Level 2: subcategory, Level 3: poi_type
 */
router.get('/categories/hierarchy', async (req, res) => {
  try {
    const { mysqlSequelize } = await import('../config/database.js');
    const { QueryTypes } = (await import('sequelize')).default;

    const results = await mysqlSequelize.query(`
      SELECT category, subcategory, poi_type, COUNT(*) as count
      FROM POI WHERE is_active = 1
      GROUP BY category, subcategory, poi_type
      ORDER BY category, subcategory, poi_type
    `, { type: QueryTypes.SELECT });

    const hierarchy = {};
    for (const row of results) {
      const cat = row.category || 'Overig';
      const subcat = row.subcategory || null;
      const poiType = row.poi_type || null;
      const count = parseInt(row.count);

      if (!hierarchy[cat]) {
        hierarchy[cat] = { name: cat, count: 0, subcategories: {} };
      }
      hierarchy[cat].count += count;

      if (subcat) {
        if (!hierarchy[cat].subcategories[subcat]) {
          hierarchy[cat].subcategories[subcat] = { name: subcat, count: 0, types: {} };
        }
        hierarchy[cat].subcategories[subcat].count += count;

        if (poiType) {
          if (!hierarchy[cat].subcategories[subcat].types[poiType]) {
            hierarchy[cat].subcategories[subcat].types[poiType] = { name: poiType, count: 0 };
          }
          hierarchy[cat].subcategories[subcat].types[poiType].count += count;
        }
      }
    }

    const hierarchyArray = Object.values(hierarchy).map(cat => ({
      name: cat.name,
      count: cat.count,
      subcategories: Object.values(cat.subcategories).map(sub => ({
        name: sub.name,
        count: sub.count,
        types: Object.values(sub.types)
      }))
    })).sort((a, b) => b.count - a.count);

    res.json({ success: true, data: hierarchyArray, totalCategories: hierarchyArray.length });

  } catch (error) {
    logger.error('Categories hierarchy error:', error);
    res.status(500).json({ success: false, error: 'Could not fetch category hierarchy' });
  }
});

/**
 * GET /api/v1/holibot/categories/:category/pois
 * Get POIs for a specific category with optional filters
 * Supports pagination via limit and offset
 * Features:
 * - Multi-language support via enriched_tile_description_* fields
 * - Excludes permanently closed POIs (7 days/week "Closed")
 */
router.get('/categories/:category/pois', async (req, res) => {
  try {
    const { category } = req.params;
    const { subcategory, type, limit = 20, offset = 0, language = 'nl' } = req.query;
    const { mysqlSequelize } = await import('../config/database.js');
    const { QueryTypes } = (await import('sequelize')).default;

    let whereClause = 'WHERE is_active = 1 AND category = ?';
    const params = [decodeURIComponent(category)];

    if (subcategory) {
      whereClause += ' AND subcategory = ?';
      params.push(decodeURIComponent(subcategory));
    }
    if (type) {
      whereClause += ' AND poi_type = ?';
      params.push(decodeURIComponent(type));
    }

    // Include translated description fields for multi-language support
    const poiResults = await mysqlSequelize.query(`
      SELECT id, name, description, category, subcategory, poi_type,
             address, latitude, longitude, rating, review_count,
             thumbnail_url, price_level, opening_hours,
             enriched_tile_description,
             enriched_tile_description_nl,
             enriched_tile_description_de,
             enriched_tile_description_es,
             enriched_tile_description_sv,
             enriched_tile_description_pl
      FROM POI ${whereClause}
      ORDER BY rating DESC, review_count DESC
      LIMIT ? OFFSET ?
    `, { replacements: [...params, parseInt(limit), parseInt(offset)], type: QueryTypes.SELECT });

    // Filter out closed POIs and apply translations
    const pois = poiResults.filter(poi => {
      const notPermanentlyClosed = !isPermanentlyClosed(poi.opening_hours);
      if (isPermanentlyClosed(poi.opening_hours)) {
        logger.info('Excluding permanently closed POI from category browser:', { id: poi.id, name: poi.name });
      }
      // CRITICAL: Also filter out currently closed POIs (e.g., closed on Mondays)
      const notCurrentlyClosed = !isCurrentlyClosedFromHours(poi.opening_hours);
      if (isCurrentlyClosedFromHours(poi.opening_hours)) {
        logger.info('Excluding currently closed POI from category browser:', { id: poi.id, name: poi.name });
      }
      return notPermanentlyClosed && notCurrentlyClosed;
    }).map(poi => ({
      ...poi,
      // Use translated description for the current language (shared helper)
      description: getTranslatedDescription(poi, language),
      // POICard expects 'images' array
      images: poi.thumbnail_url ? [poi.thumbnail_url] : []
    }));

    res.json({ success: true, data: pois, count: pois.length, filter: { category, subcategory, type }, offset: parseInt(offset) });

  } catch (error) {
    logger.error('Category POIs error:', error);
    res.status(500).json({ success: false, error: 'Could not fetch POIs for category' });
  }
});

/**
 * POST /api/v1/holibot/admin/sync
 * Legacy sync endpoint (basic POIs only)
 */
router.post('/admin/sync', async (req, res) => {
  try {
    const { type = 'incremental' } = req.body;
    logger.info(`Admin sync requested: ${type}`);
    let result;
    if (type === 'full') {
      result = await syncService.fullSync();
    } else {
      result = await syncService.incrementalSync();
    }
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Admin sync error:', error);
    res.status(500).json({ success: false, error: error.message || 'Sync failed' });
  }
});

/**
 * POST /api/v1/holibot/admin/resync
 * Enhanced sync endpoint with multi-language POIs, Q&A, and reviews
 *
 * Request body options:
 * - languages: string[] (default: all 6 languages)
 * - includeQA: boolean (default: true) - sync Q&A pairs from poi_qa table
 * - includeReviews: boolean (default: true) - include review sentiment in POI context
 * - includeAgenda: boolean (default: true) - sync agenda events
 *
 * This endpoint syncs:
 * - POIs with all enriched multi-language descriptions
 * - Q&A pairs for enhanced knowledge base
 * - Review sentiment for better recommendations
 * - Agenda events for upcoming activities
 */
router.post('/admin/resync', async (req, res) => {
  try {
    const {
      languages = ['en', 'nl', 'de', 'es', 'sv', 'pl'],
      includeQA = true,
      includeReviews = true,
      includeAgenda = true
    } = req.body;

    logger.info('Admin enhanced resync requested', {
      languages,
      includeQA,
      includeReviews,
      includeAgenda
    });

    // Validate languages
    const validLanguages = ['en', 'nl', 'de', 'es', 'sv', 'pl'];
    const filteredLanguages = languages.filter(lang => validLanguages.includes(lang));

    if (filteredLanguages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid languages specified. Valid options: ' + validLanguages.join(', ')
      });
    }

    // Execute enhanced sync
    const result = await syncService.fullSyncEnhanced({
      languages: filteredLanguages,
      includeQA,
      includeReviews,
      includeAgenda
    });

    logger.info('Enhanced resync completed', {
      totalSynced: result.totalSynced,
      totalErrors: result.totalErrors,
      duration: result.duration
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Admin enhanced resync error:', error);

    // Check if sync is already in progress
    if (error.message === 'Sync already in progress') {
      return res.status(409).json({
        success: false,
        error: 'Sync already in progress. Please wait for it to complete.'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Enhanced sync failed'
    });
  }
});

/**
 * POST /api/v1/holibot/admin/sync-single/:poiId
 * Sync a single POI across all languages
 * Useful for immediate updates after POI edits in admin
 */
router.post('/admin/sync-single/:poiId', async (req, res) => {
  try {
    const { poiId } = req.params;
    const { languages = ['en', 'nl', 'de', 'es', 'sv', 'pl'] } = req.body;

    if (!poiId || isNaN(parseInt(poiId))) {
      return res.status(400).json({
        success: false,
        error: 'Valid POI ID is required'
      });
    }

    logger.info('Admin single POI sync requested', { poiId, languages });

    const result = await syncService.syncSinglePOI(parseInt(poiId), languages);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Admin single POI sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Single POI sync failed'
    });
  }
});

/**
 * GET /api/v1/holibot/admin/stats
 */
router.get('/admin/stats', async (req, res) => {
  try {
    const stats = await ragService.getStats();
    const syncStatus = syncService.getStatus();
    res.json({ success: true, data: { ...stats, sync: syncStatus } });
  } catch (error) {
    logger.error('Admin stats error:', error);
    res.status(500).json({ success: false, error: 'Could not fetch stats' });
  }
});

/**
 * GET /api/v1/holibot/session/:sessionId/history
 * Get conversation history for a session
 */
router.get('/session/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50 } = req.query;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Session ID is required' });
    }

    const messages = await conversationService.getSessionHistory(sessionId, parseInt(limit));

    res.json({
      success: true,
      data: {
        sessionId,
        messageCount: messages.length,
        messages
      }
    });
  } catch (error) {
    logger.error('Get session history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/holibot/session/:sessionId/end
 * End a chat session with optional satisfaction rating
 */
router.post('/session/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { satisfaction } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'Session ID is required' });
    }

    // Validate satisfaction rating if provided
    const rating = satisfaction ? parseInt(satisfaction) : null;
    if (rating !== null && (rating < 1 || rating > 5)) {
      return res.status(400).json({ success: false, error: 'Satisfaction must be between 1 and 5' });
    }

    await conversationService.endSession(sessionId, rating);

    res.json({
      success: true,
      message: 'Session ended successfully'
    });
  } catch (error) {
    logger.error('End session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/holibot/poi-click
 * Track when a user clicks on a POI from chat results
 * Also learns user preferences from click behavior
 */
router.post('/poi-click', async (req, res) => {
  try {
    const {
      sessionId,
      messageId,
      poiId,
      poiName,
      poiCategory,
      poiRating,
      poiPriceLevel,
      clickType = 'view_details',
      sourceContext = 'chat'
    } = req.body;

    if (!sessionId || !poiId) {
      return res.status(400).json({ success: false, error: 'Session ID and POI ID are required' });
    }

    const validClickTypes = ['view_details', 'get_directions', 'visit_website', 'call', 'add_to_itinerary'];
    if (!validClickTypes.includes(clickType)) {
      return res.status(400).json({ success: false, error: 'Invalid click type' });
    }

    // Log the click for analytics
    await conversationService.logPoiClick({
      sessionId,
      messageId,
      poiId,
      poiName,
      clickType,
      sourceContext
    });

    // Learn from click behavior (async, non-blocking)
    if (poiCategory) {
      preferenceService.learnFromClick({
        sessionId,
        poiCategory,
        poiRating,
        poiPriceLevel
      }).catch(() => {});
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('POI click tracking error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/holibot/admin/conversation-analytics
 * Comprehensive analytics dashboard data
 */
router.get('/admin/conversation-analytics', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const analytics = await conversationService.getDailyAnalytics(parseInt(days));

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Conversation analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/holibot/preferences
 * Get user preferences for personalization
 */
router.get('/preferences', async (req, res) => {
  try {
    const { sessionId, userId } = req.query;

    if (!sessionId && !userId) {
      return res.status(400).json({ success: false, error: 'Session ID or User ID required' });
    }

    const preferences = await preferenceService.getPreferences({ sessionId, userId });

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    logger.error('Get preferences error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/holibot/preferences
 * Save user preferences
 */
router.post('/preferences', async (req, res) => {
  try {
    const { sessionId, userId, preferences } = req.body;

    if (!sessionId && !userId) {
      return res.status(400).json({ success: false, error: 'Session ID or User ID required' });
    }

    if (!preferences) {
      return res.status(400).json({ success: false, error: 'Preferences object required' });
    }

    const success = await preferenceService.savePreferences({ sessionId, userId }, preferences);

    res.json({
      success,
      message: success ? 'Preferences saved' : 'Failed to save preferences'
    });
  } catch (error) {
    logger.error('Save preferences error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/holibot/poi-rating
 * Rate a POI
 */
router.post('/poi-rating', async (req, res) => {
  try {
    const { sessionId, userId, poiId, rating, feedback, wouldRecommend } = req.body;

    if (!sessionId && !userId) {
      return res.status(400).json({ success: false, error: 'Session ID or User ID required' });
    }

    if (!poiId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'POI ID and rating (1-5) required' });
    }

    const success = await preferenceService.ratePoi({
      sessionId,
      userId,
      poiId,
      rating,
      feedback,
      wouldRecommend
    });

    res.json({
      success,
      message: success ? 'Rating saved' : 'Failed to save rating'
    });
  } catch (error) {
    logger.error('POI rating error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/holibot/recommended-categories
 * Get personalized category recommendations
 */
router.get('/recommended-categories', async (req, res) => {
  try {
    const { sessionId, userId } = req.query;

    const categories = await preferenceService.getRecommendedCategories({ sessionId, userId });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Recommended categories error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/holibot/suggestions
 * Get proactive, context-aware suggestions
 * Returns time-based, seasonal, trending, and personalized suggestions
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { language = 'nl', sessionId, userId } = req.query;

    // Get user preferences if available
    let preferences = null;
    if (sessionId || userId) {
      preferences = await preferenceService.getPreferences({ sessionId, userId });
    }

    const suggestions = await suggestionService.getProactiveSuggestions({
      language,
      sessionId,
      userId,
      preferences
    });

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    logger.error('Suggestions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/holibot/trending
 * Get trending POIs based on recent user activity
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10, days = 7, language = 'nl' } = req.query;

    const trending = await suggestionService.getTrendingPois(
      parseInt(limit),
      parseInt(days)
    );

    res.json({
      success: true,
      data: {
        label: suggestionService.getTrendingLabel(language),
        period: `${days} days`,
        pois: trending
      }
    });
  } catch (error) {
    logger.error('Trending error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/holibot/quick-actions
 * Get context-aware quick action buttons
 */
router.get('/quick-actions', async (req, res) => {
  try {
    const { language = 'nl' } = req.query;

    const timeSuggestions = suggestionService.getTimeSuggestions(language);

    res.json({
      success: true,
      data: {
        period: timeSuggestions.period,
        greeting: timeSuggestions.greeting,
        actions: suggestionService.getQuickActions(timeSuggestions.period, language),
        activities: timeSuggestions.activities
      }
    });
  } catch (error) {
    logger.error('Quick actions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/holibot/admin/fallback-stats
 * View fallback query statistics for quality improvement
 * Returns daily breakdown of fallback types and languages
 */
router.get('/admin/fallback-stats', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const { mysqlSequelize } = await import('../config/database.js');
    const { QueryTypes } = (await import('sequelize')).default;

    // Get daily stats
    const dailyStats = await mysqlSequelize.query(`
      SELECT
        DATE(created_at) as date,
        language,
        fallback_type,
        COUNT(*) as count,
        ROUND(AVG(response_time_ms)) as avg_response_ms,
        SUM(CASE WHEN was_spell_corrected THEN 1 ELSE 0 END) as spell_corrected
      FROM holibot_fallbacks
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at), language, fallback_type
      ORDER BY date DESC, count DESC
    `, { replacements: [parseInt(days)], type: QueryTypes.SELECT });

    // Get top failed queries
    const topQueries = await mysqlSequelize.query(`
      SELECT
        query,
        language,
        COUNT(*) as occurrences,
        MAX(created_at) as last_seen
      FROM holibot_fallbacks
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY query, language
      ORDER BY occurrences DESC
      LIMIT 20
    `, { replacements: [parseInt(days)], type: QueryTypes.SELECT });

    // Get summary
    const [summary] = await mysqlSequelize.query(`
      SELECT
        COUNT(*) as total_fallbacks,
        COUNT(DISTINCT DATE(created_at)) as days_active,
        SUM(CASE WHEN was_spell_corrected THEN 1 ELSE 0 END) as total_spell_corrected
      FROM holibot_fallbacks
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, { replacements: [parseInt(days)], type: QueryTypes.SELECT });

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        summary: summary[0] || { total_fallbacks: 0, days_active: 0, total_spell_corrected: 0 },
        dailyStats,
        topQueries
      }
    });
  } catch (error) {
    // Table might not exist yet
    if (error.message.includes("doesn't exist")) {
      return res.json({
        success: true,
        data: {
          message: 'Fallback logging table not yet created. Run the migration first.',
          dailyStats: [],
          topQueries: []
        }
      });
    }
    logger.error('Fallback stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/holibot/admin/debug/qna
 * Debug endpoint to test QnA table access
 */
router.get('/admin/debug/qna', async (req, res) => {
  try {
    const qaItems = await syncService.getQAForSync(5); // Just get 5 for testing
    res.json({
      success: true,
      count: qaItems.length,
      sample: qaItems.slice(0, 2).map(q => ({
        id: q.id,
        question: q.question?.substring(0, 100),
        language: q.language
      }))
    });
  } catch (error) {
    logger.error('QnA debug error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/holibot/health
 */
router.get('/health', async (req, res) => {
  try {
    const chromaReady = chromaService.isReady();
    const embeddingReady = embeddingService.isReady();
    const ragReady = ragService.isReady();

    res.json({
      success: true,
      status: chromaReady && embeddingReady ? 'healthy' : 'degraded',
      services: {
        chromaDb: chromaReady ? 'connected' : 'disconnected',
        mistral: embeddingReady ? 'configured' : 'not configured',
        rag: ragReady ? 'ready' : 'not ready'
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, status: 'unhealthy', error: error.message });
  }
});

/**
 * POST /api/v1/holibot/tts
 * Google Cloud Text-to-Speech
 * Converts text to speech audio (MP3)
 *
 * Request body:
 * - text: string (required, max 5000 chars)
 * - language: string (optional, default 'nl')
 *
 * Response:
 * - audio: base64 encoded MP3
 * - contentType: 'audio/mp3'
 */
router.post('/tts', async (req, res) => {
  try {
    const { text, language = 'nl' } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Text too long (max 5000 characters)'
      });
    }

    logger.info('TTS request', { language, textLength: text.length });

    const result = await ttsService.synthesize(text, language);

    if (!result.success) {
      return res.status(503).json({
        success: false,
        error: result.error || 'TTS service unavailable'
      });
    }

    res.json({
      success: true,
      data: {
        audio: result.audio,
        contentType: result.contentType,
        cached: result.cached || false
      }
    });

  } catch (error) {
    logger.error('TTS error:', error);
    res.status(500).json({
      success: false,
      error: 'Text-to-speech conversion failed'
    });
  }
});

/**
 * GET /api/v1/holibot/tts/status
 * Check TTS service availability
 */
router.get('/tts/status', async (req, res) => {
  try {
    const status = ttsService.checkAvailability();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


export default router;
