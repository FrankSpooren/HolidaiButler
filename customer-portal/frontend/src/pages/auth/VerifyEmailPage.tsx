import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import apiClient from '@/shared/utils/api';
import './Auth.css';

type VerificationStatus = 'loading' | 'success' | 'error' | 'already_verified';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage(t.auth.verifyEmail.failedMessage);
      return;
    }

    // Verify email
    const verifyEmail = async () => {
      try {
        const { data } = await apiClient.get(`/auth/verify-email?token=${token}`);

        if (data.success) {
          if (data.alreadyVerified) {
            setStatus('already_verified');
            setMessage(t.auth.verifyEmail.alreadyVerifiedMessage);
          } else {
            setStatus('success');
            setMessage(t.auth.verifyEmail.successMessage);
          }
        } else {
          setStatus('error');
          setMessage(data.message || t.auth.verifyEmail.failedMessage);
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(
          error.response?.data?.message || t.auth.verifyEmail.failedMessage
        );
      }
    };

    verifyEmail();
  }, [searchParams, t]);

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
          {status === 'loading' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>
                <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
              </div>
              <h2 style={{ color: '#374151', marginBottom: '12px' }}>
                {t.auth.verifyEmail.verifying}
              </h2>
              <p style={{ color: '#6B7280' }}>
                {t.auth.verifyEmail.verifyingText}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>
                ✅
              </div>
              <h2 style={{ color: '#059669', marginBottom: '12px' }}>
                {t.auth.verifyEmail.success}
              </h2>
              <p style={{ color: '#6B7280', marginBottom: '24px' }}>
                {message}
              </p>
              <Link to="/login" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none' }}>
                {t.auth.verifyEmail.goToLogin}
              </Link>
            </>
          )}

          {status === 'already_verified' && (
            <>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>
                ✓
              </div>
              <h2 style={{ color: '#2563EB', marginBottom: '12px' }}>
                {t.auth.verifyEmail.alreadyVerified}
              </h2>
              <p style={{ color: '#6B7280', marginBottom: '24px' }}>
                {message}
              </p>
              <Link to="/login" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none' }}>
                {t.auth.verifyEmail.goToLogin}
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>
                ❌
              </div>
              <h2 style={{ color: '#DC2626', marginBottom: '12px' }}>
                {t.auth.verifyEmail.failed}
              </h2>
              <p style={{ color: '#6B7280', marginBottom: '24px' }}>
                {message}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link to="/resend-verification" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none' }}>
                  {t.auth.verifyEmail.requestNew}
                </Link>
                <Link to="/login" style={{ color: '#7FA594', textDecoration: 'none' }}>
                  {t.auth.verifyEmail.backToLogin}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
