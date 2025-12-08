/**
 * HeroSection - Homepage hero with background image and text
 *
 * Features:
 * - Responsive height (45vh mobile, 50vh desktop)
 * - Gradient overlay on hero image
 * - Centered text content
 * - Text shadow for readability
 */

export function HeroSection() {
  return (
    <section
      className="relative overflow-hidden bg-cover bg-center"
      style={{
        height: '45vh',
        minHeight: '350px',
        backgroundImage: `
          linear-gradient(135deg, rgba(1, 97, 147, 0.5), rgba(26, 112, 157, 0.4)),
          linear-gradient(rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.15)),
          url('/src/assets/images/hero-calpe.jpg')
        `,
      }}
    >
      {/* Hero Content */}
      <div className="relative z-10 flex items-end justify-center h-full pb-[15%]">
        <div className="text-center px-5 max-w-[900px] w-full">
          <h1 className="text-[32px] font-black text-white mb-4" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            Your stay, your style.
          </h1>
          <p className="text-[18px] font-semibold text-accent-gold mb-3" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            Discover Calpe Through local and AI-Powered Insights
          </p>
          <p className="text-[15px] text-white" style={{ opacity: 0.95, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            Experience this Mediterranean gem with personalized recommendations
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
