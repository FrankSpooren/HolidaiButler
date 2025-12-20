import { useState, useEffect, useRef } from 'react';
import { useHoliBot } from '../../contexts/HoliBotContext';
import { useLanguage } from '../../../i18n/LanguageContext';
import { WelcomeMessage } from './WelcomeMessage';
import { QuickReplies } from './QuickReplies';
import { POICard } from './POICard';
import { ChatMessage } from './ChatMessage';
import { ItineraryBuilder, type ItineraryOptions } from './ItineraryBuilder';
import { CategoryBrowser } from './CategoryBrowser';
import { POIDetailModal } from '../../../features/poi/components/POIDetailModal';
import { chatApi } from '../../services/chat.api';
import type { POI } from '../../types/poi.types';
import './MessageList.css';

/**
 * MessageList - POI Recommendations + Chat
 * Phase 8: Itinerary Builder with choices
 */

export function MessageList() {
  const { language, messages, isLoading, isOpen, addAssistantMessage, sendMessage, wasReset } = useHoliBot();
  const { t } = useLanguage();

  const [pois, setPois] = useState<POI[]>([]);
  const [loadingPOIs, setLoadingPOIs] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dailyTipPOI, setDailyTipPOI] = useState<POI | null>(null);
  const [selectedPOIId, setSelectedPOIId] = useState<number | null>(null);
  const [itinerary, setItinerary] = useState<any>(null);
  const [showItineraryBuilder, setShowItineraryBuilder] = useState(false);
  const [showCategoryBrowser, setShowCategoryBrowser] = useState(false);
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
      setShowCategoryBrowser(false);
    } else {
      messageListRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [isOpen]);

  // Clear all local states when chat is reset
  useEffect(() => {
    if (wasReset || messages.length === 0) {
      setPois([]);
      setDailyTipPOI(null);
      setItinerary(null);
      setShowItineraryBuilder(false);
      setShowCategoryBrowser(false);
    }
  }, [wasReset, messages.length]);

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
          }).join('\n');

        const eventsNote = response.data.hasEvents ? '\n\n🎭 *' + response.data.eventsIncluded + ' evenement(en) toegevoegd*' : '';
        addAssistantMessage(response.data.description + '\n\n' + itineraryText + eventsNote, response.data.itinerary.map((item: any) => item.poi).filter(Boolean));
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
      setShowCategoryBrowser(true);
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
      {messages.length === 0 && !showItineraryBuilder && !showCategoryBrowser && (
        <>
          <WelcomeMessage
            language={language}
            onComplete={() => setShowSuggestions(true)}
            skipAnimation={wasReset}
          />
          {(showSuggestions || wasReset) && (
            <QuickReplies
              replies={quickReplies}
              onSelect={handleQuickReply}
              onAllVisible={() => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)}
              skipAnimation={wasReset}
            />
          )}
        </>
      )}

      {showCategoryBrowser && (
        <CategoryBrowser
          onSelect={async (category, subcategory, type) => {
            setShowCategoryBrowser(false);
            setLoadingPOIs(true);
            try {
              const params = new URLSearchParams({ limit: '10' });
              if (subcategory) params.append('subcategory', subcategory);
              if (type) params.append('type', type);
              const url = '/api/v1/holibot/categories/' + encodeURIComponent(category) + '/pois?' + params;
              const response = await fetch(url);
              const data = await response.json();
              if (data.success && data.data.length > 0) {
                const filterText = [category, subcategory, type].filter(Boolean).join(' > ');
                addAssistantMessage('Hier zijn locaties in ' + filterText + ':', data.data);
                setPois(data.data);
              } else {
                addAssistantMessage(t.holibotChat.responses.noResults);
              }
            } catch (error) {
              console.error('Category search error:', error);
              addAssistantMessage(t.holibotChat.responses.error);
            } finally {
              setLoadingPOIs(false);
            }
          }}
          onCancel={() => setShowCategoryBrowser(false)}
        />
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
        <div className="holibot-itinerary-container">
          <div className="holibot-itinerary-header">
            <span className="holibot-itinerary-header-icon">📋</span>
            <h4>{t.holibotChat.responses.yourItinerary || 'Jouw Programma'}</h4>
          </div>
          <div className="holibot-itinerary-timeline">
            {itinerary.itinerary.map((item: any, index: number) => {
              const typeIcon = item.type === 'event' ? '🎭' : item.type === 'lunch' ? '🍽️' : item.type === 'dinner' ? '🍷' : '📍';
              const typeClass = item.type === 'event' ? 'event' : (item.type === 'lunch' || item.type === 'dinner') ? item.type : '';
              const labelClass = item.type === 'event' ? 'event' : (item.type === 'lunch' || item.type === 'dinner') ? 'meal' : '';
              return (
                <div key={index} className="holibot-itinerary-item">
                  <div className="holibot-itinerary-time-column">
                    <span className="holibot-itinerary-time">{item.time}</span>
                    <div className={'holibot-itinerary-type-badge ' + typeClass}>{typeIcon}</div>
                  </div>
                  <div className="holibot-itinerary-content">
                    {item.poi ? (
                      <div className="holibot-itinerary-card" onClick={() => setSelectedPOIId(item.poi.id)}>
                        <div className="holibot-itinerary-card-header">
                          {item.poi.image_url ? (
                            <img src={item.poi.image_url} alt={item.poi.name} className="holibot-itinerary-card-image" />
                          ) : (
                            <div className="holibot-itinerary-card-image placeholder">{typeIcon}</div>
                          )}
                          <div className="holibot-itinerary-card-info">
                            <p className="holibot-itinerary-card-name">{item.poi.name}</p>
                            {item.label && <p className={'holibot-itinerary-card-label ' + labelClass}>{item.label}</p>}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="holibot-itinerary-card">
                        <div className="holibot-itinerary-card-header">
                          <div className="holibot-itinerary-card-image placeholder">{typeIcon}</div>
                          <div className="holibot-itinerary-card-info">
                            <p className="holibot-itinerary-card-name">{item.label || 'TBD'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {itinerary.hasEvents && (
            <div className="holibot-itinerary-events-note">
              <span>🎭</span>
              <span>{itinerary.eventsIncluded} {t.holibotChat.responses.eventsAdded || 'evenement(en) toegevoegd'}</span>
            </div>
          )}
        </div>
      )}

      <div ref={messagesEndRef} />

      {selectedPOIId && <POIDetailModal poiId={selectedPOIId} isOpen={true} onClose={() => setSelectedPOIId(null)} />}
    </div>
  );
}
