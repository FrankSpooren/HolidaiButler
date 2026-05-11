/**
 * Page Templates (Wave 2 — W2.2)
 * 8 template definities met pre-filled block layouts + placeholder content
 */

const pageTemplates = [
  {
    id: 'blank',
    label: 'Blank Page',
    description: 'Start from scratch with an empty page',
    icon: 'InsertDriveFile',
    layout: { blocks: [] }
  },
  {
    id: 'homepage',
    label: 'Homepage (desktop + mobile)',
    description: 'Volledige homepage: hero met chatbot, programma+tip, events, categorieën, kaart, POIs, CTA + 4 mobiele blokken',
    icon: 'Home',
    layout: {
      blocks: [
        { id: 'desktop-hero-1', type: 'desktop_hero', visibility: 'desktop', props: { greeting: { en: 'Welcome!', nl: 'Welkom!' }, subtitle: { en: 'Discover everything with your personal AI travel assistant', nl: 'Ontdek alles met je persoonlijke AI-reisassistent' } } },
        { id: 'desktop-program-1', type: 'desktop_program_tip', visibility: 'desktop', props: { programSize: 4 } },
        { id: 'desktop-events-1', type: 'desktop_events', visibility: 'desktop', props: { limit: 6 }, style: { backgroundColor: '#f8f9fa', paddingY: 'small' } },
        { id: 'desktop-cats-1', type: 'category_grid', visibility: 'desktop', props: {} },
        { id: 'desktop-map-1', type: 'map', visibility: 'desktop', props: { overlayLabel: 'Ontdek alle locaties' }, style: { paddingY: 'medium' } },
        { id: 'desktop-pois-1', type: 'poi_grid', visibility: 'desktop', props: { limit: 6, columns: 3, title: 'Populair' }, style: { paddingY: 'medium' } },
        { id: 'desktop-cta-1', type: 'cta', visibility: 'desktop', props: { headline: { en: 'Ready to explore?', nl: 'Klaar om te ontdekken?' }, description: { en: 'Let our AI assistant plan your perfect day', nl: 'Laat onze AI-assistent je perfecte dag plannen' }, backgroundStyle: 'primary', buttons: [{ label: 'Start Planning', variant: 'chatbot', chatbotAction: 'itinerary' }] } },
        { id: 'mobile-program-1', type: 'mobile_program', visibility: 'mobile', props: { programSize: 4 } },
        { id: 'mobile-tip-1', type: 'mobile_tip', visibility: 'mobile', props: {} },
        { id: 'mobile-events-1', type: 'mobile_events', visibility: 'mobile', props: {} },
        { id: 'mobile-map-1', type: 'mobile_map', visibility: 'mobile', props: { poiLimit: 8 } }
      ]
    }
  },
  {
    id: 'explore',
    label: 'Explore / Ontdekken',
    description: 'POI grid met filters, paginering ("Meer laden"), kaart en weer',
    icon: 'Explore',
    layout: {
      blocks: [
        { id: 'hero-1', type: 'hero', props: { headline: { en: 'Explore', nl: 'Ontdek' }, description: { en: 'Find the best places and activities', nl: 'Vind de beste plekken en activiteiten' }, height: 'compact' } },
        { id: 'poi-grid-1', type: 'poi_grid_filtered', props: { limit: 24, columns: 3 } },
        { id: 'map-1', type: 'map', props: {} }
      ]
    }
  },
  {
    id: 'events',
    label: 'Events / Evenementen',
    description: 'Evenementenkalender met filters',
    icon: 'Event',
    layout: {
      blocks: [
        { id: 'hero-1', type: 'hero', props: { headline: { en: 'Events & Activities', nl: 'Evenementen & Activiteiten' }, height: 'compact' } },
        { id: 'event-cal-1', type: 'event_calendar_filtered', props: { limit: 12, layout: 'list' } }
      ]
    }
  },
  {
    id: 'about',
    label: 'About / Info',
    description: 'Rich text content page with CTA and FAQ',
    icon: 'Info',
    layout: {
      blocks: [
        { id: 'hero-1', type: 'hero', props: { headline: { en: 'About Us', nl: 'Over Ons' } } },
        { id: 'rich-text-1', type: 'rich_text', props: { content: '<h2>Our Story</h2><p>Tell your visitors about your destination...</p>' } },
        { id: 'gallery-1', type: 'gallery', props: { columns: 3, items: [] } },
        { id: 'faq-1', type: 'faq', props: { items: [{ question: { en: 'How do I get there?', nl: 'Hoe kom ik er?' }, answer: { en: 'You can reach us by...', nl: 'U kunt ons bereiken via...' } }] } },
        { id: 'cta-1', type: 'cta', props: { headline: { en: 'Ready to visit?', nl: 'Klaar om te bezoeken?' }, buttons: [{ label: { en: 'Plan your trip', nl: 'Plan je reis' }, url: '/explore', variant: 'primary' }] } }
      ]
    }
  },
  {
    id: 'contact',
    label: 'Contact',
    description: 'Contact form with map and info',
    icon: 'ContactMail',
    layout: {
      blocks: [
        { id: 'hero-1', type: 'hero', props: { headline: { en: 'Contact', nl: 'Contact' }, description: { en: 'Get in touch with us', nl: 'Neem contact met ons op' } } },
        { id: 'contact-form-1', type: 'contact_form', props: { fields: ['name', 'email', 'message'], requireGdpr: true } },
        { id: 'map-1', type: 'map', props: { height: 350, showCategories: false } }
      ]
    }
  },
  {
    id: 'tickets',
    label: 'Tickets & Booking',
    description: 'Ticket shop with CTA banner',
    icon: 'ConfirmationNumber',
    layout: {
      blocks: [
        { id: 'hero-1', type: 'hero', props: { headline: { en: 'Tickets & Booking', nl: 'Tickets & Boeken' }, description: { en: 'Book your experience online', nl: 'Boek je ervaring online' } } },
        { id: 'ticket-shop-1', type: 'ticket_shop', props: {} },
        { id: 'reservation-1', type: 'reservation_widget', props: {} },
        { id: 'faq-1', type: 'faq', props: { items: [{ question: { en: 'Can I cancel my booking?', nl: 'Kan ik mijn boeking annuleren?' }, answer: { en: 'Yes, up to 24 hours before.', nl: 'Ja, tot 24 uur van tevoren.' } }] } }
      ]
    }
  },
  {
    id: 'blog',
    label: 'Blog',
    description: 'Blog overzichtspagina met laatste artikelen uit Content Studio',
    icon: 'Article',
    layout: {
      blocks: [
        { id: 'hero-1', type: 'hero', props: { headline: 'Blog', description: 'Stories, tips and local insights', height: 'compact' } },
        { id: 'blog-grid-1', type: 'blog_grid', props: { limit: 9, columns: 3 } },
        { id: 'cta-1', type: 'cta', props: { headline: 'Want more inspiration?', buttons: [{ label: 'Start chatting', variant: 'chatbot' }] } }
      ]
    }
  },
  {
    id: 'partners',
    label: 'Partners & Sponsors',
    description: 'Partner showcase with downloads',
    icon: 'Handshake',
    layout: {
      blocks: [
        { id: 'hero-1', type: 'hero', props: { headline: { en: 'Our Partners', nl: 'Onze Partners' } } },
        { id: 'rich-text-1', type: 'rich_text', props: { content: '<p>We work together with the following partners...</p>' } },
        { id: 'partners-1', type: 'partners', props: { items: [] } },
        { id: 'downloads-1', type: 'downloads', props: { items: [] } },
        { id: 'cta-1', type: 'cta', props: { headline: { en: 'Become a partner', nl: 'Word partner' }, buttons: [{ label: { en: 'Contact us', nl: 'Neem contact op' }, url: '/contact', variant: 'primary' }] } }
      ]
    }
  },
  // ========== E3 NEW TEMPLATES ==========
  {
    id: 'event_detail',
    label: 'Event Detail',
    description: 'Full event page with booking, calendar, map and FAQ',
    icon: 'EventNote',
    category: 'detail',
    layout: { blocks: [
      { id: 'ed_1', type: 'breadcrumbs', featureFlag: 'hasBreadcrumbsBlock', props: { source: 'auto_url' } },
      { id: 'ed_2', type: 'hero', props: { height: 'compact' } },
      { id: 'ed_3', type: 'rich_text', props: {} },
      { id: 'ed_4', type: 'add_to_calendar', featureFlag: 'hasAddToCalendarBlock', props: { source: 'event_id_from_url' } },
      { id: 'ed_5', type: 'location_details', featureFlag: 'hasLocationDetailsBlock', props: { source: 'manual' } },
      { id: 'ed_6', type: 'map', props: { height: '300px' } },
      { id: 'ed_7', type: 'gallery', props: {} },
      { id: 'ed_8', type: 'related_items', featureFlag: 'hasRelatedItemsBlock', props: { itemType: 'event', limit: 4 } },
      { id: 'ed_9', type: 'faq', props: {} },
      { id: 'ed_10', type: 'cta', props: {} },
    ]}
  },
  {
    id: 'poi_detail',
    label: 'POI Detail',
    description: 'Full POI page with opening hours, map, reviews and related',
    icon: 'PinDrop',
    category: 'detail',
    layout: { blocks: [
      { id: 'pd_1', type: 'breadcrumbs', featureFlag: 'hasBreadcrumbsBlock', props: { source: 'auto_url' } },
      { id: 'pd_2', type: 'hero', props: { height: 'compact' } },
      { id: 'pd_3', type: 'rich_text', props: {} },
      { id: 'pd_4', type: 'opening_hours', featureFlag: 'hasOpeningHoursBlock', props: { source: 'poi' } },
      { id: 'pd_5', type: 'location_details', featureFlag: 'hasLocationDetailsBlock', props: { source: 'poi' } },
      { id: 'pd_6', type: 'map', props: { height: '300px' } },
      { id: 'pd_7', type: 'gallery', props: {} },
      { id: 'pd_8', type: 'related_items', featureFlag: 'hasRelatedItemsBlock', props: { itemType: 'poi', limit: 4 } },
      { id: 'pd_9', type: 'faq', props: {} },
      { id: 'pd_10', type: 'save_to_trip', featureFlag: 'hasSaveToTripBlock', props: { variant: 'add_button' } },
    ]}
  },
  {
    id: 'events_what_on',
    label: "What's On",
    description: 'Events with calendar view and weekend filter',
    icon: 'EventNote',
    category: 'events',
    layout: { blocks: [
      { id: 'wo_1', type: 'hero', props: { height: 'compact' } },
      { id: 'wo_2', type: 'filter_bar', featureFlag: 'hasFilterBarBlock', props: { filters: ['date_preset', 'category'] } },
      { id: 'wo_3', type: 'featured_item', featureFlag: 'hasFeaturedItemBlock', props: { itemType: 'event' } },
      { id: 'wo_4', type: 'event_calendar', props: {} },
      { id: 'wo_5', type: 'calendar_view', featureFlag: 'hasCalendarViewBlock', props: { view: 'dayGridMonth' } },
      { id: 'wo_6', type: 'map_list', featureFlag: 'hasMapListBlock', props: { source: 'events' } },
      { id: 'wo_7', type: 'cta', props: {} },
      { id: 'wo_8', type: 'newsletter', props: {} },
    ]}
  },
  {
    id: 'reservations',
    label: 'Reservations',
    description: 'Reservation page with opening hours and location',
    icon: 'BookOnline',
    category: 'commerce',
    layout: { blocks: [
      { id: 'rs_1', type: 'hero', props: { height: 'compact' } },
      { id: 'rs_2', type: 'reservation_widget', props: {} },
      { id: 'rs_3', type: 'opening_hours', featureFlag: 'hasOpeningHoursBlock', props: { source: 'manual' } },
      { id: 'rs_4', type: 'location_details', featureFlag: 'hasLocationDetailsBlock', props: { source: 'manual' } },
      { id: 'rs_5', type: 'testimonials', props: {} },
      { id: 'rs_6', type: 'faq', props: {} },
    ]}
  },
  {
    id: 'route_itinerary',
    label: 'Route / Itinerary',
    description: 'Curated route with OSRM routing and save-to-trip',
    icon: 'ViewTimeline',
    category: 'editorial',
    layout: { blocks: [
      { id: 'ri_1', type: 'hero', props: { height: 'compact' } },
      { id: 'ri_2', type: 'rich_text', props: {} },
      { id: 'ri_3', type: 'itinerary', featureFlag: 'hasItineraryBlock', props: { source: 'manual_waypoints', mode: 'foot', variant: 'map_split' } },
      { id: 'ri_4', type: 'map_list', featureFlag: 'hasMapListBlock', props: { source: 'pois' } },
      { id: 'ri_5', type: 'save_to_trip', featureFlag: 'hasSaveToTripBlock', props: { variant: 'add_button' } },
      { id: 'ri_6', type: 'downloads', props: {} },
      { id: 'ri_7', type: 'related_items', featureFlag: 'hasRelatedItemsBlock', props: { itemType: 'event' } },
      { id: 'ri_8', type: 'cta', props: {} },
    ]}
  },
  {
    id: 'festival_grounds',
    label: 'Festival / Event Grounds',
    description: 'Festival page with programme, map and tickets',
    icon: 'Campaign',
    category: 'events',
    layout: { blocks: [
      { id: 'fg_1', type: 'hero', props: { height: 'tall' } },
      { id: 'fg_2', type: 'alert_status', props: {} },
      { id: 'fg_3', type: 'rich_text', props: {} },
      { id: 'fg_4', type: 'map', props: { height: '400px' } },
      { id: 'fg_5', type: 'ticket_shop', props: {} },
      { id: 'fg_6', type: 'event_calendar', props: {} },
      { id: 'fg_7', type: 'faq', props: {} },
      { id: 'fg_8', type: 'downloads', props: {} },
      { id: 'fg_9', type: 'gallery', props: {} },
    ]}
  },
  {
    id: 'mobile_onsite_guide',
    label: 'On-site Guide',
    description: 'Guide for visitors at the destination (NOT CalpeTrip)',
    icon: 'Explore',
    category: 'mobile',
    layout: { blocks: [
      { id: 'mo_1', type: 'hero', props: { height: 'compact' } },
      { id: 'mo_2', type: 'desktop_events', props: { limit: 6 } },
      { id: 'mo_3', type: 'map', props: { height: '250px' } },
      { id: 'mo_4', type: 'related_items', featureFlag: 'hasRelatedItemsBlock', props: { itemType: 'poi', limit: 4 } },
      { id: 'mo_5', type: 'opening_hours', featureFlag: 'hasOpeningHoursBlock', props: { source: 'manual', variant: 'compact' } },
      { id: 'mo_6', type: 'cta', props: {} },
    ]}
  },
  {
    id: 'whats_on_weekend',
    label: 'This Weekend',
    description: 'Weekend events overview with featured event',
    icon: 'WbSunny',
    category: 'events',
    layout: { blocks: [
      { id: 'ww_1', type: 'hero', props: { height: 'compact' } },
      { id: 'ww_2', type: 'filter_bar', featureFlag: 'hasFilterBarBlock', props: { filters: ['date_preset', 'category'] } },
      { id: 'ww_3', type: 'featured_item', featureFlag: 'hasFeaturedItemBlock', props: { itemType: 'event' } },
      { id: 'ww_4', type: 'event_calendar', props: {} },
      { id: 'ww_5', type: 'cta', props: {} },
      { id: 'ww_6', type: 'newsletter', props: {} },
    ]}
  },
  {
    id: 'rainy_day',
    label: 'Rainy Day Guide',
    description: 'Indoor activities and tips for rainy days',
    icon: 'WbSunny',
    category: 'editorial',
    layout: { blocks: [
      { id: 'rd_1', type: 'hero', props: { height: 'compact' } },
      { id: 'rd_2', type: 'weather_widget', props: {} },
      { id: 'rd_3', type: 'poi_grid', props: { limit: 12 } },
      { id: 'rd_4', type: 'event_calendar', props: {} },
      { id: 'rd_5', type: 'map_list', featureFlag: 'hasMapListBlock', props: { source: 'pois' } },
      { id: 'rd_6', type: 'cta', props: {} },
    ]}
  },
  {
    id: 'family_day_out',
    label: 'Family Day Out',
    description: 'Family-friendly activities and places',
    icon: 'Stars',
    category: 'editorial',
    layout: { blocks: [
      { id: 'fd_1', type: 'hero', props: { height: 'compact' } },
      { id: 'fd_2', type: 'poi_grid', props: { limit: 12 } },
      { id: 'fd_3', type: 'event_calendar', props: {} },
      { id: 'fd_4', type: 'map_list', featureFlag: 'hasMapListBlock', props: { source: 'pois' } },
      { id: 'fd_5', type: 'cta', props: {} },
    ]}
  },
  {
    id: 'food_drink_guide',
    label: 'Food & Drink Guide',
    description: 'Restaurants, cafes and local food',
    icon: 'Stars',
    category: 'editorial',
    layout: { blocks: [
      { id: 'fg_1', type: 'hero', props: { height: 'compact' } },
      { id: 'fg_2', type: 'category_grid', props: {} },
      { id: 'fg_3', type: 'filter_bar', featureFlag: 'hasFilterBarBlock', props: { filters: ['category', 'rating'] } },
      { id: 'fg_4', type: 'poi_grid', props: { limit: 24 } },
      { id: 'fg_5', type: 'map_list', featureFlag: 'hasMapListBlock', props: { source: 'pois' } },
      { id: 'fg_6', type: 'testimonials', props: {} },
      { id: 'fg_7', type: 'reservation_widget', props: {} },
    ]}
  },
  {
    id: 'local_deals',
    label: 'Local Deals / Passes',
    description: 'Deals, passes and promotions',
    icon: 'ConfirmationNumber',
    category: 'commerce',
    layout: { blocks: [
      { id: 'ld_1', type: 'hero', props: { height: 'compact' } },
      { id: 'ld_2', type: 'offer', featureFlag: 'hasOfferPackageBlock', props: { variant: 'comparison' } },
      { id: 'ld_3', type: 'ticket_shop', props: {} },
      { id: 'ld_4', type: 'partners', props: {} },
      { id: 'ld_5', type: 'faq', props: {} },
      { id: 'ld_6', type: 'cta', props: {} },
    ]}
  },
  {
    id: 'venue_location',
    label: 'Venue / Location',
    description: 'Venue info with opening hours and events',
    icon: 'PinDrop',
    category: 'detail',
    layout: { blocks: [
      { id: 'vl_1', type: 'hero', props: { height: 'compact' } },
      { id: 'vl_2', type: 'rich_text', props: {} },
      { id: 'vl_3', type: 'opening_hours', featureFlag: 'hasOpeningHoursBlock', props: { source: 'manual' } },
      { id: 'vl_4', type: 'location_details', featureFlag: 'hasLocationDetailsBlock', props: { source: 'manual' } },
      { id: 'vl_5', type: 'map', props: { height: '300px' } },
      { id: 'vl_6', type: 'event_calendar', props: {} },
      { id: 'vl_7', type: 'related_items', featureFlag: 'hasRelatedItemsBlock', props: { itemType: 'poi' } },
      { id: 'vl_8', type: 'faq', props: {} },
    ]}
  },
  {
    id: 'campaign_landing',
    label: 'Campaign Landing',
    description: 'Landing page for seasonal or marketing campaigns',
    icon: 'Campaign',
    category: 'campaign',
    layout: { blocks: [
      { id: 'cl_1', type: 'hero', props: { height: 'tall' } },
      { id: 'cl_2', type: 'alert_status', props: {} },
      { id: 'cl_3', type: 'featured_item', featureFlag: 'hasFeaturedItemBlock', props: {} },
      { id: 'cl_4', type: 'rich_text', props: {} },
      { id: 'cl_5', type: 'gallery', props: {} },
      { id: 'cl_6', type: 'related_items', featureFlag: 'hasRelatedItemsBlock', props: {} },
      { id: 'cl_7', type: 'ticket_shop', props: {} },
      { id: 'cl_8', type: 'faq', props: {} },
      { id: 'cl_9', type: 'cta', props: {} },
    ]}
  },
  {
    id: 'guide_article',
    label: 'Guide Article',
    description: 'Editorial article with related POIs and events',
    icon: 'Article',
    category: 'editorial',
    layout: { blocks: [
      { id: 'ga_1', type: 'breadcrumbs', featureFlag: 'hasBreadcrumbsBlock', props: { source: 'auto_url' } },
      { id: 'ga_2', type: 'hero', props: { height: 'compact' } },
      { id: 'ga_3', type: 'rich_text', props: {} },
      { id: 'ga_4', type: 'gallery', props: {} },
      { id: 'ga_5', type: 'related_items', featureFlag: 'hasRelatedItemsBlock', props: { itemType: 'poi' } },
      { id: 'ga_6', type: 'related_items', featureFlag: 'hasRelatedItemsBlock', props: { itemType: 'event' } },
      { id: 'ga_7', type: 'map', props: { height: '300px' } },
      { id: 'ga_8', type: 'save_to_trip', featureFlag: 'hasSaveToTripBlock', props: { variant: 'add_button' } },
      { id: 'ga_9', type: 'newsletter', props: {} },
    ]}
  },

];

export default pageTemplates;
