import { useLanguage } from '../../i18n/LanguageContext';
import { useDestination } from '../../shared/contexts/DestinationContext';
import './StaticPage.css';

/**
 * PrivacyPage - Privacy Policy
 * Route: /privacy
 * Multi-destination aware
 */
export function PrivacyPage() {
  const { t, language } = useLanguage();
  const destination = useDestination();
  const sp = (t as any).staticPages?.privacy;

  // Texel-specific privacy content
  const texelContent = {
    nl: {
      title: 'Privacybeleid',
      subtitle: 'Hoe wij omgaan met je persoonlijke gegevens',
      lastUpdated: 'Laatst bijgewerkt: December 2025',
      section1Title: '1. Inleiding',
      section1Text: 'TexelMaps ("wij", "ons", "onze") respecteert je privacy en zet zich in voor de bescherming van je persoonlijke gegevens. Dit privacybeleid informeert je over hoe wij omgaan met je persoonlijke gegevens wanneer je onze website of app gebruikt.',
      section2Title: '2. Welke Gegevens Verzamelen Wij',
      use2: 'Het personaliseren van aanbevelingen via Texla',
      section8Text: 'Voor vragen over dit privacybeleid of om je rechten uit te oefenen, neem contact met ons op via privacy@texelmaps.nl.',
    },
    en: {
      title: 'Privacy Policy',
      subtitle: 'How we handle your personal data',
      lastUpdated: 'Last updated: December 2025',
      section1Title: '1. Introduction',
      section1Text: 'TexelMaps ("we", "us", "our") respects your privacy and is committed to protecting your personal data. This privacy policy informs you about how we handle your personal data when you use our website or app.',
      section2Title: '2. What Data We Collect',
      use2: 'Personalizing recommendations via Texla',
      section8Text: 'For questions about this privacy policy or to exercise your rights, contact us at privacy@texelmaps.nl.',
    },
    de: {
      title: 'Datenschutzrichtlinie',
      subtitle: 'Wie wir mit Ihren persönlichen Daten umgehen',
      lastUpdated: 'Zuletzt aktualisiert: Dezember 2025',
      section1Title: '1. Einleitung',
      section1Text: 'TexelMaps ("wir", "uns", "unser") respektiert Ihre Privatsphäre und verpflichtet sich zum Schutz Ihrer persönlichen Daten. Diese Datenschutzrichtlinie informiert Sie darüber, wie wir mit Ihren persönlichen Daten umgehen, wenn Sie unsere Website oder App nutzen.',
      section2Title: '2. Welche Daten Wir Sammeln',
      use2: 'Personalisierung von Empfehlungen über Texla',
      section8Text: 'Bei Fragen zu dieser Datenschutzrichtlinie oder zur Ausübung Ihrer Rechte kontaktieren Sie uns unter privacy@texelmaps.nl.',
    },
  };

  const texel = texelContent[language as keyof typeof texelContent] || texelContent.nl;

  // Get content with Texel overrides
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
    // Update default date to December 2025
    return sp?.lastUpdated || 'Laatst bijgewerkt: December 2025';
  };

  return (
    <div className="static-page">
      <div className="static-page-hero">
        <div className="static-page-hero-content">
          <h1>{getContent('title', 'Privacybeleid')}</h1>
          <p>{getContent('subtitle', 'Hoe wij omgaan met je persoonlijke gegevens')}</p>
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
            <h2>{getContent('section1Title', '1. Inleiding')}</h2>
            <p>
              {getContent('section1Text', destination.id === 'texel'
                ? 'TexelMaps ("wij", "ons", "onze") respecteert je privacy en zet zich in voor de bescherming van je persoonlijke gegevens. Dit privacybeleid informeert je over hoe wij omgaan met je persoonlijke gegevens wanneer je onze website of app gebruikt.'
                : 'HolidaiButler ("wij", "ons", "onze") respecteert je privacy en zet zich in voor de bescherming van je persoonlijke gegevens. Dit privacybeleid informeert je over hoe wij omgaan met je persoonlijke gegevens wanneer je onze website of app gebruikt.')}
            </p>

            <h2>{sp?.section2Title || '2. Welke Gegevens Verzamelen Wij'}</h2>
            <p>{sp?.section2Intro || 'Wij kunnen de volgende categorieën persoonlijke gegevens verzamelen:'}</p>
            <ul>
              <li>{sp?.data1 || 'Identiteitsgegevens: naam, gebruikersnaam'}</li>
              <li>{sp?.data2 || 'Contactgegevens: e-mailadres, telefoonnummer'}</li>
              <li>{sp?.data3 || 'Technische gegevens: IP-adres, browsertype, tijdzone'}</li>
              <li>{sp?.data4 || 'Gebruiksgegevens: informatie over hoe je onze dienst gebruikt'}</li>
              <li>{sp?.data5 || 'Voorkeursgegevens: je opgeslagen favorieten en voorkeuren'}</li>
            </ul>

            <h2>{sp?.section3Title || '3. Hoe Gebruiken Wij Je Gegevens'}</h2>
            <p>{sp?.section3Intro || 'Wij gebruiken je gegevens voor de volgende doeleinden:'}</p>
            <ul>
              <li>{sp?.use1 || 'Het leveren van onze diensten aan jou'}</li>
              <li>{getContent('use2', destination.id === 'texel' ? 'Het personaliseren van aanbevelingen via Texla' : 'Het personaliseren van aanbevelingen via HoliBot')}</li>
              <li>{sp?.use3 || 'Het verwerken van boekingen en reserveringen'}</li>
              <li>{sp?.use4 || 'Het verbeteren van onze diensten'}</li>
              <li>{sp?.use5 || 'Het communiceren met je over je account of boekingen'}</li>
            </ul>

            <h2>{sp?.section4Title || '4. Cookies'}</h2>
            <p>
              {sp?.section4Text || 'Wij gebruiken cookies en vergelijkbare technologieën om je ervaring te verbeteren. Zie ons Cookiebeleid voor meer informatie over welke cookies wij gebruiken en hoe je ze kunt beheren.'}
            </p>

            <h2>{sp?.section5Title || '5. Delen van Gegevens'}</h2>
            <p>{sp?.section5Intro || 'Wij delen je gegevens alleen met:'}</p>
            <ul>
              <li>{sp?.share1 || 'Dienstverleners die ons helpen bij het leveren van onze diensten'}</li>
              <li>{sp?.share2 || 'Partners waar je een boeking maakt (alleen de benodigde gegevens)'}</li>
              <li>{sp?.share3 || 'Autoriteiten wanneer wij hiertoe wettelijk verplicht zijn'}</li>
            </ul>

            <h2>{sp?.section6Title || '6. Je Rechten (GDPR)'}</h2>
            <p>{sp?.section6Intro || 'Onder de AVG/GDPR heb je de volgende rechten:'}</p>
            <ul>
              <li>{sp?.right1 || 'Recht op inzage in je persoonlijke gegevens'}</li>
              <li>{sp?.right2 || 'Recht op correctie van onjuiste gegevens'}</li>
              <li>{sp?.right3 || 'Recht op verwijdering van je gegevens'}</li>
              <li>{sp?.right4 || 'Recht op beperking van verwerking'}</li>
              <li>{sp?.right5 || 'Recht op gegevensoverdraagbaarheid'}</li>
              <li>{sp?.right6 || 'Recht om bezwaar te maken tegen verwerking'}</li>
            </ul>

            <h2>{sp?.section7Title || '7. Beveiliging'}</h2>
            <p>
              {sp?.section7Text || 'Wij nemen passende technische en organisatorische maatregelen om je persoonlijke gegevens te beschermen tegen ongeautoriseerde toegang, wijziging, openbaarmaking of vernietiging.'}
            </p>

            <h2>{sp?.section8Title || '8. Contact'}</h2>
            <p>
              {getContent('section8Text', destination.id === 'texel'
                ? 'Voor vragen over dit privacybeleid of om je rechten uit te oefenen, neem contact met ons op via privacy@texelmaps.nl.'
                : 'Voor vragen over dit privacybeleid of om je rechten uit te oefenen, neem contact met ons op via privacy@holidaibutler.com.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPage;
