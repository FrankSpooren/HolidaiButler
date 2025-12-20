import { useState, useEffect, useRef } from 'react';
import { useHoliBot } from '../../contexts/HoliBotContext';
import { useLanguage } from '../../../i18n/LanguageContext';
import { WelcomeMessage } from './WelcomeMessage';
import { QuickReplies } from './QuickReplies';
import { POICard } from './POICard';
import { ChatMessage } from './ChatMessage';
import { ItineraryBuilder, type ItineraryOptions } from './ItineraryBuilder';
import { POIDetailModal } from '../../../features/poi/components/POIDetailModal';
import { chatApi } from '../../services/chat.api';
import type { POI } from '../../types/poi.types';
import './MessageList.css';

/**
 * MessageList - POI Recommendations + Chat
 * Phase 8: Itinerary Builder with choices
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
  const [showItineraryBuilder, setShowItineraryBuilder] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  const quickReplies = [
    t.holibotChat.quickActions.itinerary,
    t.holibotChat.quickActions.locationInfo,
    t.holibotChat.quickActions.directions,
    t.holibotChat.quickActions.dailyTip,
  ];

  useEffect(() => {
    if (!isOpen) {
      setShowSuggestions(false);
      setDailyTipPOI(null);
      setSelectedPOIId(null);
      setItinerary(null);
      setShowItineraryBuilder(false);
    } else {
      messageListRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [isOpen]);

  useEffect(() => {
    if (messages.length === 0 && dailyTipPOI) {
      setDailyTipPOI(null);
      setItinerary(null);
    }
  }, [messages.length, dailyTipPOI]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showItineraryBuilder]);

  const handleItinerarySubmit = async (options: ItineraryOptions) => {
    setShowItineraryBuilder(false);
    setLoadingPOIs(true);
    addAssistantMessage(t.holibotChat.responses.itineraryIntro);

    try {
      const response = await chatApi.buildItinerary({
        duration: options.duration,
        interests: options.interests,
      });

      if (response.success && response.data) {
        setItinerary(response.data);
        const itineraryText = response.data.itinerary
          .map((item: any) => {
            const typeIcon = item.type === 'event' ? '🎭' : item.type === 'lunch' ? '🍽️' : item.type === 'dinner' ? '🍷' : '📍';
            const label = item.label ? ' (' + item.label + ')' : '';
            return '**' + item.time + '** ' + typeIcon + ' ' + (item.poi?.name || 'TBD') + label;
          }).join('
');

        const eventsNote = response.data.hasEvents ? '

🎭 *' + response.data.eventsIncluded + ' evenement(en) toegevoegd*' : '';
        addAssistantMessage(response.data.description + '

' + itineraryText + eventsNote, response.data.itinerary.map((item: any) => item.poi).filter(Boolean));
      } else {
        addAssistantMessage(t.holibotChat.responses.error);
      }
    } catch (error) {
      console.error('Itinerary error:', error);
      addAssistantMessage(t.holibotChat.responses.error);
    } finally {
      setLoadingPOIs(false);
    }
  };

  const handleQuickReply = async (reply: string) => {
    const { quickActions, responses } = t.holibotChat;

    if (reply === quickActions.itinerary) {
      setShowItineraryBuilder(true);
      return;
    }

    if (reply === quickActions.locationInfo) {
      addAssistantMessage(responses.locationSearch);
      return;
    }

    if (reply === quickActions.directions) {
      addAssistantMessage(responses.directionsHelp);
      return;
    }

    if (reply === quickActions.dailyTip) {
      setLoadingPOIs(true);
      try {
        const response = await chatApi.getDailyTip();
        if (response.success && response.data) {
          const { poi, event, item, tipDescription } = response.data;
          const displayItem = poi || event || item;
          addAssistantMessage(tipDescription, displayItem ? [displayItem] : []);
          if (displayItem) setDailyTipPOI(displayItem);
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

    sendMessage(reply);
  };

  return (
    <div ref={messageListRef} className="holibot-message-list" role="log" aria-live="polite" aria-label="Chat berichten">
      {messages.length === 0 && !showItineraryBuilder && (
        <>
          <WelcomeMessage key={} language={language} onComplete={() => setShowSuggestions(true)} />
          {showSuggestions && (
            <QuickReplies key={} replies={quickReplies} onSelect={handleQuickReply}
              onAllVisible={() => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)} />
          )}
        </>
      )}

      {showItineraryBuilder && <ItineraryBuilder onSubmit={handleItinerarySubmit} onCancel={() => setShowItineraryBuilder(false)} />}

      {messages.map((message) => <ChatMessage key={message.id} message={message} />)}

      {isLoading && <ChatMessage message={{ id: 'loading', role: 'assistant', content: '', timestamp: new Date(), isStreaming: true }} />}

      {loadingPOIs && <div className="holibot-loading">{t.holibotChat.responses.loading}</div>}

      {pois.length > 0 && (
        <div className="holibot-poi-grid">
          {pois.map((poi) => <POICard key={poi.id} poi={poi} onClick={() => setSelectedPOIId(poi.id)} />)}
        </div>
      )}

      {dailyTipPOI && (
        <div className="holibot-daily-tip-poi">
          <POICard key={dailyTipPOI.id} poi={dailyTipPOI} onClick={() => setSelectedPOIId(dailyTipPOI.id)} />
        </div>
      )}

      {itinerary?.itinerary && (
        <div className="holibot-itinerary-grid">
          {itinerary.itinerary.map((item: any, index: number) => (
            <div key={index} className="holibot-itinerary-item">
              <div className="holibot-itinerary-time-badge">
                <span className="time">{item.time}</span>
                {item.type === 'event' && <span className="type-badge event">🎭</span>}
                {item.type === 'lunch' && <span className="type-badge meal">🍽️</span>}
                {item.type === 'dinner' && <span className="type-badge meal">🍷</span>}
              </div>
              {item.poi && <POICard poi={item.poi} onClick={() => setSelectedPOIId(item.poi.id)} />}
            </div>
          ))}
        </div>
      )}

      <div ref={messagesEndRef} />

      {selectedPOIId && <POIDetailModal poiId={selectedPOIId} isOpen={true} onClose={() => setSelectedPOIId(null)} />}
    </div>
  );
}
