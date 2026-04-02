import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../i18n/LanguageContext';
import { useDestination } from '../../shared/contexts/DestinationContext';
import './StaticPage.css';

/**
 * FAQPage - Frequently Asked Questions
 * Route: /faq
 * Multi-destination aware
 */
export function FAQPage() {
  const { t, language } = useLanguage();
  const destination = useDestination();
  const sp = (t as any).staticPages?.faq;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Texel-specific FAQ content
  const texelFaqs = {
    nl: {
      title: 'Veelgestelde Vragen',
      subtitle: 'Vind snel antwoord op je vragen over TexelMaps',
      q1: 'Wat is TexelMaps?',
      a1: 'TexelMaps is je persoonlijke digitale gids voor Texel. Onze AI-assistent Tessa helpt je met het vinden van de beste stranden, restaurants, fietstochten en meer - allemaal afgestemd op jouw voorkeuren.',
      q2: 'Is TexelMaps gratis te gebruiken?',
      a2: 'Ja, het gebruik van TexelMaps en Tessa is volledig gratis. Je betaalt alleen voor eventuele boekingen of tickets die je via het platform aanschaft.',
      q3: 'In welke talen is Tessa beschikbaar?',
      a3: 'Tessa spreekt Nederlands, Engels en Duits. Je kunt in je eigen taal communiceren en krijgt antwoord in dezelfde taal.',
      q4: 'Hoe werkt het boeken via TexelMaps?',
      a4: 'Je kunt direct via de app reserveringen maken bij restaurants, tickets kopen voor evenementen en activiteiten boeken. De betaling verloopt veilig via ons betalingssysteem.',
      q5: 'Kan ik mijn favorieten bewaren?',
      a5: 'Ja, je kunt locaties opslaan als favoriet zodat je ze later makkelijk terugvindt. Maak een gratis account aan om je favorieten op te slaan.',
      q6: 'Welk gebied dekt TexelMaps?',
      a6: 'TexelMaps richt zich volledig op het eiland Texel. Van Den Burg tot De Cocksdorp, van De Koog tot Oosterend - wij kennen alle hoekjes van het eiland.',
      q7: 'Hoe kan ik een reservering annuleren?',
      a7: 'Annuleringsvoorwaarden verschillen per locatie. Je vindt deze informatie bij je boeking. Neem bij vragen contact op met onze klantenservice.',
      q8: 'Is mijn data veilig?',
      a8: 'Ja, we nemen privacy zeer serieus. Je data wordt versleuteld opgeslagen en we delen nooit persoonlijke informatie met derden zonder je toestemming. Lees ons privacybeleid voor meer informatie.',
    },
    en: {
      title: 'Frequently Asked Questions',
      subtitle: 'Find quick answers to your questions about TexelMaps',
      q1: 'What is TexelMaps?',
      a1: 'TexelMaps is your personal digital guide for Texel. Our AI assistant Tessa helps you find the best beaches, restaurants, bike tours and more - all tailored to your preferences.',
      q2: 'Is TexelMaps free to use?',
      a2: 'Yes, using TexelMaps and Tessa is completely free. You only pay for any bookings or tickets you purchase through the platform.',
      q3: 'In which languages is Tessa available?',
      a3: 'Tessa speaks Dutch, English and German. You can communicate in your own language and receive answers in the same language.',
      q4: 'How does booking via TexelMaps work?',
      a4: 'You can make reservations at restaurants, buy tickets for events and book activities directly through the app. Payment is processed securely through our payment system.',
      q5: 'Can I save my favorites?',
      a5: 'Yes, you can save locations as favorites so you can easily find them later. Create a free account to save your favorites.',
      q6: 'Which area does TexelMaps cover?',
      a6: 'TexelMaps focuses entirely on the island of Texel. From Den Burg to De Cocksdorp, from De Koog to Oosterend - we know every corner of the island.',
      q7: 'How can I cancel a reservation?',
      a7: 'Cancellation policies vary by location. You can find this information with your booking. Contact our customer service if you have any questions.',
      q8: 'Is my data safe?',
      a8: 'Yes, we take privacy very seriously. Your data is stored encrypted and we never share personal information with third parties without your consent. Read our privacy policy for more information.',
    },
    de: {
      title: 'Häufig Gestellte Fragen',
      subtitle: 'Finden Sie schnell Antworten auf Ihre Fragen zu TexelMaps',
      q1: 'Was ist TexelMaps?',
      a1: 'TexelMaps ist Ihr persönlicher digitaler Führer für Texel. Unser KI-Assistent Tessa hilft Ihnen, die besten Strände, Restaurants, Radtouren und mehr zu finden - alles auf Ihre Vorlieben abgestimmt.',
      q2: 'Ist TexelMaps kostenlos?',
      a2: 'Ja, die Nutzung von TexelMaps und Tessa ist völlig kostenlos. Sie zahlen nur für eventuelle Buchungen oder Tickets, die Sie über die Plattform erwerben.',
      q3: 'In welchen Sprachen ist Tessa verfügbar?',
      a3: 'Tessa spricht Niederländisch, Englisch und Deutsch. Sie können in Ihrer eigenen Sprache kommunizieren und erhalten Antworten in derselben Sprache.',
      q4: 'Wie funktioniert das Buchen über TexelMaps?',
      a4: 'Sie können direkt über die App Reservierungen in Restaurants vornehmen, Tickets für Veranstaltungen kaufen und Aktivitäten buchen. Die Zahlung erfolgt sicher über unser Zahlungssystem.',
      q5: 'Kann ich meine Favoriten speichern?',
      a5: 'Ja, Sie können Standorte als Favoriten speichern, damit Sie sie später leicht wiederfinden. Erstellen Sie ein kostenloses Konto, um Ihre Favoriten zu speichern.',
      q6: 'Welches Gebiet deckt TexelMaps ab?',
      a6: 'TexelMaps konzentriert sich vollständig auf die Insel Texel. Von Den Burg bis De Cocksdorp, von De Koog bis Oosterend - wir kennen jede Ecke der Insel.',
      q7: 'Wie kann ich eine Reservierung stornieren?',
      a7: 'Die Stornierungsbedingungen variieren je nach Standort. Sie finden diese Informationen bei Ihrer Buchung. Kontaktieren Sie unseren Kundenservice bei Fragen.',
      q8: 'Sind meine Daten sicher?',
      a8: 'Ja, wir nehmen Datenschutz sehr ernst. Ihre Daten werden verschlüsselt gespeichert und wir teilen niemals persönliche Informationen ohne Ihre Zustimmung mit Dritten. Lesen Sie unsere Datenschutzrichtlinie für weitere Informationen.',
    },
  };

  // Calpe-specific FAQ content
  const calpeFaqs = {
    nl: {
      title: 'Veelgestelde Vragen',
      subtitle: 'Vind snel antwoord op je vragen over CalpeTrip',
      q1: 'Wat is CalpeTrip?',
      a1: 'CalpeTrip is je persoonlijke reisassistent voor Calpe en de Costa Blanca. Onze AI-chatbot CalpeChat helpt je met het vinden van de beste restaurants, stranden, activiteiten, evenementen en verborgen parels - volledig afgestemd op jouw voorkeuren.',
      q2: 'Hoe werkt CalpeChat?',
      a2: 'CalpeChat is onze AI-chatbot die je vragen beantwoordt over Calpe en omgeving. Je kunt gewoon in je eigen taal typen - "Waar eet ik het beste paella?" of "Wat zijn leuke activiteiten voor kinderen?" - en je krijgt direct gepersonaliseerde aanbevelingen.',
      q3: 'Is CalpeTrip gratis?',
      a3: 'Ja, CalpeTrip en CalpeChat zijn volledig gratis te gebruiken. Je betaalt alleen voor eventuele boekingen of tickets die je via het platform aanschaft.',
      q4: 'Wat kan ik vinden via CalpeTrip?',
      a4: 'Via CalpeTrip ontdek je het beste van Calpe en de Costa Blanca: restaurants en terrasjes, stranden, activiteiten en sport, lokale evenementen, verborgen parels die toeristen vaak missen, en veel meer. We combineren lokale expertise met actuele informatie.',
      q5: 'Hoe krijg ik gepersonaliseerde aanbevelingen?',
      a5: 'Stel je vraag aan CalpeChat en vertel wat je zoekt. CalpeChat houdt rekening met je voorkeuren, het tijdstip, het seizoen en andere factoren om de meest relevante aanbevelingen voor jou te vinden. Maak ook een gratis account aan om je favorieten op te slaan.',
      q6: 'Is mijn data veilig?',
      a6: 'Ja, we nemen privacy zeer serieus. CalpeTrip voldoet volledig aan de Europese privacywetgeving (AVG/GDPR) en al je gegevens worden opgeslagen op EU-servers. We delen nooit persoonlijke informatie met derden zonder jouw uitdrukkelijke toestemming.',
      q7: 'Welke talen worden ondersteund?',
      a7: 'CalpeChat spreekt Nederlands, Engels, Duits en Spaans. Je kunt in je eigen taal communiceren en je krijgt antwoord in dezelfde taal. CalpeTrip is volledig beschikbaar in deze vier talen.',
      q8: 'Hoe worden bedrijven geselecteerd?',
      a8: 'Bedrijven op CalpeTrip worden geselecteerd op basis van lokale expertise, gebruikersreviews en kwaliteitscriteria. We werken nauw samen met lokale partners en controleren regelmatig de kwaliteit van alle aanbevelingen. Alleen de beste plekken komen in onze database.',
    },
    en: {
      title: 'Frequently Asked Questions',
      subtitle: 'Find quick answers to your questions about CalpeTrip',
      q1: 'What is CalpeTrip?',
      a1: 'CalpeTrip is your personal travel assistant for Calpe and the Costa Blanca. Our AI chatbot CalpeChat helps you find the best restaurants, beaches, activities, events and hidden gems - all tailored to your preferences.',
      q2: 'How does CalpeChat work?',
      a2: 'CalpeChat is our AI chatbot that answers your questions about Calpe and the surrounding area. Simply type in your own language - "Where can I eat the best paella?" or "What are fun activities for kids?" - and you\'ll receive personalized recommendations instantly.',
      q3: 'Is CalpeTrip free?',
      a3: 'Yes, CalpeTrip and CalpeChat are completely free to use. You only pay for any bookings or tickets you purchase through the platform.',
      q4: 'What can I find through CalpeTrip?',
      a4: 'Through CalpeTrip you discover the best of Calpe and the Costa Blanca: restaurants and terraces, beaches, activities and sports, local events, hidden gems that tourists often miss, and much more. We combine local expertise with up-to-date information.',
      q5: 'How do I get personalized recommendations?',
      a5: 'Ask CalpeChat and tell it what you\'re looking for. CalpeChat takes into account your preferences, the time of day, the season and other factors to find the most relevant recommendations for you. Also create a free account to save your favorites.',
      q6: 'Is my data safe?',
      a6: 'Yes, we take privacy very seriously. CalpeTrip fully complies with European privacy legislation (GDPR) and all your data is stored on EU servers. We never share personal information with third parties without your explicit consent.',
      q7: 'Which languages are supported?',
      a7: 'CalpeChat speaks Dutch, English, German and Spanish. You can communicate in your own language and receive answers in the same language. CalpeTrip is fully available in these four languages.',
      q8: 'How are businesses selected?',
      a8: 'Businesses on CalpeTrip are selected based on local expertise, user reviews and quality criteria. We work closely with local partners and regularly check the quality of all recommendations. Only the best places make it into our database.',
    },
    de: {
      title: 'Häufig Gestellte Fragen',
      subtitle: 'Finden Sie schnell Antworten auf Ihre Fragen zu CalpeTrip',
      q1: 'Was ist CalpeTrip?',
      a1: 'CalpeTrip ist Ihr persönlicher Reiseassistent für Calpe und die Costa Blanca. Unser KI-Chatbot CalpeChat hilft Ihnen, die besten Restaurants, Strände, Aktivitäten, Veranstaltungen und versteckten Schätze zu finden - alles auf Ihre Vorlieben abgestimmt.',
      q2: 'Wie funktioniert CalpeChat?',
      a2: 'CalpeChat ist unser KI-Chatbot, der Ihre Fragen zu Calpe und Umgebung beantwortet. Tippen Sie einfach in Ihrer eigenen Sprache - "Wo kann ich die beste Paella essen?" oder "Was sind lustige Aktivitäten für Kinder?" - und Sie erhalten sofort personalisierte Empfehlungen.',
      q3: 'Ist CalpeTrip kostenlos?',
      a3: 'Ja, CalpeTrip und CalpeChat sind völlig kostenlos zu nutzen. Sie zahlen nur für eventuelle Buchungen oder Tickets, die Sie über die Plattform erwerben.',
      q4: 'Was kann ich über CalpeTrip finden?',
      a4: 'Über CalpeTrip entdecken Sie das Beste von Calpe und der Costa Blanca: Restaurants und Terrassen, Strände, Aktivitäten und Sport, lokale Veranstaltungen, versteckte Perlen, die Touristen oft verpassen, und vieles mehr. Wir verbinden lokales Know-how mit aktuellen Informationen.',
      q5: 'Wie erhalte ich personalisierte Empfehlungen?',
      a5: 'Stellen Sie CalpeChat Ihre Frage und sagen Sie, was Sie suchen. CalpeChat berücksichtigt Ihre Vorlieben, die Tageszeit, die Jahreszeit und andere Faktoren, um die relevantesten Empfehlungen für Sie zu finden. Erstellen Sie auch ein kostenloses Konto, um Ihre Favoriten zu speichern.',
      q6: 'Sind meine Daten sicher?',
      a6: 'Ja, wir nehmen Datenschutz sehr ernst. CalpeTrip entspricht vollständig der europäischen Datenschutzgesetzgebung (DSGVO) und alle Ihre Daten werden auf EU-Servern gespeichert. Wir teilen niemals persönliche Informationen ohne Ihre ausdrückliche Zustimmung mit Dritten.',
      q7: 'Welche Sprachen werden unterstützt?',
      a7: 'CalpeChat spricht Niederländisch, Englisch, Deutsch und Spanisch. Sie können in Ihrer eigenen Sprache kommunizieren und erhalten Antworten in derselben Sprache. CalpeTrip ist in diesen vier Sprachen vollständig verfügbar.',
      q8: 'Wie werden Unternehmen ausgewählt?',
      a8: 'Unternehmen auf CalpeTrip werden auf der Grundlage von lokalem Know-how, Nutzerbewertungen und Qualitätskriterien ausgewählt. Wir arbeiten eng mit lokalen Partnern zusammen und überprüfen regelmäßig die Qualität aller Empfehlungen. Nur die besten Orte kommen in unsere Datenbank.',
    },
    es: {
      title: 'Preguntas Frecuentes',
      subtitle: 'Encuentra respuestas rápidas a tus preguntas sobre CalpeTrip',
      q1: '¿Qué es CalpeTrip?',
      a1: 'CalpeTrip es tu asistente de viaje personal para Calpe y la Costa Blanca. Nuestro chatbot de IA CalpeChat te ayuda a encontrar los mejores restaurantes, playas, actividades, eventos y joyas ocultas, todo adaptado a tus preferencias.',
      q2: '¿Cómo funciona CalpeChat?',
      a2: 'CalpeChat es nuestro chatbot de IA que responde tus preguntas sobre Calpe y los alrededores. Simplemente escribe en tu propio idioma - "¿Dónde puedo comer la mejor paella?" o "¿Qué actividades divertidas hay para niños?" - y recibirás recomendaciones personalizadas al instante.',
      q3: '¿Es CalpeTrip gratuito?',
      a3: 'Sí, CalpeTrip y CalpeChat son completamente gratuitos. Solo pagas por las reservas o entradas que adquieras a través de la plataforma.',
      q4: '¿Qué puedo encontrar en CalpeTrip?',
      a4: 'A través de CalpeTrip descubres lo mejor de Calpe y la Costa Blanca: restaurantes y terrazas, playas, actividades y deportes, eventos locales, joyas ocultas que los turistas suelen perderse, y mucho más. Combinamos el conocimiento local con información actualizada.',
      q5: '¿Cómo obtengo recomendaciones personalizadas?',
      a5: 'Pregunta a CalpeChat y cuéntale lo que buscas. CalpeChat tiene en cuenta tus preferencias, la hora del día, la temporada y otros factores para encontrar las recomendaciones más relevantes para ti. También crea una cuenta gratuita para guardar tus favoritos.',
      q6: '¿Están mis datos seguros?',
      a6: 'Sí, nos tomamos la privacidad muy en serio. CalpeTrip cumple plenamente con la legislación europea de privacidad (RGPD) y todos tus datos se almacenan en servidores de la UE. Nunca compartimos información personal con terceros sin tu consentimiento explícito.',
      q7: '¿Qué idiomas se admiten?',
      a7: 'CalpeChat habla neerlandés, inglés, alemán y español. Puedes comunicarte en tu propio idioma y recibirás respuestas en el mismo idioma. CalpeTrip está disponible en estos cuatro idiomas.',
      q8: '¿Cómo se seleccionan los negocios?',
      a8: 'Los negocios en CalpeTrip se seleccionan en función del conocimiento local, las valoraciones de los usuarios y los criterios de calidad. Trabajamos estrechamente con socios locales y verificamos regularmente la calidad de todas las recomendaciones. Solo los mejores lugares entran en nuestra base de datos.',
    },
  };

  // Get content based on destination
  const texel = texelFaqs[language as keyof typeof texelFaqs] || texelFaqs.nl;
  const calpe = calpeFaqs[language as keyof typeof calpeFaqs] || calpeFaqs.nl;

  const faqItems = destination.id === 'texel' ? [
    { question: texel.q1, answer: texel.a1 },
    { question: texel.q2, answer: texel.a2 },
    { question: texel.q3, answer: texel.a3 },
    { question: texel.q4, answer: texel.a4 },
    { question: texel.q5, answer: texel.a5 },
    { question: texel.q6, answer: texel.a6 },
    { question: texel.q7, answer: texel.a7 },
    { question: texel.q8, answer: texel.a8 },
  ] : [
    { question: calpe.q1, answer: calpe.a1 },
    { question: calpe.q2, answer: calpe.a2 },
    { question: calpe.q3, answer: calpe.a3 },
    { question: calpe.q4, answer: calpe.a4 },
    { question: calpe.q5, answer: calpe.a5 },
    { question: calpe.q6, answer: calpe.a6 },
    { question: calpe.q7, answer: calpe.a7 },
    { question: calpe.q8, answer: calpe.a8 },
  ];

  return (
    <div className="static-page">
      <div className="static-page-hero">
        <div className="static-page-hero-content">
          <h1>{destination.id === 'texel' ? texel.title : calpe.title}</h1>
          <p>{destination.id === 'texel' ? texel.subtitle : calpe.subtitle}</p>
        </div>
      </div>

      <div className="static-page-content">
        <div className="faq-list">
          {faqItems.map((item, index) => (
            <div key={index} className="faq-item">
              <button
                className="faq-question"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                aria-expanded={openIndex === index}
              >
                <span>{item.question}</span>
                <svg
                  className={`faq-icon ${openIndex === index ? 'open' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="faq-answer">{item.answer}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FAQPage;
