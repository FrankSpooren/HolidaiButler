'use client';

import { useState, useEffect } from 'react';
import { getPortalUrl, getDestinationSlug } from '@/lib/portal-url';

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
        'monuments', 'musea', 'religieuze gebouwen', 'sociaal-culturele centra', 'texels schaap',
        // Recreatief
        'indoor',
        // Eten & Drinken (Strandpaviljoens, Ontbijt & Lunch ONLY)
        'strandpaviljoens', 'ontbijt & lunch',
      ],
      excludeSubcats: [],
      excludeNames: [],
      maxFood: 1,
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
        'monuments', 'musea', 'religieuze gebouwen', 'sociaal-culturele centra', 'texels schaap',
        // Recreatief
        'indoor',
        // Eten & Drinken (Strandpaviljoens, Specialties, Ijs & Desserts, Wijndomein)
        'strandpaviljoens', 'specialties', 'ijs & desserts', 'wijndomein',
      ],
      excludeSubcats: [],
      excludeNames: [],
      maxFood: 1,
    },
    evening: {
      categories: 'Eten & Drinken',
      allowedSubcats: [
        // ONLY these Eten & Drinken subcats
        'strandpaviljoens', 'restaurants', 'cafe', 'eetcafe', 'cocktail bar',
      ],
      excludeSubcats: ['fastfood', 'cafetaria', 'foodtrucks', 'ontbijt', 'ijs', 'speciaalzaken', 'strandkiosk'],
      excludeNames: [],
      maxFood: 3,
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
 * FILTERING & SELECTION LOGIC
 * ───────────────────────────────────────────── */

const CLOSED_KEYWORDS = [
  'permanently closed', 'permanent gesloten', 'dauerhaft geschlossen',
  'temporarily closed', 'tijdelijk gesloten', 'vorübergehend geschlossen',
  'gesloten', 'geschlossen', 'cerrado',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPOISuitable(poi: any, rule: DayPartRule): boolean {
  // Closed check
  if (poi.is_active === false) return false;
  if (poi.status === 'closed' || poi.status === 'inactive') return false;
  const fullText = `${poi.name || ''} ${poi.description || ''}`.toLowerCase();
  if (CLOSED_KEYWORDS.some(kw => fullText.includes(kw))) return false;

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
function selectDiversePOIs(pois: any[], count: number, dayPart: DayPart, config: DestinationConfig): any[] {
  const rule = config.rules[dayPart];
  const selected: any[] = [];
  const usedSubcategories = new Set<string>();
  const usedCategories = new Set<string>();
  let foodCount = 0;

  // For morning/afternoon: find and insert 1 highlight first
  if (dayPart !== 'evening') {
    const highlight = pois.find(p => isHighlight(p, config.highlights));
    if (highlight) {
      selected.push(highlight);
      usedSubcategories.add((highlight.subcategory || '').toLowerCase());
      usedCategories.add((highlight.category || '').toLowerCase());
      if (isFood(highlight)) foodCount++;
    }
  }

  // Fill remaining slots with diverse selection
  for (const poi of pois) {
    if (selected.length >= count) break;
    if (selected.some(s => s.id === poi.id)) continue; // skip if already selected (highlight)

    const subcat = (poi.subcategory || poi.category || 'other').toLowerCase();
    const mainCat = (poi.category || 'other').toLowerCase();

    // Max 1 per subcategory
    if (usedSubcategories.has(subcat)) continue;

    // Enforce category diversity (max 1 per main category) — except evening food
    if (dayPart !== 'evening' && usedCategories.has(mainCat)) continue;

    // Max food POIs per rule
    if (isFood(poi) && foodCount >= rule.maxFood) continue;

    selected.push(poi);
    usedSubcategories.add(subcat);
    usedCategories.add(mainCat);
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

function generateTimeSlots(count: number, dayPart: DayPart): { start: string; end: string }[] {
  const slots = [];
  const startHour = DAY_PART_CONFIG[dayPart].startHour;
  const maxHour = dayPart === 'morning' ? 13 : dayPart === 'afternoon' ? 18 : 23;
  const totalHours = maxHour - startHour;
  const slotDuration = Math.max(1, totalHours / count);

  let hour = startHour;
  for (let i = 0; i < count; i++) {
    const endHour = Math.min(hour + slotDuration, 23.5);
    const fmt = (h: number) => {
      const hh = Math.floor(h);
      const mm = Math.round((h % 1) * 60);
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    };
    slots.push({ start: fmt(hour), end: fmt(endHour) });
    hour = endHour;
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

/* ─────────────────────────────────────────────
 * COMPONENT
 * ───────────────────────────────────────────── */

export default function ProgramCard({ locale, programSize = 4 }: ProgramCardProps) {
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const t = (key: string) => LABELS[key]?.[locale] || LABELS[key]?.en || key;

  const dayPart = getDayPart();

  useEffect(() => {
    async function load() {
      try {
        const config = getDestinationConfig();
        const rule = config.rules[dayPart];
        const poiLimit = Math.max(1, programSize - 1);

        // Fetch more than needed to have room after filtering
        const [poisRes, eventsRes] = await Promise.all([
          fetch(`/api/pois?limit=${poiLimit * 6}&sort=rating:desc&min_rating=4.2&min_reviews=3&categories=${encodeURIComponent(rule.categories)}`),
          fetch('/api/events?limit=3'),
        ]);

        const poisData = await poisRes.json();
        const eventsData = await eventsRes.json();

        // Filter: closed + daypart suitability
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const suitable = (poisData?.data || []).filter((p: any) => isPOISuitable(p, rule));

        // Deterministic shuffle per date+daypart, then diverse selection
        const today = new Date().toISOString().split('T')[0];
        const shuffled = seededShuffle(suitable, `${today}-${dayPart}`);
        const pois = selectDiversePOIs(shuffled, poiLimit, dayPart, config);

        // Pick 1 event
        const events = (eventsData?.data || []).slice(0, 1);

        const combined: ProgramItem[] = [];
        const slots = generateTimeSlots(pois.length + events.length, dayPart);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pois.forEach((p: any, i: number) => {
          combined.push({
            id: p.id,
            type: 'poi',
            name: typeof p.name === 'string' ? p.name : getLocalizedString(p.name, locale),
            image: Array.isArray(p.images) ? p.images[0] : undefined,
            timeStart: slots[i]?.start || '09:00',
            timeEnd: slots[i]?.end || '11:00',
          });
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        events.forEach((e: any, i: number) => {
          const slotIdx = pois.length + i;
          combined.push({
            id: e.id,
            type: 'event',
            name: getLocalizedString(e.title, locale),
            image: e.image || undefined,
            timeStart: slots[slotIdx]?.start || '14:00',
            timeEnd: slots[slotIdx]?.end || '16:00',
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
  const openItinerary = () => {
    window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { action: 'itinerary' } }));
  };

  // CTA button
  const openChatbot = () => {
    window.dispatchEvent(new CustomEvent('hb:chatbot:open', { detail: { action: 'itinerary' } }));
  };

  // Details button → POI/Event drawer
  const openDetail = (e: React.MouseEvent, item: ProgramItem) => {
    e.stopPropagation();
    if (item.type === 'poi') {
      window.dispatchEvent(new CustomEvent('hb:poi:open', { detail: { poiId: item.id } }));
    } else {
      window.dispatchEvent(new CustomEvent('hb:event:open', { detail: { eventId: item.id } }));
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 mx-4 shadow-sm md:hidden">
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 mb-4">
            <div className="w-16 h-16 bg-gray-200 rounded-xl animate-pulse flex-shrink-0" />
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
    <div className="md:hidden">
      <div className="bg-white rounded-2xl p-5 mx-4 shadow-sm w-[calc(100%-2rem)] text-left">
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
                onClick={openItinerary}
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
