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

// SVG Refresh Icon component - circular arrows
const RefreshIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1.04 6.65 2.88" />
    <path d="M21 3v6h-6" />
  </svg>
);

// Translated tip titles
const tipTitles: Record<string, string> = {
  nl: 'Tip van de Dag',
  en: 'Tip of the Day',
  de: 'Tipp des Tages',
  es: 'Consejo del Día',
  sv: 'Dagens Tips',
  pl: 'Porada Dnia'
};

// Category-specific icons for POIs
const getCategoryIcon = (poi: any): string => {
  if (!poi) return '📍';
  const category = (poi.category || '').toLowerCase();
  const subcategory = (poi.subcategory || poi.poi_type || '').toLowerCase();
  const name = (poi.name || '').toLowerCase();

  // Beach & Nature
  if (category.includes('beach') || subcategory.includes('beach') || name.includes('playa')) return '🏖️';
  if (category.includes('nature') || subcategory.includes('park') || subcategory.includes('hiking')) return '🌲';
  if (subcategory.includes('viewpoint') || name.includes('mirador')) return '🏔️';

  // Food & Drinks
  if (category.includes('food') || category.includes('restaurant')) {
    if (subcategory.includes('seafood') || name.includes('marisco')) return '🦐';
    if (subcategory.includes('tapas')) return '🍢';
    if (subcategory.includes('pizz')) return '🍕';
    if (subcategory.includes('coffee') || subcategory.includes('cafe') || subcategory.includes('café')) return '☕';
    if (subcategory.includes('bakery') || subcategory.includes('panadería')) return '🥐';
    if (subcategory.includes('ice') || subcategory.includes('helad')) return '🍦';
    if (subcategory.includes('bar') || subcategory.includes('wine')) return '🍷';
    return '🍽️';
  }

  // Culture & History
  if (category.includes('culture') || category.includes('history')) {
    if (subcategory.includes('museum')) return '🏛️';
    if (subcategory.includes('church') || subcategory.includes('iglesia')) return '⛪';
    return '🏛️';
  }

  // Active & Sports
  if (category.includes('active') || category.includes('sport')) {
    if (subcategory.includes('diving') || subcategory.includes('snorkel')) return '🤿';
    if (subcategory.includes('kayak') || subcategory.includes('paddle')) return '🚣';
    if (subcategory.includes('cycling') || subcategory.includes('bike')) return '🚴';
    if (subcategory.includes('golf')) return '⛳';
    return '🏃';
  }

  // Shopping
  if (category.includes('shopping')) {
    if (subcategory.includes('market') || subcategory.includes('mercado')) return '🛒';
    return '🛍️';
  }

  // Recreation
  if (category.includes('recreation')) {
    if (subcategory.includes('spa') || subcategory.includes('wellness')) return '💆';
    return '🎯';
  }

  return '📍'; // Default
};

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

  // Store last itinerary options for shuffle functionality
  const [lastItineraryOptions, setLastItineraryOptions] = useState<ItineraryOptions | null>(null);
  const [lastDailyTipExcludes, setLastDailyTipExcludes] = useState<string[]>([]);

  const handleItinerarySubmit = async (options: ItineraryOptions) => {
    setShowItineraryBuilder(false);
    setLoadingPOIs(true);
    setLastItineraryOptions(options);
    addAssistantMessage(t.holibotChat.responses.itineraryIntro);

    try {
      const response = await chatApi.buildItinerary({
        duration: options.duration,
        interests: options.interests,
      });

      console.log('[HoliBot] Itinerary response:', response);
      if (response.success && response.data && response.data.itinerary) {
        console.log('[HoliBot] Setting itinerary:', response.data);
        console.log('[HoliBot] Itinerary items:', response.data.itinerary?.length || 0);
        // Set itinerary state BEFORE adding message to prevent race condition
        const itineraryData = { ...response.data };
        setItinerary(itineraryData);
        // Small delay to ensure state is set before adding message
        setTimeout(() => {
          addAssistantMessage(response.data.description, response.data.itinerary.map((item: any) => item.poi).filter(Boolean));
        }, 50);
      } else {
        console.log('[HoliBot] Itinerary failed:', response);
        addAssistantMessage(t.holibotChat.responses.error);
      }
    } catch (error) {
      console.error('Itinerary error:', error);
      addAssistantMessage(t.holibotChat.responses.error);
    } finally {
      setLoadingPOIs(false);
    }
  };

  // Shuffle itinerary - regenerate with same options
  const handleShuffleItinerary = async () => {
    if (!lastItineraryOptions) return;
    setLoadingPOIs(true);
    try {
      const response = await chatApi.buildItinerary({
        duration: lastItineraryOptions.duration,
        interests: lastItineraryOptions.interests,
      });
      if (response.success && response.data) {
        setItinerary(response.data);
        const shuffleLabels = { nl: 'Nieuw programma!', en: 'New program!', de: 'Neues Programm!', es: 'Nuevo programa!', sv: 'Nytt program!', pl: 'Nowy program!' };
        addAssistantMessage(shuffleLabels[language as keyof typeof shuffleLabels] || shuffleLabels.nl);
      }
    } catch (error) {
      console.error('Shuffle error:', error);
    } finally {
      setLoadingPOIs(false);
    }
  };

  // Shuffle daily tip - get new tip excluding previous ones
  const handleShuffleDailyTip = async () => {
    setLoadingPOIs(true);
    try {
      // Add current tip to exclusion list
      const newExcludes = dailyTipPOI?.id ? [...lastDailyTipExcludes, String(dailyTipPOI.id)] : lastDailyTipExcludes;
      setLastDailyTipExcludes(newExcludes);

      const response = await chatApi.getDailyTip(newExcludes);
      if (response.success && response.data) {
        const { poi, event, item, tipDescription } = response.data;
        const displayItem = poi || event || item;
        const shuffleLabels = { nl: 'Nieuwe tip!', en: 'New tip!', de: 'Neuer Tipp!', es: 'Nuevo consejo!', sv: 'Nytt tips!', pl: 'Nowa porada!' };
        addAssistantMessage((shuffleLabels[language as keyof typeof shuffleLabels] || shuffleLabels.nl) + ' ' + tipDescription, displayItem ? [displayItem] : []);
        if (displayItem) setDailyTipPOI(displayItem);
      }
    } catch (error) {
      console.error('Shuffle tip error:', error);
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
        console.log('[HoliBot] Daily tip response:', response);
        if (response.success && response.data) {
          const { poi, event, item, tipDescription, title } = response.data;
          const displayItem = poi || event || item;
          // Add bold title before tip description
          const tipTitle = title || tipTitles[language] || tipTitles.nl;
          const messageWithTitle = `**${tipTitle}**\n\n${tipDescription}`;
          addAssistantMessage(messageWithTitle, displayItem ? [displayItem] : []);
          if (displayItem) {
            console.log('[HoliBot] Setting dailyTipPOI:', displayItem);
            setDailyTipPOI(displayItem);
          }
        } else {
          addAssistantMessage(responses.error);
        }
      } catch (error) {
        console.error('[HoliBot] Daily tip error:', error);
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
            console.log('[HoliBot] Category selected:', { category, subcategory, type });
            setShowCategoryBrowser(false);
            setLoadingPOIs(true);
            try {
              const params = new URLSearchParams({ limit: '10' });
              if (subcategory) params.append('subcategory', subcategory);
              if (type) params.append('type', type);
              const url = '/api/v1/holibot/categories/' + encodeURIComponent(category) + '/pois?' + params;
              console.log('[HoliBot] Fetching POIs from:', url);
              const response = await fetch(url);
              const data = await response.json();
              console.log('[HoliBot] Category POIs response:', data);
              if (data.success && data.data && data.data.length > 0) {
                const filterText = [category, subcategory, type].filter(Boolean).join(' > ');
                console.log('[HoliBot] Setting POIs:', data.data.length);
                addAssistantMessage('Hier zijn locaties in ' + filterText + ':', data.data);
                setPois(data.data);
              } else {
                console.log('[HoliBot] No POIs found or API error');
                addAssistantMessage(t.holibotChat.responses.noResults);
              }
            } catch (error) {
              console.error('[HoliBot] Category search error:', error);
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
        <div className="holibot-daily-tip-container">
          <div className="holibot-daily-tip-header">
            <span className="holibot-daily-tip-icon">💡</span>
            <h4 className="holibot-daily-tip-title">{tipTitles[language] || tipTitles.nl}</h4>
            <button
              className="holibot-refresh-button"
              onClick={handleShuffleDailyTip}
              disabled={loadingPOIs}
              aria-label={language === 'nl' ? 'Andere tip' : language === 'de' ? 'Anderer Tipp' : language === 'es' ? 'Otro consejo' : language === 'sv' ? 'Annat tips' : language === 'pl' ? 'Inna porada' : 'Another tip'}
            >
              <RefreshIcon size={18} />
            </button>
          </div>
          <div className="holibot-daily-tip-poi">
            <POICard key={dailyTipPOI.id} poi={dailyTipPOI} onClick={() => setSelectedPOIId(dailyTipPOI.id)} />
          </div>
        </div>
      )}

      {/* DEBUG: Log itinerary state at render */}
      {console.log('[HoliBot RENDER] itinerary:', itinerary, 'hasItinerary:', !!itinerary?.itinerary)}

      {itinerary?.itinerary && (
        <div className="holibot-itinerary-container">
          <div className="holibot-itinerary-header">
            <span className="holibot-itinerary-header-icon">📋</span>
            <h4>{t.holibotChat.responses.yourItinerary || 'Jouw Programma'}</h4>
            <button
              className="holibot-refresh-button"
              onClick={handleShuffleItinerary}
              disabled={loadingPOIs}
              aria-label={language === 'nl' ? 'Ander programma' : language === 'de' ? 'Anderes Programm' : language === 'es' ? 'Otro programa' : language === 'sv' ? 'Annat program' : language === 'pl' ? 'Inny program' : 'Another program'}
            >
              <RefreshIcon size={18} />
            </button>
          </div>
          <div className="holibot-itinerary-timeline">
            {itinerary.itinerary.map((item: any, index: number) => {
              // Use category-specific icon for POIs, special icons for events/meals
              const typeIcon = item.type === 'event' ? '🎭' :
                               item.type === 'lunch' ? '🍽️' :
                               item.type === 'dinner' ? '🍷' :
                               getCategoryIcon(item.poi);
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
