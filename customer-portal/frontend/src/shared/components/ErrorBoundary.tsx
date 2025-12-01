import { useRouteError, isRouteErrorResponse, Link } from 'react-router';

/**
 * ErrorBoundary - Custom error boundary component for React Router v7
 *
 * Provides a better UX than the default error screen
 * Catches routing errors and application errors
 */
export function ErrorBoundary() {
  const error = useRouteError();

  // Check if it's a route error response (404, 500, etc)
  if (isRouteErrorResponse(error)) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #F9FAFB 0%, #E5E7EB 100%)',
        padding: '20px',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '48px',
          maxWidth: '600px',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>
            {error.status === 404 ? '🗺️' : '⚠️'}
          </div>
          <h1 style={{
            fontSize: '48px',
            fontWeight: '900',
            color: '#1F2937',
            marginBottom: '16px',
            fontFamily: 'Inter, sans-serif',
          }}>
            {error.status}
          </h1>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#4B5563',
            marginBottom: '16px',
            fontFamily: 'Inter, sans-serif',
          }}>
            {error.statusText || 'Something went wrong'}
          </h2>
          {error.status === 404 && (
            <p style={{
              fontSize: '16px',
              color: '#6B7280',
              marginBottom: '32px',
              fontFamily: 'Inter, sans-serif',
            }}>
              The page you're looking for doesn't exist or has been moved.
            </p>
          )}
          <Link
            to="/"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #7FA594, #5E8B7E)',
              color: 'white',
              padding: '14px 32px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '16px',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(127, 165, 148, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            🏠 Back to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Generic error (JavaScript errors, etc.)
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : null;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #F9FAFB 0%, #E5E7EB 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '48px',
        maxWidth: '800px',
        width: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px', textAlign: 'center' }}>
          ⚠️
        </div>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '900',
          color: '#1F2937',
          marginBottom: '16px',
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif',
        }}>
          Oops! Something went wrong
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6B7280',
          marginBottom: '24px',
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif',
        }}>
          We encountered an unexpected error. Please try again or return to the homepage.
        </p>

        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#991B1B',
            marginBottom: '8px',
            fontFamily: 'Inter, sans-serif',
          }}>
            Error Details:
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#7F1D1D',
            fontFamily: 'monospace',
            wordBreak: 'break-word',
          }}>
            {errorMessage}
          </p>
          {errorStack && (
            <details style={{ marginTop: '12px' }}>
              <summary style={{
                cursor: 'pointer',
                fontSize: '12px',
                color: '#991B1B',
                fontFamily: 'Inter, sans-serif',
              }}>
                Stack Trace
              </summary>
              <pre style={{
                marginTop: '8px',
                fontSize: '11px',
                color: '#7F1D1D',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '200px',
                overflow: 'auto',
              }}>
                {errorStack}
              </pre>
            </details>
          )}
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(135deg, #7FA594, #5E8B7E)',
              color: 'white',
              padding: '14px 32px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '600',
              fontSize: '16px',
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(127, 165, 148, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            🔄 Try Again
          </button>
          <Link
            to="/"
            style={{
              display: 'inline-block',
              background: 'white',
              color: '#7FA594',
              border: '2px solid #7FA594',
              padding: '14px 32px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '16px',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#F3F4F6';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'white';
            }}
          >
            🏠 Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
