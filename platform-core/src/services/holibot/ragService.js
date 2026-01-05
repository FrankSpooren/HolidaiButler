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
  // Cuisine and category keywords - search filters, NOT POI names
  static CUISINE_KEYWORDS = new Set([
    // Italian (all forms)
    "italian", "italiaans", "italiaanse", "italiano", "italiana", "italiens",
    "pizza", "pasta", "risotto", "lasagne", "carbonara", "tiramisu",
    // Mexican (all forms)  
    "mexican", "mexicaans", "mexicaanse", "mexicano", "mexicana", "mexikanisch",
    "taco", "tacos", "burrito", "burritos", "nachos", "quesadilla", "enchilada",
    // Spanish (all forms)
    "spanish", "spaans", "spaanse", "español", "española", "spanisch",
    "tapas", "paella", "gazpacho", "sangria",
    // Asian cuisines (all forms)
    "chinese", "chinees", "chinese", "chino", "china",
    "japanese", "japans", "japanse", "japonés", "japonesa",
    "sushi", "ramen", "tempura", "teriyaki",
    "asian", "aziatisch", "aziatische", "asiático",
    "thai", "thais", "thaise", "tailandés",
    "indian", "indiaas", "indiase", "indio", "indisch",
    "vietnamese", "vietnamees", "vietnamese",
    "korean", "koreaans", "koreaanse",
    // Other cuisines
    "greek", "grieks", "griekse", "griego",
    "french", "frans", "franse", "francés",
    "mediterranean", "mediterraan", "mediterrane", "mediterráneo",
    "american", "amerikaans", "amerikaanse",
    // Food types
    "seafood", "vis", "zeevruchten", "mariscos", "pescado",
    "vegetarian", "vegetarisch", "vegetarische", "vegetariano",
    "vegan", "vegaans", "vegaanse",
    "steakhouse", "steak", "grill", "bbq", "barbecue",
    "fastfood", "fast-food", "burger", "burgers", "hamburger",
    "kebab", "kebabs", "döner", "doner",
    "halal", "kosher", "koosjere"
  ]);

  // Common Dutch/English words that should NOT be extracted as named entities
  static COMMON_WORDS = new Set([
    // Dutch common words
    'zijn', 'er', 'wat', 'voor', 'een', 'het', 'de', 'dit', 'dat', 'deze', 'die',
    'heb', 'je', 'jij', 'ik', 'wij', 'zij', 'hun', 'mijn', 'jouw', 'uw',
    'goede', 'goed', 'leuk', 'leuke', 'mooi', 'mooie', 'beste', 'lekker', 'lekkere',
    'kan', 'kun', 'wil', 'zou', 'mag', 'moet', 'zal', 'adviseert', 'adviseer',
    'restaurants', 'restaurant', 'eten', 'lunch', 'diner', 'ontbijt', 'avondeten',
    'strand', 'stranden', 'museum', 'musea', 'winkels', 'hotels', 'bars', 'cafes',
    // English common words
    'are', 'there', 'what', 'for', 'the', 'and', 'give', 'me', 'us', 'you',
    'good', 'best', 'nice', 'great', 'recommend', 'suggest', 'find', 'show',
    'restaurants', 'beaches', 'museums', 'shops', 'hotels', 'bars', 'places',
    'food', 'lunch', 'dinner', 'breakfast', 'eating', 'drinks', 'coffee'
  ]);


  isCuisineKeyword(term) {
    if (!term) return false;
    return RAGService.CUISINE_KEYWORDS.has(term.toLowerCase());
  }

  // Check if a phrase is entirely composed of common words (not a proper noun)
  isCommonPhrase(phrase) {
    if (!phrase) return true;
    const words = phrase.toLowerCase().split(/\s+/);
    // Check if ALL words are common/cuisine words
    return words.every(w => {
      if (w.length <= 2) return true;
      if (RAGService.COMMON_WORDS.has(w)) return true;
      if (RAGService.CUISINE_KEYWORDS.has(w)) return true;
      // Also check cuisine stems (ital-, mexic-, span-, etc.)
      const cuisineStems = ['ital', 'mexic', 'span', 'chin', 'japan', 'asia', 'thai', 'indi', 'greek', 'fran', 'mediter'];
      if (cuisineStems.some(stem => w.startsWith(stem))) return true;
      return false;
    });
  }


  
  // Check if POI is closed (temporarily or permanently)
  isPOIClosed(poi) {
    if (!poi) return false;
    if (poi.is_active === false || poi.isActive === false) return true;
    const text = ((poi.name || "") + " " + (poi.description || "")).toLowerCase();
    const closedIndicators = [
      "permanently closed", "permanent gesloten", "definitief gesloten",
      "temporarily closed", "tijdelijk gesloten", "cerrado permanentemente",
      "closed down", "out of business", "bestaat niet meer", "is gesloten"
    ];
    return closedIndicators.some(ind => text.includes(ind));
  }

  extractCuisineKeywords(query) {
    const found = [];
    const words = query.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (this.isCuisineKeyword(word)) found.push(word);
    }
    return found;
  }

  /**
   * POI Category definitions with vague patterns and clarifying questions
   * Covers ALL POI types: restaurants, beaches, attractions, museums, shops, nightlife, events, etc.
   */
  static POI_CATEGORIES = {
    restaurant: {
      patterns: [
        // Dutch
        /^(ik\s+)?(zoek|wil|ken)\s+(een\s+)?(goed|leuk|lekker)e?\s+restaurant/i,
        /^(geef|toon|laat).*(restaurant|eten)/i,
        /^waar\s+kan\s+ik\s+(goed\s+)?eten/i,
        /^restaurant\s*(aanbeveling|tip|suggestie)?s?$/i,
        /^(een\s+)?restaurant\s+zoeken$/i,
        /^(ergens\s+)?(lekker\s+)?eten/i,
        // English
        /^(i('m| am)\s+)?(looking\s+for\s+)?(a\s+)?(good|nice)\s+restaurant/i,
        /^(show|give|find)\s+(me\s+)?(a\s+)?restaurant/i,
        /^where\s+(can|do)\s+(i|we)\s+eat/i,
        /^restaurant\s*(recommendation|tip)?s?$/i,
        /^(somewhere\s+)?(to\s+)?eat$/i
      ],
      clarifyingQuestions: {
        nl: ["Wat voor type keuken zoek je? (Italiaans, Spaans, Aziatisch, seafood, etc.)", "Zoek je iets voor lunch of diner?", "Heb je een voorkeur: zeezicht, centrum, of romantisch?"],
        en: ["What type of cuisine? (Italian, Spanish, Asian, seafood, etc.)", "Looking for lunch or dinner?", "Preference: sea view, city center, or romantic setting?"],
        de: ["Welche Küche suchst du? (Italienisch, Spanisch, Asiatisch, Meeresfrüchte, etc.)", "Suchst du etwas zum Mittag- oder Abendessen?", "Hast du eine Vorliebe: Meerblick, Zentrum oder romantisch?"],
        es: ["¿Qué tipo de cocina buscas? (Italiana, Española, Asiática, mariscos, etc.)", "¿Buscas algo para almorzar o cenar?", "¿Tienes preferencia: vista al mar, centro o romántico?"],
        pl: ["Jakiej kuchni szukasz? (Włoska, Hiszpańska, Azjatycka, owoce morza, itp.)", "Szukasz czegoś na lunch czy kolację?", "Masz preferencje: widok na morze, centrum czy romantycznie?"],
        sv: ["Vilken typ av kök söker du? (Italienskt, Spanskt, Asiatiskt, skaldjur, etc.)", "Söker du något till lunch eller middag?", "Har du en preferens: havsutsikt, centrum eller romantiskt?"]
      }
    },
    beach: {
      patterns: [
        // Dutch
        /^(een\s+)?(goed|mooi|leuk)e?\s+strand/i,
        /^waar\s+(is|zijn|kan).*(strand|zwemmen)/i,
        /^strand\s*(aanbeveling|tip)?s?$/i,
        /^(naar\s+)?(het\s+)?strand/i,
        // English
        /^(a\s+)?(good|nice|best)\s+beach/i,
        /^where\s+(is|are|can).*(beach|swim)/i,
        /^beach\s*(recommendation|tip)?s?$/i,
        /^(to\s+)?(the\s+)?beach$/i
      ],
      clarifyingQuestions: {
        nl: ["Zoek je een rustig strand of eentje met faciliteiten (ligbedden, chiringuito)?", "Zandstrand of rotsachtig/snorkelen?", "Met kinderen of voor volwassenen?"],
        en: ["Quiet beach or one with facilities (sun beds, beach bar)?", "Sandy beach or rocky/snorkeling?", "With children or adults only?"],
        de: ["Ruhiger Strand oder einer mit Einrichtungen (Liegen, Strandbar)?", "Sandstrand oder felsig/Schnorcheln?", "Mit Kindern oder nur für Erwachsene?"],
        es: ["¿Playa tranquila o con instalaciones (tumbonas, chiringuito)?", "¿Playa de arena o rocosa/snorkel?", "¿Con niños o solo adultos?"],
        pl: ["Spokojna plaża czy z udogodnieniami (leżaki, bar plażowy)?", "Piaszczysta czy skalista/do nurkowania?", "Z dziećmi czy tylko dla dorosłych?"],
        sv: ["Lugn strand eller en med faciliteter (solstolar, strandbar)?", "Sandstrand eller klippig/snorkling?", "Med barn eller endast vuxna?"]
      }
    },
    activity: {
      patterns: [
        // Dutch
        /^wat\s+(kan|kun)\s+(ik|je|we)\s+doen/i,
        /^(ik\s+)?(zoek|wil)\s+(iets\s+)?(leuks?|te\s+doen)/i,
        /^activiteit(en)?\s*(in\s+calpe)?$/i,
        /^wat\s+is\s+er\s+te\s+doen/i,
        /^(iets\s+)?leuks?\s+(te\s+)?doen/i,
        // English
        /^what\s+(can|should)\s+(i|we)\s+do/i,
        /^(i('m| am)\s+)?(looking\s+for\s+)?(something\s+)?(fun|to\s+do)/i,
        /^activit(y|ies)\s*(in\s+calpe)?$/i,
        /^what\s+(is\s+there\s+)?to\s+do/i,
        /^things\s+to\s+do$/i
      ],
      clarifyingQuestions: {
        nl: ["Zoek je outdoor (stranden, wandelen, watersport) of indoor (musea, winkelen)?", "Voor wie: alleen, koppel, gezin met kinderen?", "Actief of ontspannend?"],
        en: ["Outdoor (beaches, hiking, water sports) or indoor (museums, shopping)?", "For whom: solo, couple, family with kids?", "Active or relaxing?"],
        de: ["Outdoor (Strände, Wandern, Wassersport) oder Indoor (Museen, Shopping)?", "Für wen: allein, Paar, Familie mit Kindern?", "Aktiv oder entspannend?"],
        es: ["¿Exterior (playas, senderismo, deportes acuáticos) o interior (museos, compras)?", "¿Para quién: solo, pareja, familia con niños?", "¿Activo o relajante?"],
        pl: ["Na zewnątrz (plaże, wędrówki, sporty wodne) czy w pomieszczeniu (muzea, zakupy)?", "Dla kogo: sam, para, rodzina z dziećmi?", "Aktywnie czy relaksująco?"],
        sv: ["Utomhus (stränder, vandring, vattensport) eller inomhus (museer, shopping)?", "För vem: ensam, par, familj med barn?", "Aktivt eller avkopplande?"]
      }
    },
    attraction: {
      patterns: [
        // Dutch
        /^(een\s+)?(leuk|mooi)e?\s+(bezienswaardighe|attractie|uitje)/i,
        /^wat\s+(moet|kan)\s+ik\s+(zien|bezoeken)/i,
        /^bezienswaardighe(id|den)/i,
        /^attracties?$/i,
        /^(iets\s+)?(te\s+)?bezichtigen/i,
        // English
        /^(a\s+)?(nice|good)\s+(sight|attraction|landmark)/i,
        /^what\s+(should|can)\s+i\s+(see|visit)/i,
        /^sights?(eeing)?/i,
        /^attractions?$/i,
        /^(something\s+)?(to\s+)?visit$/i
      ],
      clarifyingQuestions: {
        nl: ["Zoek je historische plekken, natuurlijke bezienswaardigheden, of moderne attracties?", "Heb je interesse in de Peñón de Ifach, oude stad, of uitkijkpunten?", "Hoeveel tijd heb je: kort bezoek of halve dag?"],
        en: ["Historical sites, natural landmarks, or modern attractions?", "Interested in Peñón de Ifach, old town, or viewpoints?", "How much time: quick visit or half day?"],
        de: ["Historische Stätten, natürliche Sehenswürdigkeiten oder moderne Attraktionen?", "Interesse am Peñón de Ifach, Altstadt oder Aussichtspunkten?", "Wie viel Zeit: kurzer Besuch oder halber Tag?"],
        es: ["¿Sitios históricos, monumentos naturales o atracciones modernas?", "¿Interesado en el Peñón de Ifach, casco antiguo o miradores?", "¿Cuánto tiempo: visita rápida o medio día?"],
        pl: ["Miejsca historyczne, zabytki przyrody czy nowoczesne atrakcje?", "Zainteresowany Peñón de Ifach, starym miastem czy punktami widokowymi?", "Ile czasu: krótka wizyta czy pół dnia?"],
        sv: ["Historiska platser, naturliga landmärken eller moderna attraktioner?", "Intresserad av Peñón de Ifach, gamla stan eller utsiktspunkter?", "Hur mycket tid: kort besök eller halv dag?"]
      }
    },
    museum: {
      patterns: [
        // Dutch & English (museum is same)
        /^(een\s+|a\s+)?museum/i,
        /^museums?\s*(in\s+calpe)?$/i,
        /^cultuur|cultureel|culture|cultural/i,
        /^(iets\s+|something\s+)?cultural?/i
      ],
      clarifyingQuestions: {
        nl: ["Zoek je kunst, geschiedenis, of lokale cultuur?", "Geschikt voor kinderen of volwassenen?", "Modern of klassiek?"],
        en: ["Art, history, or local culture?", "Suitable for children or adults?", "Modern or classical?"],
        de: ["Kunst, Geschichte oder lokale Kultur?", "Geeignet für Kinder oder Erwachsene?", "Modern oder klassisch?"],
        es: ["¿Arte, historia o cultura local?", "¿Adecuado para niños o adultos?", "¿Moderno o clásico?"],
        pl: ["Sztuka, historia czy kultura lokalna?", "Odpowiednie dla dzieci czy dorosłych?", "Nowoczesne czy klasyczne?"],
        sv: ["Konst, historia eller lokal kultur?", "Lämpligt för barn eller vuxna?", "Modernt eller klassiskt?"]
      }
    },
    shop: {
      patterns: [
        // Dutch
        /^(waar\s+kan\s+ik\s+)?winkelen/i,
        /^winkels?\s*(in\s+calpe)?$/i,
        /^(iets\s+)?kopen/i,
        // English
        /^(where\s+can\s+i\s+)?(go\s+)?shopping/i,
        /^shops?\s*(in\s+calpe)?$/i,
        /^stores?$/i,
        /^(something\s+)?to\s+buy$/i
      ],
      clarifyingQuestions: {
        nl: ["Zoek je souvenirs, kleding, lokale producten, of supermarkten?", "Luxe winkels of budget-vriendelijk?", "Centrum of winkelcentrum?"],
        en: ["Souvenirs, clothing, local products, or supermarkets?", "Luxury shops or budget-friendly?", "City center or shopping mall?"],
        de: ["Souvenirs, Kleidung, lokale Produkte oder Supermärkte?", "Luxusgeschäfte oder budgetfreundlich?", "Zentrum oder Einkaufszentrum?"],
        es: ["¿Souvenirs, ropa, productos locales o supermercados?", "¿Tiendas de lujo o económicas?", "¿Centro o centro comercial?"],
        pl: ["Pamiątki, ubrania, lokalne produkty czy supermarkety?", "Sklepy luksusowe czy budżetowe?", "Centrum czy centrum handlowe?"],
        sv: ["Souvenirer, kläder, lokala produkter eller stormarknader?", "Lyxbutiker eller budgetvänliga?", "Centrum eller köpcentrum?"]
      }
    },
    nightlife: {
      patterns: [
        // Dutch
        /^(waar\s+kan\s+ik\s+)?uitgaan/i,
        /^(een\s+)?(leuk|goed)e?\s+bar/i,
        /^(iets\s+)?drinken/i,
        // English & shared
        /^(where\s+can\s+i\s+)?go\s+out/i,
        /^nachtleven|nightlife/i,
        /^bars?\s*(in\s+calpe)?$/i,
        /^(a\s+)?(good|nice)\s+bar/i,
        /^club|disco/i,
        /^(somewhere\s+)?(to\s+)?drink$/i
      ],
      clarifyingQuestions: {
        nl: ["Zoek je een rustige bar, cocktailbar, of club/disco?", "Met live muziek of DJ?", "Zeezicht of in het centrum?"],
        en: ["Quiet bar, cocktail bar, or club/disco?", "With live music or DJ?", "Sea view or city center?"],
        de: ["Ruhige Bar, Cocktailbar oder Club/Disco?", "Mit Live-Musik oder DJ?", "Meerblick oder Stadtzentrum?"],
        es: ["¿Bar tranquilo, coctelería o club/discoteca?", "¿Con música en vivo o DJ?", "¿Vista al mar o centro?"],
        pl: ["Spokojny bar, koktajlbar czy klub/dyskoteka?", "Z muzyką na żywo czy DJ?", "Widok na morze czy centrum?"],
        sv: ["Lugn bar, cocktailbar eller klubb/disco?", "Med livemusik eller DJ?", "Havsutsikt eller centrum?"]
      }
    },
    event: {
      patterns: [
        // Dutch
        /^(wat\s+voor\s+)?evenement(en)?/i,
        /^wat\s+is\s+er\s+te\s+doen\s+(deze\s+week|vandaag|dit\s+weekend)/i,
        /^agenda|programma/i,
        // English & shared
        /^(what\s+)?events?\s*(in\s+calpe|this\s+week|today)?$/i,
        /^what('s|\s+is)\s+(on|happening)\s+(this\s+week|today|this\s+weekend)/i,
        /^schedule|program/i,
        /^festival|concert|market/i
      ],
      clarifyingQuestions: {
        nl: ["Zoek je evenementen voor vandaag, dit weekend, of deze week?", "Culturele events, markten, muziek, of sport?", "Gratis of betaalde evenementen?"],
        en: ["Events for today, this weekend, or this week?", "Cultural events, markets, music, or sports?", "Free or paid events?"],
        de: ["Veranstaltungen für heute, dieses Wochenende oder diese Woche?", "Kulturelle Events, Märkte, Musik oder Sport?", "Kostenlose oder kostenpflichtige Veranstaltungen?"],
        es: ["¿Eventos para hoy, este fin de semana o esta semana?", "¿Eventos culturales, mercados, música o deportes?", "¿Eventos gratuitos o de pago?"],
        pl: ["Wydarzenia na dziś, ten weekend czy ten tydzień?", "Kulturalne, targi, muzyka czy sport?", "Darmowe czy płatne?"],
        sv: ["Evenemang för idag, denna helg eller denna vecka?", "Kulturella evenemang, marknader, musik eller sport?", "Gratis eller betalda evenemang?"]
      }
    },
    sport: {
      patterns: [
        // Dutch
        /^(waar\s+kan\s+ik\s+)?sporten/i,
        /^zwembad/i,
        // English & shared
        /^(where\s+can\s+i\s+)?(do\s+)?sports?/i,
        /^sports?\s*(in\s+calpe)?$/i,
        /^fitness|gym|pool/i,
        /^(water)?sports?/i,
        /^diving|snorkeling|kayak|paddle/i
      ],
      clarifyingQuestions: {
        nl: ["Zoek je watersport (duiken, kayak, paddleboard) of landsport (tennis, golf, fitness)?", "Beginner of ervaren?", "Wil je een les/cursus of zelf doen?"],
        en: ["Water sports (diving, kayak, paddleboard) or land sports (tennis, golf, fitness)?", "Beginner or experienced?", "Want lessons/courses or self-guided?"],
        de: ["Wassersport (Tauchen, Kajak, Paddleboard) oder Landsport (Tennis, Golf, Fitness)?", "Anfänger oder erfahren?", "Möchtest du Unterricht/Kurse oder selbstständig?"],
        es: ["¿Deportes acuáticos (buceo, kayak, paddleboard) o terrestres (tenis, golf, fitness)?", "¿Principiante o experimentado?", "¿Quieres clases/cursos o por tu cuenta?"],
        pl: ["Sporty wodne (nurkowanie, kajak, paddleboard) czy lądowe (tenis, golf, fitness)?", "Początkujący czy doświadczony?", "Chcesz lekcje/kursy czy samodzielnie?"],
        sv: ["Vattensport (dykning, kajak, paddleboard) eller landsport (tennis, golf, fitness)?", "Nybörjare eller erfaren?", "Vill du ha lektioner/kurser eller på egen hand?"]
      }
    },
    nature: {
      patterns: [
        // Dutch
        /^natuur|wandelen/i,
        /^(een\s+)?(mooi|leuk)e?\s+wandeling/i,
        /^waar\s+kan\s+ik\s+wandelen/i,
        /^natuurgebied/i,
        // English & shared
        /^nature|hiking|walk/i,
        /^(a\s+)?(nice|good)\s+(hike|walk)/i,
        /^where\s+can\s+i\s+(hike|walk)/i,
        /^nature\s*(area|reserve)|park/i
      ],
      clarifyingQuestions: {
        nl: ["Zoek je een korte wandeling of een langere hike?", "Makkelijk (vlak) of uitdagend (bergen)?", "Kust/zee of binnenland/bergen?"],
        en: ["Short walk or longer hike?", "Easy (flat) or challenging (mountains)?", "Coast/sea or inland/mountains?"],
        de: ["Kurzer Spaziergang oder längere Wanderung?", "Einfach (flach) oder anspruchsvoll (Berge)?", "Küste/Meer oder Inland/Berge?"],
        es: ["¿Paseo corto o caminata más larga?", "¿Fácil (llano) o desafiante (montañas)?", "¿Costa/mar o interior/montañas?"],
        pl: ["Krótki spacer czy dłuższa wędrówka?", "Łatwy (płaski) czy wymagający (góry)?", "Wybrzeże/morze czy wnętrze/góry?"],
        sv: ["Kort promenad eller längre vandring?", "Lätt (platt) eller utmanande (berg)?", "Kust/hav eller inland/berg?"]
      }
    },
    family: {
      patterns: [
        // Dutch
        /^(iets\s+)?(voor|met)\s+(de\s+)?kinderen/i,
        /^kinder|familie|gezin/i,
        /^wat\s+te\s+doen\s+met\s+kinderen/i,
        /^speeltuin|pretpark/i,
        // English
        /^(something\s+)?(for|with)\s+(the\s+)?kids/i,
        /^kids|family|children/i,
        /^what\s+to\s+do\s+with\s+(kids|children)/i,
        /^playground|theme\s*park/i
      ],
      clarifyingQuestions: {
        nl: ["Hoe oud zijn de kinderen?", "Binnen of buiten activiteit?", "Gratis of betaalde attractie?"],
        en: ["How old are the children?", "Indoor or outdoor activity?", "Free or paid attraction?"],
        de: ["Wie alt sind die Kinder?", "Drinnen oder draußen?", "Kostenlose oder kostenpflichtige Attraktion?"],
        es: ["¿Qué edad tienen los niños?", "¿Actividad interior o exterior?", "¿Atracción gratuita o de pago?"],
        pl: ["Ile lat mają dzieci?", "Aktywność wewnątrz czy na zewnątrz?", "Darmowa czy płatna atrakcja?"],
        sv: ["Hur gamla är barnen?", "Inomhus eller utomhusaktivitet?", "Gratis eller betald attraktion?"]
      }
    }
  };

    /**
   * Detect if a query is too vague and needs clarification
   * Works for ALL POI categories and events
   * @param {string} query - User query
   * @returns {object} - { isVague: boolean, category: string, clarifyingQuestions: object }
   */
  detectVagueQuery(query) {
    const lq = query.toLowerCase();

    // Check for specific attributes that make query NOT vague
    const cuisineKeywords = this.extractCuisineKeywords(query);
    const hasSpecificAttribute = cuisineKeywords.length > 0;

    // Check for specific time indicators (makes event queries specific)
    const hasTimeIndicator = /\b(vandaag|morgen|dit\s+weekend|deze\s+week|today|tomorrow|this\s+week(end)?)\b/i.test(query);

    // Check for specific location/name mentions (proper nouns)
    const hasSpecificName = /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(query) &&
                           !/(Calpe|Costa Blanca|Alicante|Spain|Spanje)/.test(query);

    // Check for specific descriptors that narrow down the query
    const hasSpecificDescriptor = /\b(goedkoop|duur|luxe|budget|romantisch|rustig|gezellig|authentiek|traditional|modern|cheap|expensive|quiet|romantic)\b/i.test(query);

    if (hasSpecificAttribute || hasSpecificName || (hasTimeIndicator && /event|evenement/i.test(query)) || hasSpecificDescriptor) {
      return { isVague: false, category: null, clarifyingQuestions: {} };
    }

    // Check all POI categories for vague patterns
    for (const [category, config] of Object.entries(RAGService.POI_CATEGORIES)) {
      if (config.patterns.some(p => p.test(lq))) {
        return {
          isVague: true,
          category: category,
          clarifyingQuestions: config.clarifyingQuestions
        };
      }
    }

    return { isVague: false, category: null, clarifyingQuestions: {} };
  }

  /**
   * Filter search results based on cuisine/attribute keywords
   * @param {array} results - Search results
   * @param {array} cuisineKeywords - Extracted cuisine keywords from query
   * @returns {array} - Filtered and prioritized results
   */
  filterByCuisineKeywords(results, cuisineKeywords) {
    if (!cuisineKeywords || cuisineKeywords.length === 0) return results;
    if (!results || results.length === 0) return results;

    const keywordsLower = cuisineKeywords.map(k => k.toLowerCase());

    // Score each result based on cuisine keyword matches
    const scored = results.map(r => {
      const text = ((r.name || "") + " " + (r.description || "") + " " + (r.category || "")).toLowerCase();
      let matchScore = 0;

      for (const keyword of keywordsLower) {
        if (text.includes(keyword)) {
          matchScore += 10; // Strong match
        }
        // Check related terms
        const relatedTerms = this.getRelatedCuisineTerms(keyword);
        for (const term of relatedTerms) {
          if (text.includes(term)) {
            matchScore += 5; // Related match
          }
        }
      }

      return { ...r, cuisineMatchScore: matchScore };
    });

    // Sort by cuisine match score first, then by similarity
    scored.sort((a, b) => {
      if (b.cuisineMatchScore !== a.cuisineMatchScore) {
        return b.cuisineMatchScore - a.cuisineMatchScore;
      }
      return (b.similarity || 0) - (a.similarity || 0);
    });

    // If we have matches with cuisine keywords, prioritize them
    const withMatches = scored.filter(r => r.cuisineMatchScore > 0);
    if (withMatches.length >= 3) {
      return withMatches;
    }

    // Return all results but sorted by relevance
    return scored;
  }

  /**
   * Get related cuisine terms for better matching
   */
  getRelatedCuisineTerms(keyword) {
    const relations = {
      'vegetarian': ['vegetarisch', 'groenten', 'salad', 'vegan', 'plantaardig', 'veggie'],
      'vegetarisch': ['vegetarian', 'groenten', 'salad', 'vegan', 'plantaardig', 'veggie'],
      'vegan': ['vegaans', 'plantaardig', 'vegetarian', 'vegetarisch'],
      'italian': ['italiaans', 'pizza', 'pasta', 'risotto', 'italia'],
      'italiaans': ['italian', 'pizza', 'pasta', 'risotto', 'italia'],
      'mexican': ['mexicaans', 'taco', 'burrito', 'nacho'],
      'mexicaans': ['mexican', 'taco', 'burrito', 'nacho'],
      'seafood': ['vis', 'zeevruchten', 'mariscos', 'pescado', 'fish', 'zee'],
      'vis': ['seafood', 'zeevruchten', 'mariscos', 'fish', 'zee'],
      'indian': ['indiaas', 'curry', 'tandoori', 'naan'],
      'indiaas': ['indian', 'curry', 'tandoori', 'naan'],
      'chinese': ['chinees', 'wok', 'dim sum', 'noodles'],
      'chinees': ['chinese', 'wok', 'dim sum', 'noodles'],
      'tapas': ['spanish', 'spaans', 'española'],
      'spanish': ['spaans', 'tapas', 'paella'],
      'spaans': ['spanish', 'tapas', 'paella']
    };
    return relations[keyword.toLowerCase()] || [];
  }

  /**
   * Generate a helpful response when query is too vague
   * Works for ALL POI categories with localized intros
   */
  generateVagueQueryResponse(vagueInfo, lang = 'nl') {
    const questions = vagueInfo.clarifyingQuestions[lang] || vagueInfo.clarifyingQuestions['nl'] || [];

    // Category-specific intros in all supported languages
    const intros = {
      nl: {
        restaurant: "Om je de beste restauranttips te geven, help je me door een paar vragen te beantwoorden:",
        beach: "Om het perfecte strand voor je te vinden:",
        activity: "Om de ideale activiteit voor je te vinden:",
        attraction: "Om de beste bezienswaardigheden aan te bevelen:",
        museum: "Om het juiste museum voor je te vinden:",
        shop: "Om de beste winkels voor je te vinden:",
        nightlife: "Om de perfecte uitgaansplek te vinden:",
        event: "Om de leukste evenementen te vinden:",
        sport: "Om de beste sportmogelijkheden te vinden:",
        nature: "Om de mooiste wandeling/natuurplek te vinden:",
        family: "Om de leukste gezinsactiviteit te vinden:",
        default: "Om je beter te helpen, heb ik wat meer informatie nodig:"
      },
      en: {
        restaurant: "To give you the best restaurant recommendations:",
        beach: "To find the perfect beach for you:",
        activity: "To find the ideal activity for you:",
        attraction: "To recommend the best attractions:",
        museum: "To find the right museum for you:",
        shop: "To find the best shops for you:",
        nightlife: "To find the perfect place to go out:",
        event: "To find the best events:",
        sport: "To find the best sports facilities:",
        nature: "To find the best hiking/nature spot:",
        family: "To find the best family activity:",
        default: "To help you better, I need some more information:"
      },
      de: {
        restaurant: "Um dir die besten Restaurantempfehlungen zu geben:",
        beach: "Um den perfekten Strand für dich zu finden:",
        activity: "Um die ideale Aktivität für dich zu finden:",
        attraction: "Um die besten Sehenswürdigkeiten zu empfehlen:",
        museum: "Um das richtige Museum für dich zu finden:",
        shop: "Um die besten Geschäfte für dich zu finden:",
        nightlife: "Um den perfekten Ort zum Ausgehen zu finden:",
        event: "Um die besten Veranstaltungen zu finden:",
        sport: "Um die besten Sportmöglichkeiten zu finden:",
        nature: "Um die schönste Wanderung/Naturstelle zu finden:",
        family: "Um die beste Familienaktivität zu finden:",
        default: "Um dir besser zu helfen, brauche ich mehr Informationen:"
      },
      es: {
        restaurant: "Para darte las mejores recomendaciones de restaurantes:",
        beach: "Para encontrar la playa perfecta para ti:",
        activity: "Para encontrar la actividad ideal para ti:",
        attraction: "Para recomendar las mejores atracciones:",
        museum: "Para encontrar el museo adecuado para ti:",
        shop: "Para encontrar las mejores tiendas para ti:",
        nightlife: "Para encontrar el lugar perfecto para salir:",
        event: "Para encontrar los mejores eventos:",
        sport: "Para encontrar las mejores instalaciones deportivas:",
        nature: "Para encontrar la mejor ruta/lugar natural:",
        family: "Para encontrar la mejor actividad familiar:",
        default: "Para ayudarte mejor, necesito más información:"
      },
      pl: {
        restaurant: "Aby dać ci najlepsze rekomendacje restauracji:",
        beach: "Aby znaleźć idealną plażę dla ciebie:",
        activity: "Aby znaleźć idealną aktywność dla ciebie:",
        attraction: "Aby polecić najlepsze atrakcje:",
        museum: "Aby znaleźć odpowiednie muzeum dla ciebie:",
        shop: "Aby znaleźć najlepsze sklepy dla ciebie:",
        nightlife: "Aby znaleźć idealne miejsce na wyjście:",
        event: "Aby znaleźć najlepsze wydarzenia:",
        sport: "Aby znaleźć najlepsze obiekty sportowe:",
        nature: "Aby znaleźć najlepszą trasę/miejsce przyrodnicze:",
        family: "Aby znaleźć najlepszą aktywność dla rodziny:",
        default: "Aby lepiej ci pomóc, potrzebuję więcej informacji:"
      },
      sv: {
        restaurant: "För att ge dig de bästa restaurangrekommendationerna:",
        beach: "För att hitta den perfekta stranden för dig:",
        activity: "För att hitta den ideala aktiviteten för dig:",
        attraction: "För att rekommendera de bästa attraktionerna:",
        museum: "För att hitta rätt museum för dig:",
        shop: "För att hitta de bästa butikerna för dig:",
        nightlife: "För att hitta den perfekta platsen att gå ut:",
        event: "För att hitta de bästa evenemangen:",
        sport: "För att hitta de bästa sportanläggningarna:",
        nature: "För att hitta den bästa vandringen/naturplatsen:",
        family: "För att hitta den bästa familjeaktiviteten:",
        default: "För att hjälpa dig bättre behöver jag mer information:"
      }
    };

    const endings = {
      nl: "Of vertel me gewoon specifiek wat je zoekt!",
      en: "Or just tell me specifically what you're looking for!",
      de: "Oder sag mir einfach genau, was du suchst!",
      es: "¡O simplemente dime qué estás buscando!",
      pl: "Lub po prostu powiedz mi, czego szukasz!",
      sv: "Eller berätta bara vad du letar efter!"
    };

    const langIntros = intros[lang] || intros['nl'];
    const intro = langIntros[vagueInfo.category] || langIntros['default'];
    const ending = endings[lang] || endings['nl'];

    if (!questions || questions.length === 0) {
      return intro + "\n\n" + ending;
    }

    const questionList = questions.slice(0, 3).map((q, i) => `${i + 1}. ${q}`).join('\n');

    return `${intro}\n\n${questionList}\n\n${ending}`;
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
        if (entity.length > 3 && entity.length < 50 && !this.isCuisineKeyword(entity) && !this.isCommonPhrase(entity)) {
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
      if (entity.length > 4 && !exclude.includes(entity) && !entities.includes(entity) && !this.isCuisineKeyword(entity) && !this.isCommonPhrase(entity)) {
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
    // Filter out closed POIs first
    results = results.filter(r => !this.isPOIClosed(r));
    
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

      // NEW: Check for vague queries and return clarifying questions (streaming version)
      const vagueCheck = this.detectVagueQuery(query);
      if (vagueCheck.isVague && history.length === 0) {
        logger.info("Vague query detected (stream)", { category: vagueCheck.category, query });
        const clarifyingResponse = this.generateVagueQueryResponse(vagueCheck, lang);
        // Create a simple async generator that yields the clarifying response
        async function* clarifyingStream() {
          yield clarifyingResponse;
        }
        return {
          success: true,
          searchTimeMs: Date.now() - start,
          pois: [],
          source: "clarification",
          hasEvents: false,
          isVagueQuery: true,
          vagueCategory: vagueCheck.category,
          stream: clarifyingStream()
        };
      }

      // Extract cuisine keywords for filtering
      const cuisineKeywords = this.extractCuisineKeywords(query);

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
      const sr = await this.search(sq, {limit: 20}); // Increased limit for better filtering
      let filteredResults = this.filterRelevantResults(sr.results, query, namedEntities);

      // NEW: Apply cuisine keyword filtering
      if (cuisineKeywords.length > 0) {
        filteredResults = this.filterByCuisineKeywords(filteredResults, cuisineKeywords);
      }

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

      // NEW: Check for vague queries and return clarifying questions
      const vagueCheck = this.detectVagueQuery(query);
      if (vagueCheck.isVague && history.length === 0) {
        // Only ask clarifying questions on first message, not follow-ups
        logger.info("Vague query detected", { category: vagueCheck.category, query });
        const clarifyingResponse = this.generateVagueQueryResponse(vagueCheck, lang);
        return {
          success: true,
          message: clarifyingResponse,
          pois: [],
          source: "clarification",
          hasEvents: false,
          searchTimeMs: Date.now() - start,
          isVagueQuery: true,
          vagueCategory: vagueCheck.category
        };
      }

      // Extract cuisine keywords for filtering
      const cuisineKeywords = this.extractCuisineKeywords(query);
      if (cuisineKeywords.length > 0) {
        logger.info("Cuisine keywords extracted", { keywords: cuisineKeywords, query });
      }

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
      const sr = await this.search(sq, {limit: 20}); // Increased limit for better cuisine filtering
      let filteredResults = this.filterRelevantResults(sr.results, query, namedEntities);

      // NEW: Apply cuisine keyword filtering
      if (cuisineKeywords.length > 0) {
        filteredResults = this.filterByCuisineKeywords(filteredResults, cuisineKeywords);
        logger.info("Results after cuisine filtering", { count: filteredResults.length, keywords: cuisineKeywords });
      }

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
