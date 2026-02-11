import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useLanguage } from '../i18n/LanguageContext';
import { useDestination } from '../shared/contexts/DestinationContext';
import { Footer } from '../shared/components/Footer';
import './Homepage.css';

/**
 * Homepage - Landing page (REBUILT to match wireframe exactly)
 *
 * Route: /
 * Layout: RootLayout
 * Auth: Public
 * Multi-destination aware via DestinationContext
 */

export function Homepage() {
  const { t, language } = useLanguage();
  const destination = useDestination();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Texel USP translations
  const texelUsps = {
    nl: [
      { logoSrc: '/assets/images/texel/vvv-texel-logo.gif', title: 'Officieel Partner', description: 'Officieel Partner VVV Texel' },
      { icon: '🤖', title: 'Tessa AI-Assistent', description: 'Tessa: Jouw (hyper) persoonlijke Butler' },
      { icon: '🌊', title: '100% Lokaal', description: 'Ondersteun Texel economie & identiteit' },
      { icon: '⚡', title: 'Realtime info', description: 'Stranden, veerboot, weer en evenementen' },
      { icon: '🔒', title: 'Veilig & Betrouwbaar', description: 'We geven om je privacy' },
    ],
    en: [
      { logoSrc: '/assets/images/texel/vvv-texel-logo.gif', title: 'Official Partner', description: 'Official Partner VVV Texel' },
      { icon: '🤖', title: 'Tessa AI Assistant', description: 'Tessa: Your (hyper) personal Butler' },
      { icon: '🌊', title: '100% Local', description: 'Support Texel economy & identity' },
      { icon: '⚡', title: 'Real-time info', description: 'Beaches, ferry, weather and events' },
      { icon: '🔒', title: 'Safe & Reliable', description: 'We care about your privacy' },
    ],
    de: [
      { logoSrc: '/assets/images/texel/vvv-texel-logo.gif', title: 'Offizieller Partner', description: 'Offizieller Partner VVV Texel' },
      { icon: '🤖', title: 'Tessa KI-Assistent', description: 'Tessa: Ihr (hyper) persönlicher Butler' },
      { icon: '🌊', title: '100% Lokal', description: 'Unterstützen Sie die Texeler Wirtschaft & Identität' },
      { icon: '⚡', title: 'Echtzeit-Info', description: 'Strände, Fähre, Wetter und Veranstaltungen' },
      { icon: '🔒', title: 'Sicher & Zuverlässig', description: 'Wir kümmern uns um Ihre Privatsphäre' },
    ],
  };

  // Destination-specific USPs
  const usps = destination.id === 'texel'
    ? (texelUsps[language as keyof typeof texelUsps] || texelUsps.nl)
    : [
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

  // Texel hero translations
  const texelHero = {
    nl: {
      title: 'Jouw eilandavontuur begint hier.',
      payoff: 'Ervaar dit Waddenjuweel volledig op jou afgestemd',
      subtitle: 'Stranden, natuur, fietsen en lokale parels - alles op één plek',
      why: 'Waarom TexelMaps?',
    },
    en: {
      title: 'Your island adventure starts here.',
      payoff: 'Experience this Wadden gem fully tailored to you',
      subtitle: 'Beaches, nature, cycling and local gems - all in one place',
      why: 'Why TexelMaps?',
    },
    de: {
      title: 'Ihr Inselabenteuer beginnt hier.',
      payoff: 'Erleben Sie dieses Wattenjuwel ganz auf Sie abgestimmt',
      subtitle: 'Strände, Natur, Radfahren und lokale Perlen - alles an einem Ort',
      why: 'Warum TexelMaps?',
    },
  };

  const currentTexelHero = texelHero[language as keyof typeof texelHero] || texelHero.nl;

  // Destination-specific hero content
  const heroContent = destination.id === 'texel' ? {
    title: currentTexelHero.title,
    payoff: currentTexelHero.payoff,
    subtitle: currentTexelHero.subtitle,
    logoSrc: '/assets/images/texel/texelmaps-logo.png',
    logoAlt: 'TexelMaps',
  } : {
    title: t.homepage.hero.title,
    payoff: t.homepage.hero.payoff,
    subtitle: t.homepage.hero.subtitle,
    logoSrc: '/assets/images/hb-logo-homepage.png',
    logoAlt: 'HolidaiButler',
  };

  return (
    <>
      {/* Fixed Logo Block - Homepage Only - Destination aware */}
      <Link to="/" className={`homepage-logo-container ${destination.id === 'texel' ? 'texel-logo' : ''}`}>
        <img
          src={heroContent.logoSrc}
          alt={heroContent.logoAlt}
          className="homepage-logo-img"
        />
      </Link>

      {/* Hero Section - Uses CSS variables from DestinationContext */}
      <section className="hero" style={{
        backgroundImage: `
          var(--hero-overlay),
          linear-gradient(rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.15)),
          url('${destination.heroImage}')
        `
      }}>
        <div className="hero-content">
          <h1>{heroContent.title}</h1>
          <p className="hero-payoff">{heroContent.payoff}</p>
          <p className="hero-sub">{heroContent.subtitle}</p>
        </div>
      </section>

      {/* Why Section - Destination aware */}
      <section className="why-section">
        <h2 className="why-title">
          {destination.id === 'texel' ? currentTexelHero.why : t.homepage.why.title}
        </h2>
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
                    <img src={usp.logoSrc} alt={usp.title} className={`usp-icon ${destination.id === 'texel' ? 'logo-texel-partner' : 'logo-calpe'}`} loading="lazy" />
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
                      <img src={usp.logoSrc} alt={usp.title} className={`usp-icon ${destination.id === 'texel' ? 'logo-texel-partner' : 'logo-calpe'}`} loading="lazy" />
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
