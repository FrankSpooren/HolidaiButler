/**
 * CTASection - Call-to-Action buttons
 *
 * Features:
 * - Multi-destination aware
 * - Two prominent CTA buttons
 * - "Ontdek [Destination]" (primary) and "Agenda" (secondary)
 * - Uses CSS variables for destination colors
 */

import { Link } from 'react-router';
import { useDestination } from '@/shared/contexts/DestinationContext';

export function CTASection() {
  const destination = useDestination();

  return (
    <section className="bg-white py-6 text-center">
      <div className="max-w-4xl mx-auto px-5">
        <div className="flex gap-4 justify-center items-center">
          {/* Explore Button - PRIMARY (uses destination color) */}
          <Link
            to="/pois"
            className="inline-flex items-center justify-center gap-2.5 px-8 py-4 text-white rounded-xl font-semibold text-lg min-w-[200px] transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1"
            style={{
              backgroundColor: 'var(--color-secondary)',
              boxShadow: `0 4px 12px color-mix(in srgb, var(--color-secondary) 30%, transparent)`,
            }}
          >
            <span className="text-2xl">🗺️</span>
            <span>Ontdek {destination.id === 'texel' ? 'Texel' : 'Calpe'}</span>
          </Link>

          {/* Agenda Button - SECONDARY */}
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-[#016193] text-white rounded-xl font-semibold text-lg min-w-[200px] transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1"
            style={{
              boxShadow: '0 4px 12px rgba(1, 97, 147, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#014a70';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(1, 97, 147, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            <span className="text-2xl">📅</span>
            <span>Agenda</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
