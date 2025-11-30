/**
 * HoliBot Widget - Main Entry Component
 * AI Travel Assistant for Costa Blanca
 *
 * Features:
 * - Floating Action Button (FAB)
 * - Chat Window with message history
 * - Multi-language support
 * - WCAG 2.1 AA accessible
 */

import React from 'react';
import HoliBotFAB from './HoliBotFAB';
import HoliBotChatWindow from './HoliBotChatWindow';

const HoliBotWidget = () => {
  return (
    <>
      {/* FAB - Always visible in bottom-right */}
      <HoliBotFAB />

      {/* Chat Window - Conditionally renders when open */}
      <HoliBotChatWindow />
    </>
  );
};

export default HoliBotWidget;
