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

// Category icons
const categoryIcons: Record<string, string> = {
  'Beaches & Nature': '🏖️',
  'Food & Drinks': '🍽️',
  'Culture & History': '🏛️',
  'Active': '🚴',
  'Shopping': '🛍️',
  'Recreation': '🎡',
  'Accommodations': '🏨',
  'Services': '🔧',
  'Nightlife': '🎉',
  'default': '📍'
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

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/holibot/categories/hierarchy');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
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
    selectedCategory?.name,
    selectedSubcategory?.name
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
        {/* Level 1: Categories */}
        {currentLevel === 1 && (
          <div className="category-list">
            {categories.map(cat => (
              <button
                key={cat.name}
                className="category-item"
                onClick={() => handleCategoryClick(cat)}
              >
                <span className="category-icon">{getIcon(cat.name)}</span>
                <span className="category-name">{cat.name}</span>
                <span className="category-count">{cat.count} {t.places}</span>
                {cat.subcategories.length > 0 && <span className="category-arrow">›</span>}
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
              <span className="category-name">{t.allIn} {selectedCategory.name}</span>
              <span className="category-count">{selectedCategory.count} {t.places}</span>
            </button>
            {selectedCategory.subcategories.map(sub => (
              <button
                key={sub.name}
                className="category-item"
                onClick={() => handleSubcategoryClick(sub)}
              >
                <span className="category-name">{sub.name}</span>
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
              <span className="category-name">{t.allIn} {selectedSubcategory.name}</span>
              <span className="category-count">{selectedSubcategory.count} {t.places}</span>
            </button>
            {selectedSubcategory.types.map(type => (
              <button
                key={type.name}
                className="category-item"
                onClick={() => handleTypeClick(type.name)}
              >
                <span className="category-name">{type.name}</span>
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
