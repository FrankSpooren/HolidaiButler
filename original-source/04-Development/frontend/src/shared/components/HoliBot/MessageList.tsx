import { useState, useEffect, useRef } from 'react';
import { useHoliBot } from '../../contexts/HoliBotContext';
import { WelcomeMessage } from './WelcomeMessage';
import { QuickReplies } from './QuickReplies';
import { POICard } from './POICard';
import { ChatMessage } from './ChatMessage';
import { POIDetailModal } from '../../../features/poi/components/POIDetailModal';
import { useCategories } from '../../hooks/useCategories';
import { chatApi } from '../../services/chat.api';
import type { POI } from '../../types/poi.types';
import type { PersonalityType } from '../../types/category.types';
import './MessageList.css';

/**
 * MessageList - POI Recommendations + Chat
 * Phase 4: POI Integration ✅
 * Phase 6: Chat Conversation ✅
 */

const quickReplies = [
  'Programma samenstellen',
  'Specifieke locatie-informatie',
  'Routebeschrijving',
  'Mijn Tip van de Dag'
];

const personalityMap: Record<string, PersonalityType> = {
  'Avontuur & actie': 'adventurous',
  'Ontspanning & wellness': 'relaxed',
  'Cultuur & geschiedenis': 'cultural',
  'Natuur & landschap': 'nature'
};

export function MessageList() {
  const { language, messages, isLoading, isOpen, sendMessage, addAssistantMessage } = useHoliBot();
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityType | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [loadingPOIs, setLoadingPOIs] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dailyTipPOI, setDailyTipPOI] = useState<POI | null>(null);
  const [selectedPOIId, setSelectedPOIId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  const { data: categories } = useCategories(language);

  // Reset state when widget closes (prepare for next open)
  useEffect(() => {
    if (!isOpen) {
      // Reset to initial state when closed
      setShowSuggestions(false);
      setDailyTipPOI(null);
      setSelectedPOIId(null);
    } else {
      // Scroll to top when opening
      if (messageListRef.current) {
        messageListRef.current.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }, [isOpen]);

  // Reset daily tip when messages are cleared (via reset button)
  useEffect(() => {
    if (messages.length === 0 && dailyTipPOI) {
      setDailyTipPOI(null);
    }
  }, [messages.length, dailyTipPOI]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQuickReply = async (reply: string) => {
    // Special handling for "Mijn Tip van de Dag"
    if (reply === 'Mijn Tip van de Dag') {
      setLoadingPOIs(true);

      try {
        // Call the daily tip API
        const response = await chatApi.getDailyTip();

        if (response.success && response.data) {
          const { poi, tipDescription } = response.data;

          // Add the tip description directly as assistant message with POI for clickable link
          addAssistantMessage(tipDescription, [poi]);

          // Store the POI to display below
          setDailyTipPOI(poi);
        } else {
          addAssistantMessage('Sorry, ik kon geen tip van de dag ophalen. Probeer het later opnieuw.');
        }
      } catch (error) {
        console.error('Failed to fetch daily tip:', error);
        addAssistantMessage('Er is een fout opgetreden bij het ophalen van de tip van de dag.');
      } finally {
        setLoadingPOIs(false);
      }
      return;
    }

    // Default behavior for other quick replies
    const personality = personalityMap[reply] || 'auto';
    setSelectedPersonality(personality);
    setLoadingPOIs(true);

    try {
      // Fetch POIs based on personality
      const response = await fetch(`http://localhost:3002/api/v1/pois?limit=6`);
      const data = await response.json();
      setPois(data.data || []);
    } catch (error) {
      console.error('Failed to fetch POIs:', error);
    } finally {
      setLoadingPOIs(false);
    }
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
                // Scroll to bottom after all tiles are visible
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

      {/* POI recommendations */}
      {loadingPOIs && (
        <div className="holibot-loading">Loading recommendations...</div>
      )}

      {selectedPersonality && pois.length > 0 && (
        <div className="holibot-poi-grid">
          {pois.map((poi) => (
            <POICard key={poi.id} poi={poi} />
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
