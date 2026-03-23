import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '@/features/auth/services/authService';
import { useLanguage } from '@/i18n/LanguageContext';
import { useDestination } from '@/shared/contexts/DestinationContext';
import './Auth.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || '';

/* ── Email domain suggestions ── */
const EMAIL_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'live.nl', 'ziggo.nl', 'kpnmail.nl'];

const BRAND_NAMES: Record<string, string> = {
  calpe: 'CALPETRIP',
  texel: 'TEXELMAPS',
};

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const destination = useDestination();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const brandName = BRAND_NAMES[destination.id] || destination.name;
  const [socialLoading, setSocialLoading] = useState(false);

  // Google Sign-In handler
  const handleGoogleLogin = useCallback(async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    setSocialLoading(true);
    setError('');
    try {
      await authService.loginWithGoogle(credentialResponse.credential);
      const returnUrl = searchParams.get('returnUrl') || '/account';
      navigate(returnUrl);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google login mislukt. Probeer opnieuw.');
    } finally {
      setSocialLoading(false);
    }
  }, [navigate, searchParams]);

  // Facebook Login — redirect-based flow (works on all mobile browsers)
  const triggerFacebookLogin = useCallback(() => {
    if (!FACEBOOK_APP_ID) {
      setError('Facebook login is nog niet geconfigureerd.');
      return;
    }
    // Store return URL for after Facebook redirect
    const returnUrl = searchParams.get('returnUrl') || '/account';
    sessionStorage.setItem('fb_login_return', returnUrl);
    // Redirect to Facebook OAuth dialog
    const redirectUri = encodeURIComponent(`${window.location.origin}/login`);
    window.location.href = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${redirectUri}&scope=email,public_profile&response_type=token`;
  }, [searchParams]);

  // Handle Facebook OAuth redirect callback (token in URL hash)
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('access_token=')) return;
    const params = new URLSearchParams(hash.replace('#', ''));
    const fbAccessToken = params.get('access_token');
    if (!fbAccessToken) return;

    // Clean URL hash
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    setSocialLoading(true);
    setError('');
    (async () => {
      try {
        await authService.loginWithFacebook(fbAccessToken);
        const returnUrl = sessionStorage.getItem('fb_login_return') || '/account';
        sessionStorage.removeItem('fb_login_return');
        navigate(returnUrl);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Facebook login mislukt. Probeer opnieuw.');
      } finally {
        setSocialLoading(false);
      }
    })();
  }, [navigate]);

  // Load Google Identity Services SDK
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    // Skip if already loaded
    if (document.getElementById('google-gsi-script')) return;

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      (window as any).google?.accounts?.id?.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleLogin,
        auto_select: false,
      });
    };
    document.head.appendChild(script);
  }, [handleGoogleLogin]);

  const triggerGoogleLogin = () => {
    (window as any).google?.accounts?.id?.prompt();
  };

  // Generate email domain suggestions after @ sign
  const handleEmailChange = (value: string) => {
    setEmail(value);
    const atIdx = value.indexOf('@');
    if (atIdx > 0 && atIdx < value.length - 1) {
      const typed = value.slice(atIdx + 1).toLowerCase();
      const matches = EMAIL_DOMAINS.filter(d => d.startsWith(typed) && d !== typed);
      setEmailSuggestions(matches.map(d => value.slice(0, atIdx + 1) + d));
    } else if (atIdx === value.length - 1) {
      setEmailSuggestions(EMAIL_DOMAINS.map(d => value + d));
    } else {
      setEmailSuggestions([]);
    }
  };

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
          <span style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '2px', color: 'var(--color-primary, #7FA594)' }}>
            {brandName}
          </span>
          <p style={{ marginTop: '12px' }}>{t.auth.login.subtitle}</p>
        </div>

        {!requires2FA ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group" style={{ position: 'relative' }}>
              <label htmlFor="email">{t.auth.login.emailLabel}</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => setTimeout(() => setEmailSuggestions([]), 200)}
                placeholder={t.auth.login.emailPlaceholder}
                disabled={loading}
                autoComplete="email"
              />
              {emailSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: 'white', border: '1px solid #E5E7EB', borderRadius: '0 0 8px 8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 180, overflowY: 'auto',
                }}>
                  {emailSuggestions.slice(0, 5).map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => { setEmail(suggestion); setEmailSuggestions([]); }}
                      style={{
                        display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left',
                        border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: '#374151',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = '#F3F4F6')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">{t.auth.login.passwordLabel}</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.login.passwordPlaceholder}
                  disabled={loading}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                    color: '#9CA3AF', fontSize: '18px',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
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
              className="auth-back-link"
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
                disabled={socialLoading || loading}
                onClick={triggerGoogleLogin}
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
                className="social-button facebook"
                disabled={socialLoading || loading || !FACEBOOK_APP_ID}
                onClick={triggerFacebookLogin}
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
              <a href="https://dev.holidaibutler.com" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
                <span>🏠</span>
                <span>{t.auth.login.backToHome}</span>
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
