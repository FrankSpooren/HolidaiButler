import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '@/shared/utils/api';
import './Auth.css';

export function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email) {
      setError('Voer je e-mailadres in');
      setLoading(false);
      return;
    }

    try {
      const { data } = await apiClient.post('/auth/resend-verification', { email });

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Er is een fout opgetreden');
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Je hebt te veel verificatie-emails aangevraagd. Probeer het over een uur opnieuw.');
      } else {
        setError(err.response?.data?.message || 'Er is een fout opgetreden');
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
              Verificatie-email verzonden
            </h2>
            <p style={{ color: '#6B7280', marginBottom: '24px' }}>
              Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een verificatie-email.
              Controleer ook je spam folder.
            </p>
            <Link to="/login" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Terug naar inloggen
            </Link>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                📧
              </div>
              <h2 style={{ color: '#374151', margin: '0 0 8px 0' }}>
                Verificatie-email opnieuw verzenden
              </h2>
              <p style={{ color: '#6B7280', margin: 0 }}>
                Voer je e-mailadres in om een nieuwe verificatie-email te ontvangen.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">E-mailadres</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="naam@voorbeeld.nl"
                  disabled={loading}
                />
              </div>

              {error && <div className="form-error">{error}</div>}

              <button
                type="submit"
                className="auth-button"
                disabled={loading}
              >
                {loading ? 'Verzenden...' : 'Verzend verificatie-email'}
              </button>
            </form>

            <div className="auth-link" style={{ marginTop: '24px' }}>
              <Link to="/login">← Terug naar inloggen</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
