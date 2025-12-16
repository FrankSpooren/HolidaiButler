import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '@/features/auth/services/authService';
import { useLanguage } from '@/i18n/LanguageContext';
import './Auth.css';

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!email || !password) {
      setError(t.auth.login.errorFillFields);
      setLoading(false);
      return;
    }

    try {
      // Call authService to login
      await authService.login({ email, password });

      // Get return URL from query params (if exists)
      const returnUrl = searchParams.get('returnUrl') || '/account';

      // Navigate to return URL or account page after successful login
      navigate(returnUrl);
    } catch (err: any) {
      // Handle different error types
      if (err.response?.status === 401) {
        setError(t.auth.login.errorInvalidCredentials);
      } else if (err.response?.data?.error?.message) {
        setError(err.response.data.error.message);
      } else {
        setError(t.auth.login.errorGeneric);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          {/* Logo SVG with brand icon + text */}
          <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" style={{ width: '200px', height: '125px', margin: '0 auto' }}>
            <g transform="translate(200, 70) scale(1.3)">
              <path d="M -60,30 Q -30,10 0,30 Q 30,50 60,30" stroke="#5E8B7E" strokeWidth="3" fill="none"/>
              <path d="M -60,40 Q -30,20 0,40 Q 30,60 60,40" stroke="#5E8B7E" strokeWidth="2" fill="none" opacity="0.6"/>
              <circle cx="0" cy="0" r="35" fill="none" stroke="#5E8B7E" strokeWidth="2" strokeDasharray="4,2"/>
              <g fill="#D4AF37">
                <polygon points="0,-50 -6,-15 -20,-15 -10,-5 -15,10 0,0 15,10 10,-5 20,-15 6,-15" />
              </g>
              <g fill="#D4AF37" opacity="0.7">
                <circle cx="0" cy="-35" r="2"/>
                <circle cx="35" cy="0" r="2"/>
                <circle cx="0" cy="35" r="2"/>
                <circle cx="-35" cy="0" r="2"/>
              </g>
              <circle cx="0" cy="0" r="3" fill="#5E8B7E"/>
              <circle cx="0" cy="0" r="1.5" fill="#D4AF37"/>
            </g>
            <text x="200" y="205" textAnchor="middle" fill="#5E8B7E" fontFamily="'Inter', sans-serif" fontSize="30" fontWeight="600">HolidaiButler</text>
          </svg>
          <p style={{ marginTop: '12px' }}>{t.auth.login.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">{t.auth.login.emailLabel}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.auth.login.emailPlaceholder}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t.auth.login.passwordLabel}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.auth.login.passwordPlaceholder}
              disabled={loading}
            />
            <div className="forgot-password">
              <Link to="/forgot-password">{t.auth.login.forgotPassword}</Link>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? t.auth.login.signingIn : t.auth.login.signInButton}
          </button>
        </form>

        <div className="auth-link">
          {t.auth.login.noAccount} <Link to="/signup">{t.auth.login.signUp}</Link>
        </div>

        {/* Back to Home Link */}
        <div className="auth-link" style={{ marginTop: '16px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span>🏠</span>
            <span>{t.auth.login.backToHome}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
