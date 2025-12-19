import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '@/features/auth/services/authService';
import { useLanguage } from '@/i18n/LanguageContext';
import './Auth.css';

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

export function SignupPage() {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

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
              onFocus={() => setShowPasswordRequirements(true)}
              placeholder={t.auth.signup.passwordPlaceholder}
              disabled={loading}
            />

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
