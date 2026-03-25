'use client';

interface ChatHeaderProps {
  name: string;
  locale: string;
  accentColor: string;
  onReset: () => void;
  onClose: () => void;
}

export default function ChatHeader({ name, locale, accentColor, onReset, onClose }: ChatHeaderProps) {
  return (
    <div
      className="holibot-chat-header relative"
      style={{
        background: `linear-gradient(135deg, ${accentColor} 0%, color-mix(in srgb, ${accentColor} 85%, black) 100%)`,
        borderBottom: `2px solid ${accentColor}`,
      }}
    >
      {/* Handle bar — mobile bottom-sheet affordance */}
      <div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2">
        <div className="w-10 h-1 rounded-full bg-white/40" />
      </div>

      {/* Avatar */}
      <div className="holibot-header-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C3E50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>

      <h2 id="holibot-title" className="holibot-header-title">{name}</h2>
      <div className="holibot-header-spacer" />

      {/* Reset button */}
      <button
        className="holibot-header-btn"
        onClick={onReset}
        aria-label={locale === 'nl' ? 'Opnieuw starten' : 'Start over'}
        type="button"
        title={locale === 'nl' ? 'Opnieuw starten' : 'Start over'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 12a8 8 0 018-8V0l4 4-4 4V4a6 6 0 100 12 6 6 0 006-6h2a8 8 0 01-16 0z" fill="white" />
        </svg>
      </button>

      {/* Close button */}
      <button
        className="holibot-header-btn holibot-close-btn"
        onClick={onClose}
        aria-label={locale === 'nl' ? 'Sluit chat' : 'Close chat'}
        type="button"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
