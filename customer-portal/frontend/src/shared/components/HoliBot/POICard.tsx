import type { POI } from '../../types/poi.types';
import { TrustBadge } from './TrustBadge';
import { ReviewMetadata } from './ReviewMetadata';
import { useLanguage } from '../../../i18n/LanguageContext';
import './POICard.css';

// Category translations for multi-language support
const categoryTranslations: Record<string, Record<string, string>> = {
  'Beaches & Nature': {
    nl: 'Stranden & Natuur',
    en: 'Beaches & Nature',
    de: 'Strände & Natur',
    es: 'Playas y Naturaleza',
    sv: 'Stränder & Natur',
    pl: 'Plaże i Natura'
  },
  'Food & Drinks': {
    nl: 'Eten & Drinken',
    en: 'Food & Drinks',
    de: 'Essen & Trinken',
    es: 'Comida y Bebidas',
    sv: 'Mat & Dryck',
    pl: 'Jedzenie i Napoje'
  },
  'Culture & History': {
    nl: 'Cultuur & Geschiedenis',
    en: 'Culture & History',
    de: 'Kultur & Geschichte',
    es: 'Cultura e Historia',
    sv: 'Kultur & Historia',
    pl: 'Kultura i Historia'
  },
  'Active': {
    nl: 'Actief',
    en: 'Active',
    de: 'Aktiv',
    es: 'Activo',
    sv: 'Aktivt',
    pl: 'Aktywny'
  },
  'Shopping': {
    nl: 'Winkelen',
    en: 'Shopping',
    de: 'Einkaufen',
    es: 'Compras',
    sv: 'Shopping',
    pl: 'Zakupy'
  },
  'Recreation': {
    nl: 'Recreatie',
    en: 'Recreation',
    de: 'Freizeit',
    es: 'Recreación',
    sv: 'Rekreation',
    pl: 'Rekreacja'
  },
  'Nightlife': {
    nl: 'Nachtleven',
    en: 'Nightlife',
    de: 'Nachtleben',
    es: 'Vida Nocturna',
    sv: 'Nattliv',
    pl: 'Życie Nocne'
  }
};

interface POICardProps {
  poi: POI;
  onClick?: () => void;
}

export function POICard({ poi, onClick }: POICardProps) {
  const { language } = useLanguage();
  const imageUrl = poi.images && poi.images.length > 0 ? poi.images[0] : null;

  // Get translated category
  const getTranslatedCategory = (category: string) => {
    const translations = categoryTranslations[category];
    return translations?.[language] || category;
  };

  return (
    <div className="holibot-poi-card" onClick={onClick}>
      {imageUrl && (
        <div className="poi-card-image" style={{ backgroundImage: `url(${imageUrl})` }} />
      )}
      <div className="poi-card-content">
        <h3 className="poi-card-title">{poi.name}</h3>
        <p className="poi-card-category">{getTranslatedCategory(poi.category)}</p>

        {poi.description && (
          <p className="poi-card-description">{poi.description.slice(0, 100)}...</p>
        )}

        <TrustBadge
          rating={poi.rating}
          reviewCount={poi.review_count}
          verified={poi.popularity_score !== undefined && poi.popularity_score > 80}
        />

        <ReviewMetadata
          reviewCount={poi.review_count}
          popularityScore={poi.popularity_score}
          priceLevel={poi.price_level}
        />

        {poi.website && (
          <a
            href={poi.website}
            target="_blank"
            rel="noopener noreferrer"
            className="poi-card-link"
            onClick={(e) => e.stopPropagation()}
          >
            Visit Website →
          </a>
        )}
      </div>
    </div>
  );
}
