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

// Main category icons (level 1) - for time slot badges
const categoryIconPaths: Record<string, string> = {
  'Beaches & Nature': '/assets/category-icons/beaches-nature.png',
  'Food & Drinks': '/assets/category-icons/food-drinks.png',
  'Culture & History': '/assets/category-icons/culture-history.png',
  'Active': '/assets/category-icons/active.png',
  'Shopping': '/assets/category-icons/shopping.png',
  'Recreation': '/assets/category-icons/recreation.png',
  'Nightlife': '/assets/category-icons/subcategories/nightlife.webp',
  'default': '/assets/category-icons/active.png'
};

// Subcategory icons (level 2/3) - for POI cards in itinerary
const subcategoryIconPaths: Record<string, string> = {
  // Beaches & Nature
  'Beaches': '/assets/category-icons/subcategories/beaches.webp',
  'Parks & Gardens': '/assets/category-icons/subcategories/parks-gardens.webp',
  'Viewpoints & Nature': '/assets/category-icons/subcategories/viewpoints-nature.webp',
  'Nature Reserve': '/assets/category-icons/subcategories/nature-reserve.png',
  // Food & Drinks
  'Bar Restaurants': '/assets/category-icons/subcategories/bar-restaurants-dining.png',
  'Bars': '/assets/category-icons/subcategories/bars-wine.png',
  'Breakfast & Coffee': '/assets/category-icons/subcategories/breakfast-coffee.webp',
  'Fastfood': '/assets/category-icons/subcategories/fastfood.webp',
  'Restaurants': '/assets/category-icons/subcategories/restaurants.webp',
  'Tapas Bars': '/assets/category-icons/subcategories/tapas.webp',
  'Beach Bars & Chiringuitos': '/assets/category-icons/subcategories/beach-bars.png',
  'Bars & Pubs': '/assets/category-icons/subcategories/bars-pubs.png',
  'Gastrobars & Lounges': '/assets/category-icons/subcategories/gastrobars.png',
  'Cocktail & Lounge Bars': '/assets/category-icons/subcategories/gastrobars.png',
  'Cafés & Coffee Shops': '/assets/category-icons/subcategories/cafe.webp',
  'Bakeries & Pastries': '/assets/category-icons/subcategories/bakery.webp',
  'Ice Cream & Desserts': '/assets/category-icons/subcategories/ice-cream.webp',
  'Seafood & Fish': '/assets/category-icons/subcategories/seafood.webp',
  'Italian': '/assets/category-icons/subcategories/italian.webp',
  'Spanish & Tapas': '/assets/category-icons/subcategories/tapas.webp',
  'Mediterranean': '/assets/category-icons/subcategories/mediterranean.webp',
  'Grill & Steakhouse': '/assets/category-icons/subcategories/grill.webp',
  // Culture & History
  'Arts & Museums': '/assets/category-icons/subcategories/arts-museums.webp',
  'Historical Sites': '/assets/category-icons/subcategories/historical.webp',
  'Religious Buildings': '/assets/category-icons/subcategories/churches.webp',
  'Squares & Public Spaces': '/assets/category-icons/subcategories/squares.png',
  'Museums': '/assets/category-icons/subcategories/museums.webp',
  'Galleries': '/assets/category-icons/subcategories/galleries.webp',
  // Active
  'Cycling': '/assets/category-icons/subcategories/cycling.webp',
  'Golf': '/assets/category-icons/subcategories/golf.png',
  'Hiking': '/assets/category-icons/subcategories/hiking-boot.png',
  'Padel': '/assets/category-icons/subcategories/padel.png',
  'Sports & Fitness': '/assets/category-icons/subcategories/fitness.webp',
  'Water Sports': '/assets/category-icons/subcategories/water-sports-sail.png',
  'Diving': '/assets/category-icons/subcategories/diving.webp',
  // Shopping
  'Fashion & Clothing': '/assets/category-icons/subcategories/fashion.webp',
  'Home & Lifestyle': '/assets/category-icons/subcategories/home-lifestyle.webp',
  'Markets': '/assets/category-icons/subcategories/markets.webp',
  'Specialty Stores': '/assets/category-icons/subcategories/specialty.webp',
  'Supermarkets & Food': '/assets/category-icons/subcategories/supermarkets.webp',
  'Personal Care & Beauty': '/assets/category-icons/subcategories/beauty.webp',
  // Recreation
  'Entertainment': '/assets/category-icons/subcategories/entertainment.webp',
  'Nightlife & Clubs': '/assets/category-icons/subcategories/nightlife.webp',
  'Playgrounds & Leisure Areas': '/assets/category-icons/subcategories/playground.png',
  'Amusement & Venues': '/assets/category-icons/subcategories/amusement.webp',
  'Betting & Gambling': '/assets/category-icons/subcategories/gaming.webp',
};

// Get main category icon path (for time slot badge)
const getCategoryIconPath = (poi: any): string => {
  if (!poi) return categoryIconPaths.default;
  const category = poi.category || '';
  return categoryIconPaths[category] || categoryIconPaths.default;
};

// Get subcategory icon path (for POI cards in itinerary)
const getSubcategoryIconPath = (poi: any): string => {
  if (!poi) return categoryIconPaths.default;

  // First try poi_type (most specific), then subcategory, then category
  const poiType = poi.poi_type || '';
  const subcategory = poi.subcategory || '';
  const category = poi.category || '';

  if (poiType && subcategoryIconPaths[poiType]) {
    return subcategoryIconPaths[poiType];
  }
  if (subcategory && subcategoryIconPaths[subcategory]) {
    return subcategoryIconPaths[subcategory];
  }
  // Fall back to main category icon
  return categoryIconPaths[category] || categoryIconPaths.default;
};

// Render icon as image element
const renderIconImg = (iconPath: string, alt: string, size: number = 24) => (
  <img
    src={iconPath}
    alt={alt}
    className="itinerary-icon-img"
    style={{ width: size, height: size, objectFit: 'contain', borderRadius: 4 }}
    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
  />
);

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
  // Category POI pagination state
  const [categoryPoisOffset, setCategoryPoisOffset] = useState(0);
  const [categoryPoisHasMore, setCategoryPoisHasMore] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<{category: string; subcategory?: string; type?: string} | null>(null);
  const [loadingMorePois, setLoadingMorePois] = useState(false);
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
      // Clear pagination state
      setCategoryPoisOffset(0);
      setCategoryPoisHasMore(false);
      setCategoryFilter(null);
    }
  }, [wasReset, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showItineraryBuilder]);

  // Store last itinerary options for shuffle functionality
  const [lastItineraryOptions, setLastItineraryOptions] = useState<ItineraryOptions | null>(null);
  const [lastDailyTipExcludes, setLastDailyTipExcludes] = useState<string[]>([]);

  // Load more POIs for category browser (pagination)
  const loadMoreCategoryPois = async () => {
    if (!categoryFilter || loadingMorePois) return;
    setLoadingMorePois(true);
    try {
      const LOAD_MORE_LIMIT = 3;
      const newOffset = pois.length;
      const params = new URLSearchParams({
        limit: String(LOAD_MORE_LIMIT + 1), // +1 to check if there are more
        offset: String(newOffset)
      });
      if (categoryFilter.subcategory) params.append('subcategory', categoryFilter.subcategory);
      if (categoryFilter.type) params.append('type', categoryFilter.type);
      const url = '/api/v1/holibot/categories/' + encodeURIComponent(categoryFilter.category) + '/pois?' + params;
      console.log('[HoliBot] Loading more POIs from:', url);
      const response = await fetch(url);
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        const hasMore = data.data.length > LOAD_MORE_LIMIT;
        const newPois = hasMore ? data.data.slice(0, LOAD_MORE_LIMIT) : data.data;
        setCategoryPoisHasMore(hasMore);
        setCategoryPoisOffset(newOffset + newPois.length);
        setPois(prev => [...prev, ...newPois]);
        console.log('[HoliBot] Loaded more POIs:', newPois.length, 'hasMore:', hasMore);
      } else {
        setCategoryPoisHasMore(false);
      }
    } catch (error) {
      console.error('[HoliBot] Load more POIs error:', error);
    } finally {
      setLoadingMorePois(false);
    }
  };

  // Multi-language "show more" labels
  const showMoreLabels: Record<string, string> = {
    nl: 'Meer tonen',
    en: 'Show more',
    de: 'Mehr anzeigen',
    es: 'Mostrar más',
    sv: 'Visa mer',
    pl: 'Pokaż więcej'
  };

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
        // Delay to ensure state is set and React has rendered before adding message
        // Mobile devices may need more time for state updates
        setTimeout(() => {
          addAssistantMessage(response.data.description, response.data.itinerary.map((item: any) => item.poi).filter(Boolean));
        }, 150);
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
            // Reset pagination state
            setCategoryPoisOffset(0);
            setCategoryFilter({ category, subcategory, type });
            try {
              // Initial load: only 3 POIs to avoid overwhelming the user
              const INITIAL_LIMIT = 3;
              const params = new URLSearchParams({ limit: String(INITIAL_LIMIT + 1) }); // +1 to check if there are more
              if (subcategory) params.append('subcategory', subcategory);
              if (type) params.append('type', type);
              const url = '/api/v1/holibot/categories/' + encodeURIComponent(category) + '/pois?' + params;
              console.log('[HoliBot] Fetching POIs from:', url);
              const response = await fetch(url);
              const data = await response.json();
              console.log('[HoliBot] Category POIs response:', data);
              if (data.success && data.data && data.data.length > 0) {
                const filterText = [category, subcategory, type].filter(Boolean).join(' > ');
                // Check if there are more POIs available
                const hasMore = data.data.length > INITIAL_LIMIT;
                const displayPois = hasMore ? data.data.slice(0, INITIAL_LIMIT) : data.data;
                setCategoryPoisHasMore(hasMore);
                console.log('[HoliBot] Setting POIs:', displayPois.length, 'hasMore:', hasMore);
                addAssistantMessage('Hier zijn locaties in ' + filterText + ':', displayPois);
                setPois(displayPois);
              } else {
                console.log('[HoliBot] No POIs found or API error');
                setCategoryPoisHasMore(false);
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
        <div className="holibot-poi-section">
          <div className="holibot-poi-grid">
            {pois.map((poi) => <POICard key={poi.id} poi={poi} onClick={() => setSelectedPOIId(poi.id)} />)}
          </div>
          {categoryPoisHasMore && categoryFilter && (
            <div className="holibot-show-more-container">
              <button
                className="holibot-show-more-button"
                onClick={loadMoreCategoryPois}
                disabled={loadingMorePois}
              >
                {loadingMorePois ? '...' : showMoreLabels[language] || showMoreLabels.nl}
              </button>
            </div>
          )}
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
              // TIME SLOT BADGE: Use main category icon (level 1)
              // - For meals: use Food & Drinks icon
              // - For events: use Recreation icon
              // - For activities: use POI's main category icon
              const getTimeBadgeIcon = () => {
                if (item.type === 'lunch' || item.type === 'dinner') {
                  return categoryIconPaths['Food & Drinks'];
                }
                if (item.type === 'event') {
                  return categoryIconPaths['Recreation'];
                }
                return getCategoryIconPath(item.poi);
              };

              // POI CARD: Use subcategory icon (level 2/3) for consistency with POIs page
              const poiCardIcon = item.poi ? getSubcategoryIconPath(item.poi) : getTimeBadgeIcon();

              const typeClass = item.type === 'event' ? 'event' : (item.type === 'lunch' || item.type === 'dinner') ? item.type : '';
              const labelClass = item.type === 'event' ? 'event' : (item.type === 'lunch' || item.type === 'dinner') ? 'meal' : '';
              return (
                <div key={index} className="holibot-itinerary-item">
                  <div className="holibot-itinerary-time-column">
                    <span className="holibot-itinerary-time">{item.time}</span>
                    <div className={'holibot-itinerary-type-badge ' + typeClass}>
                      {renderIconImg(getTimeBadgeIcon(), item.type || 'activity', 24)}
                    </div>
                  </div>
                  <div className="holibot-itinerary-content">
                    {item.poi ? (
                      <div className="holibot-itinerary-card" onClick={() => setSelectedPOIId(item.poi.id)}>
                        <div className="holibot-itinerary-card-header">
                          {item.poi.image_url || item.poi.thumbnail_url ? (
                            <img src={item.poi.image_url || item.poi.thumbnail_url} alt={item.poi.name} className="holibot-itinerary-card-image" />
                          ) : (
                            <div className="holibot-itinerary-card-image placeholder">
                              {renderIconImg(poiCardIcon, item.poi.name, 28)}
                            </div>
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
                          <div className="holibot-itinerary-card-image placeholder">
                            {renderIconImg(getTimeBadgeIcon(), item.label || 'TBD', 28)}
                          </div>
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
