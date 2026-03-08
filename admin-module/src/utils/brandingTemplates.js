/**
 * Design Templates for BrandingPage
 * 6 presets that fill the branding form with professional color/font/style combinations
 */

export const BRANDING_TEMPLATES = [
  {
    id: 'modern',
    name: { nl: 'Modern', en: 'Modern', de: 'Modern', es: 'Moderno' },
    description: { nl: 'Strak en hedendaags', en: 'Clean and contemporary', de: 'Klar und zeitgenössisch', es: 'Limpio y contemporáneo' },
    preview: { primary: '#3b82f6', secondary: '#8b5cf6', accent: '#06b6d4' },
    values: {
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        accent: '#06b6d4',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#0f172a',
        textMuted: '#64748b'
      },
      fonts: { heading: 'Inter', body: 'Inter' },
      style: { borderRadius: '12px', buttonStyle: 'rounded' }
    }
  },
  {
    id: 'classic',
    name: { nl: 'Klassiek', en: 'Classic', de: 'Klassisch', es: 'Clásico' },
    description: { nl: 'Tijdloos en betrouwbaar', en: 'Timeless and trustworthy', de: 'Zeitlos und vertrauenswürdig', es: 'Atemporal y confiable' },
    preview: { primary: '#1e3a5f', secondary: '#8b6f47', accent: '#b8860b' },
    values: {
      colors: {
        primary: '#1e3a5f',
        secondary: '#8b6f47',
        accent: '#b8860b',
        background: '#fefdfb',
        surface: '#faf8f5',
        text: '#1a1a1a',
        textMuted: '#6b7280'
      },
      fonts: { heading: 'Playfair Display', body: 'Source Sans 3' },
      style: { borderRadius: '4px', buttonStyle: 'square' }
    }
  },
  {
    id: 'elegant',
    name: { nl: 'Elegant', en: 'Elegant', de: 'Elegant', es: 'Elegante' },
    description: { nl: 'Luxueus en verfijnd', en: 'Luxurious and refined', de: 'Luxuriös und raffiniert', es: 'Lujoso y refinado' },
    preview: { primary: '#18181b', secondary: '#a16207', accent: '#ca8a04' },
    values: {
      colors: {
        primary: '#18181b',
        secondary: '#a16207',
        accent: '#ca8a04',
        background: '#fafafa',
        surface: '#f4f4f5',
        text: '#09090b',
        textMuted: '#71717a'
      },
      fonts: { heading: 'Playfair Display', body: 'Lato' },
      style: { borderRadius: '0px', buttonStyle: 'square' }
    }
  },
  {
    id: 'colorful',
    name: { nl: 'Kleurrijk', en: 'Colorful', de: 'Farbenfroh', es: 'Colorido' },
    description: { nl: 'Levendig en uitnodigend', en: 'Vibrant and inviting', de: 'Lebendig und einladend', es: 'Vibrante y acogedor' },
    preview: { primary: '#e11d48', secondary: '#7c3aed', accent: '#f59e0b' },
    values: {
      colors: {
        primary: '#e11d48',
        secondary: '#7c3aed',
        accent: '#f59e0b',
        background: '#ffffff',
        surface: '#fef2f2',
        text: '#1c1917',
        textMuted: '#78716c'
      },
      fonts: { heading: 'Poppins', body: 'Nunito' },
      style: { borderRadius: '16px', buttonStyle: 'pill' }
    }
  },
  {
    id: 'business',
    name: { nl: 'Zakelijk', en: 'Business', de: 'Geschäftlich', es: 'Empresarial' },
    description: { nl: 'Professioneel en zakelijk', en: 'Professional and corporate', de: 'Professionell und geschäftlich', es: 'Profesional y corporativo' },
    preview: { primary: '#0f766e', secondary: '#1d4ed8', accent: '#0284c7' },
    values: {
      colors: {
        primary: '#0f766e',
        secondary: '#1d4ed8',
        accent: '#0284c7',
        background: '#ffffff',
        surface: '#f0fdfa',
        text: '#134e4a',
        textMuted: '#5eead4'
      },
      fonts: { heading: 'Montserrat', body: 'Open Sans' },
      style: { borderRadius: '8px', buttonStyle: 'rounded' }
    }
  },
  {
    id: 'minimal',
    name: { nl: 'Minimaal', en: 'Minimal', de: 'Minimal', es: 'Minimalista' },
    description: { nl: 'Rustig en overzichtelijk', en: 'Calm and clean', de: 'Ruhig und übersichtlich', es: 'Tranquilo y limpio' },
    preview: { primary: '#525252', secondary: '#a3a3a3', accent: '#737373' },
    values: {
      colors: {
        primary: '#525252',
        secondary: '#a3a3a3',
        accent: '#737373',
        background: '#ffffff',
        surface: '#fafafa',
        text: '#171717',
        textMuted: '#a3a3a3'
      },
      fonts: { heading: 'DM Sans', body: 'DM Sans' },
      style: { borderRadius: '8px', buttonStyle: 'rounded' }
    }
  }
];
