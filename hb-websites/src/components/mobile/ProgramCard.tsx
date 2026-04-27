'use client';

import { useState, useEffect, useRef } from 'react';
import { getPortalUrl, getDestinationSlug } from '@/lib/portal-url';
import { analytics, trackSectionViewed } from '@/lib/analytics';

interface ProgramItem {
  id: number;
  type: 'poi' | 'event';
  name: string;
  image?: string;
  timeStart: string;
  timeEnd: string;
}

interface ProgramCardProps {
  locale: string;
  programSize?: number;
  /** When true, skip the md:hidden wrapper (used by desktop_program_tip block) */
  forceShow?: boolean;
}

const LABELS: Record<string, Record<string, string>> = {
  title:   { nl: 'JOUW PROGRAMMA', en: 'YOUR PROGRAM', de: 'DEIN PROGRAMM', es: 'TU PROGRAMA' },
  details: { nl: 'Details', en: 'Details', de: 'Details', es: 'Detalles' },
  cta:     { nl: 'Zelf programma samenstellen', en: 'Build your own program', de: 'Eigenes Programm erstellen', es: 'Crea tu propio programa' },
};

type DayPart = 'morning' | 'afternoon' | 'evening';

function getDayPart(): DayPart {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/* ─────────────────────────────────────────────
 * DESTINATION-SPECIFIC DAYPART CONFIGURATION
 * ───────────────────────────────────────────── */

interface DayPartRule {
  /** API categories to fetch */
  categories: string;
  /** Allowed subcategory keywords (if set, ONLY these subcats pass) */
  allowedSubcats?: string[];
  /** Excluded subcategory/name keywords */
  excludeSubcats?: string[];
  /** Excluded specific POI names */
  excludeNames?: string[];
  /** Max food/drink POIs in this daypart */
  maxFood: number;
  /** Minimum Google rating for this daypart (default 4.2) */
  minRating?: number;
  /** Minimum review count for this daypart (default 3) */
  minReviews?: number;
  /** For evening: minimum rating for fine-dine priority selection */
  fineDineMinRating?: number;
}

interface DestinationConfig {
  rules: Record<DayPart, DayPartRule>;
  /** Highlight POI names — 1 is always included in morning/afternoon (not evening) */
  highlights: string[];
}

/*
 * CALPE — Exact subcategory whitelist per dagdeel
 * DB subcategories: Active(Cycling,Golf,Hiking,Sports & Fitness,Water Sports),
 * Beaches & Nature(Beaches,Parks & Gardens,Viewpoints & Nature),
 * Shopping(Home & Lifestyle,Markets,Specialty Stores,Supermarkets & Food),
 * Culture & History(Arts & Museums,Historical Sites,Religious Buildings,Squares & Public Spaces),
 * Recreation(Entertainment,Playgrounds & Leisure Areas,RV Parks & Camping,Theaters),
 * Food & Drinks(Bar Restaurants,Bars,Breakfast & Coffee,Fastfood,Restaurants)
 */
const CALPE_CONFIG: DestinationConfig = {
  highlights: [
    'Penyal d\'Ifac Natural Park', 'Peñón de Ifach', 'Penyal d\'Ifac',
    'Old Town', 'Casco Antiguo',
    'Mirador Morro de Toix',
    'Mirador Paseo Maritimo', 'Mirador del Paseo Marítimo',
    'Parc Natural de la Serra Gelada', 'Serra Gelada',
    'Spanish Flag Steps', 'Escaleras de la Bandera',
    'Platja de la Fossa', 'Playa de la Fossa',
    'Far de l\'Albir', 'Faro del Albir',
    'Cala el Racó', 'Cala del Racó',
  ],
  rules: {
    morning: {
      categories: 'Active,Beaches & Nature,Shopping,Culture & History,Recreation,Food & Drinks',
      // STRICT whitelist: only these subcategories allowed
      allowedSubcats: [
        // Active (NOT Sports & Fitness)
        'cycling', 'golf', 'hiking', 'water sports',
        // Beaches & Nature (all)
        'beaches', 'parks & gardens', 'viewpoints & nature',
        // Shopping (Fashion & Clothing, Home & Lifestyle, Markets — NOT Specialty Stores, NOT Supermarkets)
        'fashion', 'clothing', 'home & lifestyle', 'markets',
        // Culture & History (all)
        'arts & museums', 'historical sites', 'religious buildings', 'squares & public spaces',
        // Recreation (Entertainment, Playgrounds & Leisure Areas — NOT RV Parks)
        'entertainment', 'playgrounds & leisure areas',
        // Food & Drinks (Breakfast & Coffee ONLY for morning)
        'breakfast & coffee',
      ],
      excludeSubcats: [],
      excludeNames: ['Zeeman Calpe', 'Zeeman'],
      maxFood: 1,
    },
    afternoon: {
      categories: 'Active,Beaches & Nature,Shopping,Culture & History,Recreation,Food & Drinks',
      allowedSubcats: [
        // Active (NOT Sports & Fitness)
        'cycling', 'golf', 'hiking', 'water sports',
        // Beaches & Nature (all)
        'beaches', 'parks & gardens', 'viewpoints & nature',
        // Shopping (Fashion & Clothing, Home & Lifestyle, Markets)
        'fashion', 'clothing', 'home & lifestyle', 'markets',
        // Culture & History (all)
        'arts & museums', 'historical sites', 'religious buildings', 'squares & public spaces',
        // Recreation (Entertainment, Playgrounds & Leisure Areas)
        'entertainment', 'playgrounds & leisure areas',
        // Food & Drinks (NOT Breakfast, NOT Restaurants — only light: Bars for afternoon drink)
        'bars',
      ],
      excludeSubcats: [],
      excludeNames: ['Zeeman Calpe', 'Zeeman'],
      maxFood: 1,
    },
    evening: {
      categories: 'Culture & History,Recreation,Food & Drinks',
      allowedSubcats: [
        // Culture & History (ONLY Squares & Public Spaces)
        'squares & public spaces',
        // Recreation (Theaters, Entertainment)
        'theaters', 'entertainment',
        // Food & Drinks (Restaurant, Bar Restaurants, Bars — NOT Fastfood, NOT Breakfast)
        'restaurants', 'bar restaurants', 'bars',
      ],
      excludeSubcats: ['fastfood', 'breakfast'],
      excludeNames: [],
      maxFood: 1,
      minRating: 4.3,
      minReviews: 5,
      fineDineMinRating: 4.5,
    },
  },
};

/*
 * TEXEL — Exact subcategory whitelist per dagdeel
 * DB subcategories: Actief(Excursies,Golfbaan,Paarden,Rondvaarten,Wandelroutes,Watersporten,Zwemmen),
 * Natuur(Landmarks,Natuurboerderij,Natuurgebieden,Stranden,Uitkijkpunten),
 * Winkelen(Doe-het-zelf,Huisdieren,Huishoudelijk,Mode & Lifestyle,Speciaalzaken,Supermarkten),
 * Cultuur & Historie(Landmarks,Monuments,Musea,Religieuze gebouwen,Sociaal-culturele centra,Texels Schaap,Uitkijkpunten),
 * Eten & Drinken(Cafe,Cocktail Bar,Eetcafe,Foodtrucks,Ijs & Desserts,Ontbijt & Lunch,Restaurants,Speciaalzaken,Specialties,Strandkiosk,Strandpaviljoens,Wijndomein),
 * Recreatief(Indoor)
 */
const TEXEL_CONFIG: DestinationConfig = {
  highlights: [
    'Vuurtoren Texel', 'Lighthouse Texel', 'Vuurtoren',
    'Ecomare', 'De Slufter', 'Kaap Skil',
    'Strandpaviljoen Paal 17', 'Paal 9',
    'De Cocksdorp', 'Oudeschild',
  ],
  rules: {
    morning: {
      categories: 'Actief,Natuur,Winkelen,Cultuur & Historie,Recreatief,Eten & Drinken',
      allowedSubcats: [
        // Actief (NOT Fitness)
        'excursies', 'golfbaan', 'paarden', 'rondvaarten', 'wandelroutes', 'watersporten', 'zwemmen',
        // Natuur (all)
        'landmarks', 'natuurboerderij', 'natuurgebieden', 'stranden', 'uitkijkpunten',
        // Winkelen (Mode & Lifestyle ONLY — NOT Doe-het-zelf, Huisdieren, Supermarkten, Speciaalzaken)
        'mode & lifestyle',
        // Cultuur & Historie (all)
        'monumenten', 'musea', 'religieuze gebouwen', 'sociaal-culturele centra', 'texels schaap',
        'galerie', 'atelier', 'kunst',
        // Recreatief
        'indoor',
        // Eten & Drinken (Strandpaviljoens, Ontbijt & Lunch ONLY)
        'strandpaviljoens', 'ontbijt & lunch',
      ],
      excludeSubcats: [],
      excludeNames: [],
      maxFood: 1,
      minRating: 4.0,
      minReviews: 3,
    },
    afternoon: {
      categories: 'Actief,Natuur,Winkelen,Cultuur & Historie,Recreatief,Eten & Drinken',
      allowedSubcats: [
        // Actief (NOT Fitness)
        'excursies', 'golfbaan', 'paarden', 'rondvaarten', 'wandelroutes', 'watersporten', 'zwemmen',
        // Natuur (all)
        'landmarks', 'natuurboerderij', 'natuurgebieden', 'stranden', 'uitkijkpunten',
        // Winkelen (Mode & Lifestyle)
        'mode & lifestyle',
        // Cultuur & Historie (all)
        'monumenten', 'musea', 'religieuze gebouwen', 'sociaal-culturele centra', 'texels schaap',
        'galerie', 'atelier', 'kunst',
        // Recreatief
        'indoor',
        // Eten & Drinken (Strandpaviljoens, Specialties, Ijs & Desserts, Wijndomein)
        'strandpaviljoens', 'specialties', 'ijs & desserts', 'wijndomein',
      ],
      excludeSubcats: [],
      excludeNames: [],
      maxFood: 1,
      minRating: 4.0,
      minReviews: 3,
    },
    evening: {
      categories: 'Eten & Drinken',
      allowedSubcats: [
        // ONLY these Eten & Drinken subcats
        'strandpaviljoens', 'restaurants', 'cafe', 'eetcafe', 'cocktail bar',
      ],
      excludeSubcats: ['fastfood', 'cafetaria', 'foodtrucks', 'ontbijt', 'ijs', 'speciaalzaken', 'strandkiosk'],
      excludeNames: [],
      maxFood: 1,
      minRating: 4.3,
      minReviews: 5,
      fineDineMinRating: 4.5,
    },
  },
};

function getDestinationConfig(): DestinationConfig {
  const slug = getDestinationSlug();
  if (slug === 'texel') return TEXEL_CONFIG;
  // Future destinations: add config here
  return CALPE_CONFIG;
}

/* ─────────────────────────────────────────────
 * EVENT FILTERING — Time-of-day & Tourist relevance
 * ───────────────────────────────────────────── */

/** Keywords in event titles that indicate non-tourist / local-only events */
const NON_TOURIST_EVENT_KEYWORDS = [
  // NL
  'forum', 'vergadering', 'ledenvergadering', 'gemeenteraad', 'bestuursvergadering',
  'raadszitting', 'bijeenkomst', 'overleg', 'commissie', 'werkgroep', 'jaarvergadering',
  'informatiebijeenkomst', 'spreekuur', 'inspraak',
  // ES
  'junta', 'asamblea', 'reunión', 'congreso', 'pleno', 'sesión plenaria',
  'comisión', 'ayuntamiento',
  // EN
  'meeting', 'council', 'assembly', 'committee', 'board meeting', 'town hall',
  // DE
  'sitzung', 'versammlung', 'gemeinderatssitzung', 'besprechung', 'ausschuss',
];

const DAY_PART_HOUR_RANGES: Record<DayPart, { min: number; max: number }> = {
  morning:   { min: 6, max: 12 },
  afternoon: { min: 12, max: 17 },
  evening:   { min: 17, max: 24 },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isEventSuitableForDayPart(event: any, dayPart: DayPart): boolean {
  const title = getLocalizedString(event.title, 'en').toLowerCase()
    + ' ' + getLocalizedString(event.title, 'nl').toLowerCase()
    + ' ' + getLocalizedString(event.title, 'es').toLowerCase();

  // 1. Exclude non-tourist events
  if (NON_TOURIST_EVENT_KEYWORDS.some(kw => title.includes(kw))) return false;

  // 2. All-day events → OK for morning/afternoon, NOT for evening
  if (event.allDay) return dayPart !== 'evening';

  // 3. Filter by start hour
  const startDate = event.startDate;
  if (!startDate) return dayPart !== 'evening'; // no time info = treat as all-day

  const hour = new Date(startDate).getHours();

  // Hour 0 without explicit allDay flag = likely all-day event
  if (hour === 0) return dayPart !== 'evening';

  const range = DAY_PART_HOUR_RANGES[dayPart];
  return hour >= range.min && hour < range.max;
}

const MIN_PROGRAM_ITEMS = 3;

/* ─────────────────────────────────────────────
 * FILTERING & SELECTION LOGIC
 * ───────────────────────────────────────────── */

const CLOSED_KEYWORDS = [
  'permanently closed', 'permanent gesloten', 'dauerhaft geschlossen',
  'temporarily closed', 'tijdelijk gesloten', 'vorübergehend geschlossen',
  'gesloten', 'geschlossen', 'cerrado',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any

/**
 * Check if POI is closed on a specific day of the week.
 * Handles both ARRAY format [{day:"Friday", hours:"Closed"}]
 * and OBJECT format {friday: "Closed"} / {friday: [{open:"10:00",close:"23:00"}]}
 */
function isClosedOnDay(openingHours: unknown, dayIndex: number): boolean {
  if (!openingHours) return false;
  try {
    const hours = typeof openingHours === 'string' ? JSON.parse(openingHours) : openingHours;
    if (!hours || typeof hours !== 'object') return false;

    const dayNamesEn = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayNamesEnCap = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayNamesNl = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'];
    const dayEn = dayNamesEn[dayIndex];
    const dayEnCap = dayNamesEnCap[dayIndex];
    const dayNl = dayNamesNl[dayIndex];

    // ARRAY format: [{day: "Friday", hours: "Closed"}, ...]
    if (Array.isArray(hours)) {
      const entry = hours.find((h: any) => {
        const d = (h.day || '').toLowerCase();
        return d === dayEn || d === dayNl;
      });
      if (!entry) return false;
      const h = (entry.hours || '').toLowerCase().trim();
      return h === 'closed' || h === 'gesloten' || h === '';
    }

    // OBJECT format: {friday: "Closed"} or {friday: [{open,close}]}
    const dayData = hours[dayEn] || hours[dayEnCap] || hours[dayNl];
    if (dayData === undefined) return false;
    if (!dayData) return true;
    if (Array.isArray(dayData) && dayData.length === 0) return true;
    if (typeof dayData === 'string') {
      const s = dayData.toLowerCase().trim();
      return s === 'closed' || s === 'gesloten' || s === '';
    }
    return false;
  } catch { return false; }
}

/**
 * Check if POI is closed at a specific hour on a specific day.
 * Returns true if the POI closes before the given hour.
 */
function isClosedAtHour(openingHours: unknown, dayIndex: number, hour: number): boolean {
  if (!openingHours) return false;
  if (isClosedOnDay(openingHours, dayIndex)) return true;
  try {
    const hours = typeof openingHours === 'string' ? JSON.parse(openingHours) : openingHours;
    if (!hours || typeof hours !== 'object') return false;

    const dayNamesEn = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayNamesEnCap = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayNamesNl = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'];
    const dayEn = dayNamesEn[dayIndex];
    const dayEnCap = dayNamesEnCap[dayIndex];
    const dayNl = dayNamesNl[dayIndex];

    // ARRAY format
    if (Array.isArray(hours)) {
      const entry = hours.find((h: any) => {
        const d = (h.day || '').toLowerCase();
        return d === dayEn || d === dayNl;
      });
      if (!entry) return false;
      const hoursStr = (entry.hours || '').trim();
      // Parse closing time from formats like "9 AM - 7 PM", "09:00 - 19:00", "8:30 AM to 4 PM"
      const match = hoursStr.match(/(\d{1,2}):?(\d{2})?\s*(?:AM|PM)?\s*(?:to|–|-|,)\s*(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
      if (match) {
        let closeH = parseInt(match[3]);
        if (match[5]?.toUpperCase() === 'PM' && closeH < 12) closeH += 12;
        if (match[5]?.toUpperCase() === 'AM' && closeH === 12) closeH = 0;
        return hour >= closeH;
      }
      return false;
    }

    // OBJECT format
    const dayData = hours[dayEn] || hours[dayEnCap] || hours[dayNl];
    if (!dayData) return false;
    if (Array.isArray(dayData) && dayData.length > 0) {
      // Get the latest closing time
      let latestClose = 0;
      for (const slot of dayData) {
        if (slot.close) {
          const [ch] = slot.close.split(':').map(Number);
          if (ch > latestClose) latestClose = ch;
        }
      }
      if (latestClose > 0) return hour >= latestClose;
    }
    if (typeof dayData === 'string') {
      const match = dayData.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
      if (match) {
        const closeH = parseInt(match[3]);
        return hour >= closeH;
      }
    }
    return false;
  } catch { return false; }
}

function isPOISuitable(poi: any, rule: DayPartRule): boolean {
  // Closed check — robust: handles 0, false, null
  if (poi.is_active === false || poi.is_active === 0) return false;
  if (poi.status === 'closed' || poi.status === 'inactive') return false;
  const fullText = `${poi.name || ''} ${poi.description || ''}`.toLowerCase();
  if (CLOSED_KEYWORDS.some(kw => fullText.includes(kw))) return false;

  // Opening hours check: skip POIs closed today or closed at program time
  const now = new Date();
  const dayIndex = now.getDay();
  if (isClosedOnDay(poi.opening_hours, dayIndex)) return false;

  const subText = `${poi.subcategory || ''}`.toLowerCase();
  const nameText = `${poi.name || ''}`;

  // Excluded names
  if (rule.excludeNames?.some(n => nameText.includes(n))) return false;

  // Excluded subcategories
  if (rule.excludeSubcats?.some(kw => subText.includes(kw) || nameText.toLowerCase().includes(kw))) return false;

  // If allowedSubcats is set, ONLY those pass
  if (rule.allowedSubcats && rule.allowedSubcats.length > 0) {
    const match = rule.allowedSubcats.some(kw => subText.includes(kw) || nameText.toLowerCase().includes(kw));
    if (!match) return false;
  }

  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isHighlight(poi: any, highlights: string[]): boolean {
  const name = (poi.name || '').toLowerCase();
  return highlights.some(h => name.includes(h.toLowerCase()));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isFood(p: any): boolean {
  const cat = (p.category || '').toLowerCase();
  return cat.includes('food') || cat.includes('eten') || cat.includes('drinken') || cat.includes('drinks');
}

/**
 * Select diverse POIs:
 * - Max 1 per subcategory
 * - Max N food POIs (configurable per daypart)
 * - Max 1 per main category for variety
 * - For morning/afternoon: 1 highlight POI guaranteed
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isShopping(p: { category?: string }): boolean {
  const cat = (p.category || '').toLowerCase();
  return cat.includes('winkelen') || cat.includes('shopping');
}

function selectDiversePOIs(pois: any[], count: number, dayPart: DayPart, config: DestinationConfig): any[] {
  const rule = config.rules[dayPart];
  const selected: any[] = [];
  const usedSubcategories = new Set<string>();
  const usedCategories = new Set<string>();
  const categoryCount: Record<string, number> = {};
  let foodCount = 0;

  // For morning/afternoon: find and insert 1 highlight first
  if (dayPart !== 'evening') {
    const highlight = pois.find(p => isHighlight(p, config.highlights));
    if (highlight) {
      selected.push(highlight);
      const hCat = (highlight.category || '').toLowerCase();
      usedSubcategories.add((highlight.subcategory || '').toLowerCase());
      usedCategories.add(hCat);
      categoryCount[hCat] = (categoryCount[hCat] || 0) + 1;
      if (isFood(highlight)) foodCount++;
    }
  }

  // Fill remaining slots with diverse selection
  for (const poi of pois) {
    if (selected.length >= count) break;
    if (selected.some(s => s.id === poi.id)) continue;

    const subcat = (poi.subcategory || poi.category || 'other').toLowerCase();
    const mainCat = (poi.category || 'other').toLowerCase();

    // Max 1 per subcategory
    if (usedSubcategories.has(subcat)) continue;

    // Enforce category diversity — Shopping/Winkelen: max 2, others: max 1
    const maxPerCat = isShopping(poi) ? 2 : 1;
    if ((categoryCount[mainCat] || 0) >= maxPerCat) continue;

    // Max food POIs per rule
    if (isFood(poi) && foodCount >= rule.maxFood) continue;

    selected.push(poi);
    usedSubcategories.add(subcat);
    usedCategories.add(mainCat);
    categoryCount[mainCat] = (categoryCount[mainCat] || 0) + 1;
    if (isFood(poi)) foodCount++;
  }

  // If we still need more (relaxed rules), fill without category uniqueness
  if (selected.length < count) {
    for (const poi of pois) {
      if (selected.length >= count) break;
      if (selected.some(s => s.id === poi.id)) continue;
      const subcat = (poi.subcategory || '').toLowerCase();
      if (usedSubcategories.has(subcat)) continue;
      if (isFood(poi) && foodCount >= rule.maxFood) continue;
      selected.push(poi);
      usedSubcategories.add(subcat);
      if (isFood(poi)) foodCount++;
    }
  }

  return selected;
}

/* ─────────────────────────────────────────────
 * TIME SLOTS & SHUFFLE
 * ───────────────────────────────────────────── */

const DAY_PART_CONFIG: Record<DayPart, { startHour: number }> = {
  morning:   { startHour: 9 },
  afternoon: { startHour: 13 },
  evening:   { startHour: 18 },
};

const DAY_PART_LABELS: Record<DayPart, Record<string, string>> = {
  morning:   { nl: 'OCHTENDPROGRAMMA', en: 'MORNING PROGRAM', de: 'MORGENPROGRAMM', es: 'PROGRAMA DE MAÑANA' },
  afternoon: { nl: 'MIDDAGPROGRAMMA', en: 'AFTERNOON PROGRAM', de: 'NACHMITTAGSPROGRAMM', es: 'PROGRAMA DE TARDE' },
  evening:   { nl: 'AVONDPROGRAMMA', en: 'EVENING PROGRAM', de: 'ABENDPROGRAMM', es: 'PROGRAMA DE NOCHE' },
};

/** Duration per category (hours) */
const CATEGORY_DURATION: Record<string, number> = {
  // Eten & Drinken subcategories
  'breakfast & coffee': 1, 'ontbijt & lunch': 1, 'ontbijt': 1, 'breakfast': 1,
  'restaurants': 1.5, 'bar restaurants': 1.5, 'eetcafe': 1.5, 'strandpaviljoens': 1.5,
  'lunch': 1.5, 'diner': 1.5, 'dinner': 1.5,
  'bars': 1, 'cafe': 1, 'cocktail bar': 1, 'ijs & desserts': 0.5,
  // Winkelen
  'winkelen': 0.5, 'shopping': 0.5, 'mode & lifestyle': 0.5, 'markets': 0.5,
  'speciaalzaken': 0.5, 'supermarkten': 0.5,
  // Actief / Sport
  'cycling': 1.5, 'fietsen': 1.5, 'hiking': 1.5, 'wandelroutes': 1.5,
  'water sports': 1.5, 'watersporten': 1.5, 'golf': 1.5, 'golfbaan': 1.5,
  'excursies': 1.5, 'rondvaarten': 1.5, 'zwemmen': 1.5, 'paarden': 1.5,
  // Cultuur
  'arts & museums': 1.5, 'musea': 1.5, 'historical sites': 1.5, 'monuments': 1.5,
  // Natuur
  'beaches': 1.5, 'stranden': 1.5, 'parks & gardens': 1.5, 'natuurgebieden': 1.5,
  'viewpoints & nature': 1, 'uitkijkpunten': 1,
};

/** Main category fallback durations */
const MAIN_CATEGORY_DURATION: Record<string, number> = {
  'food & drinks': 1.5, 'eten & drinken': 1.5,
  'shopping': 0.5, 'winkelen': 0.5,
  'active': 1.5, 'actief': 1.5,
  'culture & history': 1.5, 'cultuur & historie': 1.5, 'cultuur': 1.5,
  'beaches & nature': 1.5, 'natuur': 1.5,
  'recreation': 1.5, 'recreatief': 1.5,
};

function getCategoryDuration(category?: string, subcategory?: string): number {
  if (subcategory) {
    const subLower = subcategory.toLowerCase();
    if (CATEGORY_DURATION[subLower]) return CATEGORY_DURATION[subLower];
  }
  if (category) {
    const catLower = category.toLowerCase();
    if (MAIN_CATEGORY_DURATION[catLower]) return MAIN_CATEGORY_DURATION[catLower];
  }
  return 1.5; // default
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateTimeSlots(items: any[], dayPart: DayPart): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  const startHour = DAY_PART_CONFIG[dayPart].startHour;
  const maxHour = dayPart === 'morning' ? 13 : dayPart === 'afternoon' ? 18 : 23;

  const fmt = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h % 1) * 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  let hour = startHour;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const duration = item?.type === 'event'
      ? 1.5
      : getCategoryDuration(item?.category, item?.subcategory);
    const endHour = Math.min(hour + duration, maxHour, 23.5);
    slots.push({ start: fmt(hour), end: fmt(endHour) });
    hour = endHour;
    if (hour >= maxHour) break;
  }
  return slots;
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  let s = Math.abs(h) || 1;
  const next = () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getLocalizedString(val: unknown, locale: string): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    const obj = val as Record<string, string>;
    return obj[locale] || obj.en || obj.nl || Object.values(obj)[0] || '';
  }
  return '';
}

/**
 * Sort program items: activities/culture/nature first, food/drink as finale.
 * For evening with fineDineMinRating: premium restaurants come before casual ones.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any

/** Fetch current weather from OpenWeatherMap via backend proxy or direct */
interface WeatherData { condition: string; temp: number; wind: number; }
const WEATHER_COORDS: Record<string, { lat: number; lng: number }> = {
  calpe: { lat: 38.6447, lng: 0.0458 },
  texel: { lat: 53.0548, lng: 4.7979 },
};
let _weatherCache: { data: WeatherData | null; ts: number; slug: string } | null = null;

async function fetchWeather(): Promise<WeatherData | null> {
  const slug = getDestinationSlug() || 'calpe';
  if (_weatherCache && _weatherCache.slug === slug && Date.now() - _weatherCache.ts < 30 * 60 * 1000) return _weatherCache.data;
  try {
    const coords = WEATHER_COORDS[slug] || WEATHER_COORDS.calpe;
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lng}&units=metric&appid=***REMOVED***`);
    if (!res.ok) return null;
    const d = await res.json();
    const weather: WeatherData = {
      condition: (d.weather?.[0]?.main || '').toLowerCase(),
      temp: Math.round(d.main?.temp || 20),
      wind: Math.round((d.wind?.speed || 0) * 3.6),
    };
    _weatherCache = { data: weather, ts: Date.now(), slug };
    return weather;
  } catch { return null; }
}

function isRainyWeather(w: WeatherData | null): boolean {
  if (!w) return false;
  return ['rain', 'drizzle', 'thunderstorm'].includes(w.condition);
}

function isIndoorPOI(poi: any): boolean {
  const sub = (poi.subcategory || '').toLowerCase();
  const cat = (poi.category || '').toLowerCase();
  const name = (poi.name || '').toLowerCase();
  const indoorKeywords = ['museum', 'musea', 'theater', 'entertainment', 'indoor', 'restaurant', 'bar', 'cafe', 'eetcafe', 'cocktail', 'galerie', 'atelier', 'shopping', 'winkelen', 'mode', 'lifestyle', 'arts', 'religious', 'kerk', 'church'];
  return indoorKeywords.some(kw => sub.includes(kw) || cat.includes(kw) || name.includes(kw));
}

function sortProgramOrder(items: any[], dayPart: DayPart, config: DestinationConfig): any[] {
  const rule = config.rules[dayPart];

  if (dayPart === 'evening' && rule.fineDineMinRating) {
    // Evening: fine-dine (>= threshold) first, then casual, sorted by rating desc
    return [...items].sort((a, b) => {
      const rA = a.google_rating || a.rating || 0;
      const rB = b.google_rating || b.rating || 0;
      const isPremiumA = rA >= (rule.fineDineMinRating || 4.5);
      const isPremiumB = rB >= (rule.fineDineMinRating || 4.5);
      if (isPremiumA && !isPremiumB) return -1;
      if (!isPremiumA && isPremiumB) return 1;
      return rB - rA;
    });
  }

  // Morning/afternoon: non-food first, food last. Highlight stays at position 0.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nonFood: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const food: any[] = [];

  items.forEach((item, idx) => {
    if (idx === 0 && isHighlight(item, config.highlights)) {
      nonFood.unshift(item);
    } else if (isFood(item)) {
      food.push(item);
    } else {
      nonFood.push(item);
    }
  });

  return [...nonFood, ...food];
}

/* ─────────────────────────────────────────────
 * COMPONENT
 * ───────────────────────────────────────────── */

export default function ProgramCard({ locale, programSize = 4, forceShow }: ProgramCardProps) {
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef<HTMLDivElement>(null);
  const t = (key: string) => LABELS[key]?.[locale] || LABELS[key]?.en || key;

  // Track section visibility
  useEffect(() => {
    if (!loading && items.length > 0) return trackSectionViewed(sectionRef.current, 'program_card');
  }, [loading, items.length]);

  const dayPart = getDayPart();

  useEffect(() => {
    async function load() {
      try {
        const config = getDestinationConfig();
        const rule = config.rules[dayPart];
        const poiLimit = Math.max(1, programSize - 1);

        // Fetch more than needed to have room after filtering
        const [poisRes, eventsRes, weather] = await Promise.all([
          fetch(`/api/pois?limit=${poiLimit * 8}&sort=rating:desc&min_rating=${rule.minRating || 4.2}&min_reviews=${rule.minReviews || 3}&categories=${encodeURIComponent(rule.categories)}`),
          fetch('/api/events?limit=10&distance=5'),
          fetchWeather(),
        ]);

        const poisData = await poisRes.json();
        const eventsData = await eventsRes.json();
        const isRainy = isRainyWeather(weather);

        // Filter events: time-of-day + tourist relevance
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const suitableEvents = (eventsData?.data || []).filter((e: any) => isEventSuitableForDayPart(e, dayPart));
        const events = suitableEvents.slice(0, 1); // max 1 event

        // Filter POIs: closed + daypart suitability
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const suitable = (poisData?.data || []).filter((p: any) => isPOISuitable(p, rule));

        // Deterministic shuffle per date+daypart, then diverse selection
        const today = new Date().toISOString().split('T')[0];
        const shuffled = seededShuffle(suitable, `${today}-${dayPart}`);

        // Calculate how many POIs we need: fill remaining slots, ensure minimum total
        const neededPois = Math.max(poiLimit, MIN_PROGRAM_ITEMS - events.length);
        const poisRaw = selectDiversePOIs(shuffled, neededPois, dayPart, config);
        let pois = sortProgramOrder(poisRaw, dayPart, config);
        // Weather-aware: when raining, prioritize indoor POIs
        if (isRainy) {
          pois = [...pois].sort((a, b) => {
            const aIndoor = isIndoorPOI(a) ? 0 : 1;
            const bIndoor = isIndoorPOI(b) ? 0 : 1;
            return aIndoor - bIndoor;
          });
        }

        // Generate initial time slots
        const allItems: any[] = [...pois.map((p: any) => ({ ...p, type: 'poi' })), ...events.map((e: any) => ({ ...e, type: 'event' }))];
        const initialSlots = generateTimeSlots(allItems, dayPart);

        // Filter out POIs that are closed at their assigned time slot
        const dayIdx = new Date().getDay();
        const validPois = pois.filter((p: any, i: number) => {
          const slot = initialSlots[i];
          if (!slot) return true;
          const startH = parseInt(slot.start.split(':')[0]);
          if (isClosedAtHour(p.opening_hours, dayIdx, startH)) return false;
          return true;
        });

        // Regenerate slots for valid POIs only
        const allValidItems: any[] = [...validPois.map((p: any) => ({ ...p, type: 'poi' })), ...events.map((e: any) => ({ ...e, type: 'event' }))];
        const validSlots = generateTimeSlots(allValidItems, dayPart);

        const combined: ProgramItem[] = [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        validPois.forEach((p: any, i: number) => {
          combined.push({
            id: p.id,
            type: 'poi',
            name: typeof p.name === 'string' ? p.name : getLocalizedString(p.name, locale),
            image: Array.isArray(p.images) ? p.images[0] : undefined,
            timeStart: validSlots[i]?.start || '09:00',
            timeEnd: validSlots[i]?.end || '11:00',
          });
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        events.forEach((e: any, i: number) => {
          const slotIdx = validPois.length + i;
          combined.push({
            id: e.id,
            type: 'event',
            name: getLocalizedString(e.title, locale),
            image: e.image || undefined,
            timeStart: validSlots[slotIdx]?.start || '14:00',
            timeEnd: validSlots[slotIdx]?.end || '16:00',
          });
        });

        setItems(combined);
      } catch (err) {
        console.error('ProgramCard load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [locale]);

  // POI block click → open itinerary wizard
  const openItinerary = (item: ProgramItem) => {
    analytics.program_item_clicked(item.name, item.type);
    window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { action: 'itinerary' } }));
  };

  // CTA button
  const openChatbot = () => {
    analytics.program_cta_clicked();
    window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { action: 'itinerary' } }));
  };

  // Details button → POI/Event drawer
  const openDetail = (e: React.MouseEvent, item: ProgramItem) => {
    e.stopPropagation();
    analytics.program_details_clicked(item.name, item.type);
    if (item.type === 'poi') {
      window.dispatchEvent(new CustomEvent('hb:poi:open', { detail: { poiId: item.id } }));
    } else {
      window.dispatchEvent(new CustomEvent('hb:event:open', { detail: { eventId: item.id } }));
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 mx-4 shadow-sm md:hidden" style={{ minHeight: 340 }}>
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex gap-3 mb-3">
            <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div ref={sectionRef} className={forceShow ? '' : 'md:hidden'}>
      <div className="bg-white rounded-2xl p-5 mx-4 shadow-sm w-[calc(100%-2rem)] text-left" style={{ minHeight: 340 }}>
        <h3
          className="text-sm font-bold tracking-wider mb-4"
          style={{ fontFamily: "var(--hb-font-body), sans-serif", color: '#5E8B7E', fontStyle: 'normal', textTransform: 'uppercase' }}
        >
          {dayPart === 'morning' ? '🌅' : dayPart === 'afternoon' ? '☀️' : '🌙'} {DAY_PART_LABELS[dayPart][locale] || DAY_PART_LABELS[dayPart].en}
        </h3>

        <div className="relative flex flex-col items-stretch">
          {items.map((item, idx) => (
            <div key={`${item.type}-${item.id}`}>
              <div
                className="flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-colors active:bg-gray-50"
                style={{ border: '1px solid #E5E7EB', backgroundColor: '#fff' }}
                onClick={() => openItinerary(item)}
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-gray-100">
                  {item.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">
                      {item.type === 'event' ? '📅' : '📍'}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-gray-900 truncate">{item.name}</p>
                  <p className="text-[12px] font-semibold mt-0.5" style={{ color: '#5E8B7E' }}>🕓 {item.timeStart} – {item.timeEnd}</p>
                </div>

                <button
                  onClick={(e) => openDetail(e, item)}
                  className="flex-shrink-0 text-[13px] font-semibold rounded-lg whitespace-nowrap transition-colors active:bg-[#d5e8df]"
                  style={{ color: '#5E8B7E', backgroundColor: '#f0f7f4', border: '1px solid #d5e8df', padding: '6px 14px' }}
                >
                  {t('details')}
                </button>
              </div>
              {idx < items.length - 1 && (
                <div className="flex justify-start" style={{ paddingLeft: 28 }}>
                  <div style={{ width: 2, height: 20, backgroundColor: '#d5e8df' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={openChatbot}
        className="mx-4 mt-3 w-[calc(100%-2rem)] py-3 rounded-xl text-sm font-semibold text-white text-center transition-transform active:scale-[0.98]"
        style={{ backgroundColor: 'var(--hb-primary)' }}
      >
        📅 {t('cta')}
      </button>
    </div>
  );
}
