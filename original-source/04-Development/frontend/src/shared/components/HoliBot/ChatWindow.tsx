import { useHoliBot } from '../../contexts/HoliBotContext';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import './ChatWindow.css';

/**
 * ChatWindow - Main chat widget modal
 *
 * Design: MindTrip-inspired concierge experience
 * - Green header with golden line (User requirement)
 * - Calm, sophisticated color palette
 * - Minimalism & visual hierarchy
 * - Mobile-first responsive
 *
 * Accessibility: WCAG 2.1 AA
 * - role="dialog" with aria-modal="true"
 * - Keyboard navigation (Tab, Escape)
 * - Focus trap within modal
 */

export function ChatWindow() {
  const { isOpen, close } = useHoliBot();

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay backdrop */}
      <div
        className="holibot-overlay"
        onClick={close}
        aria-hidden="true"
      />

      {/* Chat modal */}
      <div
        className="holibot-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="holibot-title"
      >
        {/* Green header with golden line, logo top-left */}
        <ChatHeader />

        {/* Scrollable message list */}
        <MessageList />

        {/* Input area with text field + send button */}
        <InputArea />
      </div>
    </>
  );
}
