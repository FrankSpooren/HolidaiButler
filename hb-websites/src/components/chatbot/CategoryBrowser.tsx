'use client';

import { useState, useEffect } from 'react';
import { getDestinationSlug } from '@/lib/portal-url';

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
  locale: string;
  onSelect: (category: string, subcategory?: string, type?: string) => void;
  onCancel: () => void;
}

// Allowed categories per destination
const ALLOWED_CALPE = ['Beaches & Nature', 'Food & Drinks', 'Culture & History', 'Active', 'Shopping', 'Recreation'];
const ALLOWED_TEXEL = ['Eten & Drinken', 'Natuur', 'Cultuur & Historie', 'Winkelen', 'Recreatief', 'Actief'];

// Category emoji icons (works everywhere, no image dependencies)
const CATEGORY_EMOJI: Record<string, string> = {
  'Beaches & Nature': '🏖️', 'Food & Drinks': '🍽️', 'Culture & History': '🏛️',
  'Active': '🚴', 'Shopping': '🛍️', 'Recreation': '🎭', 'Nightlife': '🌙',
  'Eten & Drinken': '🍽️', 'Natuur': '🌿', 'Cultuur & Historie': '🏛️',
  'Actief': '🚴', 'Winkelen': '🛍️', 'Recreatief': '🎭',
  'Gezondheid & Verzorging': '💆', 'Praktisch': '🔧',
};

// Translations
const LABELS: Record<string, Record<string, string>> = {
  nl: { title: 'Zoeken op Rubriek', loading: 'Laden...', error: 'Kon niet laden', back: 'Terug', allIn: 'Alle in', places: 'locaties' },
  en: { title: 'Browse by Category', loading: 'Loading...', error: 'Could not load', back: 'Back', allIn: 'All in', places: 'places' },
  de: { title: 'Nach Kategorie suchen', loading: 'Laden...', error: 'Fehler', back: 'Zurück', allIn: 'Alle in', places: 'Orte' },
  es: { title: 'Buscar por categoría', loading: 'Cargando...', error: 'Error', back: 'Volver', allIn: 'Todo en', places: 'lugares' },
};

// Category name translations (NL/DE/ES for Calpe EN categories)
const CAT_TRANS: Record<string, Record<string, string>> = {
  nl: { 'Beaches & Nature': 'Stranden & Natuur', 'Food & Drinks': 'Eten & Drinken', 'Culture & History': 'Cultuur & Geschiedenis', 'Active': 'Actief', 'Shopping': 'Winkelen', 'Recreation': 'Recreatie', 'Nightlife': 'Uitgaan', 'Bars': 'Bars', 'Restaurants': 'Restaurants', 'Bar Restaurants': 'Bar-Restaurants', 'Breakfast & Coffee': 'Ontbijt & Koffie', 'Fastfood': 'Fastfood', 'Beaches': 'Stranden', 'Parks & Gardens': 'Parken & Tuinen', 'Viewpoints & Nature': 'Uitzichtpunten & Natuur', 'Arts & Museums': 'Kunst & Musea', 'Historical Sites': 'Historische Plaatsen', 'Religious Buildings': 'Religieuze Gebouwen', 'Squares & Public Spaces': 'Pleinen & Publieke Ruimtes', 'Cycling': 'Fietsen', 'Golf': 'Golf', 'Hiking': 'Wandelen', 'Sports & Fitness': 'Sport & Fitness', 'Water Sports': 'Watersport', 'Fashion & Clothing': 'Mode & Kleding', 'Home & Lifestyle': 'Wonen & Lifestyle', 'Markets': 'Markten', 'Specialty Stores': 'Speciaalzaken', 'Supermarkets & Food': 'Supermarkten', 'Entertainment': 'Entertainment', 'Playgrounds & Leisure Areas': 'Speeltuinen & Recreatie', 'Theaters': 'Theaters' },
  de: { 'Beaches & Nature': 'Strände & Natur', 'Food & Drinks': 'Essen & Trinken', 'Culture & History': 'Kultur & Geschichte', 'Active': 'Aktiv', 'Shopping': 'Einkaufen', 'Recreation': 'Freizeit', 'Restaurants': 'Restaurants', 'Bars': 'Bars', 'Beaches': 'Strände', 'Arts & Museums': 'Kunst & Museen', 'Historical Sites': 'Historische Stätten', 'Cycling': 'Radfahren', 'Hiking': 'Wandern', 'Water Sports': 'Wassersport' },
  es: { 'Beaches & Nature': 'Playas & Naturaleza', 'Food & Drinks': 'Comida & Bebidas', 'Culture & History': 'Cultura & Historia', 'Active': 'Activo', 'Shopping': 'Compras', 'Recreation': 'Ocio', 'Restaurants': 'Restaurantes', 'Bars': 'Bares', 'Beaches': 'Playas', 'Arts & Museums': 'Arte & Museos', 'Cycling': 'Ciclismo', 'Hiking': 'Senderismo' },
};

export default function CategoryBrowser({ locale, onSelect, onCancel }: CategoryBrowserProps) {
  const t = LABELS[locale] || LABELS.en;
  const trans = CAT_TRANS[locale] || {};
  const slug = getDestinationSlug();
  const allowed = slug === 'texel' ? ALLOWED_TEXEL : ALLOWED_CALPE;
  const translate = (name: string) => trans[name] || name;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [selectedSub, setSelectedSub] = useState<Subcategory | null>(null);

  useEffect(() => {
    fetch('/api/holibot/categories')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setCategories(data.data.filter((c: Category) => allowed.includes(c.name)));
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleBack = () => {
    if (selectedSub) setSelectedSub(null);
    else if (selectedCat) setSelectedCat(null);
    else onCancel();
  };

  const level = selectedSub ? 3 : selectedCat ? 2 : 1;

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{t.title}</p>
        <p style={{ fontSize: 14, color: '#9CA3AF' }}>{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 14, color: '#EF4444' }}>{t.error}</p>
        <button onClick={onCancel} style={{ marginTop: 8, padding: '6px 16px', borderRadius: 20, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', fontSize: 13 }}>
          {t.back}
        </button>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{t.title}</p>
      {level > 1 && (
        <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
          {translate(selectedCat!.name)}{selectedSub ? ` › ${translate(selectedSub.name)}` : ''}
        </p>
      )}

      {/* Level 1: Category grid */}
      {level === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => cat.subcategories.length > 0 ? setSelectedCat(cat) : onSelect(cat.name)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '14px 8px', borderRadius: 12,
                border: '1px solid #E5C876', background: '#FFFDF5',
                cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#2C3E50',
              }}
            >
              <span style={{ fontSize: 28 }}>{CATEGORY_EMOJI[cat.name] || '📍'}</span>
              <span>{translate(cat.name)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Level 2: Subcategory list */}
      {level === 2 && selectedCat && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            onClick={() => onSelect(selectedCat.name)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 12px', borderRadius: 8, border: '1px solid #E5C876',
              background: '#FFFDF5', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            <span>{t.allIn} {translate(selectedCat.name)}</span>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>{selectedCat.count} {t.places}</span>
          </button>
          {selectedCat.subcategories.map(sub => (
            <button
              key={sub.name}
              onClick={() => sub.types.length > 0 ? setSelectedSub(sub) : onSelect(selectedCat.name, sub.name)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
                background: 'white', cursor: 'pointer', fontSize: 13,
              }}
            >
              <span>{translate(sub.name)}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9CA3AF' }}>
                {sub.count} {t.places}
                {sub.types.length > 0 && <span>›</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Level 3: Type list */}
      {level === 3 && selectedSub && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            onClick={() => onSelect(selectedCat!.name, selectedSub.name)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 12px', borderRadius: 8, border: '1px solid #E5C876',
              background: '#FFFDF5', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            <span>{t.allIn} {translate(selectedSub.name)}</span>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>{selectedSub.count} {t.places}</span>
          </button>
          {selectedSub.types.map(type => (
            <button
              key={type.name}
              onClick={() => onSelect(selectedCat!.name, selectedSub.name, type.name)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
                background: 'white', cursor: 'pointer', fontSize: 13,
              }}
            >
              <span>{translate(type.name)}</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{type.count} {t.places}</span>
            </button>
          ))}
        </div>
      )}

      {/* Back button */}
      <button
        onClick={handleBack}
        style={{
          marginTop: 12, padding: '6px 16px', borderRadius: 20,
          border: '1px solid #E5E7EB', background: 'white',
          cursor: 'pointer', fontSize: 13, color: '#6B7280',
        }}
      >
        {t.back}
      </button>
    </div>
  );
}
