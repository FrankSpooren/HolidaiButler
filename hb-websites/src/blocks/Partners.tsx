import type { PartnersProps } from '@/types/blocks';

export default function Partners({ headline, logos, columns = 4 }: PartnersProps) {
  if (!logos || logos.length === 0) return null;

  const gridCols =
    columns === 3 ? 'grid-cols-2 sm:grid-cols-3' :
    columns === 5 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' :
    columns === 6 ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6' :
    'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

  return (
    <section className="py-12 sm:py-16 bg-surface" style={{ containerType: 'inline-size' }} role="region" aria-label={headline || 'Partners'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {headline && (
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-center mb-8">
            {headline}
          </h2>
        )}
        <div className={`grid ${gridCols} gap-8 items-center`}>
          {logos.map((logo, idx) => {
            const img = (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logo.src}
                alt={logo.alt}
                loading="lazy"
                className="max-h-16 w-auto mx-auto grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
              />
            );
            return logo.href ? (
              <a key={idx} href={logo.href} target="_blank" rel="noopener noreferrer">
                {img}
              </a>
            ) : (
              <div key={idx}>{img}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
