import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Calendar, MapPin, Clock, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { motion } from 'framer-motion';
import { staggerContainerVariants, staggerItemVariants } from '../shared/utils/animations';
import './AgendaPage.css';

/**
 * AgendaPage - Events & Activities Calendar
 *
 * Route: /agenda
 * Layout: RootLayout
 * Auth: Public
 *
 * Features:
 * - Calendar view of Calpe events
 * - Filter by category
 * - Integration with Agenda Module API
 */

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  image?: string;
  price?: string;
}

const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Fiesta de la Virgen de las Nieves',
    description: 'Traditional festival celebrating the patron saint of Calpe',
    date: '2025-08-05',
    time: '20:00',
    location: 'Plaza de la Villa, Calpe',
    category: 'festival',
    image: '/assets/images/fiesta.jpg',
    price: 'Gratis'
  },
  {
    id: '2',
    title: 'Mercado Medieval',
    description: 'Medieval market with local crafts, food, and entertainment',
    date: '2025-07-15',
    time: '10:00 - 22:00',
    location: 'Casco Antiguo, Calpe',
    category: 'market',
    image: '/assets/images/mercado.jpg',
    price: 'Gratis'
  },
  {
    id: '3',
    title: 'Concierto de Verano',
    description: 'Summer concert series at the beach promenade',
    date: '2025-07-20',
    time: '21:30',
    location: 'Paseo Marítimo, Calpe',
    category: 'music',
    image: '/assets/images/concierto.jpg',
    price: '€15'
  },
  {
    id: '4',
    title: 'Ruta de Tapas',
    description: 'Tapas route through the best restaurants in Calpe',
    date: '2025-06-10',
    time: '19:00 - 23:00',
    location: 'Various locations',
    category: 'gastronomy',
    image: '/assets/images/tapas.jpg',
    price: '€3 per tapa'
  },
  {
    id: '5',
    title: 'Yoga at Sunrise - Peñón de Ifach',
    description: 'Morning yoga session with views of the Mediterranean',
    date: '2025-06-15',
    time: '07:00',
    location: 'Peñón de Ifach, Calpe',
    category: 'wellness',
    image: '/assets/images/yoga.jpg',
    price: '€20'
  },
  {
    id: '6',
    title: 'Kayak Tour - Hidden Coves',
    description: 'Explore the hidden coves and caves along the coast',
    date: '2025-06-20',
    time: '09:00',
    location: 'Puerto de Calpe',
    category: 'adventure',
    image: '/assets/images/kayak.jpg',
    price: '€45'
  }
];

const CATEGORIES = [
  { id: 'all', label: 'Alle', icon: '🎯' },
  { id: 'festival', label: 'Festivals', icon: '🎉' },
  { id: 'music', label: 'Muziek', icon: '🎵' },
  { id: 'gastronomy', label: 'Gastronomie', icon: '🍽️' },
  { id: 'market', label: 'Markten', icon: '🛍️' },
  { id: 'wellness', label: 'Wellness', icon: '🧘' },
  { id: 'adventure', label: 'Avontuur', icon: '🚣' },
];

export function AgendaPage() {
  const { t } = useLanguage();
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>(MOCK_EVENTS);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Filter events by category
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter(e => e.category === selectedCategory));
    }
  }, [selectedCategory, events]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  // Navigate months
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const monthName = currentMonth.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });

  return (
    <div className="agenda-page">
      {/* Hero Section */}
      <section className="agenda-hero">
        <div className="agenda-hero-content">
          <h1>📅 {t.agenda?.title || 'Agenda Calpe'}</h1>
          <p>{t.agenda?.subtitle || 'Ontdek alle evenementen, festivals en activiteiten in Calpe'}</p>
        </div>
      </section>

      {/* Month Navigation */}
      <section className="month-navigation">
        <button className="month-nav-btn" onClick={prevMonth}>
          <ChevronLeft size={24} />
        </button>
        <h2 className="current-month">{monthName}</h2>
        <button className="month-nav-btn" onClick={nextMonth}>
          <ChevronRight size={24} />
        </button>
      </section>

      {/* Category Filter */}
      <section className="category-filter">
        <div className="filter-container">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span className="filter-icon">{cat.icon}</span>
              <span className="filter-label">{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Events Grid */}
      <section className="events-section">
        <motion.div
          className="events-grid"
          variants={staggerContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredEvents.length === 0 ? (
            <div className="no-events">
              <p>Geen evenementen gevonden voor deze categorie.</p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <motion.div
                key={event.id}
                className="event-card"
                variants={staggerItemVariants}
              >
                <div className="event-image">
                  <img
                    src={event.image || '/assets/images/event-placeholder.jpg'}
                    alt={event.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400';
                    }}
                  />
                  <span className="event-category">
                    {CATEGORIES.find(c => c.id === event.category)?.icon} {event.category}
                  </span>
                </div>
                <div className="event-content">
                  <div className="event-date">
                    <Calendar size={16} />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <h3 className="event-title">{event.title}</h3>
                  <p className="event-description">{event.description}</p>
                  <div className="event-meta">
                    <div className="event-time">
                      <Clock size={14} />
                      <span>{event.time}</span>
                    </div>
                    <div className="event-location">
                      <MapPin size={14} />
                      <span>{event.location}</span>
                    </div>
                  </div>
                  <div className="event-footer">
                    <span className="event-price">{event.price}</span>
                    <button className="event-btn">Meer info</button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="agenda-cta">
        <div className="cta-content">
          <h2>Mis geen enkel evenement!</h2>
          <p>Meld je aan voor onze nieuwsbrief en ontvang wekelijks de beste evenementen in Calpe.</p>
          <div className="cta-form">
            <input type="email" placeholder="Je e-mailadres" />
            <button>Aanmelden</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AgendaPage;
