/**
 * Booking Parser — Fase III Blok D
 *
 * Natural language parsing helpers for the conversational booking flow.
 * Parses dates, times, numbers, confirmations, and order numbers from user messages.
 *
 * Design principle: when in doubt, return { valid: false } and ask again.
 * "It's better to ask once more than to make a wrong booking."
 */

import logger from '../../utils/logger.js';

/**
 * Parse a date from a natural language message.
 * Recognizes: "morgen", "overmorgen", "15 maart", "2026-03-15", "tomorrow", etc.
 * @param {string} message
 * @param {string} language
 * @returns {{ valid: boolean, value?: string, error?: string }} ISO date string (YYYY-MM-DD)
 */
export function parseDate(message, language) {
  const normalized = message.toLowerCase().trim();
  const today = new Date();

  // ISO format: 2026-03-15
  const isoMatch = normalized.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return { valid: true, value: isoMatch[1] };
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const euMatch = normalized.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (euMatch) {
    const d = euMatch[1].padStart(2, '0');
    const m = euMatch[2].padStart(2, '0');
    return { valid: true, value: `${euMatch[3]}-${m}-${d}` };
  }

  // Relative dates
  const relativeMap = {
    nl: { vandaag: 0, morgen: 1, overmorgen: 2 },
    en: { today: 0, tomorrow: 1 },
    de: { heute: 0, morgen: 1, übermorgen: 2, ubermorgen: 2 },
    es: { hoy: 0, mañana: 1, manana: 1 },
    fr: { "aujourd'hui": 0, aujourdhui: 0, demain: 1, "après-demain": 2 }
  };

  const langRelatives = relativeMap[language] || relativeMap.en;
  for (const [word, offset] of Object.entries(langRelatives)) {
    if (normalized.includes(word)) {
      const target = new Date(today);
      target.setDate(target.getDate() + offset);
      return { valid: true, value: formatDateISO(target) };
    }
  }

  // Month names: "15 maart", "march 15", "15. März"
  const monthNames = {
    nl: { januari: 1, februari: 2, maart: 3, april: 4, mei: 5, juni: 6, juli: 7, augustus: 8, september: 9, oktober: 10, november: 11, december: 12 },
    en: { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 },
    de: { januar: 1, februar: 2, märz: 3, marz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12 },
    es: { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 },
    fr: { janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, août: 8, aout: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12, decembre: 12 }
  };

  const langMonths = { ...monthNames.en, ...(monthNames[language] || {}) };
  for (const [monthName, monthNum] of Object.entries(langMonths)) {
    const regex = new RegExp(`(\\d{1,2})\\s*\\.?\\s*${monthName}`);
    const match = normalized.match(regex);
    if (match) {
      const day = parseInt(match[1]);
      const year = today.getFullYear();
      const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { valid: true, value: dateStr };
    }
    // Also check "march 15" format
    const regex2 = new RegExp(`${monthName}\\s+(\\d{1,2})`);
    const match2 = normalized.match(regex2);
    if (match2) {
      const day = parseInt(match2[1]);
      const year = today.getFullYear();
      const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { valid: true, value: dateStr };
    }
  }

  // Just a number (1-31): assume day of current/next month
  const dayOnly = normalized.match(/^(\d{1,2})$/);
  if (dayOnly) {
    const day = parseInt(dayOnly[1]);
    if (day >= 1 && day <= 31) {
      let month = today.getMonth();
      let year = today.getFullYear();
      if (day <= today.getDate()) {
        month++; // next month
        if (month > 11) { month = 0; year++; }
      }
      return { valid: true, value: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
    }
  }

  return { valid: false, error: 'unrecognized_date' };
}

/**
 * Parse a time from a natural language message.
 * Recognizes: "18:00", "6 PM", "half zeven", "zes uur", "18h", etc.
 * @param {string} message
 * @param {string} language
 * @returns {{ valid: boolean, value?: string, error?: string }} Time string (HH:MM)
 */
export function parseTime(message, language) {
  const normalized = message.toLowerCase().trim();

  // HH:MM format
  const timeMatch = normalized.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const h = parseInt(timeMatch[1]);
    const m = parseInt(timeMatch[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return { valid: true, value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
    }
  }

  // "18h" or "18h30"
  const hMatch = normalized.match(/(\d{1,2})h(\d{2})?/);
  if (hMatch) {
    const h = parseInt(hMatch[1]);
    const m = hMatch[2] ? parseInt(hMatch[2]) : 0;
    if (h >= 0 && h <= 23) {
      return { valid: true, value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
    }
  }

  // "6 PM" / "6 AM"
  const ampmMatch = normalized.match(/(\d{1,2})\s*(am|pm)/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1]);
    if (ampmMatch[2] === 'pm' && h < 12) h += 12;
    if (ampmMatch[2] === 'am' && h === 12) h = 0;
    return { valid: true, value: `${String(h).padStart(2, '0')}:00` };
  }

  // Dutch: "half zeven" = 6:30, "zes uur" = 6:00
  const dutchNumbers = {
    een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6,
    zeven: 7, acht: 8, negen: 9, tien: 10, elf: 11, twaalf: 12
  };
  const halfMatch = normalized.match(/half\s+(\w+)/);
  if (halfMatch && dutchNumbers[halfMatch[1]]) {
    const h = dutchNumbers[halfMatch[1]] - 1; // "half zeven" = 6:30
    const adjustedH = h < 6 ? h + 12 : h; // Assume afternoon/evening for dining
    return { valid: true, value: `${String(adjustedH).padStart(2, '0')}:30` };
  }
  const uurMatch = normalized.match(/(\w+)\s+uur/);
  if (uurMatch && dutchNumbers[uurMatch[1]]) {
    const h = dutchNumbers[uurMatch[1]];
    const adjustedH = h < 6 ? h + 12 : h;
    return { valid: true, value: `${String(adjustedH).padStart(2, '0')}:00` };
  }

  // Just a number (likely hour): "18", "19"
  const hourOnly = normalized.match(/^(\d{1,2})$/);
  if (hourOnly) {
    const h = parseInt(hourOnly[1]);
    if (h >= 0 && h <= 23) {
      return { valid: true, value: `${String(h).padStart(2, '0')}:00` };
    }
  }

  return { valid: false, error: 'unrecognized_time' };
}

/**
 * Parse a number (party size, quantity) from a natural language message.
 * Recognizes: "2", "twee", "two", "zwei", "3 personen", "voor 4", etc.
 * @param {string} message
 * @param {string} language
 * @returns {{ valid: boolean, value?: number, error?: string }}
 */
export function parseNumber(message, language) {
  const normalized = message.toLowerCase().trim();

  // Numeric
  const numMatch = normalized.match(/(\d+)/);
  if (numMatch) {
    const n = parseInt(numMatch[1]);
    if (n >= 1 && n <= 99) {
      return { valid: true, value: n };
    }
  }

  // Word numbers per language
  const wordNumbers = {
    nl: { een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10 },
    en: { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 },
    de: { eins: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, funf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10 },
    es: { uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 },
    fr: { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10 }
  };

  const langWords = wordNumbers[language] || wordNumbers.en;
  for (const [word, num] of Object.entries(langWords)) {
    if (normalized.includes(word)) {
      return { valid: true, value: num };
    }
  }

  return { valid: false, error: 'unrecognized_number' };
}

/**
 * Parse a yes/no confirmation from a natural language message.
 * @param {string} message
 * @param {string} language
 * @returns {{ valid: boolean, value?: boolean, error?: string }}
 */
export function parseConfirmation(message, language) {
  const normalized = message.toLowerCase().trim();

  const yesWords = {
    nl: ['ja', 'jep', 'klopt', 'correct', 'dat klopt', 'prima', 'goed', 'oke', 'ok', 'top', 'akkoord'],
    en: ['yes', 'yeah', 'yep', 'correct', 'that\'s right', 'ok', 'okay', 'sure', 'confirm', 'right'],
    de: ['ja', 'stimmt', 'korrekt', 'richtig', 'ok', 'okay', 'gut', 'einverstanden'],
    es: ['sí', 'si', 'correcto', 'ok', 'vale', 'bueno', 'de acuerdo', 'perfecto'],
    fr: ['oui', 'correct', 'ok', 'bien', 'd\'accord', 'parfait']
  };

  const noWords = {
    nl: ['nee', 'niet', 'fout', 'verkeerd', 'neen', 'niet helemaal'],
    en: ['no', 'nope', 'wrong', 'incorrect', 'not right', 'cancel'],
    de: ['nein', 'falsch', 'nicht richtig', 'inkorrekt'],
    es: ['no', 'incorrecto', 'mal', 'cancelar'],
    fr: ['non', 'faux', 'incorrect', 'annuler']
  };

  const langYes = yesWords[language] || yesWords.en;
  const langNo = noWords[language] || noWords.en;

  for (const word of langYes) {
    if (normalized.includes(word)) return { valid: true, value: true };
  }
  for (const word of langNo) {
    if (normalized.includes(word)) return { valid: true, value: false };
  }

  return { valid: false, error: 'ambiguous' };
}

/**
 * Parse an order/reservation number from a message.
 * Regex: HB-T-YYMMDD-XXXX (ticket) or HB-R-YYMMDD-XXXX (reservation)
 * @param {string} message
 * @returns {{ valid: boolean, value?: string, type?: string, error?: string }}
 */
export function parseOrderNumber(message) {
  const match = message.match(/HB-([TR])-(\d{6})-(\d{4})/i);
  if (match) {
    const type = match[1].toUpperCase() === 'T' ? 'ticket' : 'reservation';
    return { valid: true, value: match[0].toUpperCase(), type };
  }
  return { valid: false, error: 'no_order_number' };
}

/**
 * Parse booking input based on the current step.
 * Routes to the appropriate parser function.
 * @param {string} message
 * @param {string} step - Current booking step
 * @param {string} language
 * @returns {{ valid: boolean, value?: *, error?: string }}
 */
export function parseBookingInput(message, step, language) {
  switch (step) {
    case 'date_select':
      return parseDate(message, language);
    case 'time_select':
      return parseTime(message, language);
    case 'party_size':
    case 'quantity':
      return parseNumber(message, language);
    case 'tier_select':
      // Tier selection is typically a number (1, 2, 3) or name
      return parseNumber(message, language);
    case 'confirm':
      return parseConfirmation(message, language);
    case 'details':
      // Special requests: any non-empty string is valid; "nee"/"no" means no requests
      return parseSpecialRequests(message, language);
    case 'lookup':
      return parseOrderNumber(message);
    case 'poi_select':
      // POI selection is handled separately by extractPoiFromMessage
      return { valid: true, value: message };
    default:
      return { valid: false, error: 'unknown_step' };
  }
}

/**
 * Parse special requests (reservation details step).
 * @param {string} message
 * @param {string} language
 * @returns {{ valid: boolean, value: string }}
 */
function parseSpecialRequests(message, language) {
  const normalized = message.toLowerCase().trim();
  const noWords = {
    nl: ['nee', 'neen', 'geen', 'niet', 'niks', 'niets'],
    en: ['no', 'none', 'nothing', 'nope'],
    de: ['nein', 'keine', 'nichts'],
    es: ['no', 'ninguno', 'nada'],
    fr: ['non', 'aucun', 'rien']
  };

  const langNo = noWords[language] || noWords.en;
  for (const word of langNo) {
    if (normalized === word || normalized.startsWith(word + ' ')) {
      return { valid: true, value: '' }; // No special requests
    }
  }

  return { valid: true, value: message.trim() };
}

// Helper: format Date to ISO string (YYYY-MM-DD)
function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
