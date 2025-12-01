import { Link } from 'react-router';

/**
 * NotFoundPage - 404 Error Page
 *
 * Route: * (catch-all)
 * Layout: RootLayout
 * Auth: Public
 *
 * Shown when user navigates to invalid route
 */
export function NotFoundPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-holibot-primary">404</h1>
        <h2 className="text-3xl font-bold text-text-primary mt-4 mb-2">
          Page Not Found
        </h2>
        <p className="text-text-secondary mb-8">
          Sorry, we couldn't find the page you're looking for.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            to="/"
            className="px-6 py-3 bg-holibot-primary text-white rounded-lg font-semibold hover:bg-holibot-secondary transition-colors"
          >
            Go to Homepage
          </Link>
          <Link
            to="/pois"
            className="px-6 py-3 bg-white text-holibot-primary border-2 border-holibot-primary rounded-lg font-semibold hover:bg-holibot-primary hover:text-white transition-colors"
          >
            Browse POIs
          </Link>
        </div>
      </div>
    </div>
  );
}
