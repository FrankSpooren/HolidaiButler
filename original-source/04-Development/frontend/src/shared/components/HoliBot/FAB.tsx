import { useHoliBot } from '../../contexts/HoliBotContext';
import './FAB.css';

/**
 * FAB - Floating Action Button
 *
 * Enterprise-level chat widget trigger
 * Design: Compass Gold gradient with floating animation
 * Icon: MessageCircle (chat bubble) from old widget
 * Accessibility: WCAG 2.1 AA, keyboard accessible, ARIA labels
 * Performance: GPU-accelerated transform, will-change optimization
 */

export function FAB() {
  const { isOpen, toggle } = useHoliBot();

  return (
    <button
      className={`holibot-fab ${isOpen ? 'holibot-fab-hidden' : ''}`}
      onClick={toggle}
      aria-label="Open HoliBot reisassistent"
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      type="button"
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* MessageCircle icon (chat bubble) */}
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    </button>
  );
}
