import { useHoliBot } from '../../contexts/HoliBotContext';
import { useDestination } from '../../contexts/DestinationContext';
import './ChatHeader.css';

/**
 * ChatHeader - Destination-aware header with brand logo
 *
 * Features:
 * - Multi-destination support via DestinationContext
 * - Accent color gradient header (uses CSS variables)
 * - Destination-specific logo icon
 * - Close button with accessibility
 */

export function ChatHeader() {
  const { close, clearMessages, messages } = useHoliBot();
  const destination = useDestination();

  const handleReset = async () => {
    await clearMessages();
  };

  // Only show reset button if there are messages
  const showResetButton = messages.length > 0;

  return (
    <div className="holibot-chat-header">
      {/* Simple user icon (consistent with dev.holidaibutler.com) */}
      <div className="holibot-header-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>

      {/* Title - destination-aware chatbot name */}
      <h2 id="holibot-title" className="holibot-header-title">
        {destination.holibot?.name || 'HoliBot'}
      </h2>

      {/* Spacer to push buttons right */}
      <div className="holibot-header-spacer" />

      {/* Reset button - only show when there are messages */}
      {showResetButton && (
        <button
          className="holibot-reset-button"
          onClick={handleReset}
          aria-label="Nieuwe chat"
          type="button"
          title="Nieuwe chat starten"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M4 12a8 8 0 018-8V0l4 4-4 4V4a6 6 0 100 12 6 6 0 006-6h2a8 8 0 01-16 0z"
              fill="white"
            />
          </svg>
        </button>
      )}

      {/* Close button */}
      <button
        className="holibot-close-button"
        onClick={close}
        aria-label="Sluit chat"
        type="button"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M18 6L6 18M6 6l12 12"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
