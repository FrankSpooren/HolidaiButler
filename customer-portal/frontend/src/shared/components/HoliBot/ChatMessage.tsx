import { useState } from 'react';
import type { ChatMessage as ChatMessageType } from '../../types/chat.types';
import { useDestination } from '../../contexts/DestinationContext';
import holibotAvatar from '../../../assets/images/hb-merkicoon.png';
import { parseMessageForPOILinks } from '../../utils/poiLinkParser';
import { POIDetailModal } from '../../../features/poi/components/POIDetailModal';
import { SpeakerButton } from './SpeakerButton';
import { MarkdownRenderer } from '../../utils/markdownRenderer';
import './ChatMessage.css';

/**
 * ChatMessage - Individual Message Display
 * Phase 7: POI Clickability in Chat ✅
 * Phase 8: Streaming Support ✅
 * Phase 9: Markdown Rendering ✅
 *
 * Features:
 * - User/Assistant message styling
 * - HoliBot avatar with HolidaiButler brand icon
 * - Timestamp display
 * - Clickable POI links in assistant messages
 * - POI Detail Modal popup on click
 * - Streaming text with blinking cursor
 * - Typing indicator for initial loading
 * - Markdown rendering (bold, italic, lists, headers)
 */

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [selectedPOIId, setSelectedPOIId] = useState<number | null>(null);
  const destination = useDestination();
  const botName = destination.holibot?.name || 'HoliBot';
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Format timestamp
  const time = message.timestamp.toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Parse message content for POI links (assistant messages only, not while streaming)
  const segments = isAssistant && !message.isStreaming
    ? parseMessageForPOILinks(message.content, message.pois)
    : [{ type: 'text' as const, content: message.content }];

  const handlePOIClick = (poiId: number) => {
    setSelectedPOIId(poiId);
  };

  const handleCloseModal = () => {
    setSelectedPOIId(null);
  };

  return (
    <>
      <div
        className={`chat-message chat-message--${message.role}`}
        role="article"
        aria-label={`${isUser ? 'Jouw bericht' : `${botName} antwoord`}`}
      >
        {isAssistant && (
          <div className="chat-message-avatar">
            <img
              src={holibotAvatar}
              alt={botName}
              className="chat-message-avatar-img"
            />
          </div>
        )}

        <div className="chat-message-content">
          <div className="chat-message-bubble">
            {message.isStreaming && !message.content ? (
              <div className="chat-message-typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            ) : isUser ? (
              // User messages: plain text
              <p className="chat-message-text">{message.content}</p>
            ) : (
              // Assistant messages: markdown rendering with POI links
              <div className="chat-message-text">
                {segments.length === 1 && segments[0].type === 'text' ? (
                  // No POI links, use full markdown rendering
                  <MarkdownRenderer content={message.content} />
                ) : (
                  // Has POI links, render with POI buttons
                  <>
                    {segments.map((segment, index) => {
                      if (segment.type === 'poi-link' && segment.poi) {
                        return (
                          <button
                            key={index}
                            className="chat-message-poi-link"
                            onClick={() => handlePOIClick(segment.poi!.id)}
                            type="button"
                          >
                            {segment.content}
                          </button>
                        );
                      }
                      // Render text segments with markdown
                      return (
                        <MarkdownRenderer
                          key={index}
                          content={segment.content}
                          className="inline"
                        />
                      );
                    })}
                  </>
                )}
                {message.isStreaming && <span className="chat-message-cursor" />}
              </div>
            )}
          </div>
          <div className="chat-message-meta">
            <span className="chat-message-time">{time}</span>
            {/* TTS Speaker button for assistant messages */}
            {isAssistant && !message.isStreaming && message.content && (
              <SpeakerButton text={message.content} size="small" />
            )}
          </div>
        </div>
      </div>

      {/* POI Detail Modal */}
      {selectedPOIId && (
        <POIDetailModal
          poiId={selectedPOIId}
          isOpen={true}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
