import { useLanguage } from '../../i18n/LanguageContext';
import './StaticPage.css';

/**
 * TermsPage - Terms of Service
 * Route: /terms
 */
export function TermsPage() {
  const { t } = useLanguage();
  const sp = (t as any).staticPages?.terms;

  return (
    <div className="static-page">
      <div className="static-page-hero">
        <div className="static-page-hero-content">
          <h1>{sp?.title || 'Algemene Voorwaarden'}</h1>
          <p>{sp?.subtitle || 'De voorwaarden voor het gebruik van HolidaiButler'}</p>
        </div>
      </div>

      <div className="static-page-content">
        <div className="static-section">
          <div className="legal-meta">
            <svg style={{ width: '20px', height: '20px', color: '#7FA594' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{sp?.lastUpdated || 'Laatst bijgewerkt: December 2024'}</span>
          </div>

          <div className="legal-content">
            <h2>{sp?.section1Title || '1. Acceptatie van Voorwaarden'}</h2>
            <p>
              {sp?.section1Text || 'Door gebruik te maken van HolidaiButler ga je akkoord met deze Algemene Voorwaarden. Als je niet akkoord gaat met deze voorwaarden, gebruik dan onze diensten niet.'}
            </p>

            <h2>{sp?.section2Title || '2. Beschrijving van de Dienst'}</h2>
            <p>
              {sp?.section2Text || 'HolidaiButler is een platform dat gebruikers helpt bij het ontdekken van lokale attracties, restaurants en activiteiten aan de Costa Blanca. Onze AI-assistent HoliBot biedt gepersonaliseerde aanbevelingen en je kunt via ons platform reserveringen maken en tickets kopen.'}
            </p>

            <h2>{sp?.section3Title || '3. Gebruikersaccount'}</h2>
            <p>{sp?.section3Intro || 'Bij het aanmaken van een account:'}</p>
            <ul>
              <li>{sp?.account1 || 'Je moet nauwkeurige en volledige informatie verstrekken'}</li>
              <li>{sp?.account2 || 'Je bent verantwoordelijk voor het geheimhouden van je inloggegevens'}</li>
              <li>{sp?.account3 || 'Je bent verantwoordelijk voor alle activiteiten onder je account'}</li>
              <li>{sp?.account4 || 'Je moet ons direct informeren bij ongeautoriseerd gebruik'}</li>
            </ul>

            <h2>{sp?.section4Title || '4. Boekingen en Betalingen'}</h2>
            <p>{sp?.section4Intro || 'Voor boekingen via ons platform:'}</p>
            <ul>
              <li>{sp?.booking1 || 'Prijzen worden getoond inclusief BTW tenzij anders vermeld'}</li>
              <li>{sp?.booking2 || 'Betalingen worden veilig verwerkt via onze betalingspartner'}</li>
              <li>{sp?.booking3 || 'Annuleringsvoorwaarden verschillen per partner en worden getoond bij de boeking'}</li>
              <li>{sp?.booking4 || 'Je ontvangt een bevestiging per e-mail na succesvolle boeking'}</li>
            </ul>

            <h2>{sp?.section5Title || '5. Gebruiksregels'}</h2>
            <p>{sp?.section5Intro || 'Je gaat ermee akkoord om onze diensten niet te gebruiken voor:'}</p>
            <ul>
              <li>{sp?.rule1 || 'Illegale activiteiten of het overtreden van toepasselijke wetten'}</li>
              <li>{sp?.rule2 || 'Het versturen van spam of ongewenste berichten'}</li>
              <li>{sp?.rule3 || 'Het proberen ongeautoriseerde toegang te krijgen tot onze systemen'}</li>
              <li>{sp?.rule4 || 'Het verstoren van de normale werking van onze diensten'}</li>
            </ul>

            <h2>{sp?.section6Title || '6. Intellectueel Eigendom'}</h2>
            <p>
              {sp?.section6Text || 'Alle content op HolidaiButler, inclusief teksten, afbeeldingen, logo\'s en software, is eigendom van HolidaiButler of onze licentiegevers en wordt beschermd door auteursrecht en andere intellectuele eigendomsrechten.'}
            </p>

            <h2>{sp?.section7Title || '7. Aansprakelijkheid'}</h2>
            <p>
              {sp?.section7Text || 'HolidaiButler fungeert als tussenpersoon tussen gebruikers en lokale partners. Wij zijn niet aansprakelijk voor de kwaliteit van diensten geleverd door partners. Onze aansprakelijkheid is beperkt tot het maximaal door jou betaalde bedrag voor de betreffende dienst.'}
            </p>

            <h2>{sp?.section8Title || '8. Wijzigingen'}</h2>
            <p>
              {sp?.section8Text || 'Wij behouden ons het recht voor deze voorwaarden te allen tijde te wijzigen. Wijzigingen treden in werking zodra ze op onze website worden gepubliceerd. Voortgezet gebruik na wijzigingen betekent acceptatie van de nieuwe voorwaarden.'}
            </p>

            <h2>{sp?.section9Title || '9. Toepasselijk Recht'}</h2>
            <p>
              {sp?.section9Text || 'Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter in Nederland.'}
            </p>

            <h2>{sp?.section10Title || '10. Contact'}</h2>
            <p>
              {sp?.section10Text || 'Voor vragen over deze voorwaarden kun je contact met ons opnemen via legal@holidaibutler.com.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TermsPage;
