'use client';

import { useState, useEffect } from 'react';

interface CategoryGridProps {
  locale?: string;
  destinationSlug?: string;
}

interface CategoryDef {
  key: string;
  label: Record<string, string>;
  emoji: string;
  filter: string;
  gradient: string;
}

const TEXEL_CATEGORIES: CategoryDef[] = [
  { key: 'beach', label: { nl: 'Stranden & Natuur', en: 'Beaches & Nature', de: 'Strände & Natur' }, emoji: '🏖️', filter: 'Natuur', gradient: 'from-blue-400 to-cyan-500' },
  { key: 'food', label: { nl: 'Eten & Drinken', en: 'Food & Drinks', de: 'Essen & Trinken' }, emoji: '🍽️', filter: 'Eten & Drinken', gradient: 'from-red-400 to-orange-500' },
  { key: 'culture', label: { nl: 'Cultuur & Historie', en: 'Culture & History', de: 'Kultur & Geschichte' }, emoji: '🏛️', filter: 'Cultuur & Historie', gradient: 'from-amber-400 to-yellow-500' },
  { key: 'active', label: { nl: 'Actief & Sport', en: 'Active & Sport', de: 'Aktiv & Sport' }, emoji: '🚴', filter: 'Actief', gradient: 'from-green-400 to-emerald-500' },
];

const CALPE_CATEGORIES: CategoryDef[] = [
  { key: 'beach', label: { nl: 'Stranden & Natuur', en: 'Beaches & Nature', de: 'Strände & Natur', es: 'Playas & Naturaleza' }, emoji: '🏖️', filter: 'Beaches & Nature', gradient: 'from-blue-400 to-cyan-500' },
  { key: 'food', label: { nl: 'Eten & Drinken', en: 'Food & Drinks', de: 'Essen & Trinken', es: 'Comida & Bebidas' }, emoji: '🍽️', filter: 'Food & Drinks', gradient: 'from-red-400 to-orange-500' },
  { key: 'culture', label: { nl: 'Cultuur & Historie', en: 'Culture & History', de: 'Kultur & Geschichte', es: 'Cultura e Historia' }, emoji: '🏛️', filter: 'Culture & History', gradient: 'from-amber-400 to-yellow-500' },
  { key: 'active', label: { nl: 'Actief & Sport', en: 'Active & Sport', de: 'Aktiv & Sport', es: 'Activo & Deporte' }, emoji: '🚴', filter: 'Active', gradient: 'from-green-400 to-emerald-500' },
];

const SECTION_LABELS: Record<string, Record<string, string>> = {
  title: { nl: 'Ontdek op categorie', en: 'Discover by category', de: 'Entdecke nach Kategorie', es: 'Descubre por categoría' },
};

function t(obj: Record<string, string>, locale: string): string {
  return obj[locale] || obj.en || obj.nl || '';
}


const categoryGridStyles = `
  .category-grid {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 8px;
  }
  .category-grid > * {
    scroll-snap-align: start;
    flex: 0 0 160px;
  }
  @container (min-width: 400px) {
    .category-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      overflow-x: visible;
      scroll-snap-type: none;
    }
    .category-grid > * { flex: none; }
  }
  @container (min-width: 700px) {
    .category-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @container (min-width: 900px) {
    .category-grid { grid-template-columns: repeat(4, 1fr); }
  }
`;

export default function CategoryGrid({ locale = 'nl', destinationSlug }: CategoryGridProps) {
  const categories = destinationSlug === 'calpe' ? CALPE_CATEGORIES : TEXEL_CATEGORIES;
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadCounts() {
      try {
        const results: Record<string, number> = {};
        await Promise.all(categories.map(async (cat) => {
          const res = await fetch(`/api/pois?categories=${encodeURIComponent(cat.filter)}&limit=1`);
          const data = await res.json();
          // total_count or data length
          results[cat.key] = data?.meta?.total || data?.total || data?.data?.length || 0;
        }));
        setCounts(results);
      } catch {
        // silent
      }
    }
    loadCounts();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8" role="navigation" aria-label="Categories" style={{ containerType: 'inline-size' }}>
      <h2 className="text-2xl font-heading font-bold text-gray-900 mb-6">
        {t(SECTION_LABELS.title, locale)}
      </h2>
      <div className="category-grid gap-4">
        {categories.map((cat) => (
          <a
            key={cat.key}
            href={`/explore?categories=${encodeURIComponent(cat.filter)}`}
            className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${cat.gradient} aspect-[4/3] flex flex-col items-center justify-center text-white hover:scale-[1.02] transition-transform shadow-md`}
          >
            <div className="absolute inset-0 bg-black/10" />
            <span className="relative text-4xl mb-2">{cat.emoji}</span>
            <span className="relative text-base sm:text-lg font-bold text-center px-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              {t(cat.label, locale)}
            </span>
            {counts[cat.key] ? (
              <span className="relative text-sm opacity-80 mt-1">{counts[cat.key]}+ locaties</span>
            ) : null}
          </a>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{ __html: categoryGridStyles }} />
    </div>
  );
}
