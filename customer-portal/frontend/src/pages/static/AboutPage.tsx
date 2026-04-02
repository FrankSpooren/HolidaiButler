import { useLanguage } from '../../i18n/LanguageContext';
import { useDestination } from '../../shared/contexts/DestinationContext';
import './StaticPage.css';

/**
 * AboutPage - About CalpeTrip / TexelMaps
 * Route: /about
 * Multi-destination aware
 */
export function AboutPage() {
  const { t, language } = useLanguage();
  const destination = useDestination();
  const sp = (t as any).staticPages?.about;

  // Texel-specific content translations
  const texelContent = {
    nl: {
      title: 'Over TexelMaps',
      subtitle: 'Jouw Persoonlijke Eilandgids voor Texel',
      missionTitle: 'Onze Missie',
      missionBold: 'TexelMaps is jouw persoonlijke digitale gids voor Texel.',
      missionText: 'Geen generieke tips of toeristische clichés, maar aanbevelingen die passen bij jou, je gezelschap en het moment. Gebaseerd op actuele omstandigheden, lokale expertise en jouw voorkeuren. Objectief, betrouwbaar en transparant — in dienst van jouw eilandervaring.',
      visionTitle: 'Onze Visie',
      visionBold: 'Wij bouwen aan het meest persoonlijke en betrouwbare eilandplatform van Nederland.',
      visionText: 'Door lokale partnerships, VVV Texel-endorsement en AI-technologie bieden we hyperpersoonlijke en realtime informatie — afgestemd op jouw profiel, voorkeuren en omstandigheden. TexelMaps is er voor bezoekers die méér willen dan generieke tips: transparant, ethisch en met diepe lokale expertise.',
      offerTitle: 'Wat Wij Bieden',
      feature1Title: 'Tessa AI-Assistent',
      feature1Text: 'Stel vragen in je eigen taal en krijg direct antwoord over Texel',
      feature2Title: 'Lokale Kennis',
      feature2Text: 'Ontdek verborgen parels die alleen eilandbewoners kennen',
      feature3Title: 'Eenvoudig Boeken',
      feature3Text: 'Reserveer restaurants, fietstochten en activiteiten in enkele klikken',
      regionTitle: 'Texel',
      regionText: 'Texel, het grootste Waddeneiland van Nederland, biedt prachtige stranden, unieke natuur, heerlijke lokale producten en een rijke geschiedenis. Van het bruisende De Koog tot het rustige Den Hoorn, wij kennen elk hoekje van dit eiland.',
    },
    en: {
      title: 'About TexelMaps',
      subtitle: 'Your Personal Island Guide for Texel',
      missionTitle: 'Our Mission',
      missionBold: 'TexelMaps is your personal digital guide for Texel.',
      missionText: 'No generic tips or tourist clichés, but recommendations that fit you, your companions and the moment. Based on current conditions, local expertise and your preferences. Objective, reliable and transparent — at the service of your island experience.',
      visionTitle: 'Our Vision',
      visionBold: 'We are building the most personal and reliable island platform in the Netherlands.',
      visionText: 'Through local partnerships, VVV Texel endorsement and AI technology, we offer hyper-personal and real-time information — tailored to your profile, preferences and circumstances. TexelMaps is for visitors who want more than generic tips: transparent, ethical and with deep local expertise.',
      offerTitle: 'What We Offer',
      feature1Title: 'Tessa AI Assistant',
      feature1Text: 'Ask questions in your own language and get instant answers about Texel',
      feature2Title: 'Local Knowledge',
      feature2Text: 'Discover hidden gems that only island residents know',
      feature3Title: 'Easy Booking',
      feature3Text: 'Book restaurants, bike tours and activities in just a few clicks',
      regionTitle: 'Texel',
      regionText: 'Texel, the largest Wadden island of the Netherlands, offers beautiful beaches, unique nature, delicious local products and a rich history. From lively De Koog to peaceful Den Hoorn, we know every corner of this island.',
    },
    de: {
      title: 'Über TexelMaps',
      subtitle: 'Ihr Persönlicher Inselführer für Texel',
      missionTitle: 'Unsere Mission',
      missionBold: 'TexelMaps ist Ihr persönlicher digitaler Führer für Texel.',
      missionText: 'Keine generischen Tipps oder touristischen Klischees, sondern Empfehlungen, die zu Ihnen, Ihren Begleitern und dem Moment passen. Basierend auf aktuellen Bedingungen, lokaler Expertise und Ihren Vorlieben. Objektiv, zuverlässig und transparent — im Dienste Ihres Inselerlebnisses.',
      visionTitle: 'Unsere Vision',
      visionBold: 'Wir bauen die persönlichste und zuverlässigste Inselplattform der Niederlande.',
      visionText: 'Durch lokale Partnerschaften, VVV Texel-Unterstützung und KI-Technologie bieten wir hyperpersönliche und Echtzeit-Informationen — abgestimmt auf Ihr Profil, Ihre Vorlieben und Umstände. TexelMaps ist für Besucher, die mehr als generische Tipps wollen: transparent, ethisch und mit tiefem lokalem Wissen.',
      offerTitle: 'Was Wir Bieten',
      feature1Title: 'Tessa KI-Assistent',
      feature1Text: 'Stellen Sie Fragen in Ihrer Sprache und erhalten Sie sofort Antworten über Texel',
      feature2Title: 'Lokales Wissen',
      feature2Text: 'Entdecken Sie versteckte Perlen, die nur Inselbewohner kennen',
      feature3Title: 'Einfach Buchen',
      feature3Text: 'Buchen Sie Restaurants, Radtouren und Aktivitäten mit wenigen Klicks',
      regionTitle: 'Texel',
      regionText: 'Texel, die größte Watteninsel der Niederlande, bietet wunderschöne Strände, einzigartige Natur, köstliche lokale Produkte und eine reiche Geschichte. Vom lebhaften De Koog bis zum ruhigen Den Hoorn, wir kennen jeden Winkel dieser Insel.',
    },
  };

  // Calpe-specific content translations
  const calpeContent = {
    nl: {
      title: 'Over CalpeTrip',
      subtitle: 'Jouw Persoonlijke Reisassistent voor Calpe',
      missionTitle: 'Onze Missie',
      missionBold: 'CalpeTrip is jouw persoonlijke digitale butler voor de Costa Blanca.',
      missionText: 'Geen generieke tips of toeristische clichés, maar aanbevelingen die passen bij jou, je gezelschap en het moment. Gebaseerd op actuele omstandigheden, lokale expertise en jouw voorkeuren. Objectief, betrouwbaar en transparant — in dienst van jouw ervaring.',
      visionTitle: 'Onze Visie',
      visionBold: 'Wij bouwen aan het meest persoonlijke en betrouwbare vakantieplatform voor de Costa Blanca.',
      visionText: 'Door lokale partnerships en AI-technologie bieden we hyperpersoonlijke en realtime informatie — afgestemd op jouw profiel, voorkeuren en omstandigheden. CalpeTrip is er voor bezoekers die méér willen dan generieke tips: transparant, ethisch en met diepe lokale expertise.',
      offerTitle: 'Wat Wij Bieden',
      feature1Title: 'CalpeChat AI-Assistent',
      feature1Text: 'Stel vragen in je eigen taal en krijg direct antwoord over Calpe en omgeving',
      feature2Title: 'Lokale Kennis',
      feature2Text: 'Ontdek verborgen parels die alleen locals kennen',
      feature3Title: 'Eenvoudig Boeken',
      feature3Text: 'Reserveer restaurants, excursies en activiteiten in enkele klikken',
      regionTitle: 'Calpe & Costa Blanca',
      regionText: 'Calpe, gelegen aan de prachtige Costa Blanca, staat bekend om de iconische Peñón de Ifach, kristalhelder water, heerlijke tapas en een bruisend cultureel leven. Van de historische oude stad tot de levendige stranden, wij kennen elk hoekje van deze bijzondere bestemming.',
    },
    en: {
      title: 'About CalpeTrip',
      subtitle: 'Your Personal Travel Assistant for Calpe',
      missionTitle: 'Our Mission',
      missionBold: 'CalpeTrip is your personal digital butler for the Costa Blanca.',
      missionText: 'No generic tips or tourist clichés, but recommendations that fit you, your companions and the moment. Based on current conditions, local expertise and your preferences. Objective, reliable and transparent — at the service of your experience.',
      visionTitle: 'Our Vision',
      visionBold: 'We are building the most personal and reliable holiday platform for the Costa Blanca.',
      visionText: 'Through local partnerships and AI technology, we offer hyper-personal and real-time information — tailored to your profile, preferences and circumstances. CalpeTrip is for visitors who want more than generic tips: transparent, ethical and with deep local expertise.',
      offerTitle: 'What We Offer',
      feature1Title: 'CalpeChat AI Assistant',
      feature1Text: 'Ask questions in your own language and get instant answers about Calpe and surroundings',
      feature2Title: 'Local Knowledge',
      feature2Text: 'Discover hidden gems that only locals know',
      feature3Title: 'Easy Booking',
      feature3Text: 'Book restaurants, excursions and activities in just a few clicks',
      regionTitle: 'Calpe & Costa Blanca',
      regionText: 'Calpe, located on the beautiful Costa Blanca, is known for the iconic Peñón de Ifach, crystal clear waters, delicious tapas and a vibrant cultural life. From the historic old town to the lively beaches, we know every corner of this special destination.',
    },
    de: {
      title: 'Über CalpeTrip',
      subtitle: 'Ihr Persönlicher Reiseassistent für Calpe',
      missionTitle: 'Unsere Mission',
      missionBold: 'CalpeTrip ist Ihr persönlicher digitaler Butler für die Costa Blanca.',
      missionText: 'Keine generischen Tipps oder touristischen Klischees, sondern Empfehlungen, die zu Ihnen, Ihren Begleitern und dem Moment passen. Basierend auf aktuellen Bedingungen, lokaler Expertise und Ihren Vorlieben. Objektiv, zuverlässig und transparent — im Dienste Ihres Erlebnisses.',
      visionTitle: 'Unsere Vision',
      visionBold: 'Wir bauen die persönlichste und zuverlässigste Urlaubsplattform für die Costa Blanca.',
      visionText: 'Durch lokale Partnerschaften und KI-Technologie bieten wir hyperpersönliche und Echtzeit-Informationen — abgestimmt auf Ihr Profil, Ihre Vorlieben und Umstände. CalpeTrip ist für Besucher, die mehr als generische Tipps wollen: transparent, ethisch und mit tiefem lokalem Wissen.',
      offerTitle: 'Was Wir Bieten',
      feature1Title: 'CalpeChat KI-Assistent',
      feature1Text: 'Stellen Sie Fragen in Ihrer Sprache und erhalten Sie sofort Antworten über Calpe und Umgebung',
      feature2Title: 'Lokales Wissen',
      feature2Text: 'Entdecken Sie versteckte Perlen, die nur Einheimische kennen',
      feature3Title: 'Einfach Buchen',
      feature3Text: 'Buchen Sie Restaurants, Ausflüge und Aktivitäten mit wenigen Klicks',
      regionTitle: 'Calpe & Costa Blanca',
      regionText: 'Calpe, an der wunderschönen Costa Blanca gelegen, ist bekannt für den ikonischen Peñón de Ifach, kristallklares Wasser, köstliche Tapas und ein lebhaftes Kulturleben. Von der historischen Altstadt bis zu den lebhaften Stränden, wir kennen jede Ecke dieses besonderen Reiseziels.',
    },
    es: {
      title: 'Sobre CalpeTrip',
      subtitle: 'Tu Asistente Personal de Viaje para Calpe',
      missionTitle: 'Nuestra Misión',
      missionBold: 'CalpeTrip es tu butler digital personal para la Costa Blanca.',
      missionText: 'No son consejos genéricos ni clichés turísticos, sino recomendaciones que se adaptan a ti, a tu compañía y al momento. Basadas en condiciones actuales, experiencia local y tus preferencias. Objetivo, fiable y transparente — al servicio de tu experiencia.',
      visionTitle: 'Nuestra Visión',
      visionBold: 'Estamos construyendo la plataforma de vacaciones más personal y fiable de la Costa Blanca.',
      visionText: 'A través de alianzas locales y tecnología de IA, ofrecemos información hiperpersonal y en tiempo real — adaptada a tu perfil, preferencias y circunstancias. CalpeTrip es para visitantes que quieren más que consejos genéricos: transparente, ético y con profundo conocimiento local.',
      offerTitle: 'Lo Que Ofrecemos',
      feature1Title: 'CalpeChat Asistente IA',
      feature1Text: 'Haz preguntas en tu idioma y obtén respuestas instantáneas sobre Calpe y alrededores',
      feature2Title: 'Conocimiento Local',
      feature2Text: 'Descubre joyas ocultas que solo los locales conocen',
      feature3Title: 'Reserva Fácil',
      feature3Text: 'Reserva restaurantes, excursiones y actividades en pocos clics',
      regionTitle: 'Calpe y Costa Blanca',
      regionText: 'Calpe, situada en la hermosa Costa Blanca, es conocida por el icónico Peñón de Ifach, aguas cristalinas, deliciosas tapas y una vibrante vida cultural. Desde el casco antiguo hasta las animadas playas, conocemos cada rincón de este destino especial.',
    },
  };

  // Get content based on destination
  const getContent = (key: string, fallback: string) => {
    if (destination.id === 'texel') {
      const texel = texelContent[language as keyof typeof texelContent] || texelContent.nl;
      return texel[key as keyof typeof texel] || fallback;
    }
    // Calpe / default
    const calpe = calpeContent[language as keyof typeof calpeContent] || calpeContent.nl;
    return calpe[key as keyof typeof calpe] || sp?.[key] || fallback;
  };

  return (
    <div className="static-page">
      <div className="static-page-hero">
        <div className="static-page-hero-content">
          <h1>{getContent('title', 'Over CalpeTrip')}</h1>
          <p>{getContent('subtitle', 'Jouw Persoonlijke Butler aan de Costa Blanca')}</p>
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
            {getContent('missionTitle', 'Onze Missie')}
          </h2>
          <p className="section-subheader">
            {getContent('missionBold', 'CalpeTrip is jouw persoonlijke digitale butler voor de Costa Blanca.')}
          </p>
          <p>
            {getContent('missionText', 'Geen generieke tips of toeristische clichés, maar aanbevelingen die passen bij jou, je gezelschap en het moment. Gebaseerd op actuele omstandigheden, lokale expertise en jouw voorkeuren. Objectief, betrouwbaar en transparant — in dienst van jouw ervaring.')}
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
            {getContent('visionTitle', 'Onze Visie')}
          </h2>
          <p className="section-subheader">
            {getContent('visionBold', 'Wij bouwen aan het meest persoonlijke en betrouwbare toerismeplatform van Europa.')}
          </p>
          <p>
            {getContent('visionText', 'Door lokale partnerships, DMO-endorsement en AI-technologie bieden we hyperpersoonlijke en realtime informatie — afgestemd op jouw profiel, voorkeuren en omstandigheden. CalpeTrip is er voor reizigers die méér willen dan generieke tips: transparant, ethisch en met diepe lokale expertise. Jij bent in control. Wij zorgen dat je niets mist — en nergens over hoeft na te denken.')}
          </p>
        </div>

        {/* What We Offer */}
        <div className="static-section">
          <h2>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {getContent('offerTitle', 'Wat Wij Bieden')}
          </h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <h3>{getContent('feature1Title', 'HoliBot AI-Assistent')}</h3>
              <p>{getContent('feature1Text', 'Stel vragen in je eigen taal en krijg direct antwoord')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <h3>{getContent('feature2Title', 'Lokale Kennis')}</h3>
              <p>{getContent('feature2Text', 'Ontdek verborgen parels die alleen locals kennen')}</p>
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
              <h3>{getContent('feature3Title', 'Eenvoudig Boeken')}</h3>
              <p>{getContent('feature3Text', 'Reserveer restaurants, tickets en activiteiten in enkele klikken')}</p>
            </div>
          </div>
        </div>

        {/* Region Section */}
        <div className="static-section">
          <h2>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
            {getContent('regionTitle', 'Costa Blanca')}
          </h2>
          <p>
            {getContent('regionText', 'De Costa Blanca, met haar prachtige stranden, pittoreske dorpjes en heerlijke Mediterrane keuken, is een van de mooiste vakantiebestemmingen van Europa. Van de bruisende stad Alicante tot het rustige Altea, wij kennen elk hoekje van deze regio.')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
