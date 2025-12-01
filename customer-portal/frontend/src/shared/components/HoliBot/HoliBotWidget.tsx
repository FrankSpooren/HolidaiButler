import { FAB } from './FAB';
import { ChatWindow } from './ChatWindow';

/**
 * HoliBotWidget - Native React Chat Widget
 *
 * Enterprise-level AI travel assistant
 * Architecture: Native React component (NOT standalone IIFE)
 * Pattern: Context API + lazy initialization (Zendesk-inspired)
 *
 * Features:
 * - 113 curated POI categories
 * - Personality-aware sorting
 * - Reviews & trust signals
 * - Voice input support
 * - Multi-language (NL, EN, DE, ES, SV)
 * - WCAG 2.1 AA compliant
 *
 * Phase 1: Foundation ✅
 * - FAB button (floating action button)
 * - Basic open/close functionality
 * - window.openHoliBot global function
 *
 * Phase 2: UI Layout ✅
 * - ChatWindow (conditional render when isOpen)
 * - Green header with golden line, logo top-left
 * - MessageList (scrollable container)
 * - InputArea (text field + send button)
 */

export function HoliBotWidget() {
  return (
    <>
      {/* FAB - Always visible in bottom-right */}
      <FAB />

      {/* ChatWindow - Conditionally renders when isOpen = true */}
      <ChatWindow />
    </>
  );
}
