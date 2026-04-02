import { Link } from 'react-router';
import { useLanguage } from '../../i18n/LanguageContext';
import { useDestination } from '../../shared/contexts/DestinationContext';
import './StaticPage.css';

/**
 * HelpCenterPage - Help and support topics
 * Route: /help
 * Multi-destination aware
 */
export function HelpCenterPage() {
  const { t, language } = useLanguage();
  const destination = useDestination();
  const sp = (t as any).staticPages?.help;

  // Calpe-specific help content translations (uses CalpeChat, not HoliBot)
  const calpeContent = {
    nl: {
      title: 'Help Center',
      subtitle: 'Vind antwoorden en leer hoe je CalpeTrip optimaal gebruikt',
      topic1Title: 'CalpeChat Gebruiken',
      topic1Desc: 'Leer hoe je het meeste uit onze AI-chatbot haalt',
      topic2Title: 'Restaurants & Activiteiten Vinden',
      topic2Desc: 'Ontdek de beste plekken in Calpe en de Costa Blanca',
      topic3Title: 'Boekingen & Reserveringen',
      topic3Desc: 'Hoe je restaurants reserveert en tickets koopt',
      topic4Title: 'Taalinstellingen',
      topic4Desc: 'Pas de taal aan naar Nederlands, Engels, Duits of Spaans',
      topic5Title: 'Privacy & Data',
      topic5Desc: 'Hoe we omgaan met je gegevens (GDPR-compliant)',
      topic6Title: 'Problemen Oplossen',
      topic6Desc: 'Oplossingen voor veelvoorkomende problemen',
      gettingStartedTitle: 'Aan de Slag met CalpeTrip',
      gs1Title: 'Maak een Account',
      gs1Text: 'Registreer gratis om je favorieten op te slaan en boekingen te beheren. Je kunt ook zonder account CalpeTrip gebruiken en CalpeChat vragen stellen.',
      gs2Title: 'Praat met CalpeChat',
      gs2Text: 'Klik op het chat-icoon en vertel CalpeChat wat je zoekt. Gebruik gewone taal - "Waar kan ik goed paella eten?" of "Leuke activiteiten voor kinderen in Calpe".',
      gs3Title: 'Ontdek & Boek',
      gs3Text: 'Bekijk de aanbevelingen, lees reviews, en boek direct. Alles wat je nodig hebt voor een perfecte tijd in Calpe op één plek.',
      ctaTitle: 'Niet Gevonden Wat Je Zocht?',
      ctaText: 'Ons team staat klaar om je te helpen',
      ctaButton: 'Neem Contact Op',
    },
    en: {
      title: 'Help Center',
      subtitle: 'Find answers and learn how to get the most out of CalpeTrip',
      topic1Title: 'Using CalpeChat',
      topic1Desc: 'Learn how to get the most out of our AI chatbot',
      topic2Title: 'Finding Restaurants & Activities',
      topic2Desc: 'Discover the best places in Calpe and the Costa Blanca',
      topic3Title: 'Bookings & Reservations',
      topic3Desc: 'How to make restaurant reservations and buy tickets',
      topic4Title: 'Language Settings',
      topic4Desc: 'Switch the language to Dutch, English, German or Spanish',
      topic5Title: 'Privacy & Data',
      topic5Desc: 'How we handle your data (GDPR-compliant)',
      topic6Title: 'Troubleshooting',
      topic6Desc: 'Solutions to common problems',
      gettingStartedTitle: 'Getting Started with CalpeTrip',
      gs1Title: 'Create an Account',
      gs1Text: 'Register for free to save your favorites and manage bookings. You can also use CalpeTrip and ask CalpeChat questions without an account.',
      gs2Title: 'Talk to CalpeChat',
      gs2Text: 'Click the chat icon and tell CalpeChat what you\'re looking for. Use plain language - "Where can I eat good paella?" or "Fun activities for children in Calpe".',
      gs3Title: 'Discover & Book',
      gs3Text: 'Browse the recommendations, read reviews, and book directly. Everything you need for a perfect time in Calpe, all in one place.',
      ctaTitle: 'Didn\'t Find What You Were Looking For?',
      ctaText: 'Our team is ready to help you',
      ctaButton: 'Contact Us',
    },
    de: {
      title: 'Hilfe-Center',
      subtitle: 'Finden Sie Antworten und erfahren Sie, wie Sie CalpeTrip optimal nutzen',
      topic1Title: 'CalpeChat Verwenden',
      topic1Desc: 'Erfahren Sie, wie Sie das Beste aus unserem KI-Chatbot herausholen',
      topic2Title: 'Restaurants & Aktivitäten Finden',
      topic2Desc: 'Entdecken Sie die besten Orte in Calpe und an der Costa Blanca',
      topic3Title: 'Buchungen & Reservierungen',
      topic3Desc: 'Wie Sie Restaurantreservierungen vornehmen und Tickets kaufen',
      topic4Title: 'Spracheinstellungen',
      topic4Desc: 'Wechseln Sie die Sprache auf Niederländisch, Englisch, Deutsch oder Spanisch',
      topic5Title: 'Datenschutz & Daten',
      topic5Desc: 'Wie wir mit Ihren Daten umgehen (DSGVO-konform)',
      topic6Title: 'Fehlerbehebung',
      topic6Desc: 'Lösungen für häufige Probleme',
      gettingStartedTitle: 'Erste Schritte mit CalpeTrip',
      gs1Title: 'Konto Erstellen',
      gs1Text: 'Registrieren Sie sich kostenlos, um Ihre Favoriten zu speichern und Buchungen zu verwalten. Sie können CalpeTrip auch ohne Konto nutzen und CalpeChat Fragen stellen.',
      gs2Title: 'Mit CalpeChat Sprechen',
      gs2Text: 'Klicken Sie auf das Chat-Symbol und sagen Sie CalpeChat, wonach Sie suchen. Verwenden Sie einfache Sprache - "Wo kann ich gute Paella essen?" oder "Lustige Aktivitäten für Kinder in Calpe".',
      gs3Title: 'Entdecken & Buchen',
      gs3Text: 'Stöbern Sie in den Empfehlungen, lesen Sie Bewertungen und buchen Sie direkt. Alles, was Sie für eine perfekte Zeit in Calpe brauchen, an einem Ort.',
      ctaTitle: 'Nicht Gefunden, Was Sie Suchten?',
      ctaText: 'Unser Team steht bereit, Ihnen zu helfen',
      ctaButton: 'Kontakt Aufnehmen',
    },
    es: {
      title: 'Centro de Ayuda',
      subtitle: 'Encuentra respuestas y aprende a sacar el máximo partido a CalpeTrip',
      topic1Title: 'Usar CalpeChat',
      topic1Desc: 'Aprende a sacar el máximo partido a nuestro chatbot de IA',
      topic2Title: 'Encontrar Restaurantes & Actividades',
      topic2Desc: 'Descubre los mejores lugares en Calpe y la Costa Blanca',
      topic3Title: 'Reservas & Entradas',
      topic3Desc: 'Cómo hacer reservas en restaurantes y comprar entradas',
      topic4Title: 'Configuración de Idioma',
      topic4Desc: 'Cambia el idioma a neerlandés, inglés, alemán o español',
      topic5Title: 'Privacidad & Datos',
      topic5Desc: 'Cómo gestionamos tus datos (cumple RGPD)',
      topic6Title: 'Resolución de Problemas',
      topic6Desc: 'Soluciones a los problemas más comunes',
      gettingStartedTitle: 'Empezar con CalpeTrip',
      gs1Title: 'Crear una Cuenta',
      gs1Text: 'Regístrate gratis para guardar tus favoritos y gestionar tus reservas. También puedes usar CalpeTrip y hacerle preguntas a CalpeChat sin una cuenta.',
      gs2Title: 'Habla con CalpeChat',
      gs2Text: 'Haz clic en el icono del chat y dile a CalpeChat lo que buscas. Usa lenguaje natural - "¿Dónde puedo comer buena paella?" o "Actividades divertidas para niños en Calpe".',
      gs3Title: 'Descubre & Reserva',
      gs3Text: 'Consulta las recomendaciones, lee reseñas y reserva directamente. Todo lo que necesitas para disfrutar al máximo de Calpe, en un solo lugar.',
      ctaTitle: '¿No Has Encontrado Lo Que Buscabas?',
      ctaText: 'Nuestro equipo está listo para ayudarte',
      ctaButton: 'Contáctanos',
    },
  };

  // Get content based on destination
  const getContent = (key: string, fallback: string) => {
    if (destination.id !== 'texel') {
      const calpe = calpeContent[language as keyof typeof calpeContent] || calpeContent.nl;
      return (calpe[key as keyof typeof calpe] as string) || fallback;
    }
    return sp?.[key] || fallback;
  };

  const helpTopics = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
      title: getContent('topic1Title', destination.id === 'texel' ? 'Tessa Gebruiken' : 'CalpeChat Gebruiken'),
      description: getContent('topic1Desc', 'Leer hoe je het meeste uit onze AI-assistent haalt'),
      link: '/faq'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
      title: getContent('topic2Title', 'Restaurants & Activiteiten Vinden'),
      description: getContent('topic2Desc', 'Ontdek de beste plekken in de buurt'),
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
      title: getContent('topic3Title', 'Boekingen & Reserveringen'),
      description: getContent('topic3Desc', 'Hoe je restaurants reserveert en tickets koopt'),
      link: '/faq'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4m0 4h.01" />
        </svg>
      ),
      title: getContent('topic4Title', 'Taalinstellingen'),
      description: getContent('topic4Desc', 'Pas de taal aan naar jouw voorkeur'),
      link: '/faq'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: getContent('topic5Title', 'Privacy & Data'),
      description: getContent('topic5Desc', 'Hoe we omgaan met je gegevens'),
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
      title: getContent('topic6Title', 'Problemen Oplossen'),
      description: getContent('topic6Desc', 'Oplossingen voor veelvoorkomende problemen'),
      link: '/faq'
    }
  ];

  return (
    <div className="static-page">
      <div className="static-page-hero">
        <div className="static-page-hero-content">
          <h1>{getContent('title', 'Help Center')}</h1>
          <p>{getContent('subtitle', 'Vind antwoorden en leer hoe je optimaal gebruik maakt van het platform')}</p>
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
            {getContent('gettingStartedTitle', 'Aan de Slag')}
          </h2>
          <div className="static-steps">
            <div className="static-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>{getContent('gs1Title', 'Maak een Account')}</h3>
                <p>{getContent('gs1Text', 'Registreer gratis om je favorieten op te slaan en boekingen te beheren. Je kunt ook zonder account de app gebruiken.')}</p>
              </div>
            </div>
            <div className="static-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>{getContent('gs2Title', destination.id === 'texel' ? 'Praat met Tessa' : 'Praat met CalpeChat')}</h3>
                <p>{getContent('gs2Text', 'Klik op het chat-icoon en vertel de assistent wat je zoekt. Gebruik gewone taal voor directe aanbevelingen.')}</p>
              </div>
            </div>
            <div className="static-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>{getContent('gs3Title', 'Ontdek & Boek')}</h3>
                <p>{getContent('gs3Text', 'Bekijk de aanbevelingen, lees reviews, en boek direct. Alles wat je nodig hebt op één plek.')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="partner-cta">
          <h2>{getContent('ctaTitle', 'Niet Gevonden Wat Je Zocht?')}</h2>
          <p>{getContent('ctaText', 'Ons team staat klaar om je te helpen')}</p>
          <Link to="/contact" className="partner-cta-btn">
            {getContent('ctaButton', 'Neem Contact Op')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HelpCenterPage;
