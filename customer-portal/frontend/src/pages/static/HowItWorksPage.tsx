import { Link } from 'react-router';
import { useLanguage } from '../../i18n/LanguageContext';
import { useDestination } from '../../shared/contexts/DestinationContext';
import './StaticPage.css';

/**
 * HowItWorksPage - How HolidaiButler / TexelMaps works
 * Route: /how-it-works
 * Multi-destination aware
 */
export function HowItWorksPage() {
  const { t, language } = useLanguage();
  const destination = useDestination();
  const sp = (t as any).staticPages?.howItWorks;

  // Texel-specific content translations
  const texelContent = {
    nl: {
      title: 'Hoe Het Werkt',
      subtitle: 'In 4 eenvoudige stappen naar de perfecte eilandervaring',
      step1Title: 'Start met TexelMaps',
      step1Text: 'Open de app of website, check de complete en up-to-date agenda, bekijk locaties en start een gesprek met Texla, onze AI-assistent. Vertel in je eigen taal wat je zoekt - een gezellig strandpaviljoen, een mooie fietsroute, of een leuke activiteit.',
      step2Title: 'Ontvang Gepersonaliseerde Suggesties',
      step2AccountLink: 'Maak je een account aan',
      step2Text: 'met behulp van enkele simpele vragen, dan worden alle TexelMaps-aanbevelingen compleet afgestemd op je wensen en voorkeuren. Of je nu zoekt naar een rustig terrasje, die ene mooie wandelroute, of een parel van een museum, wij vinden de perfecte match voor jou.',
      step3Title: 'Ontdek & Bewaar',
      step3Text: 'Blader door onze uitgebreide collectie van eilandlocaties, lees reviews van andere bezoekers, en bewaar je favorieten. Bekijk foto\'s, openingstijden en routebeschrijvingen op één plek.',
      step4Title: 'Boek & Geniet',
      step4Text: 'Reserveer direct via de app - of het nu gaat om een tafel in een restaurant, tickets voor een evenement, of een fietstocht. Alles geregeld, zodat jij kunt genieten van Texel.',
      featuresTitle: 'Waarom TexelMaps?',
      benefit1Title: '24/7 Beschikbaar',
      benefit1Text: 'Texla staat altijd voor je klaar, dag en nacht',
      benefit2Title: 'Betrouwbaar & Veilig',
      benefit2Text: 'Alleen geverifieerde locaties en veilige betalingen',
      benefit3Title: 'Meertalig',
      benefit3Text: 'Beschikbaar in Nederlands, Engels en Duits',
    },
    en: {
      title: 'How It Works',
      subtitle: 'In 4 simple steps to the perfect island experience',
      step1Title: 'Start with TexelMaps',
      step1Text: 'Open the app or website, check the complete and up-to-date agenda, browse locations and start a conversation with Texla, our AI assistant. Tell us in your own language what you\'re looking for - a cozy beach pavilion, a beautiful cycling route, or a fun activity.',
      step2Title: 'Receive Personalized Suggestions',
      step2AccountLink: 'Create an account',
      step2Text: 'with a few simple questions, and all TexelMaps recommendations will be completely tailored to your wishes and preferences. Whether you\'re looking for a quiet terrace, that special hiking route, or a gem of a museum, we\'ll find the perfect match for you.',
      step3Title: 'Discover & Save',
      step3Text: 'Browse through our extensive collection of island locations, read reviews from other visitors, and save your favorites. View photos, opening hours and directions all in one place.',
      step4Title: 'Book & Enjoy',
      step4Text: 'Book directly through the app - whether it\'s a table at a restaurant, tickets for an event, or a bike tour. Everything arranged so you can enjoy Texel.',
      featuresTitle: 'Why TexelMaps?',
      benefit1Title: '24/7 Available',
      benefit1Text: 'Texla is always ready for you, day and night',
      benefit2Title: 'Reliable & Safe',
      benefit2Text: 'Only verified locations and secure payments',
      benefit3Title: 'Multilingual',
      benefit3Text: 'Available in Dutch, English and German',
    },
    de: {
      title: 'So Funktioniert Es',
      subtitle: 'In 4 einfachen Schritten zum perfekten Inselerlebnis',
      step1Title: 'Starten Sie mit TexelMaps',
      step1Text: 'Öffnen Sie die App oder Website, schauen Sie sich die vollständige und aktuelle Agenda an, durchsuchen Sie Standorte und starten Sie ein Gespräch mit Texla, unserem KI-Assistenten. Sagen Sie uns in Ihrer eigenen Sprache, wonach Sie suchen - ein gemütlicher Strandpavillon, eine schöne Radroute oder eine lustige Aktivität.',
      step2Title: 'Erhalten Sie Personalisierte Vorschläge',
      step2AccountLink: 'Erstellen Sie ein Konto',
      step2Text: 'mit ein paar einfachen Fragen, und alle TexelMaps-Empfehlungen werden vollständig auf Ihre Wünsche und Vorlieben abgestimmt. Ob Sie nach einer ruhigen Terrasse, dieser besonderen Wanderroute oder einem Museumsschatz suchen, wir finden das Passende für Sie.',
      step3Title: 'Entdecken & Speichern',
      step3Text: 'Durchsuchen Sie unsere umfangreiche Sammlung von Inselstandorten, lesen Sie Bewertungen anderer Besucher und speichern Sie Ihre Favoriten. Sehen Sie Fotos, Öffnungszeiten und Wegbeschreibungen an einem Ort.',
      step4Title: 'Buchen & Genießen',
      step4Text: 'Buchen Sie direkt über die App - ob ein Tisch im Restaurant, Tickets für eine Veranstaltung oder eine Radtour. Alles arrangiert, damit Sie Texel genießen können.',
      featuresTitle: 'Warum TexelMaps?',
      benefit1Title: '24/7 Verfügbar',
      benefit1Text: 'Texla ist immer für Sie da, Tag und Nacht',
      benefit2Title: 'Zuverlässig & Sicher',
      benefit2Text: 'Nur verifizierte Standorte und sichere Zahlungen',
      benefit3Title: 'Mehrsprachig',
      benefit3Text: 'Verfügbar in Niederländisch, Englisch und Deutsch',
    },
  };

  // Get content based on destination
  const getContent = (key: string, fallback: string) => {
    if (destination.id === 'texel') {
      const texel = texelContent[language as keyof typeof texelContent] || texelContent.nl;
      return texel[key as keyof typeof texel] || fallback;
    }
    return sp?.[key] || fallback;
  };

  return (
    <div className="static-page">
      <div className="static-page-hero">
        <div className="static-page-hero-content">
          <h1>{getContent('title', 'Hoe Het Werkt')}</h1>
          <p>{getContent('subtitle', 'In 4 eenvoudige stappen naar de perfecte vakantie-ervaring')}</p>
        </div>
      </div>

      <div className="static-page-content">
        <div className="static-section">
          <div className="static-steps">
            {/* Step 1 */}
            <div className="static-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>{getContent('step1Title', 'Start met HolidaiButler')}</h3>
                <p>{getContent('step1Text', 'Open de app of website, check de complete en up-to-date agenda, bekijk locaties en start een gesprek met HoliBot, onze AI-assistent. Vertel in je eigen taal wat je zoekt - een romantisch restaurant, een familievriendelijk strand, of een avontuurlijke activiteit.')}</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="static-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>{getContent('step2Title', 'Ontvang Gepersonaliseerde Suggesties')}</h3>
                <p>
                  <Link to="/login" style={{ color: 'var(--color-primary, #7FA594)', fontWeight: 500 }}>
                    {getContent('step2AccountLink', 'Maak je een account aan')}
                  </Link>{' '}
                  {getContent('step2Text', 'met behulp van enkele simpele vragen, dan worden alle HolidaiButler-aanbevelingen compleet afgestemd op je wensen en voorkeuren. En dat scheelt heel wat speurwerk en overbodige informatie. Of je nu zoekt naar een rustig terrasje, die ene unieke wandelroute, of een parel van een museum, wij vinden de perfecte match voor jou.')}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="static-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>{getContent('step3Title', 'Ontdek & Bewaar')}</h3>
                <p>{getContent('step3Text', 'Blader door onze uitgebreide collectie van locaties, lees reviews van andere bezoekers, en bewaar je favorieten. Bekijk foto\'s, openingstijden en routebeschrijvingen op één plek.')}</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="static-step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>{getContent('step4Title', 'Boek & Geniet')}</h3>
                <p>{getContent('step4Text', 'Reserveer direct via de app - of het nu gaat om een tafel in een restaurant, tickets voor een evenement, of een excursie. Alles geregeld, zodat jij kunt genieten van je vakantie.')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="static-section">
          <h2>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {getContent('featuresTitle', 'Waarom HolidaiButler?')}
          </h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3>{getContent('benefit1Title', '24/7 Beschikbaar')}</h3>
              <p>{getContent('benefit1Text', 'HoliBot staat altijd voor je klaar, dag en nacht')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3>{getContent('benefit2Title', 'Betrouwbaar & Veilig')}</h3>
              <p>{getContent('benefit2Text', 'Alleen geverifieerde locaties en veilige betalingen')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h3>{getContent('benefit3Title', 'Meertalig')}</h3>
              <p>{getContent('benefit3Text', 'Beschikbaar in Nederlands, Engels, Duits, Spaans, Zweeds en Pools')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HowItWorksPage;
