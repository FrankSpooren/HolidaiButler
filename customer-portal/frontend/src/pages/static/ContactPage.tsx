import { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useDestination } from '../../shared/contexts/DestinationContext';
import './StaticPage.css';

/**
 * ContactPage - Contact form and info
 * Route: /contact
 * Multi-destination aware
 */
export function ContactPage() {
  const { t, language } = useLanguage();
  const destination = useDestination();
  const sp = (t as any).staticPages?.contact;

  // CalpeTrip-specific contact content
  const calpeContent = {
    nl: {
      title: 'Contact',
      subtitle: 'Vragen over CalpeTrip? We helpen je graag.',
      emailTitle: 'E-mail',
      emailAddress: 'info@calpetrip.com',
      responseTitle: 'Reactietijd',
      responseText: 'Binnen 48 uur op werkdagen',
      holibotTitle: 'CalpeChat',
      holibotText: 'Voor snelle vragen, chat met CalpeChat',
      infoTitle: 'Andere manieren om contact op te nemen',
      formTitle: 'Stuur ons een Bericht',
      thankYouTitle: 'Bedankt voor je bericht!',
      thankYouText: 'We nemen zo snel mogelijk contact met je op.',
      nameLabel: 'Naam',
      namePlaceholder: 'Je naam',
      emailLabel: 'E-mail',
      emailPlaceholder: 'je@email.com',
      subjectLabel: 'Onderwerp',
      subjectPlaceholder: 'Selecteer een onderwerp',
      subjectGeneral: 'Algemene vraag',
      subjectBooking: 'Vraag over boeking',
      subjectPartnership: 'Samenwerking',
      subjectFeedback: 'Feedback',
      subjectOther: 'Anders',
      messageLabel: 'Bericht',
      messagePlaceholder: 'Hoe kunnen we je helpen?',
      submitButton: 'Verstuur Bericht',
    },
    en: {
      title: 'Contact',
      subtitle: 'Questions about CalpeTrip? We are happy to help.',
      emailTitle: 'Email',
      emailAddress: 'info@calpetrip.com',
      responseTitle: 'Response time',
      responseText: 'Within 48 hours on business days',
      holibotTitle: 'CalpeChat',
      holibotText: 'For quick questions, chat with CalpeChat',
      infoTitle: 'Other ways to contact us',
      formTitle: 'Send us a Message',
      thankYouTitle: 'Thank you for your message!',
      thankYouText: 'We will get back to you as soon as possible.',
      nameLabel: 'Name',
      namePlaceholder: 'Your name',
      emailLabel: 'Email',
      emailPlaceholder: 'you@email.com',
      subjectLabel: 'Subject',
      subjectPlaceholder: 'Select a subject',
      subjectGeneral: 'General question',
      subjectBooking: 'Booking question',
      subjectPartnership: 'Partnership',
      subjectFeedback: 'Feedback',
      subjectOther: 'Other',
      messageLabel: 'Message',
      messagePlaceholder: 'How can we help you?',
      submitButton: 'Send Message',
    },
    de: {
      title: 'Kontakt',
      subtitle: 'Fragen zu CalpeTrip? Wir helfen Ihnen gerne.',
      emailTitle: 'E-Mail',
      emailAddress: 'info@calpetrip.com',
      responseTitle: 'Antwortzeit',
      responseText: 'Innerhalb von 48 Stunden an Werktagen',
      holibotTitle: 'CalpeChat',
      holibotText: 'Für schnelle Fragen chatten Sie mit CalpeChat',
      infoTitle: 'Andere Wege, uns zu kontaktieren',
      formTitle: 'Senden Sie uns eine Nachricht',
      thankYouTitle: 'Vielen Dank für Ihre Nachricht!',
      thankYouText: 'Wir melden uns so schnell wie möglich bei Ihnen.',
      nameLabel: 'Name',
      namePlaceholder: 'Ihr Name',
      emailLabel: 'E-Mail',
      emailPlaceholder: 'sie@email.com',
      subjectLabel: 'Betreff',
      subjectPlaceholder: 'Betreff auswählen',
      subjectGeneral: 'Allgemeine Frage',
      subjectBooking: 'Buchungsfrage',
      subjectPartnership: 'Partnerschaft',
      subjectFeedback: 'Feedback',
      subjectOther: 'Sonstiges',
      messageLabel: 'Nachricht',
      messagePlaceholder: 'Wie können wir Ihnen helfen?',
      submitButton: 'Nachricht senden',
    },
    es: {
      title: 'Contacto',
      subtitle: '¿Preguntas sobre CalpeTrip? Estamos encantados de ayudarte.',
      emailTitle: 'Correo electrónico',
      emailAddress: 'info@calpetrip.com',
      responseTitle: 'Tiempo de respuesta',
      responseText: 'En 48 horas en días laborables',
      holibotTitle: 'CalpeChat',
      holibotText: 'Para preguntas rápidas, chatea con CalpeChat',
      infoTitle: 'Otras formas de contactarnos',
      formTitle: 'Envíanos un Mensaje',
      thankYouTitle: '¡Gracias por tu mensaje!',
      thankYouText: 'Nos pondremos en contacto contigo lo antes posible.',
      nameLabel: 'Nombre',
      namePlaceholder: 'Tu nombre',
      emailLabel: 'Correo electrónico',
      emailPlaceholder: 'tu@email.com',
      subjectLabel: 'Asunto',
      subjectPlaceholder: 'Selecciona un asunto',
      subjectGeneral: 'Pregunta general',
      subjectBooking: 'Pregunta sobre reserva',
      subjectPartnership: 'Colaboración',
      subjectFeedback: 'Comentarios',
      subjectOther: 'Otro',
      messageLabel: 'Mensaje',
      messagePlaceholder: '¿Cómo podemos ayudarte?',
      submitButton: 'Enviar Mensaje',
    },
  };

  const calpe = calpeContent[language as keyof typeof calpeContent] || calpeContent.nl;

  // Get content with destination overrides
  const getContent = (key: string, fallback: string) => {
    if (destination.id !== 'texel' && calpe[key as keyof typeof calpe]) {
      return calpe[key as keyof typeof calpe];
    }
    return sp?.[key] || fallback;
  };
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual form submission
    console.log('Form submitted:', formData);
    setSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const contactEmail = destination.id !== 'texel' ? 'info@calpetrip.com' : (sp?.emailAddress || 'info@texelmaps.nl');

  return (
    <div className="static-page">
      <div className="static-page-hero">
        <div className="static-page-hero-content">
          <h1>{getContent('title', 'Contact')}</h1>
          <p>{getContent('subtitle', 'We staan klaar om je te helpen')}</p>
        </div>
      </div>

      <div className="static-page-content">
        <div className="static-section">
          <h2>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            {getContent('formTitle', 'Stuur ons een Bericht')}
          </h2>

          {submitted ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <svg
                style={{ width: '64px', height: '64px', color: '#30c59b', margin: '0 auto 1rem' }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <h3 style={{ color: '#1F2937', marginBottom: '0.5rem' }}>
                {getContent('thankYouTitle', 'Bedankt voor je bericht!')}
              </h3>
              <p style={{ color: '#6B7280' }}>
                {getContent('thankYouText', 'We nemen zo snel mogelijk contact met je op.')}
              </p>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">{getContent('nameLabel', 'Naam')}</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder={getContent('namePlaceholder', 'Je naam')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">{getContent('emailLabel', 'E-mail')}</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder={getContent('emailPlaceholder', 'je@email.com')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject">{getContent('subjectLabel', 'Onderwerp')}</label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                >
                  <option value="">{getContent('subjectPlaceholder', 'Selecteer een onderwerp')}</option>
                  <option value="general">{getContent('subjectGeneral', 'Algemene vraag')}</option>
                  <option value="booking">{getContent('subjectBooking', 'Vraag over boeking')}</option>
                  <option value="partnership">{getContent('subjectPartnership', 'Samenwerking')}</option>
                  <option value="feedback">{getContent('subjectFeedback', 'Feedback')}</option>
                  <option value="other">{getContent('subjectOther', 'Anders')}</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="message">{getContent('messageLabel', 'Bericht')}</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder={getContent('messagePlaceholder', 'Hoe kunnen we je helpen?')}
                  rows={5}
                />
              </div>

              <button type="submit" className="form-submit">
                {getContent('submitButton', 'Verstuur Bericht')}
              </button>
            </form>
          )}
        </div>

        {/* Contact Info */}
        <div className="static-section">
          <h2>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {getContent('infoTitle', 'Andere Manieren om Contact op te Nemen')}
          </h2>

          <div className="contact-info">
            <div className="contact-item">
              <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <div className="contact-item-content">
                <h4>{getContent('emailTitle', 'E-mail')}</h4>
                <p><a href={`mailto:${contactEmail}`}>{contactEmail}</a></p>
              </div>
            </div>

            <div className="contact-item">
              <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <div className="contact-item-content">
                <h4>{getContent('responseTitle', 'Reactietijd')}</h4>
                <p>{getContent('responseText', 'Binnen 24 uur op werkdagen')}</p>
              </div>
            </div>

            <div className="contact-item">
              <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <div className="contact-item-content">
                <h4>{getContent('holibotTitle', 'HoliBot')}</h4>
                <p>{getContent('holibotText', 'Voor snelle vragen, chat met HoliBot')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
