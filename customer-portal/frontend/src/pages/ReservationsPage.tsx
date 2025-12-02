import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Search, MapPin, Star, Clock, Users, Filter, ChevronDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { motion } from 'framer-motion';
import { staggerContainerVariants, staggerItemVariants, cardHoverVariants } from '../shared/utils/animations';
import './ReservationsPage.css';

/**
 * ReservationsPage - Restaurant Reservations
 *
 * Route: /reservations
 * Layout: RootLayout
 * Auth: Public
 *
 * Features:
 * - Browse restaurants in Calpe
 * - Filter by cuisine type
 * - Make reservations via Reservations Module API
 */

interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  address: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  image?: string;
  openingHours: string;
  features: string[];
}

const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: '1',
    name: 'Restaurante Baydal',
    description: 'Authentic Mediterranean cuisine with fresh seafood and stunning sea views',
    cuisine: 'Mediterranean',
    address: 'Av. Gabriel Miró 3, Calpe',
    rating: 4.7,
    reviewCount: 324,
    priceRange: '€€€',
    image: '/assets/images/baydal.jpg',
    openingHours: '12:00 - 23:00',
    features: ['Terrace', 'Sea View', 'Wheelchair Accessible']
  },
  {
    id: '2',
    name: 'El Bodegón',
    description: 'Traditional Spanish tapas and wines in a cozy atmosphere',
    cuisine: 'Spanish',
    address: 'Calle Mayor 15, Calpe',
    rating: 4.5,
    reviewCount: 189,
    priceRange: '€€',
    image: '/assets/images/bodegon.jpg',
    openingHours: '18:00 - 00:00',
    features: ['Wine Selection', 'Tapas', 'Live Music']
  },
  {
    id: '3',
    name: 'Sakura Japanese',
    description: 'Premium sushi and Japanese cuisine with fresh ingredients',
    cuisine: 'Japanese',
    address: 'Paseo Marítimo 22, Calpe',
    rating: 4.8,
    reviewCount: 156,
    priceRange: '€€€€',
    image: '/assets/images/sakura.jpg',
    openingHours: '13:00 - 15:30, 19:30 - 23:00',
    features: ['Sushi Bar', 'Private Rooms', 'Vegan Options']
  },
  {
    id: '4',
    name: 'Pizzeria Italiana',
    description: 'Authentic Italian pizzas baked in a wood-fired oven',
    cuisine: 'Italian',
    address: 'Plaza de la Constitución 8, Calpe',
    rating: 4.4,
    reviewCount: 267,
    priceRange: '€€',
    image: '/assets/images/pizzeria.jpg',
    openingHours: '12:00 - 23:30',
    features: ['Wood Oven', 'Family Friendly', 'Delivery']
  },
  {
    id: '5',
    name: 'Casa Pepe Mariscos',
    description: 'Fresh seafood and paella, a local favorite for over 30 years',
    cuisine: 'Seafood',
    address: 'Puerto de Calpe, Muelle 5',
    rating: 4.6,
    reviewCount: 412,
    priceRange: '€€€',
    image: '/assets/images/mariscos.jpg',
    openingHours: '12:30 - 16:00, 19:30 - 23:00',
    features: ['Harbor View', 'Fresh Catch', 'Paella']
  },
  {
    id: '6',
    name: 'Vegan Garden',
    description: 'Plant-based cuisine with organic ingredients from local farms',
    cuisine: 'Vegan',
    address: 'Calle del Sol 12, Calpe',
    rating: 4.3,
    reviewCount: 89,
    priceRange: '€€',
    image: '/assets/images/vegan.jpg',
    openingHours: '10:00 - 22:00',
    features: ['Organic', 'Gluten-Free Options', 'Smoothies']
  }
];

const CUISINES = [
  { id: 'all', label: 'Alle' },
  { id: 'Mediterranean', label: 'Mediterraan' },
  { id: 'Spanish', label: 'Spaans' },
  { id: 'Italian', label: 'Italiaans' },
  { id: 'Japanese', label: 'Japans' },
  { id: 'Seafood', label: 'Visgerechten' },
  { id: 'Vegan', label: 'Vegan' },
];

export function ReservationsPage() {
  const { t } = useLanguage();
  const [restaurants, setRestaurants] = useState<Restaurant[]>(MOCK_RESTAURANTS);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>(MOCK_RESTAURANTS);
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  // Filter restaurants
  useEffect(() => {
    let filtered = restaurants;

    if (selectedCuisine !== 'all') {
      filtered = filtered.filter(r => r.cuisine === selectedCuisine);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.cuisine.toLowerCase().includes(query)
      );
    }

    setFilteredRestaurants(filtered);
  }, [selectedCuisine, searchQuery, restaurants]);

  const openBooking = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowBookingModal(true);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        fill={i < Math.floor(rating) ? '#D4AF37' : 'none'}
        stroke={i < Math.floor(rating) ? '#D4AF37' : '#d1d5db'}
      />
    ));
  };

  return (
    <div className="reservations-page">
      {/* Hero Section */}
      <section className="reservations-hero">
        <div className="hero-content">
          <h1>🍽️ {t.reservations?.title || 'Restaurant Reserveringen'}</h1>
          <p>{t.reservations?.subtitle || 'Ontdek en reserveer bij de beste restaurants in Calpe'}</p>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <section className="search-filter-bar">
        <div className="search-container">
          <div className="search-input-wrapper">
            <Search size={20} />
            <input
              type="text"
              placeholder="Zoek restaurant of keuken..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="booking-inputs">
            <div className="input-group">
              <Users size={18} />
              <select value={partySize} onChange={(e) => setPartySize(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? 'persoon' : 'personen'}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <Clock size={18} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="input-group">
              <Clock size={18} />
              <select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}>
                <option value="">Tijd</option>
                {['12:00', '12:30', '13:00', '13:30', '14:00', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'].map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Cuisine Filter */}
      <section className="cuisine-filter">
        <div className="filter-container">
          {CUISINES.map(cuisine => (
            <button
              key={cuisine.id}
              className={`cuisine-btn ${selectedCuisine === cuisine.id ? 'active' : ''}`}
              onClick={() => setSelectedCuisine(cuisine.id)}
            >
              {cuisine.label}
            </button>
          ))}
        </div>
      </section>

      {/* Restaurants Grid */}
      <section className="restaurants-section">
        <div className="section-header">
          <h2>{filteredRestaurants.length} restaurants gevonden</h2>
        </div>

        <motion.div
          className="restaurants-grid"
          variants={staggerContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredRestaurants.map((restaurant) => (
            <motion.div
              key={restaurant.id}
              className="restaurant-card"
              variants={staggerItemVariants}
              whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.12)' }}
            >
              <div className="restaurant-image">
                <img
                  src={restaurant.image || '/assets/images/restaurant-placeholder.jpg'}
                  alt={restaurant.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';
                  }}
                />
                <span className="cuisine-tag">{restaurant.cuisine}</span>
                <span className="price-tag">{restaurant.priceRange}</span>
              </div>

              <div className="restaurant-content">
                <div className="restaurant-header">
                  <h3>{restaurant.name}</h3>
                  <div className="rating">
                    {renderStars(restaurant.rating)}
                    <span className="rating-text">{restaurant.rating} ({restaurant.reviewCount})</span>
                  </div>
                </div>

                <p className="restaurant-description">{restaurant.description}</p>

                <div className="restaurant-info">
                  <div className="info-item">
                    <MapPin size={14} />
                    <span>{restaurant.address}</span>
                  </div>
                  <div className="info-item">
                    <Clock size={14} />
                    <span>{restaurant.openingHours}</span>
                  </div>
                </div>

                <div className="restaurant-features">
                  {restaurant.features.slice(0, 3).map((feature, i) => (
                    <span key={i} className="feature-tag">{feature}</span>
                  ))}
                </div>

                <button
                  className="reserve-btn"
                  onClick={() => openBooking(restaurant)}
                >
                  Reserveer Nu
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Booking Modal */}
      {showBookingModal && selectedRestaurant && (
        <div className="modal-overlay" onClick={() => setShowBookingModal(false)}>
          <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowBookingModal(false)}>×</button>
            <h2>Reserveer bij {selectedRestaurant.name}</h2>
            <form className="booking-form" onSubmit={(e) => { e.preventDefault(); alert('Reservering verstuurd!'); setShowBookingModal(false); }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Naam</label>
                  <input type="text" required placeholder="Je naam" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" required placeholder="je@email.com" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Telefoon</label>
                  <input type="tel" required placeholder="+31 6 12345678" />
                </div>
                <div className="form-group">
                  <label>Aantal personen</label>
                  <select defaultValue={partySize}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Datum</label>
                  <input type="date" required defaultValue={selectedDate} />
                </div>
                <div className="form-group">
                  <label>Tijd</label>
                  <select required defaultValue={selectedTime}>
                    <option value="">Selecteer tijd</option>
                    {['12:00', '12:30', '13:00', '13:30', '14:00', '19:00', '19:30', '20:00', '20:30', '21:00'].map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Speciale verzoeken</label>
                <textarea placeholder="Allergieën, speciale wensen..."></textarea>
              </div>
              <button type="submit" className="submit-btn">Bevestig Reservering</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReservationsPage;
