import type { HeroProps } from '@/types/blocks';
import { resolveAssetUrl } from '@/lib/assets';
import HeroVideo from './HeroVideo';
import HeroButtons from './HeroButtons';

const heightClasses: Record<string, string> = {
  compact: 'py-12 sm:py-16 lg:py-20',
  default: 'py-20 sm:py-28 lg:py-36',
  tall: 'py-28 sm:py-36 lg:py-48',
  fullscreen: 'min-h-screen flex items-center',
};

const headlineSizeClasses: Record<string, string> = {
  small: 'text-2xl sm:text-3xl lg:text-4xl',
  default: 'text-3xl sm:text-4xl lg:text-6xl',
  large: 'text-4xl sm:text-5xl lg:text-7xl',
  xlarge: 'text-5xl sm:text-6xl lg:text-8xl',
};

const textAlignClasses: Record<string, string> = {
  left: 'text-left',
  center: 'text-center mx-auto',
  right: 'text-right ml-auto',
};

export default function Hero({
  headline, description, image, tagline, buttons,
  backgroundType = 'image', videoUrl, videoPosterImage,
  height = 'default', textStyle,
}: HeroProps) {
  const showVideo = backgroundType === 'video' && videoUrl;
  const resolvedImage = image ? resolveAssetUrl(image) : '';
  const hasImage = resolvedImage.length > 0;
  const paddingClass = heightClasses[height] ?? heightClasses.default;
  const isFullscreen = height === 'fullscreen';

  const overlayOpacity = textStyle?.overlayOpacity ?? 60;
  const alignClass = textAlignClasses[textStyle?.textAlign ?? 'left'] ?? '';
  const headlineSizeClass = headlineSizeClasses[textStyle?.headlineSize ?? 'default'] ?? headlineSizeClasses.default;
  const shadowClass = textStyle?.textShadow ? 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]' : '';

  const headlineStyle: React.CSSProperties = textStyle?.headlineColor ? { color: textStyle.headlineColor } : {};
  const descriptionStyle: React.CSSProperties = textStyle?.descriptionColor ? { color: textStyle.descriptionColor } : {};

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
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(var(--color-primary-rgb, 0,0,0), ${overlayOpacity / 100})` }} />
        </>
      ) : hasImage && backgroundType !== 'color' ? (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolvedImage} alt="" className="w-full h-full object-cover opacity-30" loading="eager" />
          <div className="absolute inset-0" style={{ backgroundColor: `rgba(var(--color-primary-rgb, 0,0,0), ${overlayOpacity / 100})` }} />
        </div>
      ) : null}

      <div className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${paddingClass} ${isFullscreen ? 'w-full' : ''} ${alignClass} ${shadowClass}`}>
        {tagline && <p className="text-sm font-medium uppercase tracking-wider opacity-80 mb-4">{tagline}</p>}
        <h1 className={`${headlineSizeClass} font-heading font-bold max-w-3xl ${textStyle?.textAlign === 'center' ? 'mx-auto' : ''}`} style={headlineStyle}>{headline}</h1>
        {description && <p className={`mt-6 text-base sm:text-lg lg:text-xl max-w-2xl opacity-90 ${textStyle?.textAlign === 'center' ? 'mx-auto' : ''}`} style={descriptionStyle}>{description}</p>}
        {buttons && buttons.length > 0 && (
          <HeroButtons buttons={buttons} />
        )}
      </div>
    </section>
  );
}
