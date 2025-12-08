import { useState, useEffect } from 'react';
import './WCAGModal.css';

interface WCAGModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WCAGModal({ isOpen, onClose }: WCAGModalProps) {
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
          <h2 className="wcag-modal-title">Accessibility Settings</h2>
          <button className="wcag-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="wcag-modal-body">
          {/* Font Size */}
          <div className="wcag-control">
            <label htmlFor="font-size" className="wcag-label">
              Font Size: {fontSize}%
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
              Letter Spacing: {letterSpacing}px
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
              Line Height: {lineHeight.toFixed(1)}
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
            <label className="wcag-label">Contrast Mode</label>
            <div className="wcag-toggle-group">
              <button
                className={`wcag-toggle-btn ${contrast === 'normal' ? 'active' : ''}`}
                onClick={() => setContrast('normal')}
              >
                Normal
              </button>
              <button
                className={`wcag-toggle-btn ${contrast === 'high' ? 'active' : ''}`}
                onClick={() => setContrast('high')}
              >
                High Contrast
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
              <span>Grayscale Mode</span>
            </label>
          </div>
        </div>

        <div className="wcag-modal-footer">
          <button className="wcag-reset-btn" onClick={resetToDefault}>
            Reset to Default
          </button>
          <button className="wcag-apply-btn" onClick={onClose}>
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
