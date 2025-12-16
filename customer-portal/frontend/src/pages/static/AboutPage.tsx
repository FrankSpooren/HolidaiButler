import { useLanguage } from '../../i18n/LanguageContext';
import './StaticPage.css';

/**
 * AboutPage - About HolidaiButler
 * Route: /about
 */
export function AboutPage() {
  const { t } = useLanguage();
  const sp = (t as any).staticPages?.about;

  return (
    <div className="static-page">
      <div className="static-page-hero">
        <div className="static-page-hero-content">
          <h1>{sp?.title || 'Over HolidaiButler'}</h1>
          <p>{sp?.subtitle || 'Jouw Persoonlijke Butler aan de Costa Blanca'}</p>
        </div>
      </div>

      <div className="static-page-content">
        {/* Mission */}
        <div className="static-section">
          <h2>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            {sp?.missionTitle || 'Onze Missie'}
          </h2>
          <p className="section-subheader">
            {sp?.missionBold || 'HolidaiButler is jouw persoonlijke digitale butler voor de Costa Blanca.'}
          </p>
          <p>
            {sp?.missionText || 'Geen generieke tips of toeristische clichés, maar aanbevelingen die passen bij jou, je gezelschap en het moment. Gebaseerd op actuele omstandigheden, lokale expertise en jouw voorkeuren. Objectief, betrouwbaar en transparant — in dienst van jouw ervaring.'}
          </p>
        </div>

        {/* Vision */}
        <div className="static-section">
          <h2>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            {sp?.visionTitle || 'Onze Visie'}
          </h2>
          <p className="section-subheader">
            {sp?.visionBold || 'Wij bouwen aan het meest persoonlijke en betrouwbare toerismeplatform van Europa.'}
          </p>
          <p>
            {sp?.visionText || 'Door lokale partnerships, DMO-endorsement en AI-technologie bieden we hyperpersoonlijke en realtime informatie — afgestemd op jouw profiel, voorkeuren en omstandigheden. HolidaiButler is er voor reizigers die méér willen dan generieke tips: transparant, ethisch en met diepe lokale expertise. Jij bent in control. Wij zorgen dat je niets mist — en nergens over hoeft na te denken.'}
          </p>
        </div>

        {/* What We Offer */}
        <div className="static-section">
          <h2>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {sp?.offerTitle || 'Wat Wij Bieden'}
          </h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <h3>{sp?.feature1Title || 'HoliBot AI-Assistent'}</h3>
              <p>{sp?.feature1Text || 'Stel vragen in je eigen taal en krijg direct antwoord'}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <h3>{sp?.feature2Title || 'Lokale Kennis'}</h3>
              <p>{sp?.feature2Text || 'Ontdek verborgen parels die alleen locals kennen'}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h3>{sp?.feature3Title || 'Eenvoudig Boeken'}</h3>
              <p>{sp?.feature3Text || 'Reserveer restaurants, tickets en activiteiten in enkele klikken'}</p>
            </div>
          </div>
        </div>

        {/* Costa Blanca */}
        <div className="static-section">
          <h2>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
            {sp?.regionTitle || 'Costa Blanca'}
          </h2>
          <p>
            {sp?.regionText || 'De Costa Blanca, met haar prachtige stranden, pittoreske dorpjes en heerlijke Mediterrane keuken, is een van de mooiste vakantiebestemmingen van Europa. Van de bruisende stad Alicante tot het rustige Altea, wij kennen elk hoekje van deze regio.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
