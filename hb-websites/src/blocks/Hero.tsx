import type { HeroProps } from '@/types/blocks';
import HeroVideo from './HeroVideo';
import HeroButtons from './HeroButtons';

function resolveAssetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const baseUrl = process.env.HB_ASSET_URL ?? process.env.HB_API_URL ?? '';
  return `${baseUrl}${path}`;
}

const heightClasses: Record<string, string> = {
  compact: 'py-12 sm:py-16 lg:py-20',
  default: 'py-20 sm:py-28 lg:py-36',
  tall: 'py-28 sm:py-36 lg:py-48',
  fullscreen: 'min-h-screen flex items-center',
};

export default function Hero({
  headline, description, image, tagline, buttons,
  backgroundType = 'image', videoUrl, videoPosterImage,
  height = 'default',
}: HeroProps) {
  const showVideo = backgroundType === 'video' && videoUrl;
  const resolvedImage = image ? resolveAssetUrl(image) : '';
  const hasImage = resolvedImage.length > 0;
  const paddingClass = heightClasses[height] ?? heightClasses.default;
  const isFullscreen = height === 'fullscreen';

  return (
    <section className="relative bg-primary text-on-primary overflow-hidden">
      {showVideo ? (
        <>
          <div className="absolute inset-0 hidden md:block">
            <HeroVideo videoUrl={videoUrl} posterImage={videoPosterImage} />
          </div>
          {videoPosterImage && (
            <div className="absolute inset-0 md:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveAssetUrl(videoPosterImage)} alt="" className="w-full h-full object-cover opacity-40" loading="eager" />
            </div>
          )}
          <div className="absolute inset-0 bg-primary/60" />
        </>
      ) : hasImage && backgroundType !== 'color' ? (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolvedImage} alt="" className="w-full h-full object-cover opacity-30" loading="eager" />
          <div className="absolute inset-0 bg-primary/60" />
        </div>
      ) : null}

      <div className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${paddingClass} ${isFullscreen ? 'w-full' : ''}`}>
        {tagline && <p className="text-sm font-medium uppercase tracking-wider opacity-80 mb-4">{tagline}</p>}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold max-w-3xl">{headline}</h1>
        {description && <p className="mt-6 text-lg sm:text-xl max-w-2xl opacity-90">{description}</p>}
        {buttons && buttons.length > 0 && (
          <HeroButtons buttons={buttons} />
        )}
      </div>
    </section>
  );
}
