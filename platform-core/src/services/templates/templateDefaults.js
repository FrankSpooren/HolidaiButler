/**
 * Template Defaults — VII-E3 Page Builder Templates
 *
 * 20 template configs: default block layouts, metadata, schema types.
 * Used by admin Page Editor when creating new pages from templates.
 * Template defaults are immutable (only via code, not admin UI).
 *
 * @module services/templates/templateDefaults
 * @version 1.0.0
 */

const TEMPLATE_DEFAULTS = {
  // ========== EXISTING (upgraded in Sub-batch 2) ==========

  blank: {
    template_type: 'blank',
    name: { nl: 'Lege pagina', en: 'Blank Page', de: 'Leere Seite', es: 'Pagina en blanco' },
    description: { nl: 'Start met een lege pagina', en: 'Start with a blank page' },
    category: 'basic',
    default_layout: { blocks: [] },
  },

  homepage: {
    template_type: 'homepage',
    name: { nl: 'Homepage', en: 'Homepage', de: 'Startseite', es: 'Pagina principal' },
    description: { nl: 'Hoofdpagina met hero, zoeken, evenementen en kaart', en: 'Main page with hero, search, events and map' },
    category: 'basic',
    url_pattern: '/',
    default_layout: {
      blocks: [
        { id: 'hp_1', type: 'hero', props: { variant: 'homepage', height: 'tall' } },
        { id: 'hp_2', type: 'search', featureFlag: 'hasSearchBlock', props: { variant: 'inline', searchTypes: ['pois', 'events', 'articles'], showSuggestions: true } },
        { id: 'hp_3', type: 'desktop_events', props: { layout: 'auto', limit: 6 } },
        { id: 'hp_4', type: 'category_grid', props: { layout: 'auto' } },
        { id: 'hp_5', type: 'poi_grid', props: { limit: 8, showFilters: false } },
        { id: 'hp_6', type: 'map_list', featureFlag: 'hasMapListBlock', props: { source: 'pois', layout: 'split_60_40', height: 'medium', limit: 15 } },
        { id: 'hp_7', type: 'cta', props: {} },
        { id: 'hp_8', type: 'newsletter', props: { variant: 'inline' } },
      ],
    },
    schema_type: 'WebSite',
  },

  explore: {
    template_type: 'explore',
    name: { nl: 'Ontdekken', en: 'Explore', de: 'Entdecken', es: 'Explorar' },
    description: { nl: 'Ontdek POIs met zoeken, filters en kaart', en: 'Discover POIs with search, filters and map' },
    category: 'discovery',
    url_pattern: '/explore',
    default_layout: {
      blocks: [
        { id: 'ex_1', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'ex_2', type: 'search', featureFlag: 'hasSearchBlock', props: { variant: 'inline', searchTypes: ['pois'] } },
        { id: 'ex_3', type: 'category_grid', props: { layout: 'auto' } },
        { id: 'ex_4', type: 'filter_bar', featureFlag: 'hasFilterBarBlock', props: { filters: ['category', 'rating'], layout: 'auto' } },
        { id: 'ex_5', type: 'poi_grid', props: { showFilters: false, limit: 24 } },
        { id: 'ex_6', type: 'map_list', featureFlag: 'hasMapListBlock', props: { source: 'pois', layout: 'split_70_30', height: 'medium' } },
        { id: 'ex_7', type: 'cta', props: {} },
      ],
    },
    schema_type: 'CollectionPage',
  },

  events: {
    template_type: 'events',
    name: { nl: 'Evenementen', en: 'Events', de: 'Veranstaltungen', es: 'Eventos' },
    description: { nl: 'Evenementen overzicht met kalender en filters', en: 'Events overview with calendar and filters' },
    category: 'events',
    url_pattern: '/events',
    default_layout: {
      blocks: [
        { id: 'ev_1', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'ev_2', type: 'filter_bar', featureFlag: 'hasFilterBarBlock', props: { filters: ['date_preset', 'category'], layout: 'auto' } },
        { id: 'ev_3', type: 'event_calendar', props: { showFilters: false } },
        { id: 'ev_4', type: 'calendar_view', featureFlag: 'hasCalendarViewBlock', props: { view: 'dayGridMonth', startDay: 1 } },
        { id: 'ev_5', type: 'newsletter', props: {} },
      ],
    },
  },

  about: {
    template_type: 'about',
    name: { nl: 'Over ons', en: 'About', de: 'Uber uns', es: 'Sobre nosotros' },
    description: { nl: 'Over de bestemming of organisatie', en: 'About the destination or organization' },
    category: 'basic',
    url_pattern: '/about',
    default_layout: {
      blocks: [
        { id: 'ab_1', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'ab_2', type: 'rich_text', props: {} },
        { id: 'ab_3', type: 'gallery', props: {} },
        { id: 'ab_4', type: 'testimonials', props: {} },
        { id: 'ab_5', type: 'partners', props: {} },
        { id: 'ab_6', type: 'cta', props: {} },
      ],
    },
    schema_type: 'AboutPage',
  },

  contact: {
    template_type: 'contact',
    name: { nl: 'Contact', en: 'Contact', de: 'Kontakt', es: 'Contacto' },
    description: { nl: 'Contactpagina met formulier, kaart en openingstijden', en: 'Contact page with form, map and opening hours' },
    category: 'basic',
    url_pattern: '/contact',
    default_layout: {
      blocks: [
        { id: 'co_1', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'co_2', type: 'rich_text', props: {} },
        { id: 'co_3', type: 'location_details', featureFlag: 'hasLocationDetailsBlock', props: { source: 'manual', showOpenInMaps: true, showCopyAddress: true } },
        { id: 'co_4', type: 'opening_hours', featureFlag: 'hasOpeningHoursBlock', props: { source: 'manual', variant: 'detailed' } },
        { id: 'co_5', type: 'contact_form', props: {} },
        { id: 'co_6', type: 'map', props: { height: '300px' } },
        { id: 'co_7', type: 'faq', props: {} },
      ],
    },
    schema_type: 'ContactPage',
  },

  tickets: {
    template_type: 'tickets',
    name: { nl: 'Tickets', en: 'Tickets', de: 'Tickets', es: 'Entradas' },
    description: { nl: 'Ticketshop met aanbiedingen en FAQ', en: 'Ticket shop with offers and FAQ' },
    category: 'commerce',
    url_pattern: '/tickets',
    default_layout: {
      blocks: [
        { id: 'tk_1', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'tk_2', type: 'ticket_shop', props: {} },
        { id: 'tk_3', type: 'offer', featureFlag: 'hasOfferPackageBlock', props: { variant: 'comparison' } },
        { id: 'tk_4', type: 'testimonials', props: {} },
        { id: 'tk_5', type: 'faq', props: {} },
      ],
    },
  },

  blog: {
    template_type: 'blog',
    name: { nl: 'Blog / Verhalen', en: 'Blog / Stories', de: 'Blog / Geschichten', es: 'Blog / Historias' },
    description: { nl: 'Blog overzicht met uitgelicht artikel en filters', en: 'Blog overview with featured article and filters' },
    category: 'editorial',
    url_pattern: '/blog',
    default_layout: {
      blocks: [
        { id: 'bl_1', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'bl_2', type: 'featured_item', featureFlag: 'hasFeaturedItemBlock', props: { itemType: 'article', variant: 'split_image_text' } },
        { id: 'bl_3', type: 'rich_text', props: {} },
        { id: 'bl_4', type: 'newsletter', props: { variant: 'inline' } },
      ],
    },
  },

  partners: {
    template_type: 'partners',
    name: { nl: 'Partners & Sponsors', en: 'Partners & Sponsors', de: 'Partner & Sponsoren', es: 'Socios y Patrocinadores' },
    description: { nl: 'Partnerpagina met tiers en contactformulier', en: 'Partners page with tiers and contact form' },
    category: 'basic',
    url_pattern: '/partners',
    default_layout: {
      blocks: [
        { id: 'pa_1', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'pa_2', type: 'rich_text', props: {} },
        { id: 'pa_3', type: 'featured_item', featureFlag: 'hasFeaturedItemBlock', props: { itemType: 'article', badgeText: 'Partner van de maand' } },
        { id: 'pa_4', type: 'partners', props: {} },
        { id: 'pa_5', type: 'downloads', props: {} },
        { id: 'pa_6', type: 'cta', props: {} },
        { id: 'pa_7', type: 'contact_form', props: {} },
      ],
    },
  },

  // ========== NEW — Sub-batch 1: Detail templates ==========

  event_detail: {
    template_type: 'event_detail',
    name: { nl: 'Evenement Detail', en: 'Event Detail', de: 'Veranstaltungsdetails', es: 'Detalle del Evento' },
    description: { nl: 'Volledige eventpagina met booking, kaart en FAQ', en: 'Full event page with booking, map and FAQ' },
    category: 'detail',
    url_pattern: '/event/[id]/[slug]',
    required_blocks: ['hero', 'rich_text', 'add_to_calendar', 'location_details'],
    recommended_blocks: ['gallery', 'map', 'related_items', 'faq', 'ticket_shop'],
    default_layout: {
      blocks: [
        { id: 'ed_1', type: 'breadcrumbs', featureFlag: 'hasBreadcrumbsBlock', props: { source: 'auto_url', showHomeIcon: true } },
        { id: 'ed_2', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'ed_3', type: 'rich_text', props: {} },
        { id: 'ed_4', type: 'add_to_calendar', featureFlag: 'hasAddToCalendarBlock', props: { source: 'event_id_from_url', buttonStyle: 'dropdown' } },
        { id: 'ed_5', type: 'location_details', featureFlag: 'hasLocationDetailsBlock', props: { source: 'manual', showMapPreview: true, showOpenInMaps: true } },
        { id: 'ed_6', type: 'map', props: { height: '300px' } },
        { id: 'ed_7', type: 'gallery', props: {} },
        { id: 'ed_8', type: 'related_items', featureFlag: 'hasRelatedItemsBlock', props: { itemType: 'event', relationStrategy: 'same_category', limit: 4 } },
        { id: 'ed_9', type: 'faq', props: {} },
        { id: 'ed_10', type: 'cta', props: {} },
      ],
    },
    schema_type: 'Event',
  },

  poi_detail: {
    template_type: 'poi_detail',
    name: { nl: 'POI Detail', en: 'Point of Interest Detail', de: 'Sehenswurdigkeit Detail', es: 'Detalle del Lugar' },
    description: { nl: 'Volledige POI-pagina met openingstijden, kaart en reviews', en: 'Full POI page with opening hours, map and reviews' },
    category: 'detail',
    url_pattern: '/poi/[id]/[slug]',
    required_blocks: ['hero', 'rich_text', 'opening_hours', 'location_details', 'map'],
    recommended_blocks: ['gallery', 'related_items', 'faq', 'save_to_trip'],
    default_layout: {
      blocks: [
        { id: 'pd_1', type: 'breadcrumbs', featureFlag: 'hasBreadcrumbsBlock', props: { source: 'auto_url', showHomeIcon: true } },
        { id: 'pd_2', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'pd_3', type: 'rich_text', props: {} },
        { id: 'pd_4', type: 'opening_hours', featureFlag: 'hasOpeningHoursBlock', props: { source: 'poi', showOpenNow: true, variant: 'detailed' } },
        { id: 'pd_5', type: 'location_details', featureFlag: 'hasLocationDetailsBlock', props: { source: 'poi', showOpenInMaps: true, showCopyAddress: true } },
        { id: 'pd_6', type: 'map', props: { height: '300px' } },
        { id: 'pd_7', type: 'gallery', props: {} },
        { id: 'pd_8', type: 'related_items', featureFlag: 'hasRelatedItemsBlock', props: { itemType: 'poi', relationStrategy: 'nearby', limit: 4 } },
        { id: 'pd_9', type: 'faq', props: {} },
        { id: 'pd_10', type: 'save_to_trip', featureFlag: 'hasSaveToTripBlock', props: { variant: 'add_button' } },
      ],
    },
    schema_type: 'TouristAttraction',
  },

  // ========== NEW — Sub-batch 2: Upgraded variants ==========

  events_what_on: {
    template_type: 'events_what_on',
    name: { nl: 'Wat is er te doen', en: "What's On", de: 'Was ist los', es: 'Que hacer' },
    description: { nl: 'Evenementen met kalenderweergave en weekendfilter', en: 'Events with calendar view and weekend filter' },
    category: 'events',
    url_pattern: '/whats-on',
    default_layout: {
      blocks: [
        { id: 'wo_1', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'wo_2', type: 'filter_bar', featureFlag: 'hasFilterBarBlock', props: { filters: ['date_preset', 'category'], layout: 'auto' } },
        { id: 'wo_3', type: 'featured_item', featureFlag: 'hasFeaturedItemBlock', props: { itemType: 'event', variant: 'split_image_text' } },
        { id: 'wo_4', type: 'event_calendar', props: { showFilters: false } },
        { id: 'wo_5', type: 'calendar_view', featureFlag: 'hasCalendarViewBlock', props: { view: 'dayGridMonth', startDay: 1 } },
        { id: 'wo_6', type: 'map_list', featureFlag: 'hasMapListBlock', props: { source: 'events' } },
        { id: 'wo_7', type: 'cta', props: {} },
        { id: 'wo_8', type: 'newsletter', props: {} },
      ],
    },
  },

  reservations: {
    template_type: 'reservations',
    name: { nl: 'Reserveren', en: 'Reservations', de: 'Reservierungen', es: 'Reservas' },
    description: { nl: 'Reserveringspagina met openingstijden en locatie', en: 'Reservation page with opening hours and location' },
    category: 'commerce',
    url_pattern: '/reservations',
    default_layout: {
      blocks: [
        { id: 'rs_1', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'rs_2', type: 'reservation_widget', props: {} },
        { id: 'rs_3', type: 'opening_hours', featureFlag: 'hasOpeningHoursBlock', props: { source: 'manual', variant: 'detailed' } },
        { id: 'rs_4', type: 'location_details', featureFlag: 'hasLocationDetailsBlock', props: { source: 'manual' } },
        { id: 'rs_5', type: 'testimonials', props: {} },
        { id: 'rs_6', type: 'faq', props: {} },
      ],
    },
  },

  // ========== NEW — Sub-batch 3: Priority new templates ==========

  route_itinerary: {
    template_type: 'route_itinerary',
    name: { nl: 'Route / Reisplan', en: 'Route / Itinerary', de: 'Route / Reiseplan', es: 'Ruta / Itinerario' },
    description: { nl: 'Samengestelde route met OSRM-routering', en: 'Curated route with OSRM routing' },
    category: 'editorial',
    url_pattern: '/route/[slug]',
    default_layout: {
      blocks: [
        { id: 'ri_1', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'ri_2', type: 'rich_text', props: {} },
        { id: 'ri_3', type: 'itinerary', featureFlag: 'hasItineraryBlock', props: { source: 'manual_waypoints', mode: 'foot', variant: 'map_split', showMap: true } },
        { id: 'ri_4', type: 'map_list', featureFlag: 'hasMapListBlock', props: { source: 'pois' } },
        { id: 'ri_5', type: 'save_to_trip', featureFlag: 'hasSaveToTripBlock', props: { variant: 'add_button' } },
        { id: 'ri_6', type: 'downloads', props: {} },
        { id: 'ri_7', type: 'related_items', featureFlag: 'hasRelatedItemsBlock', props: { itemType: 'event', relationStrategy: 'nearby' } },
        { id: 'ri_8', type: 'cta', props: {} },
      ],
    },
    schema_type: 'TouristTrip',
  },

  festival_grounds: {
    template_type: 'festival_grounds',
    name: { nl: 'Festival / Evenemententerrein', en: 'Festival / Event Grounds', de: 'Festival / Veranstaltungsgelande', es: 'Festival / Recinto' },
    description: { nl: 'Festivalpagina met programma, kaart en tickets', en: 'Festival page with programme, map and tickets' },
    category: 'events',
    url_pattern: '/festival/[slug]',
    default_layout: {
      blocks: [
        { id: 'fg_1', type: 'hero', props: { variant: 'tall', height: 'tall' } },
        { id: 'fg_2', type: 'alert_status', props: {} },
        { id: 'fg_3', type: 'rich_text', props: {} },
        { id: 'fg_4', type: 'map', props: { height: '400px' } },
        { id: 'fg_5', type: 'ticket_shop', props: {} },
        { id: 'fg_6', type: 'event_calendar', props: {} },
        { id: 'fg_7', type: 'faq', props: {} },
        { id: 'fg_8', type: 'downloads', props: {} },
        { id: 'fg_9', type: 'gallery', props: {} },
      ],
    },
    schema_type: 'Festival',
  },

  mobile_onsite_guide: {
    template_type: 'mobile_onsite_guide',
    name: { nl: 'On-site Gids', en: 'On-site Guide', de: 'Vor-Ort-Fuhrer', es: 'Guia In Situ' },
    description: { nl: 'Gids voor bezoekers die al op de bestemming zijn', en: 'Guide for visitors already at the destination' },
    category: 'mobile',
    url_pattern: '/onsite-guide',
    calpe_protected: true,
    default_layout: {
      blocks: [
        { id: 'mo_1', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'mo_2', type: 'desktop_events', props: { layout: 'auto', limit: 6 } },
        { id: 'mo_3', type: 'map', props: { height: '250px' } },
        { id: 'mo_4', type: 'related_items', featureFlag: 'hasRelatedItemsBlock', props: { itemType: 'poi', relationStrategy: 'nearby', limit: 4 } },
        { id: 'mo_5', type: 'opening_hours', featureFlag: 'hasOpeningHoursBlock', props: { source: 'manual', showOpenNow: true, variant: 'compact' } },
        { id: 'mo_6', type: 'cta', props: {} },
      ],
    },
  },

  whats_on_weekend: {
    template_type: 'whats_on_weekend',
    name: { nl: 'Dit Weekend', en: 'This Weekend', de: 'Dieses Wochenende', es: 'Este Fin de Semana' },
    description: { nl: 'Weekend-evenementen overzicht', en: 'Weekend events overview' },
    category: 'events',
    url_pattern: '/whats-on-weekend',
    default_layout: {
      blocks: [
        { id: 'ww_1', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'ww_2', type: 'filter_bar', featureFlag: 'hasFilterBarBlock', props: { filters: ['date_preset', 'category'], layout: 'auto' } },
        { id: 'ww_3', type: 'featured_item', featureFlag: 'hasFeaturedItemBlock', props: { itemType: 'event', variant: 'split_image_text' } },
        { id: 'ww_4', type: 'event_calendar', props: { showFilters: false } },
        { id: 'ww_5', type: 'cta', props: {} },
        { id: 'ww_6', type: 'newsletter', props: {} },
      ],
    },
  },

  // ========== NEW — Sub-batch 4: Medium-priority ==========

  rainy_day: {
    template_type: 'rainy_day',
    name: { nl: 'Regenachtige Dag', en: 'Rainy Day', de: 'Regentag', es: 'Dia Lluvioso' },
    description: { nl: 'Tips voor als het regent', en: 'Indoor activities for rainy days' },
    category: 'editorial',
    url_pattern: '/rainy-day',
    default_layout: {
      blocks: [
        { id: 'rd_1', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'rd_2', type: 'weather_widget', props: {} },
        { id: 'rd_3', type: 'poi_grid', props: { showFilters: false, limit: 12 } },
        { id: 'rd_4', type: 'event_calendar', props: {} },
        { id: 'rd_5', type: 'map_list', featureFlag: 'hasMapListBlock', props: { source: 'pois' } },
        { id: 'rd_6', type: 'cta', props: {} },
      ],
    },
  },

  family_day_out: {
    template_type: 'family_day_out',
    name: { nl: 'Gezinsdag', en: 'Family Day Out', de: 'Familientag', es: 'Dia en Familia' },
    description: { nl: 'Gezinsvriendelijke activiteiten', en: 'Family-friendly activities' },
    category: 'editorial',
    url_pattern: '/family',
    default_layout: {
      blocks: [
        { id: 'fd_1', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'fd_2', type: 'poi_grid', props: { limit: 12, showFilters: false } },
        { id: 'fd_3', type: 'event_calendar', props: {} },
        { id: 'fd_4', type: 'map_list', featureFlag: 'hasMapListBlock', props: { source: 'pois' } },
        { id: 'fd_5', type: 'cta', props: {} },
      ],
    },
  },

  food_drink_guide: {
    template_type: 'food_drink_guide',
    name: { nl: 'Eten & Drinken', en: 'Food & Drink Guide', de: 'Essen & Trinken', es: 'Comida y Bebida' },
    description: { nl: 'Restaurants, cafes en lokale gerechten', en: 'Restaurants, cafes and local food' },
    category: 'editorial',
    url_pattern: '/food-drink',
    default_layout: {
      blocks: [
        { id: 'fg_1', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'fg_2', type: 'category_grid', props: {} },
        { id: 'fg_3', type: 'filter_bar', featureFlag: 'hasFilterBarBlock', props: { filters: ['category', 'rating'], layout: 'auto' } },
        { id: 'fg_4', type: 'poi_grid', props: { showFilters: false, limit: 24 } },
        { id: 'fg_5', type: 'map_list', featureFlag: 'hasMapListBlock', props: { source: 'pois' } },
        { id: 'fg_6', type: 'testimonials', props: {} },
        { id: 'fg_7', type: 'reservation_widget', props: {} },
      ],
    },
    schema_type: 'CollectionPage',
  },

  local_deals: {
    template_type: 'local_deals',
    name: { nl: 'Aanbiedingen', en: 'Local Deals', de: 'Angebote', es: 'Ofertas Locales' },
    description: { nl: 'Deals, passes en promoties', en: 'Deals, passes and promotions' },
    category: 'commerce',
    url_pattern: '/deals',
    default_layout: {
      blocks: [
        { id: 'ld_1', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'ld_2', type: 'offer', featureFlag: 'hasOfferPackageBlock', props: { variant: 'comparison', layout: 'grid' } },
        { id: 'ld_3', type: 'ticket_shop', props: {} },
        { id: 'ld_4', type: 'partners', props: {} },
        { id: 'ld_5', type: 'faq', props: {} },
        { id: 'ld_6', type: 'cta', props: {} },
      ],
    },
    schema_type: 'CollectionPage',
  },

  venue_location: {
    template_type: 'venue_location',
    name: { nl: 'Locatie / Venue', en: 'Venue / Location', de: 'Veranstaltungsort', es: 'Lugar / Recinto' },
    description: { nl: 'Venue-informatie met openingstijden en evenementen', en: 'Venue info with opening hours and events' },
    category: 'detail',
    url_pattern: '/venue/[slug]',
    default_layout: {
      blocks: [
        { id: 'vl_1', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'vl_2', type: 'rich_text', props: {} },
        { id: 'vl_3', type: 'opening_hours', featureFlag: 'hasOpeningHoursBlock', props: { source: 'manual', variant: 'detailed' } },
        { id: 'vl_4', type: 'location_details', featureFlag: 'hasLocationDetailsBlock', props: { source: 'manual' } },
        { id: 'vl_5', type: 'map', props: { height: '300px' } },
        { id: 'vl_6', type: 'event_calendar', props: {} },
        { id: 'vl_7', type: 'related_items', featureFlag: 'hasRelatedItemsBlock', props: { itemType: 'poi', relationStrategy: 'nearby' } },
        { id: 'vl_8', type: 'faq', props: {} },
      ],
    },
    schema_type: 'Place',
  },

  campaign_landing: {
    template_type: 'campaign_landing',
    name: { nl: 'Campagne Landing', en: 'Campaign Landing', de: 'Kampagnen-Landing', es: 'Pagina de Campana' },
    description: { nl: 'Landingspagina voor seizoens- of marketingcampagnes', en: 'Landing page for seasonal or marketing campaigns' },
    category: 'campaign',
    url_pattern: '/campaign/[slug]',
    default_layout: {
      blocks: [
        { id: 'cl_1', type: 'hero', props: { variant: 'tall', height: 'tall' } },
        { id: 'cl_2', type: 'alert_status', props: {} },
        { id: 'cl_3', type: 'featured_item', featureFlag: 'hasFeaturedItemBlock', props: {} },
        { id: 'cl_4', type: 'rich_text', props: {} },
        { id: 'cl_5', type: 'gallery', props: {} },
        { id: 'cl_6', type: 'related_items', featureFlag: 'hasRelatedItemsBlock', props: {} },
        { id: 'cl_7', type: 'ticket_shop', props: {} },
        { id: 'cl_8', type: 'faq', props: {} },
        { id: 'cl_9', type: 'cta', props: {} },
      ],
    },
  },

  guide_article: {
    template_type: 'guide_article',
    name: { nl: 'Gids / Artikel', en: 'Guide Article', de: 'Reisefuhrer-Artikel', es: 'Articulo Guia' },
    description: { nl: 'Redactioneel artikel met gerelateerde POIs en evenementen', en: 'Editorial article with related POIs and events' },
    category: 'editorial',
    url_pattern: '/guides/[slug]',
    default_layout: {
      blocks: [
        { id: 'ga_1', type: 'breadcrumbs', featureFlag: 'hasBreadcrumbsBlock', props: { source: 'auto_url', showHomeIcon: true } },
        { id: 'ga_2', type: 'hero', props: { variant: 'compact', height: 'compact' } },
        { id: 'ga_3', type: 'rich_text', props: {} },
        { id: 'ga_4', type: 'gallery', props: {} },
        { id: 'ga_5', type: 'related_items', featureFlag: 'hasRelatedItemsBlock', props: { itemType: 'poi', relationStrategy: 'same_category' } },
        { id: 'ga_6', type: 'related_items', featureFlag: 'hasRelatedItemsBlock', props: { itemType: 'event', relationStrategy: 'same_category' } },
        { id: 'ga_7', type: 'map', props: { height: '300px' } },
        { id: 'ga_8', type: 'save_to_trip', featureFlag: 'hasSaveToTripBlock', props: { variant: 'add_button' } },
        { id: 'ga_9', type: 'newsletter', props: {} },
      ],
    },
    schema_type: 'Article',
  },
};

export default TEMPLATE_DEFAULTS;
