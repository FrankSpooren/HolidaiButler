/**
 * HeroSection - Homepage hero with background image and text
 *
 * Features:
 * - Multi-destination aware (uses DestinationContext)
 * - Responsive height (45vh mobile, 50vh desktop)
 * - Gradient overlay on hero image
 * - Centered text content
 * - Text shadow for readability
 */

import { useDestination } from '@/shared/contexts/DestinationContext';

export function HeroSection() {
  const destination = useDestination();

  return (
    <section
      className="relative overflow-hidden bg-cover bg-center"
      style={{
        height: '45vh',
        minHeight: '350px',
        backgroundImage: `
          var(--hero-overlay),
          linear-gradient(rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.15)),
          url('${destination.heroImage}')
        `,
      }}
    >
      {/* Hero Content */}
      <div className="relative z-10 flex items-end justify-center h-full pb-[15%]">
        <div className="text-center px-5 max-w-[900px] w-full">
          <h1 className="text-[32px] font-black text-white mb-4" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            {destination.hero.title}
          </h1>
          <p className="text-[18px] font-semibold mb-3" style={{ color: 'var(--color-accent)', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            {destination.hero.subtitle}
          </p>
          <p className="text-[15px] text-white" style={{ opacity: 0.95, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            {destination.hero.description}
          </p>
        </div>
      </div>

      {/* Desktop - larger hero */}
      <style>{`
        @media (min-width: 768px) {
          section {
            height: 50vh !important;
            min-height: 400px !important;
          }
          h1 {
            font-size: 56px !important;
          }
          p:first-of-type {
            font-size: 24px !important;
          }
          p:last-of-type {
            font-size: 18px !important;
          }
        }
      `}</style>
    </section>
  );
}
