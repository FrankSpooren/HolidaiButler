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
    label: 'Homepage',
    description: 'Hero, POI grid, events, and newsletter signup',
    icon: 'Home',
    layout: {
      blocks: [
        { id: 'hero-1', type: 'hero', props: { headline: { en: 'Welcome to [Destination]', nl: 'Welkom bij [Bestemming]' }, description: { en: 'Discover the best local experiences', nl: 'Ontdek de beste lokale ervaringen' }, buttons: [{ label: { en: 'Explore', nl: 'Ontdek' }, url: '/explore', variant: 'primary' }] } },
        { id: 'poi-grid-1', type: 'poi_grid', props: { limit: 6, columns: 3, showRating: true, showCategory: true } },
        { id: 'event-cal-1', type: 'event_calendar', props: { limit: 4, layout: 'grid' } },
        { id: 'newsletter-1', type: 'newsletter', props: { headline: { en: 'Stay updated', nl: 'Blijf op de hoogte' }, description: { en: 'Subscribe to our newsletter', nl: 'Schrijf je in voor onze nieuwsbrief' } } }
      ]
    }
  },
  {
    id: 'explore',
    label: 'Explore / Discover',
    description: 'Full POI grid with map and weather widget',
    icon: 'Explore',
    layout: {
      blocks: [
        { id: 'hero-1', type: 'hero', props: { headline: { en: 'Explore', nl: 'Ontdek' }, description: { en: 'Find the best places and activities', nl: 'Vind de beste plekken en activiteiten' } } },
        { id: 'poi-grid-1', type: 'poi_grid', props: { limit: 12, columns: 3, showRating: true, showCategory: true, showFilter: true } },
        { id: 'map-1', type: 'map', props: { height: 500, showCategories: true } },
        { id: 'weather-1', type: 'weather_widget', props: { layout: 'detailed' } }
      ]
    }
  },
  {
    id: 'events',
    label: 'Events',
    description: 'Events calendar with social feed',
    icon: 'Event',
    layout: {
      blocks: [
        { id: 'hero-1', type: 'hero', props: { headline: { en: 'Events & Activities', nl: 'Evenementen & Activiteiten' } } },
        { id: 'event-cal-1', type: 'event_calendar', props: { limit: 12, layout: 'list', showPastEvents: false } },
        { id: 'social-1', type: 'social_feed', props: { platforms: ['instagram'] } }
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
