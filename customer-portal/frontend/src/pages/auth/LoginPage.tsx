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

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingToken, setPendingToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

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
      const response = await authService.login({ email, password });

      // Check if 2FA is required
      if (response.requires2FA && response.pendingToken) {
        setRequires2FA(true);
        setPendingToken(response.pendingToken);
        setLoading(false);
        return;
      }

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
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(t.auth.login.errorGeneric);
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!twoFactorCode || twoFactorCode.length !== 6) {
      setError('Voer een geldige 6-cijferige code in');
      setLoading(false);
      return;
    }

    try {
      await authService.validate2FA(twoFactorCode, pendingToken);

      // Get return URL from query params (if exists)
      const returnUrl = searchParams.get('returnUrl') || '/account';

      // Navigate to return URL or account page after successful login
      navigate(returnUrl);
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Ongeldige verificatiecode. Probeer opnieuw.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setRequires2FA(false);
    setPendingToken('');
    setTwoFactorCode('');
    setError('');
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

        {!requires2FA ? (
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
        ) : (
          <form onSubmit={handle2FASubmit} className="auth-form">
            <div className="twofa-login-header" style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔐</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>Twee-Factor Authenticatie</h3>
              <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>
                Voer de 6-cijferige code uit je authenticator app in
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="twoFactorCode">Verificatiecode</label>
              <input
                id="twoFactorCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                disabled={loading}
                autoFocus
                style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }}
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <button
              type="submit"
              className="auth-button"
              disabled={loading || twoFactorCode.length !== 6}
            >
              {loading ? 'Verifiëren...' : 'Verifiëren'}
            </button>

            <button
              type="button"
              onClick={handleBack}
              style={{
                background: 'none',
                border: 'none',
                color: '#7FA594',
                cursor: 'pointer',
                marginTop: '12px',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              ← Terug naar inloggen
            </button>
          </form>
        )}

        {/* Hide social login and links when in 2FA mode */}
        {!requires2FA && (
          <>
            {/* Social Login Divider */}
            <div className="social-divider">
              <span>of log in met</span>
            </div>

            {/* Social Login Buttons */}
            <div className="social-buttons">
              <button
                type="button"
                className="social-button google"
                onClick={() => {
                  // TODO: Implement Google OAuth
                  alert('Google login wordt binnenkort beschikbaar');
                }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                className="social-button apple"
                onClick={() => {
                  // TODO: Implement Apple Sign In
                  alert('Apple login wordt binnenkort beschikbaar');
                }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <span>Apple</span>
              </button>

              <button
                type="button"
                className="social-button facebook"
                onClick={() => {
                  // TODO: Implement Facebook OAuth
                  alert('Facebook login wordt binnenkort beschikbaar');
                }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Facebook</span>
              </button>
            </div>

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
          </>
        )}
      </div>
    </div>
  );
}
