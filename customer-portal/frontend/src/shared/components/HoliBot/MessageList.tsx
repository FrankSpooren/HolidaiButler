import { useState, useEffect, useRef } from 'react';
import { useHoliBot } from '../../contexts/HoliBotContext';
import { useLanguage } from '../../../i18n/LanguageContext';
import { WelcomeMessage } from './WelcomeMessage';
import { QuickReplies } from './QuickReplies';
import { POICard } from './POICard';
import { ChatMessage } from './ChatMessage';
import { POIDetailModal } from '../../../features/poi/components/POIDetailModal';
import { chatApi } from '../../services/chat.api';
import type { POI } from '../../types/poi.types';
import './MessageList.css';

/**
 * MessageList - POI Recommendations + Chat
 * Phase 4: POI Integration ✅
 * Phase 6: Chat Conversation ✅
 * Phase 7: Multi-language Quick Actions ✅
 */

export function MessageList() {
  const { language, messages, isLoading, isOpen, addAssistantMessage, sendMessage } = useHoliBot();
  const { t } = useLanguage();

  const [pois, setPois] = useState<POI[]>([]);
  const [loadingPOIs, setLoadingPOIs] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dailyTipPOI, setDailyTipPOI] = useState<POI | null>(null);
  const [selectedPOIId, setSelectedPOIId] = useState<number | null>(null);
  const [itinerary, setItinerary] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  // Get translated quick replies
  const quickReplies = [
    t.holibotChat.quickActions.itinerary,
    t.holibotChat.quickActions.locationInfo,
    t.holibotChat.quickActions.directions,
    t.holibotChat.quickActions.dailyTip,
  ];

  // Reset state when widget closes
  useEffect(() => {
    if (!isOpen) {
      setShowSuggestions(false);
      setDailyTipPOI(null);
      setSelectedPOIId(null);
      setItinerary(null);
    } else {
      if (messageListRef.current) {
        messageListRef.current.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }, [isOpen]);

  // Reset daily tip when messages are cleared
  useEffect(() => {
    if (messages.length === 0 && dailyTipPOI) {
      setDailyTipPOI(null);
      setItinerary(null);
    }
  }, [messages.length, dailyTipPOI]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Handle Quick Action button clicks
   */
  const handleQuickReply = async (reply: string) => {
    const { quickActions, prompts, responses } = t.holibotChat;

    // Quick Action 1: Build Itinerary
    if (reply === quickActions.itinerary) {
      setLoadingPOIs(true);
      addAssistantMessage(responses.itineraryIntro);

      try {
        const response = await chatApi.buildItinerary({
          duration: 'full-day'
        });

        if (response.success && response.data) {
          setItinerary(response.data);

          // Format itinerary as message
          const itineraryText = response.data.itinerary
            .map((item: any) => `**${item.time}** - ${item.poi.name}`)
            .join('\n');

          addAssistantMessage(`${response.data.description}\n\n${itineraryText}`,
            response.data.itinerary.map((item: any) => item.poi));
        } else {
          addAssistantMessage(responses.error);
        }
      } catch (error) {
        console.error('Itinerary error:', error);
        addAssistantMessage(responses.error);
      } finally {
        setLoadingPOIs(false);
      }
      return;
    }

    // Quick Action 2: Location Info
    if (reply === quickActions.locationInfo) {
      addAssistantMessage(responses.locationSearch);
      // User will type the location name, handled by regular sendMessage
      return;
    }

    // Quick Action 3: Directions
    if (reply === quickActions.directions) {
      addAssistantMessage(responses.directionsHelp);
      // User will type the destination, handled by regular sendMessage
      return;
    }

    // Quick Action 4: Daily Tip
    if (reply === quickActions.dailyTip) {
      setLoadingPOIs(true);

      try {
        const response = await chatApi.getDailyTip();

        if (response.success && response.data) {
          const { poi, tipDescription } = response.data;
          addAssistantMessage(tipDescription, [poi]);
          setDailyTipPOI(poi);
        } else {
          addAssistantMessage(responses.error);
        }
      } catch (error) {
        console.error('Daily tip error:', error);
        addAssistantMessage(responses.error);
      } finally {
        setLoadingPOIs(false);
      }
      return;
    }

    // Default: send as regular message
    sendMessage(reply);
  };

  return (
    <div
      ref={messageListRef}
      className="holibot-message-list"
      role="log"
      aria-live="polite"
      aria-label="Chat berichten"
    >
      {/* Welcome message - only show if no messages yet */}
      {messages.length === 0 && (
        <>
          <WelcomeMessage
            key={`welcome-${isOpen}`}
            language={language}
            onComplete={() => setShowSuggestions(true)}
          />
          {showSuggestions && (
            <QuickReplies
              key={`quickreplies-${isOpen}`}
              replies={quickReplies}
              onSelect={handleQuickReply}
              onAllVisible={() => {
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
            />
          )}
        </>
      )}

      {/* Chat messages */}
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <ChatMessage
          message={{
            id: 'loading',
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true
          }}
        />
      )}

      {/* POI loading */}
      {loadingPOIs && (
        <div className="holibot-loading">{t.holibotChat.responses.loading}</div>
      )}

      {/* POI grid */}
      {pois.length > 0 && (
        <div className="holibot-poi-grid">
          {pois.map((poi) => (
            <POICard key={poi.id} poi={poi} onClick={() => setSelectedPOIId(poi.id)} />
          ))}
        </div>
      )}

      {/* Daily Tip POI Card */}
      {dailyTipPOI && (
        <div className="holibot-daily-tip-poi">
          <POICard
            key={dailyTipPOI.id}
            poi={dailyTipPOI}
            onClick={() => setSelectedPOIId(dailyTipPOI.id)}
          />
        </div>
      )}

      {/* Itinerary POI Cards */}
      {itinerary && itinerary.itinerary && (
        <div className="holibot-itinerary-grid">
          {itinerary.itinerary.map((item: any, index: number) => (
            <div key={index} className="holibot-itinerary-item">
              <span className="holibot-itinerary-time">{item.time}</span>
              <POICard poi={item.poi} onClick={() => setSelectedPOIId(item.poi.id)} />
            </div>
          ))}
        </div>
      )}

      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />

      {/* POI Detail Modal */}
      {selectedPOIId && (
        <POIDetailModal
          poiId={selectedPOIId}
          isOpen={true}
          onClose={() => setSelectedPOIId(null)}
        />
      )}
    </div>
  );
}
