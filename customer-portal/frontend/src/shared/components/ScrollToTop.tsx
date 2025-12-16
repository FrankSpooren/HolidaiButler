import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * ScrollToTop - Scrolls to top on route change
 *
 * Place this component inside your router to ensure
 * pages always start at the top when navigating.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default ScrollToTop;
