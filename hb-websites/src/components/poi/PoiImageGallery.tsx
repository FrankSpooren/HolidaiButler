'use client';

interface PoiImageGalleryProps {
  images: string[];
  name: string;
  category?: string;
}

export default function PoiImageGallery({ images, name, category }: PoiImageGalleryProps) {
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).style.display = 'none';
  };

  if (images.length === 0) {
    return (
      <div className="mb-8 rounded-tenant overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 aspect-[16/9] max-h-64 flex items-center justify-center">
        <div className="text-center px-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-primary/40 mx-auto mb-2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <p className="text-lg font-heading font-semibold text-foreground/60">{name}</p>
          {category && <p className="text-sm text-muted">{category}</p>}
        </div>
      </div>
    );
  }

  if (images.length === 1) {
    return (
      <div className="mb-8 rounded-tenant overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[0]}
          alt={name}
          className="w-full aspect-[16/9] object-cover"
          loading="eager"
          onError={handleError}
        />
      </div>
    );
  }

  if (images.length <= 3) {
    return (
      <div className="mb-8 grid grid-cols-1 md:grid-cols-10 gap-2 rounded-tenant overflow-hidden" style={{ height: '360px' }}>
        <div className="md:col-span-7 h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[0]}
            alt={name}
            className="w-full h-full object-cover"
            loading="eager"
            onError={handleError}
          />
        </div>
        <div className="hidden md:flex md:col-span-3 flex-col gap-2 h-full">
          {images.slice(1, 3).map((img, i) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={i}
              src={img}
              alt={`${name} ${i + 2}`}
              className="w-full flex-1 object-cover"
              loading="lazy"
              onError={handleError}
            />
          ))}
        </div>
      </div>
    );
  }

  // 4+ images
  return (
    <div className="mb-8 grid grid-cols-1 md:grid-cols-5 gap-2 rounded-tenant overflow-hidden" style={{ height: '400px' }}>
      <div className="md:col-span-3 h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[0]}
          alt={name}
          className="w-full h-full object-cover"
          loading="eager"
          onError={handleError}
        />
      </div>
      <div className="hidden md:grid md:col-span-2 grid-cols-2 grid-rows-2 gap-2 h-full">
        {images.slice(1, 5).map((img, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={i}
            src={img}
            alt={`${name} ${i + 2}`}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={handleError}
          />
        ))}
      </div>
    </div>
  );
}
