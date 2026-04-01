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
  }
];

export default pageTemplates;
