import { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import './StaticPage.css';

/**
 * ContactPage - Contact form and info
 * Route: /contact
 */
export function ContactPage() {
  const { t } = useLanguage();
  const sp = (t as any).staticPages?.contact;
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

  return (
    <div className="static-page">
      <div className="static-page-hero">
        <div className="static-page-hero-content">
          <h1>{sp?.title || 'Contact'}</h1>
          <p>{sp?.subtitle || 'We staan klaar om je te helpen'}</p>
        </div>
      </div>

      <div className="static-page-content">
        <div className="static-section">
          <h2>
            <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            {sp?.formTitle || 'Stuur ons een Bericht'}
          </h2>

          {submitted ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <svg
                style={{ width: '64px', height: '64px', color: '#7FA594', margin: '0 auto 1rem' }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <h3 style={{ color: '#1F2937', marginBottom: '0.5rem' }}>
                {sp?.thankYouTitle || 'Bedankt voor je bericht!'}
              </h3>
              <p style={{ color: '#6B7280' }}>
                {sp?.thankYouText || 'We nemen zo snel mogelijk contact met je op.'}
              </p>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">{sp?.nameLabel || 'Naam'}</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder={sp?.namePlaceholder || 'Je naam'}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">{sp?.emailLabel || 'E-mail'}</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder={sp?.emailPlaceholder || 'je@email.com'}
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject">{sp?.subjectLabel || 'Onderwerp'}</label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                >
                  <option value="">{sp?.subjectPlaceholder || 'Selecteer een onderwerp'}</option>
                  <option value="general">{sp?.subjectGeneral || 'Algemene vraag'}</option>
                  <option value="booking">{sp?.subjectBooking || 'Vraag over boeking'}</option>
                  <option value="partnership">{sp?.subjectPartnership || 'Samenwerking'}</option>
                  <option value="feedback">{sp?.subjectFeedback || 'Feedback'}</option>
                  <option value="other">{sp?.subjectOther || 'Anders'}</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="message">{sp?.messageLabel || 'Bericht'}</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder={sp?.messagePlaceholder || 'Hoe kunnen we je helpen?'}
                  rows={5}
                />
              </div>

              <button type="submit" className="form-submit">
                {sp?.submitButton || 'Verstuur Bericht'}
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
            {sp?.infoTitle || 'Andere Manieren om Contact op te Nemen'}
          </h2>

          <div className="contact-info">
            <div className="contact-item">
              <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <div className="contact-item-content">
                <h4>{sp?.emailTitle || 'E-mail'}</h4>
                <p><a href="mailto:info@holidaibutler.com">info@holidaibutler.com</a></p>
              </div>
            </div>

            <div className="contact-item">
              <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <div className="contact-item-content">
                <h4>{sp?.responseTitle || 'Reactietijd'}</h4>
                <p>{sp?.responseText || 'Binnen 24 uur op werkdagen'}</p>
              </div>
            </div>

            <div className="contact-item">
              <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <div className="contact-item-content">
                <h4>{sp?.holibotTitle || 'HoliBot'}</h4>
                <p>{sp?.holibotText || 'Voor snelle vragen, chat met HoliBot'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
