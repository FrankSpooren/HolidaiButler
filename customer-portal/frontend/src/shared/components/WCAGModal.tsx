import { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import './WCAGModal.css';

interface WCAGModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// WCAG translations
const wcagTranslations = {
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
    fontSize: 'Schriftgröße',
    letterSpacing: 'Zeichenabstand',
    lineHeight: 'Zeilenhöhe',
    contrastMode: 'Kontrastmodus',
    normal: 'Normal',
    highContrast: 'Hoher Kontrast',
    grayscale: 'Graustufenmodus',
    resetToDefault: 'Zurücksetzen',
    applyAndClose: 'Anwenden & Schließen',
  },
  es: {
    title: 'Configuración de Accesibilidad',
    fontSize: 'Tamaño de Fuente',
    letterSpacing: 'Espaciado de Letras',
    lineHeight: 'Altura de Línea',
    contrastMode: 'Modo de Contraste',
    normal: 'Normal',
    highContrast: 'Alto Contraste',
    grayscale: 'Modo Escala de Grises',
    resetToDefault: 'Restablecer',
    applyAndClose: 'Aplicar y Cerrar',
  },
};

export function WCAGModal({ isOpen, onClose }: WCAGModalProps) {
  const { language } = useLanguage();
  const t = wcagTranslations[language as keyof typeof wcagTranslations] || wcagTranslations.en;
  const [fontSize, setFontSize] = useState<number>(100);
  const [contrast, setContrast] = useState<'normal' | 'high'>('normal');
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  const [lineHeight, setLineHeight] = useState<number>(1.5);
  const [grayscale, setGrayscale] = useState<boolean>(false);

  // Load preferences from localStorage
  useEffect(() => {
    const savedPrefs = localStorage.getItem('wcag-preferences');
    if (savedPrefs) {
      const prefs = JSON.parse(savedPrefs);
      setFontSize(prefs.fontSize || 100);
      setContrast(prefs.contrast || 'normal');
      setLetterSpacing(prefs.letterSpacing || 0);
      setLineHeight(prefs.lineHeight || 1.5);
      setGrayscale(prefs.grayscale || false);
    }
  }, []);

  // Apply preferences to document
  useEffect(() => {
    if (!isOpen) return;

    const root = document.documentElement;
    root.style.fontSize = `${fontSize}%`;
    root.style.letterSpacing = `${letterSpacing}px`;
    root.style.lineHeight = `${lineHeight}`;

    if (contrast === 'high') {
      root.classList.add('wcag-high-contrast');
    } else {
      root.classList.remove('wcag-high-contrast');
    }

    if (grayscale) {
      root.classList.add('wcag-grayscale');
    } else {
      root.classList.remove('wcag-grayscale');
    }

    // Save preferences
    const prefs = { fontSize, contrast, letterSpacing, lineHeight, grayscale };
    localStorage.setItem('wcag-preferences', JSON.stringify(prefs));
  }, [fontSize, contrast, letterSpacing, lineHeight, grayscale, isOpen]);

  const resetToDefault = () => {
    setFontSize(100);
    setContrast('normal');
    setLetterSpacing(0);
    setLineHeight(1.5);
    setGrayscale(false);
    localStorage.removeItem('wcag-preferences');
  };

  if (!isOpen) return null;

  return (
    <div className="wcag-modal-overlay" onClick={onClose}>
      <div className="wcag-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wcag-modal-header">
          <h2 className="wcag-modal-title">{t.title}</h2>
          <button className="wcag-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="wcag-modal-body">
          {/* Font Size */}
          <div className="wcag-control">
            <label htmlFor="font-size" className="wcag-label">
              {t.fontSize}: {fontSize}%
            </label>
            <div className="wcag-slider-container">
              <button
                className="wcag-btn-small"
                onClick={() => setFontSize(Math.max(80, fontSize - 10))}
                aria-label="Decrease font size"
              >
                A-
              </button>
              <input
                id="font-size"
                type="range"
                min="80"
                max="150"
                step="10"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="wcag-slider"
                aria-label="Font size slider"
              />
              <button
                className="wcag-btn-small"
                onClick={() => setFontSize(Math.min(150, fontSize + 10))}
                aria-label="Increase font size"
              >
                A+
              </button>
            </div>
          </div>

          {/* Letter Spacing */}
          <div className="wcag-control">
            <label htmlFor="letter-spacing" className="wcag-label">
              {t.letterSpacing}: {letterSpacing}px
            </label>
            <input
              id="letter-spacing"
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={letterSpacing}
              onChange={(e) => setLetterSpacing(Number(e.target.value))}
              className="wcag-slider"
              aria-label="Letter spacing slider"
            />
          </div>

          {/* Line Height */}
          <div className="wcag-control">
            <label htmlFor="line-height" className="wcag-label">
              {t.lineHeight}: {lineHeight.toFixed(1)}
            </label>
            <input
              id="line-height"
              type="range"
              min="1.2"
              max="2.5"
              step="0.1"
              value={lineHeight}
              onChange={(e) => setLineHeight(Number(e.target.value))}
              className="wcag-slider"
              aria-label="Line height slider"
            />
          </div>

          {/* Contrast Mode */}
          <div className="wcag-control">
            <label className="wcag-label">{t.contrastMode}</label>
            <div className="wcag-toggle-group">
              <button
                className={`wcag-toggle-btn ${contrast === 'normal' ? 'active' : ''}`}
                onClick={() => setContrast('normal')}
              >
                {t.normal}
              </button>
              <button
                className={`wcag-toggle-btn ${contrast === 'high' ? 'active' : ''}`}
                onClick={() => setContrast('high')}
              >
                {t.highContrast}
              </button>
            </div>
          </div>

          {/* Grayscale */}
          <div className="wcag-control">
            <label className="wcag-checkbox-label">
              <input
                type="checkbox"
                checked={grayscale}
                onChange={(e) => setGrayscale(e.target.checked)}
                className="wcag-checkbox"
              />
              <span>{t.grayscale}</span>
            </label>
          </div>
        </div>

        <div className="wcag-modal-footer">
          <button className="wcag-reset-btn" onClick={resetToDefault}>
            {t.resetToDefault}
          </button>
          <button className="wcag-apply-btn" onClick={onClose}>
            {t.applyAndClose}
          </button>
        </div>
      </div>
    </div>
  );
}
