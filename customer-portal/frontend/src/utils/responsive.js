/**
 * Responsive Utilities
 * Helper functions and constants for responsive design
 */

/**
 * Breakpoint values (in pixels) - matches MUI breakpoints
 */
export const breakpoints = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
};

/**
 * Media query strings for use in CSS-in-JS
 */
export const media = {
  xs: `@media (min-width: ${breakpoints.xs}px)`,
  sm: `@media (min-width: ${breakpoints.sm}px)`,
  md: `@media (min-width: ${breakpoints.md}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  mobile: `@media (max-width: ${breakpoints.sm - 1}px)`,
  tablet: `@media (min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.md - 1}px)`,
  desktop: `@media (min-width: ${breakpoints.md}px)`,
};

/**
 * Common responsive spacing values
 * Usage: px={{ xs: spacing.page.xs, sm: spacing.page.sm }}
 */
export const spacing = {
  page: {
    xs: 2,    // 16px
    sm: 3,    // 24px
    md: 4,    // 32px
    lg: 6,    // 48px
  },
  section: {
    xs: 4,    // 32px
    sm: 6,    // 48px
    md: 8,    // 64px
  },
  card: {
    xs: 2,
    sm: 2.5,
    md: 3,
  },
};

/**
 * Common responsive font sizes
 * Usage: fontSize={{ xs: fontSizes.h1.xs, sm: fontSizes.h1.sm }}
 */
export const fontSizes = {
  h1: {
    xs: '1.75rem',   // 28px
    sm: '2.25rem',   // 36px
    md: '3rem',      // 48px
  },
  h2: {
    xs: '1.5rem',    // 24px
    sm: '1.875rem',  // 30px
    md: '2.25rem',   // 36px
  },
  h3: {
    xs: '1.25rem',   // 20px
    sm: '1.5rem',    // 24px
    md: '1.75rem',   // 28px
  },
  body: {
    xs: '0.875rem',  // 14px
    sm: '1rem',      // 16px
  },
};

/**
 * Grid configuration for responsive layouts
 */
export const gridColumns = {
  cards: {
    xs: 12,   // 1 column
    sm: 6,    // 2 columns
    md: 4,    // 3 columns
    lg: 3,    // 4 columns
  },
  sidebar: {
    main: { xs: 12, md: 8, lg: 9 },
    side: { xs: 12, md: 4, lg: 3 },
  },
};

/**
 * Container max widths
 */
export const containerWidths = {
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1400,
};

/**
 * Touch-friendly sizes
 */
export const touchTargets = {
  minimum: 44,  // Apple's HIG minimum
  comfortable: 48,
  large: 56,
};

/**
 * Check if device is mobile based on viewport width
 * Use MUI's useMediaQuery hook instead when possible
 */
export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < breakpoints.sm;
};

/**
 * Check if device is tablet
 */
export const isTablet = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= breakpoints.sm && window.innerWidth < breakpoints.md;
};

/**
 * Check if device is desktop
 */
export const isDesktop = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= breakpoints.md;
};

/**
 * Get responsive value based on breakpoint
 * @param {Object} values - Object with breakpoint keys
 * @returns {*} The value for current breakpoint
 */
export const getResponsiveValue = (values) => {
  if (typeof window === 'undefined') return values.xs;

  const width = window.innerWidth;
  if (width >= breakpoints.xl && values.xl) return values.xl;
  if (width >= breakpoints.lg && values.lg) return values.lg;
  if (width >= breakpoints.md && values.md) return values.md;
  if (width >= breakpoints.sm && values.sm) return values.sm;
  return values.xs;
};

/**
 * Common responsive sx props for hiding elements
 */
export const hideOnMobile = { display: { xs: 'none', sm: 'block' } };
export const hideOnDesktop = { display: { xs: 'block', md: 'none' } };
export const showOnlyOnMobile = { display: { xs: 'block', sm: 'none' } };
export const showOnlyOnDesktop = { display: { xs: 'none', md: 'block' } };

/**
 * Common responsive flex layouts
 */
export const responsiveFlex = {
  column: { flexDirection: { xs: 'column', md: 'row' } },
  columnReverse: { flexDirection: { xs: 'column-reverse', md: 'row' } },
  rowOnMobile: { flexDirection: { xs: 'row', md: 'row' } },
};
