import { useState, useEffect } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import { chatApi } from '../../services/chat.api';
import './CategoryBrowser.css';

/**
 * CategoryBrowser - Browse POIs by category hierarchy
 * 3 levels: Category > Subcategory > Type
 */

interface Category {
  name: string;
  count: number;
  subcategories: Subcategory[];
}

interface Subcategory {
  name: string;
  count: number;
  types: { name: string; count: number }[];
}

interface CategoryBrowserProps {
  onSelect: (category: string, subcategory?: string, type?: string) => void;
  onCancel: () => void;
}

// Categories to HIDE (grondwet: geen accommodaties)
const hiddenCategories = [
  'Accommodations',
  'Accommodation (do not communicate)',
  'Practical',
  'Health & Wellbeing',
  'Services'
];

// Level 1: Main category icons (matching POIs page for consistency)
const categoryIcons: Record<string, string> = {
  'Beaches & Nature': '/assets/category-icons/beaches-nature.png',
  'Food & Drinks': '/assets/category-icons/food-drinks.png',
  'Culture & History': '/assets/category-icons/culture-history.png',
  'Active': '/assets/category-icons/active.png',
  'Shopping': '/assets/category-icons/shopping.png',
  'Recreation': '/assets/category-icons/recreation.png',
  'Nightlife': '/assets/category-icons/subcategories/nightlife.webp',
  'default': '/assets/category-icons/active.png'
};

// Level 2: Subcategory icons
const subcategoryIcons: Record<string, string> = {
  // Beaches & Nature
  'Beaches': '/assets/category-icons/subcategories/beaches.webp',
  'Parks & Gardens': '/assets/category-icons/subcategories/parks-gardens.webp',
  'Viewpoints & Nature': '/assets/category-icons/subcategories/viewpoints-nature.webp',

  // Food & Drinks
  'Bar Restaurants': '/assets/category-icons/subcategories/bar-restaurants.webp',
  'Bars': '/assets/category-icons/subcategories/bars.webp',
  'Breakfast & Coffee': '/assets/category-icons/subcategories/breakfast-coffee.webp',
  'Fastfood': '/assets/category-icons/subcategories/fastfood.webp',
  'Restaurants': '/assets/category-icons/subcategories/restaurants.webp',

  // Culture & History
  'Arts & Museums': '/assets/category-icons/subcategories/arts-museums.webp',
  'Historical Sites': '/assets/category-icons/subcategories/historical.webp',
  'Religious Buildings': '/assets/category-icons/subcategories/churches.webp',
  'Squares & Public Spaces': '/assets/category-icons/subcategories/parks-gardens.webp',

  // Active
  'Cycling': '/assets/category-icons/subcategories/cycling.webp',
  'Golf': '/assets/category-icons/active.png',
  'Hiking': '/assets/category-icons/subcategories/hiking.webp',
  'Padel': '/assets/category-icons/subcategories/fitness.webp',
  'Sports & Fitness': '/assets/category-icons/subcategories/fitness.webp',
  'Water Sports': '/assets/category-icons/subcategories/water-sports.webp',

  // Shopping
  'Fashion & Clothing': '/assets/category-icons/subcategories/fashion.webp',
  'Home & Lifestyle': '/assets/category-icons/subcategories/home-lifestyle.webp',
  'Markets': '/assets/category-icons/subcategories/markets.webp',
  'Specialty Stores': '/assets/category-icons/subcategories/specialty.webp',
  'Supermarkets & Food': '/assets/category-icons/subcategories/supermarkets.webp',

  // Recreation
  'Entertainment': '/assets/category-icons/subcategories/entertainment.webp',
  'Nightlife & Clubs': '/assets/category-icons/subcategories/nightlife.webp',
  'Playgrounds & Leisure Areas': '/assets/category-icons/subcategories/playground.webp',
  'RV Parks & Camping': '/assets/category-icons/subcategories/camping.png',
  'Theaters': '/assets/category-icons/subcategories/theater.webp',
};

// Level 3: Type icons (most specific)
const typeIcons: Record<string, string> = {
  // Food types
  'Tapas Bars': '/assets/category-icons/subcategories/tapas.webp',
  'Beach Bars & Chiringuitos': '/assets/category-icons/subcategories/bars.webp',
  'Cocktail & Lounge Bars': '/assets/category-icons/subcategories/bars.webp',
  'Bars & Pubs': '/assets/category-icons/subcategories/bars.webp',
  'Gastrobars & Lounges': '/assets/category-icons/subcategories/bar-restaurants.webp',
  'Bar & Grill': '/assets/category-icons/subcategories/grill.webp',
  'Cafés & Coffee Shops': '/assets/category-icons/subcategories/cafe.webp',
  'Bakeries & Pastries': '/assets/category-icons/subcategories/bakery.webp',
  'Ice Cream & Desserts': '/assets/category-icons/subcategories/ice-cream.webp',
  'Seafood & Fish': '/assets/category-icons/subcategories/seafood.webp',
  'Italian': '/assets/category-icons/subcategories/italian.webp',
  'Spanish & Tapas': '/assets/category-icons/subcategories/tapas.webp',
  'Asian Cuisine': '/assets/category-icons/subcategories/asian.webp',
  'Mexican': '/assets/category-icons/subcategories/mexican.webp',
  'Mediterranean': '/assets/category-icons/subcategories/mediterranean.webp',
  'Mediteranean': '/assets/category-icons/subcategories/mediterranean.webp',
  'Grill & Steakhouse': '/assets/category-icons/subcategories/grill.webp',
  'European Specialties': '/assets/category-icons/subcategories/mediterranean.webp',
  'Contemporary Dining': '/assets/category-icons/subcategories/restaurants.webp',

  // Culture types
  'Galleries': '/assets/category-icons/subcategories/galleries.webp',
  'Museums': '/assets/category-icons/subcategories/museums.webp',
  'Street Art & Sculptures': '/assets/category-icons/subcategories/galleries.webp',
  'Cultural Centers': '/assets/category-icons/subcategories/arts-museums.webp',
  'Historical Landmarks': '/assets/category-icons/subcategories/historical.webp',
  'Monuments & Memorials': '/assets/category-icons/subcategories/historical.webp',

  // Nature types
  'Nature Reserve': '/assets/category-icons/subcategories/viewpoints-nature.webp',
  'Viewpoints & Miradors': '/assets/category-icons/subcategories/viewpoints-nature.webp',

  // Active types
  'Diving': '/assets/category-icons/subcategories/diving.webp',
  'Water Sports Activities': '/assets/category-icons/subcategories/water-sports.webp',
  'Water Sports Schools': '/assets/category-icons/subcategories/water-sports.webp',
  'Boat Rental & Tours': '/assets/category-icons/subcategories/water-sports.webp',
  'Marinas & Harbors': '/assets/category-icons/subcategories/water-sports.webp',
  'Hiking Trails': '/assets/category-icons/subcategories/hiking.webp',
  'Mountain Hikes': '/assets/category-icons/subcategories/hiking.webp',
  'Coastal & Nature Walks': '/assets/category-icons/subcategories/hiking.webp',

  // Shopping types
  'Footwear': '/assets/category-icons/subcategories/footwear.webp',
  'General Clothing': '/assets/category-icons/subcategories/fashion.webp',
  'Specialty Fashion': '/assets/category-icons/subcategories/fashion.webp',
  'Electronics & Telecom': '/assets/category-icons/subcategories/specialty.webp',
  'Home & Hardware': '/assets/category-icons/subcategories/home-lifestyle.webp',
  'Personal Care & Beauty': '/assets/category-icons/subcategories/specialty.webp',
  'Supermarkets': '/assets/category-icons/subcategories/supermarkets.webp',
  'Fresh Products': '/assets/category-icons/subcategories/supermarkets.webp',
  'Butchers': '/assets/category-icons/subcategories/supermarkets.webp',

  // Recreation types
  'Amusement Parks': '/assets/category-icons/subcategories/theme-park.webp',
  'Amusement & Venues': '/assets/category-icons/subcategories/entertainment.webp',
  'Gaming & Arcades': '/assets/category-icons/subcategories/arcade.webp',
  'Betting & Gambling': '/assets/category-icons/subcategories/gaming.webp',
  'Nightclubs & Discos': '/assets/category-icons/subcategories/dancing.webp',
};

// Category, subcategory, and type translations per language
// Complete translations matching actual database hierarchy (2025-12-22)
const categoryTranslations: Record<string, Record<string, string>> = {
  nl: {
    // === TOP-LEVEL CATEGORIES ===
    'Beaches & Nature': 'Stranden & Natuur',
    'Food & Drinks': 'Eten & Drinken',
    'Culture & History': 'Cultuur & Geschiedenis',
    'Active': 'Actief',
    'Shopping': 'Winkelen',
    'Recreation': 'Recreatie',
    'Nightlife': 'Uitgaan',

    // === BEACHES & NATURE - Subcategories ===
    'Beaches': 'Stranden',
    'Parks & Gardens': 'Parken & Tuinen',
    'Viewpoints & Nature': 'Uitzichtpunten & Natuur',
    // Types
    'Nature Reserve': 'Natuurgebied',
    'Viewpoints & Miradors': 'Uitzichtpunten & Miradors',

    // === FOOD & DRINKS - Subcategories ===
    'Bar Restaurants': 'Bar-Restaurants',
    'Bars': 'Bars',
    'Breakfast & Coffee': 'Ontbijt & Koffie',
    'Fastfood': 'Fastfood',
    'Restaurants': 'Restaurants',
    // Types - Bar Restaurants
    'Bar & Grill': 'Bar & Grill',
    'Gastrobars & Lounges': 'Gastrobars & Lounges',
    'Tapas Bars': 'Tapas Bars',
    // Types - Bars
    'Bars & Pubs': 'Bars & Pubs',
    'Beach Bars & Chiringuitos': 'Strandbars & Chiringuitos',
    'Cocktail & Lounge Bars': 'Cocktail & Lounge Bars',
    // Types - Breakfast & Coffee
    'Bakeries & Pastries': 'Bakkerijen & Gebak',
    'Cafés & Coffee Shops': 'Cafés & Koffiehuizen',
    'Ice Cream & Desserts': 'IJs & Desserts',
    // Types - Restaurants
    'Asian Cuisine': 'Aziatische Keuken',
    'Contemporary Dining': 'Modern Dineren',
    'European Specialties': 'Europese Specialiteiten',
    'Grill & Steakhouse': 'Grill & Steakhouse',
    'Italian': 'Italiaans',
    'Mediteranean': 'Mediterraans',
    'Mediterranean': 'Mediterraans',
    'Mexican': 'Mexicaans',
    'Seafood & Fish': 'Vis & Zeevruchten',
    'Spanish & Tapas': 'Spaans & Tapas',

    // === CULTURE & HISTORY - Subcategories ===
    'Arts & Museums': 'Kunst & Musea',
    'Historical Sites': 'Historische Plaatsen',
    'Religious Buildings': 'Religieuze Gebouwen',
    'Squares & Public Spaces': 'Pleinen & Openbare Ruimtes',
    // Types - Arts & Museums
    'Galleries': 'Galerieën',
    'Museums': 'Musea',
    'Street Art & Sculptures': 'Straatkunst & Sculpturen',
    // Types - Historical Sites
    'Cultural Centers': 'Culturele Centra',
    'Historical Landmarks': 'Historische Monumenten',
    'Monuments & Memorials': 'Monumenten & Gedenkplaatsen',

    // === ACTIVE - Subcategories ===
    'Cycling': 'Fietsen',
    'Golf': 'Golf',
    'Hiking': 'Wandelen',
    'Padel': 'Padel',
    'Sports & Fitness': 'Sport & Fitness',
    'Water Sports': 'Watersport',
    // Types - Hiking
    'Coastal & Nature Walks': 'Kust- & Natuurwandelingen',
    'Hiking Trails': 'Wandelpaden',
    'Mountain Hikes': 'Bergwandelingen',
    // Types - Water Sports
    'Boat Rental & Tours': 'Bootverhuur & Rondvaarten',
    'Diving': 'Duiken',
    'Marinas & Harbors': 'Jachthavens & Havens',
    'Water Sports Activities': 'Watersportactiviteiten',
    'Water Sports Schools': 'Watersportscholen',

    // === SHOPPING - Subcategories ===
    'Fashion & Clothing': 'Mode & Kleding',
    'Home & Lifestyle': 'Wonen & Lifestyle',
    'Markets': 'Markten',
    'Specialty Stores': 'Speciaalzaken',
    'Supermarkets & Food': 'Supermarkten & Voeding',
    // Types - Fashion & Clothing
    'Footwear': 'Schoenen',
    'General Clothing': 'Algemene Kleding',
    'Specialty Fashion': 'Speciale Mode',
    // Types - Specialty Stores
    'Electronics & Telecom': 'Elektronica & Telecom',
    'Home & Hardware': 'Wonen & Bouwmarkt',
    'Personal Care & Beauty': 'Verzorging & Beauty',
    'Second Hand & Markets': 'Tweedehands & Markten',
    'Specialty Retail': 'Speciaalzaken',
    'Sports & Recreation': 'Sport & Recreatie',
    // Types - Supermarkets & Food
    'Butchers': 'Slagerijen',
    'Fresh Products': 'Verse Producten',
    'Supermarkets': 'Supermarkten',

    // === RECREATION - Subcategories ===
    'Entertainment': 'Entertainment',
    'Nightlife & Clubs': 'Nachtleven & Clubs',
    'Playgrounds & Leisure Areas': 'Speeltuinen & Recreatiegebieden',
    'RV Parks & Camping': 'Camperplaatsen & Campings',
    'Theaters': 'Theaters',
    // Types - Entertainment
    'Amusement & Venues': 'Amusement & Uitgaansgelegenheden',
    'Amusement Parks': 'Pretparken',
    'Betting & Gambling': 'Wedden & Gokken',
    'Gaming & Arcades': 'Gaming & Speelhallen',
    // Types - Nightlife
    'Nightclubs & Discos': 'Nachtclubs & Disco\'s',
  },
  en: {
    'Beaches & Nature': 'Beaches & Nature',
    'Food & Drinks': 'Food & Drinks',
    'Culture & History': 'Culture & History',
    'Active': 'Active',
    'Shopping': 'Shopping',
    'Recreation': 'Recreation',
    'Nightlife': 'Nightlife',
  },
  de: {
    // === TOP-LEVEL CATEGORIES ===
    'Beaches & Nature': 'Strände & Natur',
    'Food & Drinks': 'Essen & Trinken',
    'Culture & History': 'Kultur & Geschichte',
    'Active': 'Aktiv',
    'Shopping': 'Einkaufen',
    'Recreation': 'Freizeit',
    'Nightlife': 'Nachtleben',
    // === BEACHES & NATURE ===
    'Beaches': 'Strände',
    'Parks & Gardens': 'Parks & Gärten',
    'Viewpoints & Nature': 'Aussichtspunkte & Natur',
    'Nature Reserve': 'Naturschutzgebiet',
    'Viewpoints & Miradors': 'Aussichtspunkte & Miradors',
    // === FOOD & DRINKS ===
    'Bar Restaurants': 'Bar-Restaurants',
    'Bars': 'Bars',
    'Breakfast & Coffee': 'Frühstück & Kaffee',
    'Fastfood': 'Fastfood',
    'Restaurants': 'Restaurants',
    'Bar & Grill': 'Bar & Grill',
    'Gastrobars & Lounges': 'Gastrobars & Lounges',
    'Tapas Bars': 'Tapas Bars',
    'Bars & Pubs': 'Bars & Pubs',
    'Beach Bars & Chiringuitos': 'Strandbars & Chiringuitos',
    'Cocktail & Lounge Bars': 'Cocktail & Lounge Bars',
    'Bakeries & Pastries': 'Bäckereien & Gebäck',
    'Cafés & Coffee Shops': 'Cafés & Kaffeehäuser',
    'Ice Cream & Desserts': 'Eis & Desserts',
    'Asian Cuisine': 'Asiatische Küche',
    'Contemporary Dining': 'Modernes Dining',
    'European Specialties': 'Europäische Spezialitäten',
    'Grill & Steakhouse': 'Grill & Steakhouse',
    'Italian': 'Italienisch',
    'Mediterranean': 'Mediterran',
    'Mediteranean': 'Mediterran',
    'Mexican': 'Mexikanisch',
    'Seafood & Fish': 'Fisch & Meeresfrüchte',
    'Spanish & Tapas': 'Spanisch & Tapas',
    // === CULTURE & HISTORY ===
    'Arts & Museums': 'Kunst & Museen',
    'Historical Sites': 'Historische Stätten',
    'Religious Buildings': 'Religiöse Gebäude',
    'Squares & Public Spaces': 'Plätze & Öffentliche Räume',
    'Galleries': 'Galerien',
    'Museums': 'Museen',
    'Street Art & Sculptures': 'Straßenkunst & Skulpturen',
    'Cultural Centers': 'Kulturzentren',
    'Historical Landmarks': 'Historische Sehenswürdigkeiten',
    'Monuments & Memorials': 'Denkmäler & Gedenkstätten',
    // === ACTIVE ===
    'Cycling': 'Radfahren',
    'Golf': 'Golf',
    'Hiking': 'Wandern',
    'Padel': 'Padel',
    'Sports & Fitness': 'Sport & Fitness',
    'Water Sports': 'Wassersport',
    'Coastal & Nature Walks': 'Küsten- & Naturwanderungen',
    'Hiking Trails': 'Wanderwege',
    'Mountain Hikes': 'Bergwanderungen',
    'Boat Rental & Tours': 'Bootsverleih & Touren',
    'Diving': 'Tauchen',
    'Marinas & Harbors': 'Yachthäfen & Häfen',
    'Water Sports Activities': 'Wassersportaktivitäten',
    'Water Sports Schools': 'Wassersportschulen',
    // === SHOPPING ===
    'Fashion & Clothing': 'Mode & Kleidung',
    'Home & Lifestyle': 'Wohnen & Lifestyle',
    'Markets': 'Märkte',
    'Specialty Stores': 'Fachgeschäfte',
    'Supermarkets & Food': 'Supermärkte & Lebensmittel',
    'Footwear': 'Schuhe',
    'General Clothing': 'Allgemeine Kleidung',
    'Specialty Fashion': 'Spezialmode',
    'Electronics & Telecom': 'Elektronik & Telekommunikation',
    'Home & Hardware': 'Wohnen & Baumarkt',
    'Personal Care & Beauty': 'Körperpflege & Schönheit',
    'Second Hand & Markets': 'Second Hand & Märkte',
    'Specialty Retail': 'Fachhandel',
    'Sports & Recreation': 'Sport & Freizeit',
    'Butchers': 'Metzgereien',
    'Fresh Products': 'Frische Produkte',
    'Supermarkets': 'Supermärkte',
    // === RECREATION ===
    'Entertainment': 'Unterhaltung',
    'Nightlife & Clubs': 'Nachtleben & Clubs',
    'Playgrounds & Leisure Areas': 'Spielplätze & Freizeitbereiche',
    'RV Parks & Camping': 'Wohnmobilstellplätze & Camping',
    'Theaters': 'Theater',
    'Amusement & Venues': 'Unterhaltung & Veranstaltungsorte',
    'Amusement Parks': 'Freizeitparks',
    'Betting & Gambling': 'Wetten & Glücksspiel',
    'Gaming & Arcades': 'Gaming & Spielhallen',
    'Nightclubs & Discos': 'Nachtclubs & Diskotheken',
  },
  es: {
    // === TOP-LEVEL CATEGORIES ===
    'Beaches & Nature': 'Playas y Naturaleza',
    'Food & Drinks': 'Comida y Bebidas',
    'Culture & History': 'Cultura e Historia',
    'Active': 'Activo',
    'Shopping': 'Compras',
    'Recreation': 'Ocio',
    'Nightlife': 'Vida Nocturna',
    // === BEACHES & NATURE ===
    'Beaches': 'Playas',
    'Parks & Gardens': 'Parques y Jardines',
    'Viewpoints & Nature': 'Miradores y Naturaleza',
    'Nature Reserve': 'Reserva Natural',
    'Viewpoints & Miradors': 'Miradores',
    // === FOOD & DRINKS ===
    'Bar Restaurants': 'Bar-Restaurantes',
    'Bars': 'Bares',
    'Breakfast & Coffee': 'Desayuno y Café',
    'Fastfood': 'Comida Rápida',
    'Restaurants': 'Restaurantes',
    'Bar & Grill': 'Bar y Parrilla',
    'Gastrobars & Lounges': 'Gastrobares y Lounges',
    'Tapas Bars': 'Bares de Tapas',
    'Bars & Pubs': 'Bares y Pubs',
    'Beach Bars & Chiringuitos': 'Chiringuitos',
    'Cocktail & Lounge Bars': 'Coctelerías y Lounges',
    'Bakeries & Pastries': 'Panaderías y Pastelerías',
    'Cafés & Coffee Shops': 'Cafeterías',
    'Ice Cream & Desserts': 'Heladerías y Postres',
    'Asian Cuisine': 'Cocina Asiática',
    'Contemporary Dining': 'Cocina Contemporánea',
    'European Specialties': 'Especialidades Europeas',
    'Grill & Steakhouse': 'Parrillas y Asadores',
    'Italian': 'Italiano',
    'Mediterranean': 'Mediterráneo',
    'Mediteranean': 'Mediterráneo',
    'Mexican': 'Mexicano',
    'Seafood & Fish': 'Mariscos y Pescados',
    'Spanish & Tapas': 'Español y Tapas',
    // === CULTURE & HISTORY ===
    'Arts & Museums': 'Arte y Museos',
    'Historical Sites': 'Sitios Históricos',
    'Religious Buildings': 'Edificios Religiosos',
    'Squares & Public Spaces': 'Plazas y Espacios Públicos',
    'Galleries': 'Galerías',
    'Museums': 'Museos',
    'Street Art & Sculptures': 'Arte Urbano y Esculturas',
    'Cultural Centers': 'Centros Culturales',
    'Historical Landmarks': 'Monumentos Históricos',
    'Monuments & Memorials': 'Monumentos y Memoriales',
    // === ACTIVE ===
    'Cycling': 'Ciclismo',
    'Golf': 'Golf',
    'Hiking': 'Senderismo',
    'Padel': 'Pádel',
    'Sports & Fitness': 'Deportes y Fitness',
    'Water Sports': 'Deportes Acuáticos',
    'Coastal & Nature Walks': 'Paseos Costeros y Naturales',
    'Hiking Trails': 'Rutas de Senderismo',
    'Mountain Hikes': 'Excursiones de Montaña',
    'Boat Rental & Tours': 'Alquiler de Barcos y Tours',
    'Diving': 'Buceo',
    'Marinas & Harbors': 'Puertos Deportivos',
    'Water Sports Activities': 'Actividades Acuáticas',
    'Water Sports Schools': 'Escuelas de Deportes Acuáticos',
    // === SHOPPING ===
    'Fashion & Clothing': 'Moda y Ropa',
    'Home & Lifestyle': 'Hogar y Estilo de Vida',
    'Markets': 'Mercados',
    'Specialty Stores': 'Tiendas Especializadas',
    'Supermarkets & Food': 'Supermercados y Alimentación',
    'Footwear': 'Calzado',
    'General Clothing': 'Ropa General',
    'Specialty Fashion': 'Moda Especializada',
    'Electronics & Telecom': 'Electrónica y Telecom',
    'Home & Hardware': 'Hogar y Ferretería',
    'Personal Care & Beauty': 'Cuidado Personal y Belleza',
    'Second Hand & Markets': 'Segunda Mano y Mercadillos',
    'Specialty Retail': 'Comercio Especializado',
    'Sports & Recreation': 'Deportes y Ocio',
    'Butchers': 'Carnicerías',
    'Fresh Products': 'Productos Frescos',
    'Supermarkets': 'Supermercados',
    // === RECREATION ===
    'Entertainment': 'Entretenimiento',
    'Nightlife & Clubs': 'Vida Nocturna y Clubes',
    'Playgrounds & Leisure Areas': 'Parques Infantiles y Áreas de Ocio',
    'RV Parks & Camping': 'Áreas de Autocaravanas y Camping',
    'Theaters': 'Teatros',
    'Amusement & Venues': 'Ocio y Locales',
    'Amusement Parks': 'Parques de Atracciones',
    'Betting & Gambling': 'Apuestas y Juegos',
    'Gaming & Arcades': 'Videojuegos y Recreativos',
    'Nightclubs & Discos': 'Discotecas',
  },
  sv: {
    // Top-level
    'Beaches & Nature': 'Stränder & Natur',
    'Food & Drinks': 'Mat & Dryck',
    'Culture & History': 'Kultur & Historia',
    'Active': 'Aktiv',
    'Shopping': 'Shopping',
    'Recreation': 'Rekreation',
    'Nightlife': 'Nattliv',
    // Subcategories - Beaches & Nature
    'Beaches': 'Stränder',
    'Nature & Parks': 'Natur & Parker',
    'Viewpoints': 'Utsiktspunkter',
    'Gardens': 'Trädgårdar',
    'Beach': 'Strand',
    'Park': 'Park',
    'Nature Reserve': 'Naturreservat',
    'Mountain': 'Berg',
    'Lake': 'Sjö',
    'Cove': 'Vik',
    'Cliff': 'Klippa',
    // Subcategories - Food & Drinks
    'Restaurants': 'Restauranger',
    'Cafes': 'Kaféer',
    'Bars': 'Barer',
    'Bakeries': 'Bagerier',
    'Ice Cream': 'Glassställen',
    'Fast Food': 'Snabbmat',
    'Fine Dining': 'Fin Dining',
    'Tapas': 'Tapas',
    'Restaurant': 'Restaurang',
    'Cafe': 'Kafé',
    'Bar': 'Bar',
    'Beach Bar': 'Strandbar',
    'Wine Bar': 'Vinbar',
    'Cocktail Bar': 'Cocktailbar',
    'Bakery': 'Bageri',
    'Ice Cream Shop': 'Glassbutik',
    'Pizzeria': 'Pizzeria',
    'Seafood': 'Fiskrestaurang',
    'Mediterranean': 'Medelhav',
    'Spanish': 'Spansk',
    'Italian': 'Italiensk',
    'Chinese': 'Kinesisk',
    'Indian': 'Indisk',
    'Asian': 'Asiatisk',
    'International': 'Internationell',
    // Subcategories - Culture & History
    'Museums': 'Museer',
    'Historical Sites': 'Historiska Platser',
    'Churches': 'Kyrkor',
    'Monuments': 'Monument',
    'Art Galleries': 'Konstgallerier',
    'Museum': 'Museum',
    'Church': 'Kyrka',
    'Castle': 'Slott',
    'Tower': 'Torn',
    'Ruins': 'Ruiner',
    'Art Gallery': 'Konstgalleri',
    'Historic Building': 'Historisk Byggnad',
    'Archaeological Site': 'Arkeologisk Plats',
    // Subcategories - Active
    'Sports': 'Sport',
    'Water Sports': 'Vattensport',
    'Hiking': 'Vandring',
    'Cycling': 'Cykling',
    'Golf': 'Golf',
    'Tennis': 'Tennis',
    'Diving': 'Dykning',
    'Fitness': 'Fitness',
    'Gym': 'Gym',
    'Fitness Center': 'Träningscenter',
    'Yoga': 'Yoga',
    'Pilates': 'Pilates',
    'Swimming Pool': 'Simbassäng',
    'Diving Center': 'Dykcenter',
    'Kayak': 'Kajak',
    'Paddle Surf': 'Paddelsurfing',
    'Jet Ski': 'Vattenskoter',
    'Sailing': 'Segling',
    'Boat Rental': 'Båtuthyrning',
    'Golf Course': 'Golfbana',
    'Tennis Court': 'Tennisbana',
    'Hiking Trail': 'Vandringsleder',
    'Bike Rental': 'Cykeluthyrning',
    'Rock Climbing': 'Klättring',
    // Subcategories - Shopping
    'Shops': 'Butiker',
    'Markets': 'Marknader',
    'Supermarkets': 'Stormarknader',
    'Fashion': 'Mode',
    'Souvenirs': 'Souvenirer',
    'Shop': 'Butik',
    'Market': 'Marknad',
    'Supermarket': 'Stormarknad',
    'Fashion Store': 'Modebutik',
    'Souvenir Shop': 'Souvenirbutik',
    'Pharmacy': 'Apotek',
    'Electronics': 'Elektronik',
    'Bookstore': 'Bokhandel',
    'Jewelry': 'Juvelerare',
    'Shopping Center': 'Köpcentrum',
    // Subcategories - Recreation
    'Entertainment': 'Underhållning',
    'Amusement': 'Nöje',
    'Cinema': 'Bio',
    'Wellness': 'Wellness',
    'Spa': 'Spa',
    'Theme Park': 'Nöjespark',
    'Zoo': 'Djurpark',
    'Aquarium': 'Akvarium',
    'Bowling': 'Bowling',
    'Mini Golf': 'Minigolf',
    'Escape Room': 'Escape Room',
    'Nightclub': 'Nattklubb',
    'Disco': 'Disco',
    'Lounge': 'Lounge',
  },
  pl: {
    // Top-level
    'Beaches & Nature': 'Plaże i Natura',
    'Food & Drinks': 'Jedzenie i Napoje',
    'Culture & History': 'Kultura i Historia',
    'Active': 'Aktywny',
    'Shopping': 'Zakupy',
    'Recreation': 'Rekreacja',
    'Nightlife': 'Życie Nocne',
    // Subcategories - Beaches & Nature
    'Beaches': 'Plaże',
    'Nature & Parks': 'Natura i Parki',
    'Viewpoints': 'Punkty Widokowe',
    'Gardens': 'Ogrody',
    'Beach': 'Plaża',
    'Park': 'Park',
    'Nature Reserve': 'Rezerwat Przyrody',
    'Mountain': 'Góra',
    'Lake': 'Jezioro',
    'Cove': 'Zatoka',
    'Cliff': 'Klif',
    // Subcategories - Food & Drinks
    'Restaurants': 'Restauracje',
    'Cafes': 'Kawiarnie',
    'Bars': 'Bary',
    'Bakeries': 'Piekarnie',
    'Ice Cream': 'Lodziarnie',
    'Fast Food': 'Fast Food',
    'Fine Dining': 'Elegancka Kuchnia',
    'Tapas': 'Tapas',
    'Restaurant': 'Restauracja',
    'Cafe': 'Kawiarnia',
    'Bar': 'Bar',
    'Beach Bar': 'Bar Plażowy',
    'Wine Bar': 'Winiarnia',
    'Cocktail Bar': 'Koktajlbar',
    'Bakery': 'Piekarnia',
    'Ice Cream Shop': 'Lodziarnia',
    'Pizzeria': 'Pizzeria',
    'Seafood': 'Owoce Morza',
    'Mediterranean': 'Śródziemnomorski',
    'Spanish': 'Hiszpański',
    'Italian': 'Włoski',
    'Chinese': 'Chiński',
    'Indian': 'Indyjski',
    'Asian': 'Azjatycki',
    'International': 'Międzynarodowy',
    // Subcategories - Culture & History
    'Museums': 'Muzea',
    'Historical Sites': 'Miejsca Historyczne',
    'Churches': 'Kościoły',
    'Monuments': 'Pomniki',
    'Art Galleries': 'Galerie Sztuki',
    'Museum': 'Muzeum',
    'Church': 'Kościół',
    'Castle': 'Zamek',
    'Tower': 'Wieża',
    'Ruins': 'Ruiny',
    'Art Gallery': 'Galeria Sztuki',
    'Historic Building': 'Budynek Historyczny',
    'Archaeological Site': 'Stanowisko Archeologiczne',
    // Subcategories - Active
    'Sports': 'Sport',
    'Water Sports': 'Sporty Wodne',
    'Hiking': 'Wędrówki',
    'Cycling': 'Jazda na Rowerze',
    'Golf': 'Golf',
    'Tennis': 'Tenis',
    'Diving': 'Nurkowanie',
    'Fitness': 'Fitness',
    'Gym': 'Siłownia',
    'Fitness Center': 'Centrum Fitness',
    'Yoga': 'Joga',
    'Pilates': 'Pilates',
    'Swimming Pool': 'Basen',
    'Diving Center': 'Centrum Nurkowe',
    'Kayak': 'Kajak',
    'Paddle Surf': 'Deska SUP',
    'Jet Ski': 'Skuter Wodny',
    'Sailing': 'Żeglarstwo',
    'Boat Rental': 'Wynajem Łodzi',
    'Golf Course': 'Pole Golfowe',
    'Tennis Court': 'Kort Tenisowy',
    'Hiking Trail': 'Szlak Turystyczny',
    'Bike Rental': 'Wynajem Rowerów',
    'Rock Climbing': 'Wspinaczka',
    // Subcategories - Shopping
    'Shops': 'Sklepy',
    'Markets': 'Targi',
    'Supermarkets': 'Supermarkety',
    'Fashion': 'Moda',
    'Souvenirs': 'Pamiątki',
    'Shop': 'Sklep',
    'Market': 'Targ',
    'Supermarket': 'Supermarket',
    'Fashion Store': 'Sklep Odzieżowy',
    'Souvenir Shop': 'Sklep z Pamiątkami',
    'Pharmacy': 'Apteka',
    'Electronics': 'Elektronika',
    'Bookstore': 'Księgarnia',
    'Jewelry': 'Jubiler',
    'Shopping Center': 'Centrum Handlowe',
    // Subcategories - Recreation
    'Entertainment': 'Rozrywka',
    'Amusement': 'Zabawa',
    'Cinema': 'Kino',
    'Wellness': 'Wellness',
    'Spa': 'Spa',
    'Theme Park': 'Park Rozrywki',
    'Zoo': 'Zoo',
    'Aquarium': 'Akwarium',
    'Bowling': 'Kręgle',
    'Mini Golf': 'Minigolf',
    'Escape Room': 'Escape Room',
    'Nightclub': 'Klub Nocny',
    'Disco': 'Dyskoteka',
    'Lounge': 'Lounge',
  },
};

// Multi-language labels
const labels: Record<string, Record<string, string>> = {
  nl: {
    title: 'Zoeken op Rubriek',
    loading: 'Categorieën laden...',
    error: 'Kon categorieën niet laden',
    back: 'Terug',
    select: 'Selecteer',
    places: 'locaties',
    allIn: 'Alle in',
  },
  en: {
    title: 'Browse by Category',
    loading: 'Loading categories...',
    error: 'Could not load categories',
    back: 'Back',
    select: 'Select',
    places: 'places',
    allIn: 'All in',
  },
  de: {
    title: 'Nach Kategorie suchen',
    loading: 'Kategorien laden...',
    error: 'Kategorien konnten nicht geladen werden',
    back: 'Zurück',
    select: 'Auswählen',
    places: 'Orte',
    allIn: 'Alle in',
  },
  es: {
    title: 'Buscar por categoría',
    loading: 'Cargando categorías...',
    error: 'No se pudieron cargar las categorías',
    back: 'Volver',
    select: 'Seleccionar',
    places: 'lugares',
    allIn: 'Todo en',
  },
  sv: {
    title: 'Sök efter kategori',
    loading: 'Laddar kategorier...',
    error: 'Kunde inte ladda kategorier',
    back: 'Tillbaka',
    select: 'Välj',
    places: 'platser',
    allIn: 'Alla i',
  },
  pl: {
    title: 'Szukaj według kategorii',
    loading: 'Ładowanie kategorii...',
    error: 'Nie można załadować kategorii',
    back: 'Wstecz',
    select: 'Wybierz',
    places: 'miejsc',
    allIn: 'Wszystko w',
  },
};

export function CategoryBrowser({ onSelect, onCancel }: CategoryBrowserProps) {
  const { language } = useLanguage();
  const t = labels[language] || labels.nl;
  const catTrans = categoryTranslations[language] || categoryTranslations.nl;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);

  // Translate category name
  const translateCategory = (name: string) => catTrans[name] || name;

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/holibot/categories/hierarchy');
      const data = await response.json();
      if (data.success) {
        // Filter out hidden categories (Accommodations, Practical, etc.)
        const filtered = data.data.filter(
          (cat: Category) => !hiddenCategories.includes(cat.name)
        );
        setCategories(filtered);
      } else {
        setError(t.error);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category: Category) => {
    if (category.subcategories.length === 0) {
      onSelect(category.name);
    } else {
      setSelectedCategory(category);
    }
  };

  const handleSubcategoryClick = (subcategory: Subcategory) => {
    if (subcategory.types.length === 0) {
      onSelect(selectedCategory!.name, subcategory.name);
    } else {
      setSelectedSubcategory(subcategory);
    }
  };

  const handleTypeClick = (type: string) => {
    onSelect(selectedCategory!.name, selectedSubcategory!.name, type);
  };

  const handleBack = () => {
    if (selectedSubcategory) {
      setSelectedSubcategory(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    } else {
      onCancel();
    }
  };

  // Get icon for any level (category, subcategory, or type)
  const getIcon = (name: string, level: 1 | 2 | 3 = 1): string => {
    if (level === 3) return typeIcons[name] || subcategoryIcons[name] || categoryIcons.default;
    if (level === 2) return subcategoryIcons[name] || categoryIcons.default;
    return categoryIcons[name] || categoryIcons.default;
  };

  // Render icon as image
  const renderIcon = (iconPath: string, alt: string, size: number = 32) => (
    <img
      src={iconPath}
      alt={alt}
      className="category-icon-img"
      style={{ width: size, height: size, objectFit: 'contain' }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );

  const currentLevel = selectedSubcategory ? 3 : selectedCategory ? 2 : 1;
  const breadcrumb = [
    selectedCategory ? translateCategory(selectedCategory.name) : null,
    selectedSubcategory ? translateCategory(selectedSubcategory.name) : null
  ].filter(Boolean).join(' > ');

  if (loading) {
    return (
      <div className="category-browser">
        <div className="category-browser-header">
          <h3>{t.title}</h3>
        </div>
        <div className="category-browser-loading">{t.loading}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="category-browser">
        <div className="category-browser-header">
          <h3>{t.title}</h3>
        </div>
        <div className="category-browser-error">{error}</div>
        <button className="btn-cancel" onClick={onCancel}>{t.back}</button>
      </div>
    );
  }

  return (
    <div className="category-browser">
      <div className="category-browser-header">
        <h3>{t.title}</h3>
        {breadcrumb && <span className="breadcrumb">{breadcrumb}</span>}
      </div>

      <div className="category-browser-content">
        {/* Level 1: Categories - Grid 2 rows x 4 cols */}
        {currentLevel === 1 && (
          <div className="category-grid">
            {categories.map(cat => (
              <button
                key={cat.name}
                className="category-tile"
                onClick={() => handleCategoryClick(cat)}
              >
                <span className="category-icon">{renderIcon(getIcon(cat.name, 1), cat.name, 40)}</span>
                <span className="category-name">{translateCategory(cat.name)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Level 2: Subcategories */}
        {currentLevel === 2 && selectedCategory && (
          <div className="category-list">
            <button
              className="category-item all-item"
              onClick={() => onSelect(selectedCategory.name)}
            >
              <span className="category-icon">{renderIcon(getIcon(selectedCategory.name, 1), selectedCategory.name, 28)}</span>
              <span className="category-name">{t.allIn} {translateCategory(selectedCategory.name)}</span>
              <span className="category-count">{selectedCategory.count} {t.places}</span>
            </button>
            {selectedCategory.subcategories.map(sub => (
              <button
                key={sub.name}
                className="category-item"
                onClick={() => handleSubcategoryClick(sub)}
              >
                <span className="category-icon">{renderIcon(getIcon(sub.name, 2), sub.name, 24)}</span>
                <span className="category-name">{translateCategory(sub.name)}</span>
                <span className="category-count">{sub.count} {t.places}</span>
                {sub.types.length > 0 && <span className="category-arrow">›</span>}
              </button>
            ))}
          </div>
        )}

        {/* Level 3: Types */}
        {currentLevel === 3 && selectedSubcategory && (
          <div className="category-list">
            <button
              className="category-item all-item"
              onClick={() => onSelect(selectedCategory!.name, selectedSubcategory.name)}
            >
              <span className="category-icon">{renderIcon(getIcon(selectedSubcategory.name, 2), selectedSubcategory.name, 24)}</span>
              <span className="category-name">{t.allIn} {translateCategory(selectedSubcategory.name)}</span>
              <span className="category-count">{selectedSubcategory.count} {t.places}</span>
            </button>
            {selectedSubcategory.types.map(type => (
              <button
                key={type.name}
                className="category-item"
                onClick={() => handleTypeClick(type.name)}
              >
                <span className="category-icon">{renderIcon(getIcon(type.name, 3), type.name, 24)}</span>
                <span className="category-name">{translateCategory(type.name)}</span>
                <span className="category-count">{type.count} {t.places}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="category-browser-footer">
        <button className="btn-back" onClick={handleBack}>
          {t.back}
        </button>
      </div>
    </div>
  );
}
