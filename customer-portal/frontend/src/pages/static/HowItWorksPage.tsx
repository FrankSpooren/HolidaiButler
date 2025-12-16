import { useLanguage } from '../../i18n/LanguageContext';
import './StaticPage.css';

/**
 * HowItWorksPage - How HolidaiButler works
 * Route: /how-it-works
 */
export function HowItWorksPage() {
  const { t } = useLanguage();
  const sp = (t as any).staticPages?.howItWorks;

  return (
    <div className="static-page">
      <div className="static-page-hero">
        <div className="static-page-hero-content">
          <h1>{sp?.title || 'Hoe Het Werkt'}</h1>
          <p>{sp?.subtitle || 'In 4 eenvoudige stappen naar de perfecte vakantie-ervaring'}</p>
        </div>
      </div>

      <div className="static-page-content">
        <div className="static-section">
          <div className="static-steps">
            {/* Step 1 */}
            <div className="static-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>{sp?.step1Title || 'Start met HoliBot'}</h3>
                <p>{sp?.step1Text || 'Open de app of website en start een gesprek met HoliBot, onze AI-assistent. Vertel in je eigen taal wat je zoekt - een romantisch restaurant, een familievriendelijk strand, of een avontuurlijke activiteit.'}</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="static-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>{sp?.step2Title || 'Ontvang Gepersonaliseerde Suggesties'}</h3>
                <p>{sp?.step2Text || 'HoliBot analyseert je voorkeuren en geeft je aanbevelingen op maat. Of je nu zoekt naar een rustig terrasje of een bruisende club, wij vinden de perfecte match voor jou.'}</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="static-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>{sp?.step3Title || 'Ontdek & Bewaar'}</h3>
                <p>{sp?.step3Text || 'Blader door onze uitgebreide collectie van locaties, lees reviews van andere bezoekers, en bewaar je favorieten. Bekijk foto\'s, openingstijden en routebeschrijvingen op één plek.'}</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="static-step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>{sp?.step4Title || 'Boek & Geniet'}</h3>
                <p>{sp?.step4Text || 'Reserveer direct via de app - of het nu gaat om een tafel in een restaurant, tickets voor een evenement, of een excursie. Alles geregeld, zodat jij kunt genieten van je vakantie.'}</p>
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
            {sp?.featuresTitle || 'Waarom HolidaiButler?'}
          </h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3>{sp?.benefit1Title || '24/7 Beschikbaar'}</h3>
              <p>{sp?.benefit1Text || 'HoliBot staat altijd voor je klaar, dag en nacht'}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3>{sp?.benefit2Title || 'Betrouwbaar & Veilig'}</h3>
              <p>{sp?.benefit2Text || 'Alleen geverifieerde locaties en veilige betalingen'}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h3>{sp?.benefit3Title || 'Meertalig'}</h3>
              <p>{sp?.benefit3Text || 'Beschikbaar in Nederlands, Engels, Duits, Spaans, Zweeds en Pools'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HowItWorksPage;
