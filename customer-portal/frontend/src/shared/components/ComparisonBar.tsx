/**
 * ComparisonBar - Sticky bar showing selected POIs for comparison
 *
 * Sprint 8.0: POI Comparison Feature
 *
 * Features:
 * - Fixed bottom position
 * - Shows count of selected POIs
 * - Compare button (enabled when 2-3 POIs selected)
 * - Clear all button
 * - Animated slide-in/out
 * - Responsive design
 */

import { useComparison } from '../contexts/ComparisonContext';
import { useLanguage } from '../../i18n/LanguageContext';
import './ComparisonBar.css';

interface ComparisonBarProps {
  onCompare: () => void;
}

export function ComparisonBar({ onCompare }: ComparisonBarProps) {
  const { comparisonPOIs, clearComparison } = useComparison();
  const { t } = useLanguage();

  const count = comparisonPOIs.size;
  const isVisible = count > 0;
  const canCompare = count >= 2 && count <= 3;

  if (!isVisible) return null;

  return (
    <div className={`comparison-bar ${isVisible ? 'visible' : ''}`}>
      <div className="comparison-bar-content">
        <div className="comparison-bar-info">
          <span className="comparison-bar-icon">⚖️</span>
          <span className="comparison-bar-text">
            {t.poi.comparison.selectedCount.replace('{count}', count.toString())}
          </span>
          {count === 1 && (
            <span className="comparison-bar-hint">
              {t.poi.comparison.selectToCompare}
            </span>
          )}
          {count > 3 && (
            <span className="comparison-bar-warning">
              {t.poi.comparison.maxReached}
            </span>
          )}
        </div>

        <div className="comparison-bar-actions">
          <button
            onClick={clearComparison}
            className="comparison-bar-btn comparison-bar-btn-clear"
          >
            {t.poi.comparison.clearAll}
          </button>
          <button
            onClick={onCompare}
            disabled={!canCompare}
            className={`comparison-bar-btn comparison-bar-btn-compare ${canCompare ? 'enabled' : 'disabled'}`}
          >
            {t.poi.comparison.compare} ({count})
          </button>
        </div>
      </div>
    </div>
  );
}
