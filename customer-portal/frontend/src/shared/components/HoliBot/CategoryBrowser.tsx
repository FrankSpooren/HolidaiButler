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
    // Subcategories - Food & Drinks
    'Restaurants': 'Restaurants',
    'Cafes': 'Cafés',
    'Bars': 'Bars',
    'Bakeries': 'Bakkerijen',
    'Ice Cream': 'IJssalons',
    'Fast Food': 'Fastfood',
    'Fine Dining': 'Fijn Dineren',
    'Tapas': 'Tapas',
    // Subcategories - Culture & History
    'Museums': 'Musea',
    'Historical Sites': 'Historische Plaatsen',
    'Churches': 'Kerken',
    'Monuments': 'Monumenten',
    'Art Galleries': 'Galeries',
    // Subcategories - Active
    'Sports': 'Sport',
    'Water Sports': 'Watersport',
    'Hiking': 'Wandelen',
    'Cycling': 'Fietsen',
    'Golf': 'Golf',
    'Tennis': 'Tennis',
    'Diving': 'Duiken',
    'Fitness': 'Fitness',
    // Subcategories - Shopping
    'Shops': 'Winkels',
    'Markets': 'Markten',
    'Supermarkets': 'Supermarkten',
    'Fashion': 'Mode',
    'Souvenirs': 'Souvenirs',
    // Subcategories - Recreation
    'Entertainment': 'Entertainment',
    'Amusement': 'Amusement',
    'Cinema': 'Bioscoop',
    'Wellness': 'Wellness',
    'Spa': 'Spa',
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
    // Subcategories
    'Beaches': 'Strände',
    'Nature & Parks': 'Natur & Parks',
    'Viewpoints': 'Aussichtspunkte',
    'Gardens': 'Gärten',
    'Restaurants': 'Restaurants',
    'Cafes': 'Cafés',
    'Bars': 'Bars',
    'Bakeries': 'Bäckereien',
    'Ice Cream': 'Eisdielen',
    'Fast Food': 'Fastfood',
    'Fine Dining': 'Gehobene Küche',
    'Tapas': 'Tapas',
    'Museums': 'Museen',
    'Historical Sites': 'Historische Stätten',
    'Churches': 'Kirchen',
    'Monuments': 'Denkmäler',
    'Art Galleries': 'Kunstgalerien',
    'Sports': 'Sport',
    'Water Sports': 'Wassersport',
    'Hiking': 'Wandern',
    'Cycling': 'Radfahren',
    'Golf': 'Golf',
    'Tennis': 'Tennis',
    'Diving': 'Tauchen',
    'Fitness': 'Fitness',
    'Shops': 'Geschäfte',
    'Markets': 'Märkte',
    'Supermarkets': 'Supermärkte',
    'Fashion': 'Mode',
    'Souvenirs': 'Souvenirs',
    'Entertainment': 'Unterhaltung',
    'Amusement': 'Vergnügen',
    'Cinema': 'Kino',
    'Wellness': 'Wellness',
    'Spa': 'Spa',
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
    // Subcategories
    'Beaches': 'Playas',
    'Nature & Parks': 'Naturaleza y Parques',
    'Viewpoints': 'Miradores',
    'Gardens': 'Jardines',
    'Restaurants': 'Restaurantes',
    'Cafes': 'Cafeterías',
    'Bars': 'Bares',
    'Bakeries': 'Panaderías',
    'Ice Cream': 'Heladerías',
    'Fast Food': 'Comida Rápida',
    'Fine Dining': 'Alta Cocina',
    'Tapas': 'Tapas',
    'Museums': 'Museos',
    'Historical Sites': 'Sitios Históricos',
    'Churches': 'Iglesias',
    'Monuments': 'Monumentos',
    'Art Galleries': 'Galerías de Arte',
    'Sports': 'Deportes',
    'Water Sports': 'Deportes Acuáticos',
    'Hiking': 'Senderismo',
    'Cycling': 'Ciclismo',
    'Golf': 'Golf',
    'Tennis': 'Tenis',
    'Diving': 'Buceo',
    'Fitness': 'Fitness',
    'Shops': 'Tiendas',
    'Markets': 'Mercados',
    'Supermarkets': 'Supermercados',
    'Fashion': 'Moda',
    'Souvenirs': 'Souvenirs',
    'Entertainment': 'Entretenimiento',
    'Amusement': 'Diversión',
    'Cinema': 'Cine',
    'Wellness': 'Bienestar',
    'Spa': 'Spa',
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
    // Subcategories
    'Beaches': 'Stränder',
    'Nature & Parks': 'Natur & Parker',
    'Viewpoints': 'Utsiktspunkter',
    'Gardens': 'Trädgårdar',
    'Restaurants': 'Restauranger',
    'Cafes': 'Kaféer',
    'Bars': 'Barer',
    'Bakeries': 'Bagerier',
    'Ice Cream': 'Glassställen',
    'Fast Food': 'Snabbmat',
    'Fine Dining': 'Fin Dining',
    'Tapas': 'Tapas',
    'Museums': 'Museer',
    'Historical Sites': 'Historiska Platser',
    'Churches': 'Kyrkor',
    'Monuments': 'Monument',
    'Art Galleries': 'Konstgallerier',
    'Sports': 'Sport',
    'Water Sports': 'Vattensport',
    'Hiking': 'Vandring',
    'Cycling': 'Cykling',
    'Golf': 'Golf',
    'Tennis': 'Tennis',
    'Diving': 'Dykning',
    'Fitness': 'Fitness',
    'Shops': 'Butiker',
    'Markets': 'Marknader',
    'Supermarkets': 'Stormarknader',
    'Fashion': 'Mode',
    'Souvenirs': 'Souvenirer',
    'Entertainment': 'Underhållning',
    'Amusement': 'Nöje',
    'Cinema': 'Bio',
    'Wellness': 'Wellness',
    'Spa': 'Spa',
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
    // Subcategories
    'Beaches': 'Plaże',
    'Nature & Parks': 'Natura i Parki',
    'Viewpoints': 'Punkty Widokowe',
    'Gardens': 'Ogrody',
    'Restaurants': 'Restauracje',
    'Cafes': 'Kawiarnie',
    'Bars': 'Bary',
    'Bakeries': 'Piekarnie',
    'Ice Cream': 'Lodziarnie',
    'Fast Food': 'Fast Food',
    'Fine Dining': 'Elegancka Kuchnia',
    'Tapas': 'Tapas',
    'Museums': 'Muzea',
    'Historical Sites': 'Miejsca Historyczne',
    'Churches': 'Kościoły',
    'Monuments': 'Pomniki',
    'Art Galleries': 'Galerie Sztuki',
    'Sports': 'Sport',
    'Water Sports': 'Sporty Wodne',
    'Hiking': 'Wędrówki',
    'Cycling': 'Jazda na Rowerze',
    'Golf': 'Golf',
    'Tennis': 'Tenis',
    'Diving': 'Nurkowanie',
    'Fitness': 'Fitness',
    'Shops': 'Sklepy',
    'Markets': 'Targi',
    'Supermarkets': 'Supermarkety',
    'Fashion': 'Moda',
    'Souvenirs': 'Pamiątki',
    'Entertainment': 'Rozrywka',
    'Amusement': 'Zabawa',
    'Cinema': 'Kino',
    'Wellness': 'Wellness',
    'Spa': 'Spa',
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
