'use client';

import { useState, useEffect, useCallback } from 'react';

interface OnboardingSheetProps {
  locale: string;
  primaryColor?: string;
}

interface OnboardingData {
  travel_companion?: string;
  interests?: string[];
  visit_purpose?: string;
  visit_frequency?: string;
  special_needs?: string[];
}

/* ── i18n labels ── */
const T: Record<string, Record<string, string>> = {
  step1_q:   { nl: 'Met wie reis je?', en: 'Who are you traveling with?', de: 'Mit wem reist du?', es: '¿Con quién viajas?' },
  step1_h:   { nl: 'We passen je aanbevelingen aan', en: "We'll personalize your recommendations", de: 'Wir passen deine Empfehlungen an', es: 'Personalizaremos tus recomendaciones' },
  step2_q:   { nl: 'Wat zijn je interesses?', en: 'What are your interests?', de: 'Was sind deine Interessen?', es: '¿Cuáles son tus intereses?' },
  step2_h:   { nl: 'Kies er één of meer', en: 'Choose one or more', de: 'Wähle eine oder mehrere', es: 'Elige una o más' },
  step3_q:   { nl: 'Omschrijf je bezoek', en: 'Describe your visit', de: 'Beschreibe deinen Besuch', es: 'Describe tu visita' },
  step3_h:   { nl: 'Twee korte vragen', en: 'Two quick questions', de: 'Zwei kurze Fragen', es: 'Dos preguntas rápidas' },
  step3_a:   { nl: 'Wat is het doel?', en: 'What is the purpose?', de: 'Was ist der Zweck?', es: '¿Cuál es el propósito?' },
  step3_b:   { nl: 'Hoe vaak ben je hier?', en: 'How often have you been here?', de: 'Wie oft warst du hier?', es: '¿Con qué frecuencia vienes?' },
  step4_q:   { nl: 'Speciale wensen?', en: 'Special requirements?', de: 'Besondere Wünsche?', es: '¿Necesidades especiales?' },
  step4_h:   { nl: 'Optioneel — je kunt dit overslaan', en: 'Optional — you can skip this', de: 'Optional — du kannst das überspringen', es: 'Opcional — puedes omitir esto' },
  skip:      { nl: 'Overslaan', en: 'Skip', de: 'Überspringen', es: 'Omitir' },
  back:      { nl: 'Terug', en: 'Back', de: 'Zurück', es: 'Atrás' },
  next:      { nl: 'Volgende', en: 'Next', de: 'Weiter', es: 'Siguiente' },
  done:      { nl: 'Klaar!', en: 'Done!', de: 'Fertig!', es: '¡Listo!' },
  solo:      { nl: 'Solo', en: 'Solo', de: 'Allein', es: 'Solo/a' },
  couple:    { nl: 'Koppel', en: 'Couple', de: 'Paar', es: 'Pareja' },
  family:    { nl: 'Gezin', en: 'Family', de: 'Familie', es: 'Familia' },
  group:     { nl: 'Groep', en: 'Group', de: 'Gruppe', es: 'Grupo' },
  beach:     { nl: 'Strand', en: 'Beach', de: 'Strand', es: 'Playa' },
  culture:   { nl: 'Cultuur', en: 'Culture', de: 'Kultur', es: 'Cultura' },
  nature:    { nl: 'Natuur', en: 'Nature', de: 'Natur', es: 'Naturaleza' },
  gastro:    { nl: 'Gastronomie', en: 'Gastronomy', de: 'Gastronomie', es: 'Gastronomía' },
  active:    { nl: 'Actief', en: 'Active', de: 'Aktiv', es: 'Activo' },
  nightlife: { nl: 'Nachtleven', en: 'Nightlife', de: 'Nachtleben', es: 'Vida nocturna' },
  vacation:  { nl: 'Vakantie', en: 'Vacation', de: 'Urlaub', es: 'Vacaciones' },
  business:  { nl: 'Zakelijk', en: 'Business', de: 'Geschäftlich', es: 'Negocios' },
  first:     { nl: 'Eerste bezoek', en: 'First visit', de: 'Erster Besuch', es: 'Primera visita' },
  returning: { nl: 'Terugkerend', en: 'Returning', de: 'Wiederkehrend', es: 'Recurrente' },
  wheelchair:{ nl: 'Rolstoeltoegankelijk', en: 'Wheelchair accessible', de: 'Rollstuhlgerecht', es: 'Accesible en silla' },
  vegetarian:{ nl: 'Vegetarisch', en: 'Vegetarian', de: 'Vegetarisch', es: 'Vegetariano' },
  kids:      { nl: 'Kindvriendelijk', en: 'Kid-friendly', de: 'Kinderfreundlich', es: 'Para niños' },
  pets:      { nl: 'Huisdieren', en: 'Pets welcome', de: 'Haustiere', es: 'Mascotas' },
};

const COMPANIONS = [
  { key: 'solo', emoji: '🧑' },
  { key: 'couple', emoji: '💑' },
  { key: 'family', emoji: '👨‍👩‍👧‍👦' },
  { key: 'group', emoji: '👪' },
];

const INTERESTS = [
  { key: 'beach', emoji: '🏖️' },
  { key: 'culture', emoji: '🏛️' },
  { key: 'nature', emoji: '🌿' },
  { key: 'gastro', emoji: '🍷' },
  { key: 'active', emoji: '🚴' },
  { key: 'nightlife', emoji: '🌙' },
];

const PURPOSE = [
  { key: 'vacation', emoji: '☀️' },
  { key: 'business', emoji: '💼' },
];

const FREQUENCY = [
  { key: 'first', emoji: '🆕' },
  { key: 'returning', emoji: '🔄' },
];

const SPECIAL = [
  { key: 'wheelchair', emoji: '♿' },
  { key: 'vegetarian', emoji: '🥬' },
  { key: 'kids', emoji: '👶' },
  { key: 'pets', emoji: '🐾' },
];

export default function OnboardingSheet({ locale, primaryColor }: OnboardingSheetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimizing, setIsMinimizing] = useState(false);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({});

  const accent = primaryColor || 'var(--hb-primary)';
  const t = (key: string) => T[key]?.[locale] || T[key]?.en || key;

  useEffect(() => {
    const complete = localStorage.getItem('hb_onboarding_complete');
    const dismissed = localStorage.getItem('hb_onboarding_dismissed');
    if (complete !== 'true' && dismissed !== 'true') {
      // Small delay so homepage renders first
      const timer = setTimeout(() => setIsVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = useCallback(() => {
    setIsMinimizing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsMinimizing(false);
      localStorage.setItem('hb_onboarding_dismissed', 'true');
      window.dispatchEvent(new Event('hb:onboarding-update'));
    }, 500);
  }, []);

  const complete = useCallback(() => {
    localStorage.setItem('hb_onboarding_complete', 'true');
    localStorage.setItem('hb_onboarding_data', JSON.stringify(data));
    setIsMinimizing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsMinimizing(false);
      window.dispatchEvent(new Event('hb:onboarding-update'));
    }, 500);
  }, [data]);

  const goNext = useCallback(() => {
    if (step < 3) {
      setStep(s => s + 1);
    } else {
      complete();
    }
  }, [step, complete]);

  const goBack = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  // Step 1 auto-advance
  const selectCompanion = (key: string) => {
    setData(d => ({ ...d, travel_companion: key }));
    setTimeout(() => setStep(1), 400);
  };

  const toggleInterest = (key: string) => {
    setData(d => {
      const current = d.interests || [];
      const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
      return { ...d, interests: next };
    });
  };

  const toggleSpecial = (key: string) => {
    setData(d => {
      const current = d.special_needs || [];
      const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
      return { ...d, special_needs: next };
    });
  };

  if (!isVisible) return null;

  const canNext =
    step === 0 ? !!data.travel_companion :
    step === 1 ? (data.interests?.length ?? 0) > 0 :
    step === 2 ? !!data.visit_purpose && !!data.visit_frequency :
    true; // step 4 always allowed

  const questions = [
    { q: t('step1_q'), h: t('step1_h') },
    { q: t('step2_q'), h: t('step2_h') },
    { q: t('step3_q'), h: t('step3_h') },
    { q: t('step4_q'), h: t('step4_h') },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] transition-opacity duration-300"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={dismiss}
      />

      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[61] flex flex-col bg-white"
        style={{
          maxHeight: '85vh',
          borderRadius: '24px 24px 0 0',
          transformOrigin: 'bottom right',
          transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease',
          transform: isMinimizing ? 'scale(0.05) translateY(20px)' : 'scale(1) translateY(0)',
          opacity: isMinimizing ? 0 : 1,
          boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
        }}
      >
        {/* ── Sticky Header ── */}
        <div className="flex-shrink-0 px-5 pt-3 pb-4 relative">
          {/* Handle bar */}
          <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-3" />

          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-3 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Progress dots */}
          <div className="flex gap-2 justify-center mb-3">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 24 : 8,
                  backgroundColor: i <= step ? accent : '#E5E7EB',
                }}
              />
            ))}
          </div>

          {/* Question */}
          <h2 className="text-xl font-bold text-gray-900 text-center">{questions[step].q}</h2>
          <p className="text-sm text-gray-500 text-center mt-1">{questions[step].h}</p>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ minHeight: 0 }}>

          {/* Step 1: Travel companion — single select list */}
          {step === 0 && (
            <div className="flex flex-col gap-3">
              {COMPANIONS.map(c => (
                <button
                  key={c.key}
                  onClick={() => selectCompanion(c.key)}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 transition-all duration-200 text-left"
                  style={{
                    borderColor: data.travel_companion === c.key ? accent : '#E5E7EB',
                    backgroundColor: data.travel_companion === c.key ? `${accent}10` : '#fff',
                  }}
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <span className="text-base font-medium text-gray-800">{t(c.key)}</span>
                  {data.travel_companion === c.key && (
                    <svg className="ml-auto" width="20" height="20" viewBox="0 0 24 24" fill={accent} stroke="#fff" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="9 12 11.5 14.5 15.5 9.5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Interests — multi-select grid */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {INTERESTS.map(item => {
                const selected = data.interests?.includes(item.key);
                return (
                  <button
                    key={item.key}
                    onClick={() => toggleInterest(item.key)}
                    className="flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl border-2 transition-all duration-200"
                    style={{
                      borderColor: selected ? accent : '#E5E7EB',
                      backgroundColor: selected ? `${accent}10` : '#fff',
                    }}
                  >
                    <span className="text-3xl">{item.emoji}</span>
                    <span className="text-sm font-medium text-gray-700">{t(item.key)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 3: Visit description — dual single-select */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              {/* Sub-block A: Purpose */}
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">{t('step3_a')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {PURPOSE.map(item => {
                    const selected = data.visit_purpose === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setData(d => ({ ...d, visit_purpose: item.key }))}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl border-2 transition-all duration-200"
                        style={{
                          borderColor: selected ? accent : '#E5E7EB',
                          backgroundColor: selected ? `${accent}10` : '#fff',
                        }}
                      >
                        <span className="text-2xl">{item.emoji}</span>
                        <span className="text-sm font-medium text-gray-700">{t(item.key)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sub-block B: Frequency */}
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">{t('step3_b')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {FREQUENCY.map(item => {
                    const selected = data.visit_frequency === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setData(d => ({ ...d, visit_frequency: item.key }))}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl border-2 transition-all duration-200"
                        style={{
                          borderColor: selected ? accent : '#E5E7EB',
                          backgroundColor: selected ? `${accent}10` : '#fff',
                        }}
                      >
                        <span className="text-2xl">{item.emoji}</span>
                        <span className="text-sm font-medium text-gray-700">{t(item.key)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Special needs — multi-select grid (optional) */}
          {step === 3 && (
            <div className="grid grid-cols-2 gap-3">
              {SPECIAL.map(item => {
                const selected = data.special_needs?.includes(item.key);
                return (
                  <button
                    key={item.key}
                    onClick={() => toggleSpecial(item.key)}
                    className="flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl border-2 transition-all duration-200"
                    style={{
                      borderColor: selected ? accent : '#E5E7EB',
                      backgroundColor: selected ? `${accent}10` : '#fff',
                    }}
                  >
                    <span className="text-3xl">{item.emoji}</span>
                    <span className="text-sm font-medium text-gray-700">{t(item.key)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Sticky Footer ── */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 flex items-center safe-area-pb"
          style={{ justifyContent: step === 0 ? 'center' : 'space-between' }}
        >
          {/* Skip / Back */}
          {step === 0 ? (
            <button
              onClick={dismiss}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 py-2 px-4"
            >
              {t('skip')}
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={dismiss}
                className="text-sm font-medium text-gray-500 hover:text-gray-700 py-2 px-3"
              >
                {t('skip')}
              </button>
              <button
                onClick={goBack}
                className="text-sm font-medium text-gray-600 hover:text-gray-800 py-2 px-3"
              >
                {t('back')}
              </button>
            </div>
          )}

          {/* Next / Done */}
          {step > 0 && (
            <button
              onClick={goNext}
              disabled={!canNext}
              className="text-sm font-semibold py-2.5 px-6 rounded-full text-white transition-all duration-200 disabled:opacity-40"
              style={{ backgroundColor: accent }}
            >
              {step === 3 ? t('done') : t('next')}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
