import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useDestination } from '@/shared/contexts/DestinationContext';
import apiClient from '@/shared/utils/api';
import './Auth.css';

const BRAND_NAMES: Record<string, string> = {
  calpe: 'CALPETRIP',
  texel: 'TEXELMAPS',
};

const LABELS: Record<string, Record<string, string>> = {
  title:       { nl: 'Wachtwoord vergeten?', en: 'Forgot password?', de: 'Passwort vergessen?', es: '¿Olvidaste tu contraseña?' },
  subtitle:    { nl: 'Vul je e-mailadres in en we sturen je een link om je wachtwoord te herstellen.', en: 'Enter your email and we\'ll send you a link to reset your password.', de: 'Gib deine E-Mail ein und wir senden dir einen Link zum Zurücksetzen.', es: 'Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.' },
  emailLabel:  { nl: 'E-mailadres', en: 'Email address', de: 'E-Mail-Adresse', es: 'Correo electrónico' },
  emailPlace:  { nl: 'jouw@email.com', en: 'your@email.com', de: 'deine@email.com', es: 'tu@email.com' },
  submit:      { nl: 'Herstelmail versturen', en: 'Send reset email', de: 'Reset-E-Mail senden', es: 'Enviar correo de restablecimiento' },
  sending:     { nl: 'Versturen...', en: 'Sending...', de: 'Senden...', es: 'Enviando...' },
  successTitle:{ nl: 'Check je inbox!', en: 'Check your inbox!', de: 'Prüfe dein Postfach!', es: '¡Revisa tu bandeja!' },
  successMsg:  { nl: 'Als dit e-mailadres bij ons bekend is, ontvang je een e-mail met instructies om je wachtwoord te herstellen.', en: 'If this email address is registered with us, you\'ll receive an email with instructions to reset your password.', de: 'Wenn diese E-Mail bei uns registriert ist, erhältst du eine E-Mail mit Anweisungen.', es: 'Si este correo está registrado, recibirás un email con instrucciones.' },
  backToLogin: { nl: 'Terug naar inloggen', en: 'Back to login', de: 'Zurück zum Login', es: 'Volver a iniciar sesión' },
  errorEmpty:  { nl: 'Vul een e-mailadres in', en: 'Please enter an email address', de: 'Bitte E-Mail eingeben', es: 'Ingresa un correo electrónico' },
  errorGeneric:{ nl: 'Er ging iets mis. Probeer het later opnieuw.', en: 'Something went wrong. Please try again later.', de: 'Etwas ist schiefgelaufen. Bitte versuche es später erneut.', es: 'Algo salió mal. Inténtalo más tarde.' },
};

export function ForgotPasswordPage() {
  const { language } = useLanguage();
  const destination = useDestination();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const t = (key: string) => LABELS[key]?.[language] || LABELS[key]?.en || key;
  const brandName = BRAND_NAMES[destination.id] || destination.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError(t('errorEmpty'));
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      setSuccess(true);
    } catch {
      // Always show success to prevent email enumeration
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '2px', color: 'var(--color-primary, #7FA594)' }}>
              {brandName}
            </span>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📧</div>
            <h2 style={{ color: '#374151', marginBottom: '12px' }}>{t('successTitle')}</h2>
            <p style={{ color: '#6B7280', marginBottom: '24px', fontSize: '14px', lineHeight: 1.6 }}>
              {t('successMsg')}
            </p>
            <Link to="/login" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none' }}>
              {t('backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '2px', color: 'var(--color-primary, #7FA594)' }}>
            {brandName}
          </span>
          <h2 style={{ marginTop: '16px', fontSize: '20px', color: '#374151' }}>{t('title')}</h2>
          <p style={{ marginTop: '8px', fontSize: '14px', color: '#6B7280', lineHeight: 1.5 }}>{t('subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="forgot-email">{t('emailLabel')}</label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlace')}
              disabled={loading}
              autoFocus
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? t('sending') : t('submit')}
          </button>
        </form>

        <div className="auth-link" style={{ marginTop: '16px' }}>
          <Link to="/login">{t('backToLogin')}</Link>
        </div>
      </div>
    </div>
  );
}
