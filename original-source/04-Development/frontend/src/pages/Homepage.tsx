import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useLanguage } from '../i18n/LanguageContext';
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
      logoSrc: '/src/assets/images/calpe-turismo-logo.png',
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
        <svg className="homepage-logo-svg" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
          <g transform="translate(200, 70) scale(1.3)">
            <path d="M -60,30 Q -30,10 0,30 Q 30,50 60,30" stroke="#5E8B7E" strokeWidth="3" fill="none"/>
            <path d="M -60,40 Q -30,20 0,40 Q 30,60 60,40" stroke="#5E8B7E" strokeWidth="2" fill="none" opacity="0.6"/>
            <circle cx="0" cy="0" r="35" fill="none" stroke="#5E8B7E" strokeWidth="2" strokeDasharray="4,2"/>
            <g fill="#D4AF37">
              <polygon points="0,-50 -6,-15 -20,-15 -10,-5 -15,10 0,0 15,10 10,-5 20,-15 6,-15" />
            </g>
            <g fill="#D4AF37" opacity="0.7">
              <circle cx="0" cy="-35" r="2"/>
              <circle cx="35" cy="0" r="2"/>
              <circle cx="0" cy="35" r="2"/>
              <circle cx="-35" cy="0" r="2"/>
            </g>
            <circle cx="0" cy="0" r="3" fill="#5E8B7E"/>
            <circle cx="0" cy="0" r="1.5" fill="#D4AF37"/>
          </g>
          <text x="200" y="205" textAnchor="middle" fill="#5E8B7E" fontFamily="'Inter', sans-serif" fontSize="30" fontWeight="600">HolidaiButler</text>
        </svg>
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
          <Link to="/login" className="cta-btn agenda">
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
          <Link to="/signup" className="feature-card">
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

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-links">
            <Link to="/about" className="footer-link">{t.footer.about}</Link>
            <Link to="/privacy" className="footer-link">{t.footer.privacy}</Link>
            <Link to="/terms" className="footer-link">{t.footer.terms}</Link>
            <Link to="/contact" className="footer-link">{t.footer.contact}</Link>
          </div>
          <p className="footer-copy">
            {t.footer.copyright}
          </p>
        </div>
      </footer>
    </>
  );
}
