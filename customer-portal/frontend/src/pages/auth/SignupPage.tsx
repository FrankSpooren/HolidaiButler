import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '@/features/auth/services/authService';
import { useLanguage } from '@/i18n/LanguageContext';
import { useDestination } from '@/shared/contexts/DestinationContext';
import './Auth.css';

const BRAND_NAMES: Record<string, string> = {
  calpe: 'CALPETRIP',
  texel: 'TEXELMAPS',
};

// Password validation helper
const validatePassword = (password: string) => ({
  minLength: password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  number: /[0-9]/.test(password),
  special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
});

// Password requirement item component
const PasswordRequirement = ({ met, label }: { met: boolean; label: string }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: met ? '#059669' : '#6B7280',
    transition: 'color 0.2s ease',
  }}>
    <span style={{
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: met ? '#059669' : '#E5E7EB',
      color: met ? '#fff' : '#9CA3AF',
      fontSize: '12px',
      transition: 'all 0.2s ease',
    }}>
      {met ? '✓' : ''}
    </span>
    <span>{label}</span>
  </div>
);

/* ── Email domain suggestions ── */
const EMAIL_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'live.nl', 'ziggo.nl', 'kpnmail.nl'];

export function SignupPage() {
  const { t } = useLanguage();
  const destination = useDestination();
  const brandName = BRAND_NAMES[destination.id] || destination.name;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

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

  // Memoized password validation
  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const isPasswordValid = useMemo(() =>
    Object.values(passwordValidation).every(Boolean),
    [passwordValidation]
  );

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

    if (!isPasswordValid) {
      setError(t.auth.signup.errorPasswordTooShort);
      setLoading(false);
      return;
    }

    try {
      // Call authService to signup
      await authService.signup({ email, password, name });

      // Show success message - user needs to verify email
      setSignupSuccess(true);
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

  // Show success message after signup
  if (signupSuccess) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <span style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '2px', color: 'var(--color-primary, #7FA594)' }}>
              {brandName}
            </span>
          </div>

          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>
              📧
            </div>
            <h2 style={{ color: '#374151', marginBottom: '12px' }}>
              {t.auth.signup.verificationSent.title}
            </h2>
            <p style={{ color: '#6B7280', marginBottom: '8px' }}>
              {t.auth.signup.verificationSent.sentTo}
            </p>
            <p style={{ color: '#1e3a5f', fontWeight: '600', marginBottom: '24px' }}>
              {email}
            </p>
            <p style={{ color: '#6B7280', marginBottom: '24px', fontSize: '14px' }}>
              {t.auth.signup.verificationSent.instruction}
            </p>
            <Link to="/login" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none' }}>
              {t.auth.signup.verificationSent.goToLogin}
            </Link>
            <div className="auth-link" style={{ marginTop: '16px' }}>
              <Link to="/resend-verification">{t.auth.signup.verificationSent.noEmail}</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <span style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '2px', color: 'var(--color-primary, #7FA594)' }}>
            {brandName}
          </span>
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

          <div className="form-group" style={{ position: 'relative' }}>
            <label htmlFor="email">{t.auth.signup.emailLabel}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={() => setTimeout(() => setEmailSuggestions([]), 200)}
              placeholder={t.auth.signup.emailPlaceholder}
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
            <label htmlFor="password">{t.auth.signup.passwordLabel}</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setShowPasswordRequirements(true)}
                placeholder={t.auth.signup.passwordPlaceholder}
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

            {/* Password requirements - show when focused or has content */}
            {(showPasswordRequirements || password.length > 0) && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
              }}>
                <p style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                }}>
                  {t.auth.signup.passwordRequirements.title}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <PasswordRequirement
                    met={passwordValidation.minLength}
                    label={t.auth.signup.passwordRequirements.minLength}
                  />
                  <PasswordRequirement
                    met={passwordValidation.uppercase}
                    label={t.auth.signup.passwordRequirements.uppercase}
                  />
                  <PasswordRequirement
                    met={passwordValidation.lowercase}
                    label={t.auth.signup.passwordRequirements.lowercase}
                  />
                  <PasswordRequirement
                    met={passwordValidation.number}
                    label={t.auth.signup.passwordRequirements.number}
                  />
                  <PasswordRequirement
                    met={passwordValidation.special}
                    label={t.auth.signup.passwordRequirements.special}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t.auth.signup.confirmPasswordLabel}</label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.auth.signup.confirmPasswordPlaceholder}
                disabled={loading}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                  color: '#9CA3AF', fontSize: '18px',
                }}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
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
          <a href="https://dev.holidaibutler.com" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
            <span>🏠</span>
            <span>{t.auth.signup.backToHome}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
