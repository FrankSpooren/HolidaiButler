import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * i18n Configuration for Agenda Module
 * Supported languages: nl, en, es, de, fr
 */

const resources = {
  nl: {
    translation: {
      // Common
      common: {
        loading: 'Laden...',
        error: 'Er is een fout opgetreden',
        noResults: 'Geen resultaten gevonden',
        search: 'Zoeken',
        filter: 'Filter',
        clear: 'Wissen',
        apply: 'Toepassen',
        close: 'Sluiten',
        viewDetails: 'Bekijk details',
        backToList: 'Terug naar lijst',
      },

      // Agenda page
      agenda: {
        title: 'Agenda Calpe',
        subtitle: 'Ontdek de beste evenementen en activiteiten in Calpe',
        upcomingEvents: 'Aankomende evenementen',
        featuredEvents: 'Uitgelichte evenementen',
        noEvents: 'Geen evenementen gevonden',
        showMore: 'Toon meer',
        eventDetails: 'Evenement details',
      },

      // Filters
      filters: {
        title: 'Filters',
        dateRange: 'Periode',
        category: 'Categorie',
        audience: 'Doelgroep',
        timeOfDay: 'Dagdeel',
        location: 'Locatie',
        price: 'Prijs',
        freeOnly: 'Alleen gratis evenementen',
        allCategories: 'Alle categorieën',
      },

      // Date ranges
      dateRanges: {
        upcoming: 'Aankomend',
        today: 'Vandaag',
        thisWeek: 'Deze week',
        thisMonth: 'Deze maand',
        custom: 'Aangepaste periode',
      },

      // Categories
      categories: {
        culture: 'Cultuur',
        beach: 'Strand',
        'active-sports': 'Actief & Sport',
        relaxation: 'Ontspanning',
        'food-drink': 'Eten & Drinken',
        nature: 'Natuur',
        entertainment: 'Entertainment',
        folklore: 'Folklore',
        festivals: 'Festivals',
        tours: 'Rondleidingen',
        workshops: 'Workshops',
        markets: 'Markten',
        'sports-events': 'Sportevenementen',
        exhibitions: 'Tentoonstellingen',
        music: 'Muziek',
        family: 'Familie',
      },

      // Time of day
      timeOfDay: {
        morning: 'Ochtend',
        afternoon: 'Middag',
        evening: 'Avond',
        night: 'Nacht',
        'all-day': 'Hele dag',
      },

      // Target audience
      audience: {
        'families-with-kids': 'Gezinnen met kinderen',
        couples: 'Stellen',
        friends: 'Vrienden',
        'solo-travelers': 'Alleen reizigers',
        seniors: 'Senioren',
        'young-adults': 'Jongvolwassenen',
        children: 'Kinderen',
        teens: 'Tieners',
        'all-ages': 'Alle leeftijden',
      },

      // Event details
      event: {
        date: 'Datum',
        time: 'Tijd',
        location: 'Locatie',
        price: 'Prijs',
        free: 'Gratis',
        description: 'Beschrijving',
        organizer: 'Organisator',
        website: 'Website',
        registration: 'Aanmelding',
        registrationRequired: 'Aanmelding verplicht',
        spotsLeft: 'plaatsen beschikbaar',
        soldOut: 'Uitverkocht',
        categories: 'Categorieën',
        audience: 'Geschikt voor',
      },
    },
  },

  en: {
    translation: {
      common: {
        loading: 'Loading...',
        error: 'An error occurred',
        noResults: 'No results found',
        search: 'Search',
        filter: 'Filter',
        clear: 'Clear',
        apply: 'Apply',
        close: 'Close',
        viewDetails: 'View details',
        backToList: 'Back to list',
      },

      agenda: {
        title: 'Calpe Agenda',
        subtitle: 'Discover the best events and activities in Calpe',
        upcomingEvents: 'Upcoming events',
        featuredEvents: 'Featured events',
        noEvents: 'No events found',
        showMore: 'Show more',
        eventDetails: 'Event details',
      },

      filters: {
        title: 'Filters',
        dateRange: 'Date range',
        category: 'Category',
        audience: 'Audience',
        timeOfDay: 'Time of day',
        location: 'Location',
        price: 'Price',
        freeOnly: 'Free events only',
        allCategories: 'All categories',
      },

      dateRanges: {
        upcoming: 'Upcoming',
        today: 'Today',
        thisWeek: 'This week',
        thisMonth: 'This month',
        custom: 'Custom',
      },

      categories: {
        culture: 'Culture',
        beach: 'Beach',
        'active-sports': 'Active & Sports',
        relaxation: 'Relaxation',
        'food-drink': 'Food & Drink',
        nature: 'Nature',
        entertainment: 'Entertainment',
        folklore: 'Folklore',
        festivals: 'Festivals',
        tours: 'Tours',
        workshops: 'Workshops',
        markets: 'Markets',
        'sports-events': 'Sports Events',
        exhibitions: 'Exhibitions',
        music: 'Music',
        family: 'Family',
      },

      timeOfDay: {
        morning: 'Morning',
        afternoon: 'Afternoon',
        evening: 'Evening',
        night: 'Night',
        'all-day': 'All day',
      },

      audience: {
        'families-with-kids': 'Families with kids',
        couples: 'Couples',
        friends: 'Friends',
        'solo-travelers': 'Solo travelers',
        seniors: 'Seniors',
        'young-adults': 'Young adults',
        children: 'Children',
        teens: 'Teens',
        'all-ages': 'All ages',
      },

      event: {
        date: 'Date',
        time: 'Time',
        location: 'Location',
        price: 'Price',
        free: 'Free',
        description: 'Description',
        organizer: 'Organizer',
        website: 'Website',
        registration: 'Registration',
        registrationRequired: 'Registration required',
        spotsLeft: 'spots available',
        soldOut: 'Sold out',
        categories: 'Categories',
        audience: 'Suitable for',
      },
    },
  },

  es: {
    translation: {
      common: {
        loading: 'Cargando...',
        error: 'Se produjo un error',
        noResults: 'No se encontraron resultados',
        search: 'Buscar',
        filter: 'Filtrar',
        clear: 'Borrar',
        apply: 'Aplicar',
        close: 'Cerrar',
        viewDetails: 'Ver detalles',
        backToList: 'Volver a la lista',
      },

      agenda: {
        title: 'Agenda Calpe',
        subtitle: 'Descubre los mejores eventos y actividades en Calpe',
        upcomingEvents: 'Próximos eventos',
        featuredEvents: 'Eventos destacados',
        noEvents: 'No se encontraron eventos',
        showMore: 'Mostrar más',
        eventDetails: 'Detalles del evento',
      },

      filters: {
        title: 'Filtros',
        dateRange: 'Rango de fechas',
        category: 'Categoría',
        audience: 'Público',
        timeOfDay: 'Momento del día',
        location: 'Ubicación',
        price: 'Precio',
        freeOnly: 'Solo eventos gratuitos',
        allCategories: 'Todas las categorías',
      },

      dateRanges: {
        upcoming: 'Próximos',
        today: 'Hoy',
        thisWeek: 'Esta semana',
        thisMonth: 'Este mes',
        custom: 'Personalizado',
      },

      categories: {
        culture: 'Cultura',
        beach: 'Playa',
        'active-sports': 'Activo y Deportes',
        relaxation: 'Relajación',
        'food-drink': 'Comida y Bebida',
        nature: 'Naturaleza',
        entertainment: 'Entretenimiento',
        folklore: 'Folklore',
        festivals: 'Festivales',
        tours: 'Tours',
        workshops: 'Talleres',
        markets: 'Mercados',
        'sports-events': 'Eventos Deportivos',
        exhibitions: 'Exposiciones',
        music: 'Música',
        family: 'Familia',
      },

      timeOfDay: {
        morning: 'Mañana',
        afternoon: 'Tarde',
        evening: 'Noche',
        night: 'Madrugada',
        'all-day': 'Todo el día',
      },

      audience: {
        'families-with-kids': 'Familias con niños',
        couples: 'Parejas',
        friends: 'Amigos',
        'solo-travelers': 'Viajeros solitarios',
        seniors: 'Mayores',
        'young-adults': 'Jóvenes adultos',
        children: 'Niños',
        teens: 'Adolescentes',
        'all-ages': 'Todas las edades',
      },

      event: {
        date: 'Fecha',
        time: 'Hora',
        location: 'Ubicación',
        price: 'Precio',
        free: 'Gratis',
        description: 'Descripción',
        organizer: 'Organizador',
        website: 'Sitio web',
        registration: 'Inscripción',
        registrationRequired: 'Inscripción obligatoria',
        spotsLeft: 'plazas disponibles',
        soldOut: 'Agotado',
        categories: 'Categorías',
        audience: 'Adecuado para',
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'nl', // Default language
    fallbackLng: 'nl',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
