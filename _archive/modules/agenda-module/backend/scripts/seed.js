const mongoose = require('mongoose');
const Event = require('../models/Event');
const logger = require('../config/logger');

/**
 * Seed Database with Real Calpe Events
 * Demo-ready data for investor presentations
 */

const calpeEvents = [
  {
    title: {
      nl: 'Moros y Cristianos Fiesta - Historisch Festival',
      en: 'Moors and Christians Festival - Historic Celebration',
      es: 'Fiestas de Moros y Cristianos - Celebración Histórica',
      de: 'Mauren und Christen Fest - Historische Feier',
      fr: 'Fête des Maures et Chrétiens - Célébration Historique',
    },
    description: {
      nl: 'Het meest spectaculaire historische festival van Calpe! Ervaar de rijke geschiedenis van de Reconquista met kleurrijke optochten, traditionele kostuums, muziek en vuurwerk. Drie dagen vol festiviteiten in het oude stadscentrum met parades, gevechten en een adembenemende finale.',
      en: 'The most spectacular historical festival in Calpe! Experience the rich history of the Reconquista with colorful parades, traditional costumes, music and fireworks. Three days of festivities in the old town center with parades, battles and a breathtaking finale.',
      es: 'El festival histórico más espectacular de Calpe! Experimenta la rica historia de la Reconquista con desfiles coloridos, trajes tradicionales, música y fuegos artificiales. Tres días de festividades en el casco antiguo con desfiles, batallas y un final impresionante.',
      de: 'Das spektakulärste historische Festival in Calpe! Erleben Sie die reiche Geschichte der Reconquista mit farbenfrohen Umzügen, traditionellen Kostümen, Musik und Feuerwerk. Drei Tage voller Festlichkeiten in der Altstadt mit Paraden, Kämpfen und einem atemberaubenden Finale.',
      fr: 'Le festival historique le plus spectaculaire de Calpe! Découvrez la riche histoire de la Reconquista avec des défilés colorés, des costumes traditionnels, de la musique et des feux d\'artifice. Trois jours de festivités dans la vieille ville avec des défilés, des batailles et une finale à couper le souffle.',
    },
    shortDescription: {
      nl: 'Spectaculair historisch festival met optochten, traditionele kostuums en vuurwerk',
      en: 'Spectacular historical festival with parades, traditional costumes and fireworks',
      es: 'Festival histórico espectacular con desfiles, trajes tradicionales y fuegos artificiales',
    },
    startDate: new Date('2025-10-18T18:00:00Z'),
    endDate: new Date('2025-10-23T23:00:00Z'),
    allDay: false,
    location: {
      name: 'Casco Antiguo de Calpe',
      address: 'Centro Histórico',
      city: 'Calpe',
      region: 'Costa Blanca',
      coordinates: {
        lat: 38.6477,
        lng: 0.0419,
      },
      area: 'old-town',
    },
    primaryCategory: 'folklore',
    secondaryCategories: ['festivals', 'culture', 'entertainment'],
    activityType: 'fiesta',
    targetAudience: ['families-with-kids', 'all-ages', 'couples'],
    pricing: {
      isFree: true,
    },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
        alt: { nl: 'Moros y Cristianos parade', en: 'Moors and Christians parade' },
        isPrimary: true,
        source: 'demo',
      },
    ],
    organizer: {
      name: 'Ayuntamiento de Calpe',
      website: 'https://www.calpe.es',
      email: 'turismo@calpe.es',
    },
    sources: [{
      platform: 'calpe-official',
      url: 'https://www.calpe.es/eventos',
      lastChecked: new Date(),
      isVerified: true,
      confidence: 95,
    }],
    verification: {
      status: 'verified',
      verificationCount: 3,
      lastVerified: new Date(),
    },
    status: 'published',
    visibility: 'public',
    featured: true,
    priority: 100,
    metrics: {
      views: 1250,
      clicks: 340,
      bookmarks: 89,
    },
  },
  {
    title: {
      nl: 'Peñón de Ifach Zonsopgang Wandeling',
      en: 'Peñón de Ifach Sunrise Hiking Tour',
      es: 'Senderismo al Amanecer en el Peñón de Ifach',
      de: 'Sonnenaufgangswanderung am Peñón de Ifach',
      fr: 'Randonnée au Lever du Soleil au Peñón de Ifach',
    },
    description: {
      nl: 'Beklim de iconische Peñón de Ifach bij zonsopgang en geniet van adembenemende uitzichten over de Costa Blanca. Deze begeleide wandeling start vroeg in de ochtend voor de meest spectaculaire lichtshow. Inclusief professionele gids, fotomomenten en lokaal ontbijt na afloop.',
      en: 'Climb the iconic Peñón de Ifach at sunrise and enjoy breathtaking views over the Costa Blanca. This guided hike starts early in the morning for the most spectacular light show. Includes professional guide, photo moments and local breakfast afterwards.',
      es: 'Sube al icónico Peñón de Ifach al amanecer y disfruta de vistas impresionantes sobre la Costa Blanca. Esta caminata guiada comienza temprano en la mañana para el espectáculo de luz más espectacular. Incluye guía profesional, momentos fotográficos y desayuno local después.',
    },
    shortDescription: {
      nl: 'Begeleide zonsopgang wandeling met spectaculair uitzicht en lokaal ontbijt',
      en: 'Guided sunrise hike with spectacular views and local breakfast',
      es: 'Caminata guiada al amanecer con vistas espectaculares y desayuno local',
    },
    startDate: new Date('2025-07-15T05:30:00Z'),
    endDate: new Date('2025-07-15T09:00:00Z'),
    allDay: false,
    recurring: {
      enabled: true,
      frequency: 'weekly',
      endRecurrence: new Date('2025-09-30'),
      daysOfWeek: [0, 3, 6], // Sunday, Wednesday, Saturday
    },
    location: {
      name: 'Parque Natural del Peñón de Ifach',
      address: 'Camí del Penyó, 03710 Calp',
      city: 'Calpe',
      region: 'Costa Blanca',
      coordinates: {
        lat: 38.6380,
        lng: 0.0614,
      },
      area: 'penon-ifach',
    },
    primaryCategory: 'active-sports',
    secondaryCategories: ['nature', 'tours'],
    activityType: 'guided-walk',
    targetAudience: ['young-adults', 'couples', 'friends'],
    difficultyLevel: 'moderate',
    ageRestriction: {
      min: 12,
    },
    accessibility: {
      wheelchairAccessible: false,
      familyFriendly: true,
      petsAllowed: false,
    },
    pricing: {
      isFree: false,
      price: {
        amount: 35,
        currency: 'EUR',
      },
      priceDescription: {
        nl: 'Inclusief professionele gids, verzekering en ontbijt',
        en: 'Including professional guide, insurance and breakfast',
        es: 'Incluye guía profesional, seguro y desayuno',
      },
    },
    registration: {
      required: true,
      url: 'https://booking.example.com/ifach-sunrise',
      maxParticipants: 15,
      currentParticipants: 8,
      waitingList: true,
    },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800',
        alt: { nl: 'Peñón de Ifach bij zonsopgang', en: 'Peñón de Ifach at sunrise' },
        isPrimary: true,
        source: 'demo',
      },
    ],
    organizer: {
      name: 'Calpe Adventures',
      website: 'https://calpe-adventures.com',
      email: 'info@calpe-adventures.com',
      phone: '+34 965 123 456',
    },
    sources: [{
      platform: 'getyourguide',
      url: 'https://www.getyourguide.com/calpe',
      lastChecked: new Date(),
      isVerified: true,
      confidence: 85,
    }],
    verification: {
      status: 'verified',
      verificationCount: 2,
      lastVerified: new Date(),
    },
    status: 'published',
    visibility: 'public',
    featured: true,
    priority: 95,
    weatherDependent: true,
    weatherConditions: {
      noRain: true,
      noStrongWind: true,
    },
    metrics: {
      views: 890,
      clicks: 245,
      bookmarks: 67,
    },
  },
  {
    title: {
      nl: 'Zomerse Jazz Concert aan Zee',
      en: 'Summer Jazz Concert by the Sea',
      es: 'Concierto de Jazz de Verano junto al Mar',
      de: 'Sommer Jazz Konzert am Meer',
      fr: 'Concert de Jazz d\'Été au Bord de la Mer',
    },
    description: {
      nl: 'Geniet van een magische avond vol live jazz muziek met de Middellandse Zee als achtergrond. Internationale jazzmuzikanten brengen klassiekers en moderne interpretaties ten gehore op het strand van Calpe. Breng je eigen picknick mee of koop lokale tapas ter plaatse.',
      en: 'Enjoy a magical evening of live jazz music with the Mediterranean Sea as your backdrop. International jazz musicians perform classics and modern interpretations on the beach of Calpe. Bring your own picnic or buy local tapas on site.',
      es: 'Disfruta de una velada mágica llena de música de jazz en vivo con el Mar Mediterráneo como telón de fondo. Músicos de jazz internacionales interpretan clásicos e interpretaciones modernas en la playa de Calpe. Trae tu propio picnic o compra tapas locales en el lugar.',
    },
    shortDescription: {
      nl: 'Live jazz concert op het strand met internationale muzikanten',
      en: 'Live jazz concert on the beach with international musicians',
      es: 'Concierto de jazz en vivo en la playa con músicos internacionales',
    },
    startDate: new Date('2025-08-05T20:30:00Z'),
    endDate: new Date('2025-08-05T23:00:00Z'),
    allDay: false,
    location: {
      name: 'Playa del Arenal-Bol',
      address: 'Paseo Marítimo Infanta Elena',
      city: 'Calpe',
      region: 'Costa Blanca',
      coordinates: {
        lat: 38.6458,
        lng: 0.0520,
      },
      area: 'beach-area',
    },
    primaryCategory: 'music',
    secondaryCategories: ['entertainment', 'beach', 'culture'],
    activityType: 'live-music',
    targetAudience: ['couples', 'young-adults', 'all-ages'],
    accessibility: {
      wheelchairAccessible: true,
      familyFriendly: true,
      petsAllowed: false,
    },
    pricing: {
      isFree: true,
    },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800',
        alt: { nl: 'Jazz concert op het strand', en: 'Jazz concert on the beach' },
        isPrimary: true,
        source: 'demo',
      },
    ],
    organizer: {
      name: 'Calpe Cultural',
      website: 'https://cultura.calp.es',
      email: 'cultura@calp.es',
    },
    sources: [{
      platform: 'cultura-calpe',
      url: 'https://cultura.calp.es/eventos',
      lastChecked: new Date(),
      isVerified: true,
      confidence: 90,
    }],
    verification: {
      status: 'verified',
      verificationCount: 2,
      lastVerified: new Date(),
    },
    status: 'published',
    visibility: 'public',
    featured: true,
    priority: 90,
    metrics: {
      views: 1450,
      clicks: 380,
      bookmarks: 125,
    },
  },
  {
    title: {
      nl: 'Lokale Boerenmarkt & Ambachtsmarkt',
      en: 'Local Farmers & Artisan Market',
      es: 'Mercado de Agricultores y Artesanos Locales',
      de: 'Lokaler Bauern- und Handwerkermarkt',
      fr: 'Marché des Agriculteurs et Artisans Locaux',
    },
    description: {
      nl: 'Ontdek de smaken en tradities van de Costa Blanca op onze wekelijkse boerenmarkt. Verse lokale producten, ambachtelijke kazen, honing, olijfolie, handgemaakte sieraden en traditioneel vakmanschap. Perfecte gelegenheid om lokale producenten te ontmoeten en authentieke souvenirs te kopen.',
      en: 'Discover the flavors and traditions of the Costa Blanca at our weekly farmers market. Fresh local produce, artisan cheeses, honey, olive oil, handmade jewelry and traditional craftsmanship. Perfect opportunity to meet local producers and buy authentic souvenirs.',
      es: 'Descubre los sabores y tradiciones de la Costa Blanca en nuestro mercado de agricultores semanal. Productos locales frescos, quesos artesanales, miel, aceite de oliva, joyería hecha a mano y artesanía tradicional. Oportunidad perfecta para conocer a los productores locales y comprar souvenirs auténticos.',
    },
    shortDescription: {
      nl: 'Wekelijkse markt met verse lokale producten en ambachtelijk vakwerk',
      en: 'Weekly market with fresh local produce and artisan crafts',
      es: 'Mercado semanal con productos locales frescos y artesanías',
    },
    startDate: new Date('2025-06-21T08:00:00Z'),
    endDate: new Date('2025-06-21T14:00:00Z'),
    allDay: false,
    recurring: {
      enabled: true,
      frequency: 'weekly',
      endRecurrence: new Date('2025-12-31'),
      daysOfWeek: [6], // Saturday
    },
    location: {
      name: 'Plaza de la Constitución',
      address: 'Plaza de la Constitución, Centro',
      city: 'Calpe',
      region: 'Costa Blanca',
      coordinates: {
        lat: 38.6425,
        lng: 0.0445,
      },
      area: 'city-center',
    },
    primaryCategory: 'markets',
    secondaryCategories: ['food-drink', 'culture'],
    activityType: 'local-market',
    targetAudience: ['families-with-kids', 'all-ages', 'seniors'],
    accessibility: {
      wheelchairAccessible: true,
      familyFriendly: true,
      petsAllowed: true,
    },
    pricing: {
      isFree: true,
    },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800',
        alt: { nl: 'Kleurrijke boerenmarkt', en: 'Colorful farmers market' },
        isPrimary: true,
        source: 'demo',
      },
    ],
    organizer: {
      name: 'Asociación de Productores Locales',
      email: 'mercado@calpe.es',
    },
    sources: [{
      platform: 'calpe-official',
      url: 'https://www.calpe.es/mercados',
      lastChecked: new Date(),
      isVerified: true,
      confidence: 95,
    }],
    verification: {
      status: 'verified',
      verificationCount: 3,
      lastVerified: new Date(),
    },
    status: 'published',
    visibility: 'public',
    featured: false,
    priority: 70,
    metrics: {
      views: 780,
      clicks: 156,
      bookmarks: 45,
    },
  },
  {
    title: {
      nl: 'Paella Kookworkshop met Zeezicht',
      en: 'Paella Cooking Workshop with Sea View',
      es: 'Taller de Cocina de Paella con Vista al Mar',
      de: 'Paella Kochworkshop mit Meerblick',
      fr: 'Atelier de Cuisine de Paella avec Vue sur la Mer',
    },
    description: {
      nl: 'Leer de geheimen van de authentieke Valenciaanse paella van een lokale chef-kok. Deze hands-on workshop vindt plaats op een terras met prachtig uitzicht op de Middellandse Zee. Inclusief alle ingrediënten, aperitief, wijn en natuurlijk het eten van je zelfgemaakte paella!',
      en: 'Learn the secrets of authentic Valencian paella from a local chef. This hands-on workshop takes place on a terrace with beautiful views of the Mediterranean Sea. Includes all ingredients, aperitif, wine and of course eating your homemade paella!',
      es: 'Aprende los secretos de la auténtica paella valenciana de un chef local. Este taller práctico tiene lugar en una terraza con hermosas vistas al Mar Mediterráneo. ¡Incluye todos los ingredientes, aperitivo, vino y por supuesto comer tu paella casera!',
    },
    shortDescription: {
      nl: 'Hands-on paella kookworkshop inclusief ingrediënten en wijn',
      en: 'Hands-on paella cooking workshop including ingredients and wine',
      es: 'Taller de cocina de paella práctico incluyendo ingredientes y vino',
    },
    startDate: new Date('2025-07-10T10:00:00Z'),
    endDate: new Date('2025-07-10T14:30:00Z'),
    allDay: false,
    recurring: {
      enabled: true,
      frequency: 'weekly',
      endRecurrence: new Date('2025-09-30'),
      daysOfWeek: [3, 6], // Wednesday, Saturday
    },
    location: {
      name: 'La Terraza Gastronómica',
      address: 'Av. del Puerto, 24',
      city: 'Calpe',
      region: 'Costa Blanca',
      coordinates: {
        lat: 38.6392,
        lng: 0.0532,
      },
      area: 'port',
    },
    primaryCategory: 'food-drink',
    secondaryCategories: ['workshops', 'culture'],
    activityType: 'cooking-class',
    targetAudience: ['couples', 'friends', 'young-adults'],
    ageRestriction: {
      min: 16,
    },
    accessibility: {
      wheelchairAccessible: true,
      familyFriendly: false,
    },
    pricing: {
      isFree: false,
      price: {
        amount: 65,
        currency: 'EUR',
      },
      priceDescription: {
        nl: 'Inclusief alle ingrediënten, aperitief, wijn en lunch',
        en: 'Including all ingredients, aperitif, wine and lunch',
        es: 'Incluye todos los ingredientes, aperitivo, vino y almuerzo',
      },
    },
    registration: {
      required: true,
      url: 'https://booking.example.com/paella-workshop',
      phone: '+34 965 234 567',
      maxParticipants: 12,
      currentParticipants: 9,
      waitingList: true,
    },
    images: [
      {
        url: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=800',
        alt: { nl: 'Paella koken', en: 'Cooking paella' },
        isPrimary: true,
        source: 'demo',
      },
    ],
    organizer: {
      name: 'Chef Miguel García',
      website: 'https://laterrazagastronomica.com',
      email: 'info@laterrazagastronomica.com',
      phone: '+34 965 234 567',
    },
    externalLinks: [{
      platform: 'tripadvisor',
      url: 'https://www.tripadvisor.com/cooking-class-calpe',
      rating: 4.9,
      reviewCount: 187,
    }],
    sources: [{
      platform: 'tripadvisor',
      url: 'https://www.tripadvisor.com/calpe',
      lastChecked: new Date(),
      isVerified: true,
      confidence: 85,
    }],
    verification: {
      status: 'verified',
      verificationCount: 2,
      lastVerified: new Date(),
    },
    status: 'published',
    visibility: 'public',
    featured: true,
    priority: 85,
    metrics: {
      views: 1120,
      clicks: 298,
      bookmarks: 94,
    },
  },
];

/**
 * Seed the database
 */
async function seedDatabase() {
  try {
    logger.info('Starting database seed...');

    // Clear existing events (only in development!)
    if (process.env.NODE_ENV === 'development') {
      await Event.deleteMany({});
      logger.info('Cleared existing events');
    }

    // Insert seed data
    const inserted = await Event.insertMany(calpeEvents);
    logger.info(`Successfully seeded ${inserted.length} events`);

    // Log statistics
    const stats = {
      total: inserted.length,
      featured: inserted.filter(e => e.featured).length,
      free: inserted.filter(e => e.pricing.isFree).length,
      recurring: inserted.filter(e => e.recurring?.enabled).length,
      categories: [...new Set(inserted.map(e => e.primaryCategory))],
    };

    logger.info('Seed statistics:', stats);

    return inserted;
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  }
}

/**
 * Run seed if called directly
 */
if (require.main === module) {
  require('dotenv').config();
  const connectDB = require('../config/database');

  connectDB()
    .then(() => seedDatabase())
    .then(() => {
      logger.info('Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seed failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase, calpeEvents };
