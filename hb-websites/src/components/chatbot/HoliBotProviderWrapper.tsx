'use client';

import { HoliBotProvider } from './HoliBotContext';

/**
 * Client-side wrapper for HoliBotProvider.
 * Needed because layout.tsx is a Server Component and cannot use client-side Context directly.
 */
export default function HoliBotProviderWrapper({ children }: { children: React.ReactNode }) {
  return <HoliBotProvider>{children}</HoliBotProvider>;
}
