import type { TenantBranding } from '@/types/tenant';
import type { CSSProperties } from 'react';

const RADIUS_MAP: Record<string, string> = {
  'rounded-sm': '0.125rem',
  'rounded': '0.25rem',
  'rounded-md': '0.375rem',
  'rounded-lg': '0.5rem',
  'rounded-xl': '0.75rem',
  'rounded-2xl': '1rem',
  'rounded-3xl': '1.5rem',
  'rounded-full': '9999px',
};

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0xff) - Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function contrastColor(hex: string): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1C1917' : '#FFFFFF';
}

export function brandingToCssVars(branding: TenantBranding): CSSProperties {
  const { colors, fonts, style } = branding;
  const radius = RADIUS_MAP[style.borderRadius] ?? '0.75rem';
  const typo = fonts.typography;

  return {
    '--hb-primary': colors.primary,
    '--hb-primary-light': lighten(colors.primary, 0.35),
    '--hb-primary-dark': darken(colors.primary, 0.15),
    '--hb-on-primary': contrastColor(colors.primary),
    '--hb-secondary': colors.secondary,
    '--hb-accent': colors.accent,
    '--hb-background': colors.background,
    '--hb-surface': colors.surface,
    '--hb-text': colors.text,
    '--hb-text-muted': colors.textMuted,
    '--hb-font-heading': fonts.heading,
    '--hb-font-body': fonts.body,
    '--hb-radius': radius,
    // Typography hierarchy
    '--hb-h1-size': typo?.h1?.fontSize || '3rem',
    '--hb-h1-weight': typo?.h1?.fontWeight || '700',
    '--hb-h1-spacing': typo?.h1?.letterSpacing || '-0.02em',
    '--hb-h1-height': typo?.h1?.lineHeight || '1.1',
    '--hb-h2-size': typo?.h2?.fontSize || '2.25rem',
    '--hb-h2-weight': typo?.h2?.fontWeight || '700',
    '--hb-h2-spacing': typo?.h2?.letterSpacing || '-0.01em',
    '--hb-h2-height': typo?.h2?.lineHeight || '1.2',
    '--hb-h3-size': typo?.h3?.fontSize || '1.75rem',
    '--hb-h3-weight': typo?.h3?.fontWeight || '600',
    '--hb-h3-spacing': typo?.h3?.letterSpacing || '0',
    '--hb-h3-height': typo?.h3?.lineHeight || '1.3',
    '--hb-h4-size': typo?.h4?.fontSize || '1.25rem',
    '--hb-h4-weight': typo?.h4?.fontWeight || '600',
    '--hb-h4-spacing': typo?.h4?.letterSpacing || '0',
    '--hb-h4-height': typo?.h4?.lineHeight || '1.4',
    '--hb-body-size': typo?.body?.fontSize || '1rem',
    '--hb-body-weight': typo?.body?.fontWeight || '400',
    '--hb-body-height': typo?.body?.lineHeight || '1.6',
    '--hb-small-size': typo?.small?.fontSize || '0.875rem',
    '--hb-small-weight': typo?.small?.fontWeight || '400',
    '--hb-small-height': typo?.small?.lineHeight || '1.5',
  } as CSSProperties;
}
