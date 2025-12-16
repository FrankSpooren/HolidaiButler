import { Link } from 'react-router';
import { useLanguage } from '../../i18n/LanguageContext';
import './StaticPage.css';

/**
 * PartnersPage - Partnership opportunities
 * Route: /partners
 */
export function PartnersPage() {
  const { t } = useLanguage();
  const sp = (t as any).staticPages?.partners;

  return (
    <div className="static-page">
      <div className="static-page-hero">
        <div className="static-page-hero-content">
          <h1>{sp?.title || 'Word Partner'}</h1>
          <p>{sp?.subtitle || 'Vergroot je bereik en verbind met vakantiegangers aan de Costa Blanca'}</p>
        </div>
      </div>

      <div className="static-page-content">
        {/* For Property Owners */}
        <div className="static-section">
          <h2>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {sp?.propertyTitle || 'Voor Vastgoedeigenaren'}
          </h2>
          <p>
            {sp?.propertyText || 'Bied je gasten een premium ervaring met HolidaiButler. Als partner krijg je toegang tot ons platform waar je gasten lokale tips, reserveringen en activiteiten kunnen ontdekken - allemaal afgestemd op hun voorkeuren.'}
          </p>
          <h3>{sp?.propertyBenefitsTitle || 'Voordelen'}</h3>
          <ul>
            <li>{sp?.propertyBenefit1 || 'Verhoogde gasttevredenheid'}</li>
            <li>{sp?.propertyBenefit2 || 'Persoonlijke butler-service voor je gasten'}</li>
            <li>{sp?.propertyBenefit3 || 'Onderscheid je van de concurrentie'}</li>
            <li>{sp?.propertyBenefit4 || 'Eenvoudige integratie in je welkomstpakket'}</li>
          </ul>
        </div>

        {/* For Local Businesses */}
        <div className="static-section">
          <h2>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
            {sp?.businessTitle || 'Voor Lokale Ondernemers'}
          </h2>
          <p>
            {sp?.businessText || 'Bereik duizenden vakantiegangers die op zoek zijn naar authentieke lokale ervaringen. Of je nu een restaurant, excursiebedrijf, of winkel hebt, met HolidaiButler kom je in contact met je ideale klanten.'}
          </p>
          <h3>{sp?.businessBenefitsTitle || 'Wat je krijgt'}</h3>
          <ul>
            <li>{sp?.businessBenefit1 || 'Vermelding in ons platform'}</li>
            <li>{sp?.businessBenefit2 || 'Directe reserveringen en boekingen'}</li>
            <li>{sp?.businessBenefit3 || 'Meertalige presentatie van je bedrijf'}</li>
            <li>{sp?.businessBenefit4 || 'Inzicht in klantvoorkeuren'}</li>
          </ul>
        </div>

        {/* How to Partner */}
        <div className="static-section">
          <h2>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            {sp?.howToTitle || 'Hoe Word Je Partner?'}
          </h2>
          <div className="static-steps">
            <div className="static-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>{sp?.howToStep1Title || 'Neem Contact Op'}</h3>
                <p>{sp?.howToStep1Text || 'Stuur ons een bericht via het contactformulier of mail naar partners@holidaibutler.com'}</p>
              </div>
            </div>
            <div className="static-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>{sp?.howToStep2Title || 'Kennismakingsgesprek'}</h3>
                <p>{sp?.howToStep2Text || 'We bespreken je wensen en bekijken hoe we kunnen samenwerken'}</p>
              </div>
            </div>
            <div className="static-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>{sp?.howToStep3Title || 'Start de Samenwerking'}</h3>
                <p>{sp?.howToStep3Text || 'Je wordt toegevoegd aan ons platform en kunt direct beginnen met het bereiken van nieuwe klanten'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="partner-cta">
          <h2>{sp?.ctaTitle || 'Klaar om te Groeien?'}</h2>
          <p>{sp?.ctaText || 'Word vandaag nog partner en verbind met duizenden vakantiegangers'}</p>
          <Link to="/contact" className="partner-cta-btn">
            {sp?.ctaButton || 'Neem Contact Op'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PartnersPage;
