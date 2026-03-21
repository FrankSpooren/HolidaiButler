'use client';

import { useState, useEffect } from 'react';

interface AccessibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
}

const translations: Record<string, Record<string, string>> = {
  nl: {
    title: 'Toegankelijkheidsinstellingen',
    fontSize: 'Lettergrootte',
    letterSpacing: 'Letterafstand',
    lineHeight: 'Regelhoogte',
    contrastMode: 'Contrastmodus',
    normal: 'Normaal',
    highContrast: 'Hoog contrast',
    grayscale: 'Grijstintenmodus',
    resetToDefault: 'Standaardinstellingen',
    applyAndClose: 'Toepassen & Sluiten',
  },
  en: {
    title: 'Accessibility Settings',
    fontSize: 'Font Size',
    letterSpacing: 'Letter Spacing',
    lineHeight: 'Line Height',
    contrastMode: 'Contrast Mode',
    normal: 'Normal',
    highContrast: 'High Contrast',
    grayscale: 'Grayscale Mode',
    resetToDefault: 'Reset to Default',
    applyAndClose: 'Apply & Close',
  },
  de: {
    title: 'Barrierefreiheitseinstellungen',
    fontSize: 'Schriftgr\u00F6\u00DFe',
    letterSpacing: 'Zeichenabstand',
    lineHeight: 'Zeilenh\u00F6he',
    contrastMode: 'Kontrastmodus',
    normal: 'Normal',
    highContrast: 'Hoher Kontrast',
    grayscale: 'Graustufenmodus',
    resetToDefault: 'Zur\u00FCcksetzen',
    applyAndClose: 'Anwenden & Schlie\u00DFen',
  },
  es: {
    title: 'Configuraci\u00F3n de Accesibilidad',
    fontSize: 'Tama\u00F1o de Fuente',
    letterSpacing: 'Espaciado de Letras',
    lineHeight: 'Altura de L\u00EDnea',
    contrastMode: 'Modo de Contraste',
    normal: 'Normal',
    highContrast: 'Alto Contraste',
    grayscale: 'Modo Escala de Grises',
    resetToDefault: 'Restablecer',
    applyAndClose: 'Aplicar y Cerrar',
  },
};

const STORAGE_KEY = 'wcag-preferences';

export default function AccessibilityModal({ isOpen, onClose, locale }: AccessibilityModalProps) {
  const t = translations[locale] || translations.en;
  const [fontSize, setFontSize] = useState(100);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [contrast, setContrast] = useState<'normal' | 'high'>('normal');
  const [grayscale, setGrayscale] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const prefs = JSON.parse(saved);
        setFontSize(prefs.fontSize ?? 100);
        setLetterSpacing(prefs.letterSpacing ?? 0);
        setLineHeight(prefs.lineHeight ?? 1.5);
        setContrast(prefs.contrast ?? 'normal');
        setGrayscale(prefs.grayscale ?? false);
      }
    } catch { /* ignore */ }
  }, []);

  // Apply preferences to document + persist
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${fontSize}%`;
    root.style.letterSpacing = `${letterSpacing}px`;
    root.style.lineHeight = `${lineHeight}`;

    root.classList.toggle('wcag-high-contrast', contrast === 'high');
    root.classList.toggle('wcag-grayscale', grayscale);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ fontSize, letterSpacing, lineHeight, contrast, grayscale }));
    } catch { /* ignore */ }
  }, [fontSize, letterSpacing, lineHeight, contrast, grayscale]);

  const resetToDefault = () => {
    setFontSize(100);
    setLetterSpacing(0);
    setLineHeight(1.5);
    setContrast('normal');
    setGrayscale(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[999999] flex items-center justify-center animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="bg-white w-[min(480px,calc(100vw-32px))] max-h-[calc(100vh-64px)] rounded-2xl shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b-2 border-gray-200 gap-3">
          <h2 className="text-base sm:text-xl font-bold text-gray-800 break-words leading-tight">{t.title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all text-3xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Font Size */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {t.fontSize}: {fontSize}%
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFontSize(Math.max(80, fontSize - 10))}
                className="w-10 h-10 bg-gray-100 border-2 border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:border-primary transition-all flex-shrink-0"
                aria-label="Decrease font size"
              >
                A-
              </button>
              <input
                type="range" min="80" max="150" step="10" value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                className="wcag-slider flex-1"
                aria-label="Font size"
              />
              <button
                onClick={() => setFontSize(Math.min(150, fontSize + 10))}
                className="w-10 h-10 bg-gray-100 border-2 border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:border-primary transition-all flex-shrink-0"
                aria-label="Increase font size"
              >
                A+
              </button>
            </div>
          </div>

          {/* Letter Spacing */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {t.letterSpacing}: {letterSpacing}px
            </label>
            <input
              type="range" min="0" max="5" step="0.5" value={letterSpacing}
              onChange={e => setLetterSpacing(Number(e.target.value))}
              className="wcag-slider w-full"
              aria-label="Letter spacing"
            />
          </div>

          {/* Line Height */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {t.lineHeight}: {lineHeight.toFixed(1)}
            </label>
            <input
              type="range" min="1.2" max="2.5" step="0.1" value={lineHeight}
              onChange={e => setLineHeight(Number(e.target.value))}
              className="wcag-slider w-full"
              aria-label="Line height"
            />
          </div>

          {/* Contrast Mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {t.contrastMode}
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setContrast('normal')}
                className={`flex-1 py-3 px-5 rounded-lg text-sm font-semibold border-2 transition-all ${
                  contrast === 'normal'
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-primary/50'
                }`}
              >
                {t.normal}
              </button>
              <button
                onClick={() => setContrast('high')}
                className={`flex-1 py-3 px-5 rounded-lg text-sm font-semibold border-2 transition-all ${
                  contrast === 'high'
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-primary/50'
                }`}
              >
                {t.highContrast}
              </button>
            </div>
          </div>

          {/* Grayscale */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox" checked={grayscale}
              onChange={e => setGrayscale(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary accent-primary"
            />
            <span className="text-sm font-medium text-gray-700">{t.grayscale}</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-5 border-t-2 border-gray-200">
          <button
            onClick={resetToDefault}
            className="flex-1 py-3 px-6 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all"
          >
            {t.resetToDefault}
          </button>
          <button
            onClick={onClose}
            className="flex-[2] py-3 px-6 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
          >
            {t.applyAndClose}
          </button>
        </div>
      </div>
    </div>
  );
}
