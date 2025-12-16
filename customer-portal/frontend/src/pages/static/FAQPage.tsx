import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../i18n/LanguageContext';
import './StaticPage.css';

/**
 * FAQPage - Frequently Asked Questions
 * Route: /faq
 */
export function FAQPage() {
  const { t } = useLanguage();
  const sp = (t as any).staticPages?.faq;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqItems = [
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
          <h1>{sp?.title || 'Veelgestelde Vragen'}</h1>
          <p>{sp?.subtitle || 'Vind snel antwoord op je vragen over HolidaiButler'}</p>
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
