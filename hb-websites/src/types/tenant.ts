export interface TenantBranding {
  logo: string;
  logoDark?: string;
  favicon?: string;
  payoff: Record<string, string>;
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
  };
  style: {
    borderRadius: string;
    buttonStyle: string;
  };
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
  isActive: boolean;
}

export interface TenantMapping {
  slug: string;
  defaultLocale: string;
}
