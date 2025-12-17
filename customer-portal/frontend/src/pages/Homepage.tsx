import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useLanguage } from '../i18n/LanguageContext';
import { Footer } from '../shared/components/Footer';
import './Homepage.css';

/**
 * Homepage - Landing page (REBUILT to match wireframe exactly)
 *
 * Route: /
 * Layout: RootLayout
 * Auth: Public
 */

export function Homepage() {
  const { t } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // USPs with translations
  const usps = [
    {
      logoSrc: '/assets/images/calpe-turismo-logo.png',
      title: t.homepage.usps.partner.title,
      description: t.homepage.usps.partner.description,
    },
    {
      icon: '🤖',
      title: t.homepage.usps.ai.title,
      description: t.homepage.usps.ai.description,
    },
    {
      icon: '🏘️',
      title: t.homepage.usps.local.title,
      description: t.homepage.usps.local.description,
    },
    {
      icon: '⚡',
      title: t.homepage.usps.realtime.title,
      description: t.homepage.usps.realtime.description,
    },
    {
      icon: '🔒',
      title: t.homepage.usps.trusted.title,
      description: t.homepage.usps.trusted.description,
    },
  ];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % usps.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isMobile]);

  return (
    <>
      {/* Fixed Logo Block - Homepage Only */}
      <Link to="/" className="homepage-logo-container">
        <div className="homepage-logo-content">
          {/* Brand Icon - stays at top */}
          <img
            src="/assets/images/hb-merkicoon.png"
            alt="HolidaiButler Icon"
            className="homepage-logo-icon"
          />
          {/* Brand Text - centered between icon and bottom with whitespace */}
          <span className="homepage-logo-text">HolidaiButler</span>
        </div>
      </Link>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>{t.homepage.hero.title}</h1>
          <p className="hero-payoff">{t.homepage.hero.payoff}</p>
          <p className="hero-sub">{t.homepage.hero.subtitle}</p>
        </div>
      </section>

      {/* Why HolidaiButler Section */}
      <section className="why-section">
        <h2 className="why-title">{t.homepage.why.title}</h2>
      </section>

      {/* USP Section */}
      <section className="usp-section">
        <div className="usp-container">
          {/* Desktop: Grid */}
          {!isMobile && (
            <div className="usp-grid">
              {usps.map((usp, index) => (
                <div key={index} className="usp-card">
                  {usp.logoSrc ? (
                    <img src={usp.logoSrc} alt={usp.title} className="usp-icon logo-calpe" />
                  ) : (
                    <div className="usp-icon">{usp.icon}</div>
                  )}
                  <h3 className="usp-title">{usp.title}</h3>
                  <p className="usp-text">{usp.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Mobile: Carousel */}
          {isMobile && (
            <div className="usp-carousel">
              <div className="usp-carousel-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                {usps.map((usp, index) => (
                  <div key={index} className="usp-card">
                    {usp.logoSrc ? (
                      <img src={usp.logoSrc} alt={usp.title} className="usp-icon logo-calpe" />
                    ) : (
                      <div className="usp-icon">{usp.icon}</div>
                    )}
                    <h3 className="usp-title">{usp.title}</h3>
                    <p className="usp-text">{usp.description}</p>
                  </div>
                ))}
              </div>
              <div className="carousel-dots">
                {usps.map((_, index) => (
                  <button
                    key={index}
                    className={`carousel-dot ${currentSlide === index ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA Buttons */}
      <section className="cta-section">
        <div className="cta-container">
          <Link to="/pois" className="cta-btn explore">
            {t.homepage.cta.explore}
          </Link>
          <Link to="/agenda" className="cta-btn agenda">
            {t.homepage.cta.agenda}
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features">
        <div className="features-grid">
          {/* Feature 1: AI Assistant */}
          <div
            className="feature-card"
            onClick={() => {
              if ((window as unknown as { openHoliBot?: () => void }).openHoliBot) {
                (window as unknown as { openHoliBot: () => void }).openHoliBot();
              }
            }}
          >
            <span className="feature-icon">🤖</span>
            <h3 className="feature-title">{t.homepage.features.aiAssistant.title}</h3>
            <p className="feature-description">
              {t.homepage.features.aiAssistant.description}
            </p>
          </div>

          {/* Feature 2: Local Expertise */}
          <Link to="/pois" className="feature-card">
            <span className="feature-icon">🗺️</span>
            <h3 className="feature-title">{t.homepage.features.localPois.title}</h3>
            <p className="feature-description">
              {t.homepage.features.localPois.description}
            </p>
          </Link>

          {/* Feature 3: Personalized Experience */}
          <Link to="/onboarding" className="feature-card">
            <span className="feature-icon">✨</span>
            <h3 className="feature-title">{t.homepage.features.tailored.title}</h3>
            <p className="feature-description">
              {t.homepage.features.tailored.description}
            </p>
          </Link>

          {/* Feature 4: User Account */}
          <Link to="/login" className="feature-card">
            <span className="feature-icon">👤</span>
            <h3 className="feature-title">{t.homepage.features.account.title}</h3>
            <p className="feature-description">
              {t.homepage.features.account.description}
            </p>
          </Link>
        </div>
      </section>

      {/* Rating Section */}
      <section className="rating-section">
        <div className="rating-content">
          <div className="stars">⭐⭐⭐⭐⭐</div>
          <div className="rating-text">{t.homepage.rating.text}</div>
          <div className="rating-subtext">{t.homepage.rating.score}</div>
          <a href="#" className="review-btn">{t.homepage.rating.button}</a>
        </div>
      </section>

      {/* Enterprise Footer Component */}
      <Footer />
    </>
  );
}
