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

// Category icons
const categoryIcons: Record<string, string> = {
  'Beaches & Nature': '🏖️',
  'Food & Drinks': '🍽️',
  'Culture & History': '🏛️',
  'Active': '🚴',
  'Shopping': '🛍️',
  'Recreation': '🎡',
  'Nightlife': '🎉',
  'default': '📍'
};

// Category, subcategory, and type translations per language
// Expanded to include all POI types from database
const categoryTranslations: Record<string, Record<string, string>> = {
  nl: {
    // Top-level categories
    'Beaches & Nature': 'Stranden & Natuur',
    'Food & Drinks': 'Eten & Drinken',
    'Culture & History': 'Cultuur & Geschiedenis',
    'Active': 'Actief',
    'Shopping': 'Winkelen',
    'Recreation': 'Recreatie',
    'Nightlife': 'Uitgaan',
    // Subcategories - Beaches & Nature
    'Beaches': 'Stranden',
    'Nature & Parks': 'Natuur & Parken',
    'Viewpoints': 'Uitzichtpunten',
    'Gardens': 'Tuinen',
    'Beach': 'Strand',
    'Park': 'Park',
    'Nature Reserve': 'Natuurgebied',
    'Mountain': 'Berg',
    'Lake': 'Meer',
    'Cove': 'Baai',
    'Cliff': 'Klif',
    // Subcategories - Food & Drinks
    'Restaurants': 'Restaurants',
    'Cafes': 'Cafés',
    'Bars': 'Bars',
    'Bakeries': 'Bakkerijen',
    'Ice Cream': 'IJssalons',
    'Fast Food': 'Fastfood',
    'Fine Dining': 'Fijn Dineren',
    'Tapas': 'Tapas',
    'Restaurant': 'Restaurant',
    'Cafe': 'Café',
    'Bar': 'Bar',
    'Beach Bar': 'Strandbar',
    'Wine Bar': 'Wijnbar',
    'Cocktail Bar': 'Cocktailbar',
    'Bakery': 'Bakkerij',
    'Ice Cream Shop': 'IJssalon',
    'Pizzeria': 'Pizzeria',
    'Seafood': 'Visrestaurant',
    'Mediterranean': 'Mediterraans',
    'Spanish': 'Spaans',
    'Italian': 'Italiaans',
    'Chinese': 'Chinees',
    'Indian': 'Indiaas',
    'Asian': 'Aziatisch',
    'International': 'Internationaal',
    // Subcategories - Culture & History
    'Museums': 'Musea',
    'Historical Sites': 'Historische Plaatsen',
    'Churches': 'Kerken',
    'Monuments': 'Monumenten',
    'Art Galleries': 'Galeries',
    'Museum': 'Museum',
    'Church': 'Kerk',
    'Castle': 'Kasteel',
    'Tower': 'Toren',
    'Ruins': 'Ruïnes',
    'Art Gallery': 'Kunstgalerie',
    'Historic Building': 'Historisch Gebouw',
    'Archaeological Site': 'Archeologische Vindplaats',
    // Subcategories - Active
    'Sports': 'Sport',
    'Water Sports': 'Watersport',
    'Hiking': 'Wandelen',
    'Cycling': 'Fietsen',
    'Golf': 'Golf',
    'Tennis': 'Tennis',
    'Diving': 'Duiken',
    'Fitness': 'Fitness',
    'Gym': 'Sportschool',
    'Fitness Center': 'Fitnesscentrum',
    'Yoga': 'Yoga',
    'Pilates': 'Pilates',
    'Swimming Pool': 'Zwembad',
    'Diving Center': 'Duikcentrum',
    'Kayak': 'Kano',
    'Paddle Surf': 'Suppen',
    'Jet Ski': 'Jetski',
    'Sailing': 'Zeilen',
    'Boat Rental': 'Bootje Huren',
    'Golf Course': 'Golfbaan',
    'Tennis Court': 'Tennisbaan',
    'Hiking Trail': 'Wandelpad',
    'Bike Rental': 'Fietsverhuur',
    'Rock Climbing': 'Klimmen',
    // Subcategories - Shopping
    'Shops': 'Winkels',
    'Markets': 'Markten',
    'Supermarkets': 'Supermarkten',
    'Fashion': 'Mode',
    'Souvenirs': 'Souvenirs',
    'Shop': 'Winkel',
    'Market': 'Markt',
    'Supermarket': 'Supermarkt',
    'Fashion Store': 'Modewinkel',
    'Souvenir Shop': 'Souvenirwinkel',
    'Pharmacy': 'Apotheek',
    'Electronics': 'Elektronica',
    'Bookstore': 'Boekwinkel',
    'Jewelry': 'Juwelier',
    'Shopping Center': 'Winkelcentrum',
    // Subcategories - Recreation
    'Entertainment': 'Entertainment',
    'Amusement': 'Amusement',
    'Cinema': 'Bioscoop',
    'Wellness': 'Wellness',
    'Spa': 'Spa',
    'Theme Park': 'Pretpark',
    'Zoo': 'Dierentuin',
    'Aquarium': 'Aquarium',
    'Bowling': 'Bowlen',
    'Mini Golf': 'Midgetgolf',
    'Escape Room': 'Escape Room',
    'Nightclub': 'Nachtclub',
    'Disco': 'Disco',
    'Lounge': 'Lounge',
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
    // Top-level
    'Beaches & Nature': 'Strände & Natur',
    'Food & Drinks': 'Essen & Trinken',
    'Culture & History': 'Kultur & Geschichte',
    'Active': 'Aktiv',
    'Shopping': 'Einkaufen',
    'Recreation': 'Freizeit',
    'Nightlife': 'Nachtleben',
    // Subcategories - Beaches & Nature
    'Beaches': 'Strände',
    'Nature & Parks': 'Natur & Parks',
    'Viewpoints': 'Aussichtspunkte',
    'Gardens': 'Gärten',
    'Beach': 'Strand',
    'Park': 'Park',
    'Nature Reserve': 'Naturschutzgebiet',
    'Mountain': 'Berg',
    'Lake': 'See',
    'Cove': 'Bucht',
    'Cliff': 'Klippe',
    // Subcategories - Food & Drinks
    'Restaurants': 'Restaurants',
    'Cafes': 'Cafés',
    'Bars': 'Bars',
    'Bakeries': 'Bäckereien',
    'Ice Cream': 'Eisdielen',
    'Fast Food': 'Fastfood',
    'Fine Dining': 'Gehobene Küche',
    'Tapas': 'Tapas',
    'Restaurant': 'Restaurant',
    'Cafe': 'Café',
    'Bar': 'Bar',
    'Beach Bar': 'Strandbar',
    'Wine Bar': 'Weinbar',
    'Cocktail Bar': 'Cocktailbar',
    'Bakery': 'Bäckerei',
    'Ice Cream Shop': 'Eisdiele',
    'Pizzeria': 'Pizzeria',
    'Seafood': 'Fischrestaurant',
    'Mediterranean': 'Mediterran',
    'Spanish': 'Spanisch',
    'Italian': 'Italienisch',
    'Chinese': 'Chinesisch',
    'Indian': 'Indisch',
    'Asian': 'Asiatisch',
    'International': 'International',
    // Subcategories - Culture & History
    'Museums': 'Museen',
    'Historical Sites': 'Historische Stätten',
    'Churches': 'Kirchen',
    'Monuments': 'Denkmäler',
    'Art Galleries': 'Kunstgalerien',
    'Museum': 'Museum',
    'Church': 'Kirche',
    'Castle': 'Schloss',
    'Tower': 'Turm',
    'Ruins': 'Ruinen',
    'Art Gallery': 'Kunstgalerie',
    'Historic Building': 'Historisches Gebäude',
    'Archaeological Site': 'Archäologische Stätte',
    // Subcategories - Active
    'Sports': 'Sport',
    'Water Sports': 'Wassersport',
    'Hiking': 'Wandern',
    'Cycling': 'Radfahren',
    'Golf': 'Golf',
    'Tennis': 'Tennis',
    'Diving': 'Tauchen',
    'Fitness': 'Fitness',
    'Gym': 'Fitnessstudio',
    'Fitness Center': 'Fitnesscenter',
    'Yoga': 'Yoga',
    'Pilates': 'Pilates',
    'Swimming Pool': 'Schwimmbad',
    'Diving Center': 'Tauchzentrum',
    'Kayak': 'Kajak',
    'Paddle Surf': 'Stand-Up-Paddling',
    'Jet Ski': 'Jetski',
    'Sailing': 'Segeln',
    'Boat Rental': 'Bootsverleih',
    'Golf Course': 'Golfplatz',
    'Tennis Court': 'Tennisplatz',
    'Hiking Trail': 'Wanderweg',
    'Bike Rental': 'Fahrradverleih',
    'Rock Climbing': 'Klettern',
    // Subcategories - Shopping
    'Shops': 'Geschäfte',
    'Markets': 'Märkte',
    'Supermarkets': 'Supermärkte',
    'Fashion': 'Mode',
    'Souvenirs': 'Souvenirs',
    'Shop': 'Geschäft',
    'Market': 'Markt',
    'Supermarket': 'Supermarkt',
    'Fashion Store': 'Modegeschäft',
    'Souvenir Shop': 'Souvenirladen',
    'Pharmacy': 'Apotheke',
    'Electronics': 'Elektronik',
    'Bookstore': 'Buchhandlung',
    'Jewelry': 'Juwelier',
    'Shopping Center': 'Einkaufszentrum',
    // Subcategories - Recreation
    'Entertainment': 'Unterhaltung',
    'Amusement': 'Vergnügen',
    'Cinema': 'Kino',
    'Wellness': 'Wellness',
    'Spa': 'Spa',
    'Theme Park': 'Freizeitpark',
    'Zoo': 'Zoo',
    'Aquarium': 'Aquarium',
    'Bowling': 'Bowling',
    'Mini Golf': 'Minigolf',
    'Escape Room': 'Escape Room',
    'Nightclub': 'Nachtclub',
    'Disco': 'Disco',
    'Lounge': 'Lounge',
  },
  es: {
    // Top-level
    'Beaches & Nature': 'Playas y Naturaleza',
    'Food & Drinks': 'Comida y Bebidas',
    'Culture & History': 'Cultura e Historia',
    'Active': 'Activo',
    'Shopping': 'Compras',
    'Recreation': 'Recreación',
    'Nightlife': 'Vida Nocturna',
    // Subcategories - Beaches & Nature
    'Beaches': 'Playas',
    'Nature & Parks': 'Naturaleza y Parques',
    'Viewpoints': 'Miradores',
    'Gardens': 'Jardines',
    'Beach': 'Playa',
    'Park': 'Parque',
    'Nature Reserve': 'Reserva Natural',
    'Mountain': 'Montaña',
    'Lake': 'Lago',
    'Cove': 'Cala',
    'Cliff': 'Acantilado',
    // Subcategories - Food & Drinks
    'Restaurants': 'Restaurantes',
    'Cafes': 'Cafeterías',
    'Bars': 'Bares',
    'Bakeries': 'Panaderías',
    'Ice Cream': 'Heladerías',
    'Fast Food': 'Comida Rápida',
    'Fine Dining': 'Alta Cocina',
    'Tapas': 'Tapas',
    'Restaurant': 'Restaurante',
    'Cafe': 'Cafetería',
    'Bar': 'Bar',
    'Beach Bar': 'Chiringuito',
    'Wine Bar': 'Vinoteca',
    'Cocktail Bar': 'Coctelería',
    'Bakery': 'Panadería',
    'Ice Cream Shop': 'Heladería',
    'Pizzeria': 'Pizzería',
    'Seafood': 'Marisquería',
    'Mediterranean': 'Mediterráneo',
    'Spanish': 'Español',
    'Italian': 'Italiano',
    'Chinese': 'Chino',
    'Indian': 'Indio',
    'Asian': 'Asiático',
    'International': 'Internacional',
    // Subcategories - Culture & History
    'Museums': 'Museos',
    'Historical Sites': 'Sitios Históricos',
    'Churches': 'Iglesias',
    'Monuments': 'Monumentos',
    'Art Galleries': 'Galerías de Arte',
    'Museum': 'Museo',
    'Church': 'Iglesia',
    'Castle': 'Castillo',
    'Tower': 'Torre',
    'Ruins': 'Ruinas',
    'Art Gallery': 'Galería de Arte',
    'Historic Building': 'Edificio Histórico',
    'Archaeological Site': 'Yacimiento Arqueológico',
    // Subcategories - Active
    'Sports': 'Deportes',
    'Water Sports': 'Deportes Acuáticos',
    'Hiking': 'Senderismo',
    'Cycling': 'Ciclismo',
    'Golf': 'Golf',
    'Tennis': 'Tenis',
    'Diving': 'Buceo',
    'Fitness': 'Fitness',
    'Gym': 'Gimnasio',
    'Fitness Center': 'Centro Fitness',
    'Yoga': 'Yoga',
    'Pilates': 'Pilates',
    'Swimming Pool': 'Piscina',
    'Diving Center': 'Centro de Buceo',
    'Kayak': 'Kayak',
    'Paddle Surf': 'Paddle Surf',
    'Jet Ski': 'Moto de Agua',
    'Sailing': 'Vela',
    'Boat Rental': 'Alquiler de Barcos',
    'Golf Course': 'Campo de Golf',
    'Tennis Court': 'Pista de Tenis',
    'Hiking Trail': 'Ruta de Senderismo',
    'Bike Rental': 'Alquiler de Bicicletas',
    'Rock Climbing': 'Escalada',
    // Subcategories - Shopping
    'Shops': 'Tiendas',
    'Markets': 'Mercados',
    'Supermarkets': 'Supermercados',
    'Fashion': 'Moda',
    'Souvenirs': 'Souvenirs',
    'Shop': 'Tienda',
    'Market': 'Mercado',
    'Supermarket': 'Supermercado',
    'Fashion Store': 'Tienda de Moda',
    'Souvenir Shop': 'Tienda de Recuerdos',
    'Pharmacy': 'Farmacia',
    'Electronics': 'Electrónica',
    'Bookstore': 'Librería',
    'Jewelry': 'Joyería',
    'Shopping Center': 'Centro Comercial',
    // Subcategories - Recreation
    'Entertainment': 'Entretenimiento',
    'Amusement': 'Diversión',
    'Cinema': 'Cine',
    'Wellness': 'Bienestar',
    'Spa': 'Spa',
    'Theme Park': 'Parque Temático',
    'Zoo': 'Zoo',
    'Aquarium': 'Acuario',
    'Bowling': 'Bolera',
    'Mini Golf': 'Minigolf',
    'Escape Room': 'Escape Room',
    'Nightclub': 'Discoteca',
    'Disco': 'Disco',
    'Lounge': 'Lounge',
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

  const getIcon = (name: string) => categoryIcons[name] || categoryIcons.default;

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
                <span className="category-icon">{getIcon(cat.name)}</span>
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
              <span className="category-icon">{getIcon(selectedCategory.name)}</span>
              <span className="category-name">{t.allIn} {translateCategory(selectedCategory.name)}</span>
              <span className="category-count">{selectedCategory.count} {t.places}</span>
            </button>
            {selectedCategory.subcategories.map(sub => (
              <button
                key={sub.name}
                className="category-item"
                onClick={() => handleSubcategoryClick(sub)}
              >
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
              <span className="category-name">{t.allIn} {translateCategory(selectedSubcategory.name)}</span>
              <span className="category-count">{selectedSubcategory.count} {t.places}</span>
            </button>
            {selectedSubcategory.types.map(type => (
              <button
                key={type.name}
                className="category-item"
                onClick={() => handleTypeClick(type.name)}
              >
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
