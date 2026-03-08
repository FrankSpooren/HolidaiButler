export interface TypographyLevel {
  fontSize?: string;
  fontWeight?: string;
  letterSpacing?: string;
  lineHeight?: string;
}

export interface ButtonVariant {
  bg?: string;
  text?: string;
  borderColor?: string;
  borderRadius?: string;
  hoverBg?: string;
  hoverText?: string;
}

export interface FooterColumn {
  type: string;
  title?: string | Record<string, string>;
  content?: string | Record<string, string>;
}

export interface FooterConfig {
  columns?: FooterColumn[];
  copyright?: string | Record<string, string>;
  showNewsletter?: boolean;
  showSocial?: boolean;
}

export interface TenantBranding {
  logo: string;
  logoDark?: string;
  favicon?: string;
  navicon?: string;
  payoff: Record<string, string>;
  contactEmail?: string;
  privacyPolicyUrl?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
  };
  fonts: {
    heading: string;
    body: string;
    headingUrl?: string;
    bodyUrl?: string;
    typography?: {
      h1?: TypographyLevel;
      h2?: TypographyLevel;
      h3?: TypographyLevel;
      h4?: TypographyLevel;
      body?: TypographyLevel;
      small?: TypographyLevel;
    };
  };
  style: {
    borderRadius: string;
    buttonStyle: string;
    spacingScale?: string;
    shadowIntensity?: string;
    imageStyle?: string;
    headingTextTransform?: string;
  };
  buttons?: {
    primary?: ButtonVariant;
    secondary?: ButtonVariant;
    outline?: ButtonVariant;
    ghost?: ButtonVariant;
    link?: ButtonVariant;
  };
  footer?: FooterConfig;
  brandVisuals?: string[];
}

export interface FeatureFlags {
  holibot?: boolean;
  ticketing?: boolean;
  reservations?: boolean;
  agenda?: boolean;
  reviews?: boolean;
  qna?: boolean;
  premium?: boolean;
  hasIntermediary?: boolean;
  hasFinancial?: boolean;
  hasChatToBook?: boolean;
  hasGuestCheckout?: boolean;
  [key: string]: boolean | undefined;
}

export interface TenantConfig {
  id: number;
  code: string;
  name: string;
  displayName: string;
  domain: string;
  country: string;
  region?: string;
  timezone: string;
  currency: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  featureFlags: FeatureFlags;
  branding: TenantBranding;
  config?: {
    nav_items?: Array<{
      label: Record<string, string> | string;
      href: string;
      featureFlag?: string;
      sortOrder?: number;
      isActive?: boolean;
    }>;
    [key: string]: unknown;
  };
  socialLinks?: Record<string, string>;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
}

export interface TenantMapping {
  slug: string;
  defaultLocale: string;
}
