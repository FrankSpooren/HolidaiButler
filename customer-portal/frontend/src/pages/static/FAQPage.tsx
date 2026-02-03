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
      a1: 'TexelMaps is je persoonlijke digitale gids voor Texel. Onze AI-assistent Texla helpt je met het vinden van de beste stranden, restaurants, fietstochten en meer - allemaal afgestemd op jouw voorkeuren.',
      q2: 'Is TexelMaps gratis te gebruiken?',
      a2: 'Ja, het gebruik van TexelMaps en Texla is volledig gratis. Je betaalt alleen voor eventuele boekingen of tickets die je via het platform aanschaft.',
      q3: 'In welke talen is Texla beschikbaar?',
      a3: 'Texla spreekt Nederlands, Engels en Duits. Je kunt in je eigen taal communiceren en krijgt antwoord in dezelfde taal.',
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
      a1: 'TexelMaps is your personal digital guide for Texel. Our AI assistant Texla helps you find the best beaches, restaurants, bike tours and more - all tailored to your preferences.',
      q2: 'Is TexelMaps free to use?',
      a2: 'Yes, using TexelMaps and Texla is completely free. You only pay for any bookings or tickets you purchase through the platform.',
      q3: 'In which languages is Texla available?',
      a3: 'Texla speaks Dutch, English and German. You can communicate in your own language and receive answers in the same language.',
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
      a1: 'TexelMaps ist Ihr persönlicher digitaler Führer für Texel. Unser KI-Assistent Texla hilft Ihnen, die besten Strände, Restaurants, Radtouren und mehr zu finden - alles auf Ihre Vorlieben abgestimmt.',
      q2: 'Ist TexelMaps kostenlos?',
      a2: 'Ja, die Nutzung von TexelMaps und Texla ist völlig kostenlos. Sie zahlen nur für eventuelle Buchungen oder Tickets, die Sie über die Plattform erwerben.',
      q3: 'In welchen Sprachen ist Texla verfügbar?',
      a3: 'Texla spricht Niederländisch, Englisch und Deutsch. Sie können in Ihrer eigenen Sprache kommunizieren und erhalten Antworten in derselben Sprache.',
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

  // Get content based on destination
  const texel = texelFaqs[language as keyof typeof texelFaqs] || texelFaqs.nl;

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
    {
      question: sp?.q1 || 'Wat is HolidaiButler?',
      answer: sp?.a1 || 'HolidaiButler is je persoonlijke digitale butler voor de Costa Blanca. Onze AI-assistent HoliBot helpt je met het vinden van de beste restaurants, stranden, activiteiten en meer - allemaal afgestemd op jouw voorkeuren.'
    },
    {
      question: sp?.q2 || 'Is HolidaiButler gratis te gebruiken?',
      answer: sp?.a2 || 'Ja, het gebruik van HolidaiButler en HoliBot is volledig gratis. Je betaalt alleen voor eventuele boekingen of tickets die je via het platform aanschaft.'
    },
    {
      question: sp?.q3 || 'In welke talen is HoliBot beschikbaar?',
      answer: sp?.a3 || 'HoliBot spreekt Nederlands, Engels, Duits, Spaans, Zweeds en Pools. Je kunt in je eigen taal communiceren en krijgt antwoord in dezelfde taal.'
    },
    {
      question: sp?.q4 || 'Hoe werkt het boeken via HolidaiButler?',
      answer: sp?.a4 || 'Je kunt direct via de app reserveringen maken bij restaurants, tickets kopen voor evenementen en activiteiten boeken. De betaling verloopt veilig via ons betalingssysteem.'
    },
    {
      question: sp?.q5 || 'Kan ik mijn favorieten bewaren?',
      answer: sp?.a5 || 'Ja, je kunt locaties opslaan als favoriet zodat je ze later makkelijk terugvindt. Maak een gratis account aan om je favorieten op te slaan.'
    },
    {
      question: sp?.q6 || 'Welk gebied dekt HolidaiButler?',
      answer: sp?.a6 || 'HolidaiButler richt zich op de Costa Blanca regio in Spanje, van Denia in het noorden tot Torrevieja in het zuiden. We breiden ons aanbod continu uit.'
    },
    {
      question: sp?.q7 || 'Hoe kan ik een reservering annuleren?',
      answer: sp?.a7 || 'Annuleringsvoorwaarden verschillen per locatie. Je vindt deze informatie bij je boeking. Neem bij vragen contact op met onze klantenservice.'
    },
    {
      question: sp?.q8 || 'Is mijn data veilig?',
      answer: sp?.a8 || 'Ja, we nemen privacy zeer serieus. Je data wordt versleuteld opgeslagen en we delen nooit persoonlijke informatie met derden zonder je toestemming. Lees ons privacybeleid voor meer informatie.'
    }
  ];

  return (
    <div className="static-page">
      <div className="static-page-hero">
        <div className="static-page-hero-content">
          <h1>{destination.id === 'texel' ? texel.title : (sp?.title || 'Veelgestelde Vragen')}</h1>
          <p>{destination.id === 'texel' ? texel.subtitle : (sp?.subtitle || 'Vind snel antwoord op je vragen over HolidaiButler')}</p>
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
