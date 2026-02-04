import { useLanguage } from '../../i18n/LanguageContext';
import { useDestination } from '../../shared/contexts/DestinationContext';
import './StaticPage.css';

/**
 * CookiesPage - Cookie Policy
 * Route: /cookies
 * Multi-destination aware
 */
export function CookiesPage() {
  const { t, language } = useLanguage();
  const destination = useDestination();
  const sp = (t as any).staticPages?.cookies;

  // Texel-specific cookies content
  const texelContent = {
    nl: {
      title: 'Cookiebeleid',
      subtitle: 'Hoe wij cookies gebruiken op onze website',
      lastUpdated: 'Laatst bijgewerkt: December 2025',
      section7Text: 'Voor vragen over ons cookiebeleid kun je contact met ons opnemen via privacy@texelmaps.nl.',
    },
    en: {
      title: 'Cookie Policy',
      subtitle: 'How we use cookies on our website',
      lastUpdated: 'Last updated: December 2025',
      section7Text: 'For questions about our cookie policy, you can contact us at privacy@texelmaps.nl.',
    },
    de: {
      title: 'Cookie-Richtlinie',
      subtitle: 'Wie wir Cookies auf unserer Website verwenden',
      lastUpdated: 'Zuletzt aktualisiert: Dezember 2025',
      section7Text: 'Bei Fragen zu unserer Cookie-Richtlinie können Sie uns unter privacy@texelmaps.nl kontaktieren.',
    },
  };

  const texel = texelContent[language as keyof typeof texelContent] || texelContent.nl;

  // Get content based on destination
  const getContent = (key: string, fallback: string) => {
    if (destination.id === 'texel' && texel[key as keyof typeof texel]) {
      return texel[key as keyof typeof texel];
    }
    return sp?.[key] || fallback;
  };

  // Fixed date for all destinations
  const getLastUpdated = () => {
    if (destination.id === 'texel') {
      return texel.lastUpdated;
    }
    return sp?.lastUpdated || 'Laatst bijgewerkt: December 2025';
  };

  return (
    <div className="static-page">
      <div className="static-page-hero">
        <div className="static-page-hero-content">
          <h1>{getContent('title', 'Cookiebeleid')}</h1>
          <p>{getContent('subtitle', 'Hoe wij cookies gebruiken op onze website')}</p>
        </div>
      </div>

      <div className="static-page-content">
        <div className="static-section">
          <div className="legal-meta">
            <svg style={{ width: '20px', height: '20px', color: 'var(--color-primary, #30c59b)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{getLastUpdated()}</span>
          </div>

          <div className="legal-content">
            <h2>{sp?.section1Title || '1. Wat zijn Cookies?'}</h2>
            <p>
              {sp?.section1Text || 'Cookies zijn kleine tekstbestanden die op je apparaat worden geplaatst wanneer je onze website bezoekt. Ze helpen ons om de website goed te laten functioneren, je ervaring te verbeteren en te begrijpen hoe bezoekers onze site gebruiken.'}
            </p>

            <h2>{sp?.section2Title || '2. Soorten Cookies die Wij Gebruiken'}</h2>

            <h3>{sp?.essential || 'Essentiële Cookies'}</h3>
            <p>
              {sp?.essentialText || 'Deze cookies zijn noodzakelijk voor het functioneren van de website. Ze maken basisfuncties mogelijk zoals navigatie en toegang tot beveiligde gedeeltes. De website kan niet goed functioneren zonder deze cookies.'}
            </p>
            <ul>
              <li>{sp?.essential1 || 'Sessiecookies voor inloggen'}</li>
              <li>{sp?.essential2 || 'Taalvoorkeur'}</li>
              <li>{sp?.essential3 || 'Winkelwagen/boekingsgegevens'}</li>
            </ul>

            <h3>{sp?.analytics || 'Analytische Cookies'}</h3>
            <p>
              {sp?.analyticsText || 'Deze cookies helpen ons te begrijpen hoe bezoekers de website gebruiken, welke pagina\'s populair zijn en of er problemen zijn. Alle informatie is geanonimiseerd.'}
            </p>
            <ul>
              <li>{sp?.analytics1 || 'Google Analytics (geanonimiseerd)'}</li>
              <li>{sp?.analytics2 || 'Paginaweergaven en bezoekduur'}</li>
              <li>{sp?.analytics3 || 'Verkeersbronnen'}</li>
            </ul>

            <h3>{sp?.functional || 'Functionele Cookies'}</h3>
            <p>
              {sp?.functionalText || 'Deze cookies onthouden je keuzes en voorkeuren voor een betere gebruikerservaring.'}
            </p>
            <ul>
              <li>{sp?.functional1 || 'Onthouden van je taalvoorkeur'}</li>
              <li>{sp?.functional2 || 'Opslaan van je favoriete locaties'}</li>
              <li>{sp?.functional3 || 'Onthouden van zoekvoorkeuren'}</li>
            </ul>

            <h3>{sp?.marketing || 'Marketing Cookies'}</h3>
            <p>
              {sp?.marketingText || 'Deze cookies worden gebruikt om advertenties relevanter voor je te maken. We gebruiken deze alleen met je toestemming.'}
            </p>

            <h2>{sp?.section3Title || '3. Je Cookievoorkeuren Beheren'}</h2>
            <p>{sp?.section3Intro || 'Je kunt je cookievoorkeuren op verschillende manieren beheren:'}</p>
            <ul>
              <li>{sp?.manage1 || 'Via onze cookie-instellingen (cookiebanner)'}</li>
              <li>{sp?.manage2 || 'Via je browserinstellingen'}</li>
              <li>{sp?.manage3 || 'Door cookies handmatig te verwijderen'}</li>
            </ul>
            <p>
              {sp?.section3Note || 'Let op: het uitschakelen van bepaalde cookies kan de functionaliteit van de website beperken.'}
            </p>

            <h2>{sp?.section4Title || '4. Cookies van Derden'}</h2>
            <p>
              {sp?.section4Text || 'Sommige cookies worden geplaatst door diensten van derden die op onze pagina\'s verschijnen. Wij hebben geen controle over deze cookies. Raadpleeg het privacybeleid van deze derden voor meer informatie.'}
            </p>

            <h2>{sp?.section5Title || '5. Bewaartermijn'}</h2>
            <p>{sp?.section5Intro || 'Cookies hebben verschillende bewaartermijnen:'}</p>
            <ul>
              <li>{sp?.retention1 || 'Sessiecookies: worden verwijderd wanneer je de browser sluit'}</li>
              <li>{sp?.retention2 || 'Permanente cookies: blijven tot de vervaldatum (maximaal 2 jaar)'}</li>
            </ul>

            <h2>{sp?.section6Title || '6. Updates'}</h2>
            <p>
              {sp?.section6Text || 'Wij kunnen dit cookiebeleid van tijd tot tijd bijwerken. De datum van de laatste wijziging staat bovenaan deze pagina.'}
            </p>

            <h2>{sp?.section7Title || '7. Contact'}</h2>
            <p>
              {getContent('section7Text', destination.id === 'texel'
                ? 'Voor vragen over ons cookiebeleid kun je contact met ons opnemen via privacy@texelmaps.nl.'
                : 'Voor vragen over ons cookiebeleid kun je contact met ons opnemen via privacy@holidaibutler.com.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CookiesPage;
