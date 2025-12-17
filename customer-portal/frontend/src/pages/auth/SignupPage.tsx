import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '@/features/auth/services/authService';
import { useLanguage } from '@/i18n/LanguageContext';
import './Auth.css';

export function SignupPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!name || !email || !password || !confirmPassword) {
      setError(t.auth.signup.errorFillFields);
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.auth.signup.errorPasswordMismatch);
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError(t.auth.signup.errorPasswordTooShort);
      setLoading(false);
      return;
    }

    try {
      // Call authService to signup
      await authService.signup({ email, password, name });

      // Navigate to onboarding flow after successful signup
      navigate('/onboarding');
    } catch (err: any) {
      // Handle different error types
      if (err.response?.status === 409) {
        setError(t.auth.signup.errorEmailExists);
      } else if (err.response?.data?.error?.message) {
        setError(err.response.data.error.message);
      } else {
        setError(t.auth.signup.errorGeneric);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          {/* Butler with compass logo */}
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
          <p style={{ marginTop: '12px' }}>{t.auth.signup.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">{t.auth.signup.nameLabel}</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.auth.signup.namePlaceholder}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">{t.auth.signup.emailLabel}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.auth.signup.emailPlaceholder}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t.auth.signup.passwordLabel}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.auth.signup.passwordPlaceholder}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t.auth.signup.confirmPasswordLabel}</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.auth.signup.confirmPasswordPlaceholder}
              disabled={loading}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? t.auth.signup.signingUp : t.auth.signup.signUpButton}
          </button>
        </form>

        <div className="auth-link">
          {t.auth.signup.haveAccount} <Link to="/login">{t.auth.signup.signIn}</Link>
        </div>

        {/* Back to Home Link */}
        <div className="auth-link" style={{ marginTop: '16px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span>🏠</span>
            <span>{t.auth.signup.backToHome}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
