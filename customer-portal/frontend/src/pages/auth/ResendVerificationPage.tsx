import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import apiClient from '@/shared/utils/api';
import './Auth.css';

export function ResendVerificationPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email) {
      setError(t.auth.resendVerification.errorEmpty);
      setLoading(false);
      return;
    }

    try {
      const { data } = await apiClient.post('/auth/resend-verification', { email });

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || t.auth.resendVerification.errorGeneric);
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError(t.auth.resendVerification.errorTooMany);
      } else {
        setError(err.response?.data?.message || t.auth.resendVerification.errorGeneric);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{
            width: '200px',
            height: '125px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img
              src="/assets/images/hb-logo-homepage.png"
              alt="HolidaiButler"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>
              📧
            </div>
            <h2 style={{ color: '#374151', marginBottom: '12px' }}>
              {t.auth.resendVerification.success}
            </h2>
            <p style={{ color: '#6B7280', marginBottom: '24px' }}>
              {t.auth.resendVerification.successMessage}
            </p>
            <Link to="/login" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none' }}>
              {t.auth.resendVerification.backToLogin}
            </Link>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                📧
              </div>
              <h2 style={{ color: '#374151', margin: '0 0 8px 0' }}>
                {t.auth.resendVerification.title}
              </h2>
              <p style={{ color: '#6B7280', margin: 0 }}>
                {t.auth.resendVerification.subtitle}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">{t.auth.resendVerification.emailLabel}</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.auth.resendVerification.emailPlaceholder}
                  disabled={loading}
                />
              </div>

              {error && <div className="form-error">{error}</div>}

              <button
                type="submit"
                className="auth-button"
                disabled={loading}
              >
                {loading ? t.auth.resendVerification.sending : t.auth.resendVerification.sendButton}
              </button>
            </form>

            <div className="auth-link" style={{ marginTop: '24px' }}>
              <Link to="/login">{t.auth.resendVerification.backToLogin}</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
