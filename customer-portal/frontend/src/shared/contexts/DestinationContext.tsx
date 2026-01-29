/**
 * DestinationContext - Provides destination-specific configuration throughout the app
 *
 * The config is injected at build time via __DESTINATION_CONFIG__ in vite.config.ts
 * This ensures each destination build has the correct branding, colors, and content.
 */

import { createContext, useContext, ReactNode, useEffect } from 'react';

// Type definition for destination config
export interface DestinationConfig {
  id: string;
  destinationId: number;
  name: string;
  tagline: string;
  description: string;
  domain: string;
  icon: string;
  heroImage: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  languages: string[];
  defaultLanguage: string;
  // Category configuration for destination-specific filtering
  categories: {
    enabled: string[];      // Categories to show in menu (by id)
    excluded: string[];     // Categories excluded from menu
    presentation: string[]; // Categories for default browse view (full names)
  };
  colors: {
    primary: string;
    secondary: string;
    tertiary: string;
    accent: string;
    headerGradient: string;
    heroOverlay: string;
  };
  hero: {
    title: string;
    subtitle: string;
    description: string;
  };
}

// Declare the global type for __DESTINATION_CONFIG__
declare global {
  const __DESTINATION_CONFIG__: DestinationConfig;
}

// Get the config from build-time injection
const destinationConfig: DestinationConfig = __DESTINATION_CONFIG__;

// Create context
const DestinationContext = createContext<DestinationConfig>(destinationConfig);

// Provider component
interface DestinationProviderProps {
  children: ReactNode;
}

export function DestinationProvider({ children }: DestinationProviderProps) {
  // Apply CSS variables on mount
  useEffect(() => {
    const root = document.documentElement;
    const { colors } = destinationConfig;

    // Set CSS custom properties for destination colors
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-tertiary', colors.tertiary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--header-gradient', colors.headerGradient);
    root.style.setProperty('--hero-overlay', colors.heroOverlay);

    // Also set Tailwind-compatible CSS variables
    root.style.setProperty('--tw-color-brand-primary', colors.primary);
    root.style.setProperty('--tw-color-brand-secondary', colors.secondary);
    root.style.setProperty('--tw-color-brand-accent', colors.accent);
  }, []);

  return (
    <DestinationContext.Provider value={destinationConfig}>
      {children}
    </DestinationContext.Provider>
  );
}

// Hook for consuming the context
export function useDestination(): DestinationConfig {
  const context = useContext(DestinationContext);
  if (!context) {
    throw new Error('useDestination must be used within a DestinationProvider');
  }
  return context;
}

// Direct access to config (for use outside React components)
export function getDestinationConfig(): DestinationConfig {
  return destinationConfig;
}

// Helper to check if we're on a specific destination
export function isDestination(id: string): boolean {
  return destinationConfig.id === id;
}

export default DestinationContext;
