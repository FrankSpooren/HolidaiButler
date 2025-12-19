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
      setMessage('Verificatietoken ontbreekt in de URL.');
      return;
    }

    // Verify email
    const verifyEmail = async () => {
      try {
        const { data } = await apiClient.get(`/auth/verify-email?token=${token}`);

        if (data.success) {
          if (data.alreadyVerified) {
            setStatus('already_verified');
          } else {
            setStatus('success');
          }
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.message || 'Verificatie mislukt');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(
          error.response?.data?.message ||
          'Er is een fout opgetreden bij de verificatie. Probeer het opnieuw of vraag een nieuwe verificatie-email aan.'
        );
      }
    };

    verifyEmail();
  }, [searchParams]);

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
                E-mail verifiëren...
              </h2>
              <p style={{ color: '#6B7280' }}>
                Even geduld, we controleren je verificatielink.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>
                ✅
              </div>
              <h2 style={{ color: '#059669', marginBottom: '12px' }}>
                E-mail geverifieerd!
              </h2>
              <p style={{ color: '#6B7280', marginBottom: '24px' }}>
                {message}
              </p>
              <Link to="/login" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none' }}>
                Ga naar inloggen
              </Link>
            </>
          )}

          {status === 'already_verified' && (
            <>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>
                ✓
              </div>
              <h2 style={{ color: '#2563EB', marginBottom: '12px' }}>
                Al geverifieerd
              </h2>
              <p style={{ color: '#6B7280', marginBottom: '24px' }}>
                {message}
              </p>
              <Link to="/login" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none' }}>
                Ga naar inloggen
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>
                ❌
              </div>
              <h2 style={{ color: '#DC2626', marginBottom: '12px' }}>
                Verificatie mislukt
              </h2>
              <p style={{ color: '#6B7280', marginBottom: '24px' }}>
                {message}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link to="/resend-verification" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none' }}>
                  Nieuwe verificatie-email aanvragen
                </Link>
                <Link to="/login" style={{ color: '#7FA594', textDecoration: 'none' }}>
                  Terug naar inloggen
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
