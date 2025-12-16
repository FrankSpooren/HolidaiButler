import { Link } from 'react-router';
import { useLanguage } from '../../i18n/LanguageContext';
import './StaticPage.css';

/**
 * HelpCenterPage - Help and support topics
 * Route: /help
 */
export function HelpCenterPage() {
  const { t } = useLanguage();
  const sp = (t as any).staticPages?.help;

  const helpTopics = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
      title: sp?.topic1Title || 'HoliBot Gebruiken',
      description: sp?.topic1Desc || 'Leer hoe je het meeste uit onze AI-assistent haalt',
      link: '/faq'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      title: sp?.topic2Title || 'Reserveringen & Boekingen',
      description: sp?.topic2Desc || 'Hoe je restaurants reserveert en tickets koopt',
      link: '/faq'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      title: sp?.topic3Title || 'Account & Profiel',
      description: sp?.topic3Desc || 'Beheer je account, voorkeuren en favorieten',
      link: '/faq'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      ),
      title: sp?.topic4Title || 'Betalingen',
      description: sp?.topic4Desc || 'Informatie over betaalmethodes en terugbetalingen',
      link: '/faq'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
      title: sp?.topic5Title || 'Locaties Ontdekken',
      description: sp?.topic5Desc || 'Tips voor het vinden van de beste plekken',
      link: '/faq'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      title: sp?.topic6Title || 'Problemen Oplossen',
      description: sp?.topic6Desc || 'Oplossingen voor veelvoorkomende problemen',
      link: '/faq'
    }
  ];

  return (
    <div className="static-page">
      <div className="static-page-hero">
        <div className="static-page-hero-content">
          <h1>{sp?.title || 'Help Center'}</h1>
          <p>{sp?.subtitle || 'Vind antwoorden en leer hoe je HolidaiButler optimaal gebruikt'}</p>
        </div>
      </div>

      <div className="static-page-content">
        {/* Quick Links */}
        <div className="help-topics">
          {helpTopics.map((topic, index) => (
            <Link to={topic.link} key={index} className="help-topic-card">
              <div className="help-topic-icon">{topic.icon}</div>
              <h3>{topic.title}</h3>
              <p>{topic.description}</p>
            </Link>
          ))}
        </div>

        {/* Getting Started */}
        <div className="static-section" style={{ marginTop: '2rem' }}>
          <h2>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {sp?.gettingStartedTitle || 'Aan de Slag'}
          </h2>
          <div className="static-steps">
            <div className="static-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>{sp?.gs1Title || 'Maak een Account'}</h3>
                <p>{sp?.gs1Text || 'Registreer gratis om je favorieten op te slaan en boekingen te beheren. Je kunt ook zonder account de app gebruiken.'}</p>
              </div>
            </div>
            <div className="static-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>{sp?.gs2Title || 'Praat met HoliBot'}</h3>
                <p>{sp?.gs2Text || 'Klik op het chat-icoon en vertel HoliBot wat je zoekt. Gebruik gewone taal - "Waar kan ik goed paella eten?" of "Leuke activiteiten voor kinderen".'}</p>
              </div>
            </div>
            <div className="static-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>{sp?.gs3Title || 'Ontdek & Boek'}</h3>
                <p>{sp?.gs3Text || 'Bekijk de aanbevelingen, lees reviews, en boek direct. Alles wat je nodig hebt op één plek.'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="partner-cta">
          <h2>{sp?.ctaTitle || 'Niet Gevonden Wat Je Zocht?'}</h2>
          <p>{sp?.ctaText || 'Ons team staat klaar om je te helpen'}</p>
          <Link to="/contact" className="partner-cta-btn">
            {sp?.ctaButton || 'Neem Contact Op'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HelpCenterPage;
