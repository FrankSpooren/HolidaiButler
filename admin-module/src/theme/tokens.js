// Design System Tokens — Single Source of Truth
// Scope: alle admin-module styling. Componenten migreren geleidelijk.

export const tokens = {
  // Surfaces
  bg: {
    page: '#0D1B2A',
    panel: '#15293F',
    elevated: '#1E3550',
    overlay: 'rgba(13, 27, 42, 0.85)',
  },
  border: {
    subtle: '#2A3A4A',
    strong: '#3D5266',
    focus: '#02C39A',
  },
  // Brand
  brand: {
    teal: '#02C39A',       // Primary action
    tealDim: 'rgba(2, 195, 154, 0.15)',
    gold: '#F2C94C',       // Warnings, highlights
    goldDim: 'rgba(242, 201, 76, 0.12)',
  },
  // Semantic
  semantic: {
    success: '#27AE60',
    warning: '#F2C94C',
    error: '#E74C3C',
    info: '#3498DB',
  },
  // Text
  text: {
    primary: '#E8ECF1',
    secondary: '#B8C5D1',
    dim: '#8B9DB8',
    inverse: '#0D1B2A',
  },
  // Platform colors (social)
  platforms: {
    facebook: '#1877F2',
    instagram: '#E4405F',
    linkedin: '#0A66C2',
    youtube: '#FF0000',
    tiktok: '#000000',
    pinterest: '#BD081C',
    x: '#000000',
  },
  // Typography scale (desktop-first)
  type: {
    display: { size: 40, weight: 700, lineHeight: 1.2 },  // Page hero (1 per page)
    h1: { size: 32, weight: 700, lineHeight: 1.25 },      // Page title
    h2: { size: 24, weight: 700, lineHeight: 1.3 },       // Section header
    h3: { size: 20, weight: 600, lineHeight: 1.4 },       // Sub-section
    h4: { size: 16, weight: 600, lineHeight: 1.5 },       // Card title
    body: { size: 14, weight: 400, lineHeight: 1.6 },     // Default body (corporate = 14)
    bodyLg: { size: 16, weight: 400, lineHeight: 1.6 },   // Reading content
    small: { size: 13, weight: 400, lineHeight: 1.5 },    // Metadata
    micro: { size: 11, weight: 500, lineHeight: 1.4 },    // Labels, chips
  },
  // Spacing (8px grid)
  space: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64,
  },
  // Radius
  radius: {
    sm: 4, md: 8, lg: 12, xl: 16, pill: 999,
  },
  // Shadows (dark theme)
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 4px 12px rgba(0,0,0,0.35)',
    lg: '0 12px 32px rgba(0,0,0,0.4)',
    glow: '0 0 0 3px rgba(2, 195, 154, 0.25)',  // Focus ring
  },
  // Motion
  motion: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};
