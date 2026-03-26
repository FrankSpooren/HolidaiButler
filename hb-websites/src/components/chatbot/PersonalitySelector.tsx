'use client';

import { useHoliBot, type Personality } from './HoliBotContext';

interface PersonalitySelectorProps {
  locale: string;
}

const PERSONALITIES: { id: Personality; emoji: string; labels: Record<string, string> }[] = [
  { id: 'auto', emoji: '✨', labels: { nl: 'Automatisch', en: 'Automatic', de: 'Automatisch', es: 'Automático' } },
  { id: 'adventurous', emoji: '🧭', labels: { nl: 'Avontuurlijk', en: 'Adventurous', de: 'Abenteuerlich', es: 'Aventurero' } },
  { id: 'relaxed', emoji: '🧘', labels: { nl: 'Ontspannen', en: 'Relaxed', de: 'Entspannt', es: 'Relajado' } },
  { id: 'cultural', emoji: '🏛️', labels: { nl: 'Cultureel', en: 'Cultural', de: 'Kulturell', es: 'Cultural' } },
  { id: 'social', emoji: '🎉', labels: { nl: 'Gezellig', en: 'Social', de: 'Gesellig', es: 'Social' } },
];

const TITLE: Record<string, string> = {
  nl: 'Hoe wil je ontdekken?',
  en: 'How do you want to explore?',
  de: 'Wie möchtest du entdecken?',
  es: '¿Cómo quieres explorar?',
};

export default function PersonalitySelector({ locale }: PersonalitySelectorProps) {
  const { personality, setPersonality } = useHoliBot();

  return (
    <div style={{ padding: '8px 0' }}>
      <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
        {TITLE[locale] || TITLE.en}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {PERSONALITIES.map(p => (
          <button
            key={p.id}
            onClick={() => setPersonality(p.id)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              border: '1px solid',
              borderColor: personality === p.id ? 'var(--hb-primary, #D4AF37)' : '#E5E7EB',
              background: personality === p.id ? 'var(--hb-primary, #D4AF37)' : 'white',
              color: personality === p.id ? 'white' : '#2C3E50',
              cursor: 'pointer',
              fontWeight: personality === p.id ? 600 : 400,
              transition: 'all 0.2s',
            }}
          >
            {p.emoji} {p.labels[locale] || p.labels.en}
          </button>
        ))}
      </div>
    </div>
  );
}
