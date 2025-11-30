import { redirect } from 'react-router';
import { useAuthStore } from '../../features/auth/stores/authStore';

/**
 * protectedLoader - Route loader for protected routes
 *
 * Checks if user is authenticated before allowing access.
 * If not authenticated, redirects to /login with returnUrl.
 *
 * Usage in route config:
 * {
 *   path: '/account',
 *   element: <AccountDashboard />,
 *   loader: protectedLoader
 * }
 */
export async function protectedLoader({ request }: { request: Request}) {
  // Check localStorage for access token (in case store not hydrated yet)
  const accessToken = localStorage.getItem('accessToken');

  // Check auth store state
  const { isAuthenticated } = useAuthStore.getState();

  // If no token or not authenticated, redirect to login
  if (!accessToken || !isAuthenticated) {
    // Redirect to login with return URL
    const url = new URL(request.url);
    const returnUrl = url.pathname + url.search;

    throw redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  return null;
}
