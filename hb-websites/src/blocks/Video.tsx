import type { VideoProps } from '@/types/blocks';
import VideoPlayer from './VideoPlayer';

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match?.[1] ?? null;
}

export default function Video({
  youtubeUrl,
  vimeoUrl,
  videoFile,
  headline,
  description,
  posterImage,
  layout = 'contained',
  autoplay = false,
  muted = true,
  backgroundColor = 'transparent',
}: VideoProps) {
  const bgClass =
    backgroundColor === 'primary' ? 'bg-primary text-on-primary' :
    backgroundColor === 'surface' ? 'bg-surface' : '';

  const containerClass =
    layout === 'full-width' ? 'w-full' :
    layout === 'side-by-side' ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' :
    'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8';

  const youtubeId = youtubeUrl ? extractYouTubeId(youtubeUrl) : null;
  const vimeoId = vimeoUrl ? extractVimeoId(vimeoUrl) : null;

  const videoContent = (
    <div className="relative w-full aspect-video rounded-tenant overflow-hidden bg-black">
      {youtubeId ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}${autoplay ? '?autoplay=1&mute=1' : ''}`}
          title={headline ?? 'Video'}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      ) : vimeoId ? (
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}${autoplay ? '?autoplay=1&muted=1' : ''}`}
          title={headline ?? 'Video'}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      ) : videoFile ? (
        <VideoPlayer
          src={videoFile}
          poster={posterImage}
          autoplay={autoplay}
          muted={muted}
        />
      ) : null}
    </div>
  );

  const textContent = (headline || description) ? (
    <div className={layout === 'side-by-side' ? '' : 'text-center'}>
      {headline && (
        <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-3">
          {headline}
        </h2>
      )}
      {description && (
        <p className="text-base sm:text-lg opacity-80">
          {description}
        </p>
      )}
    </div>
  ) : null;

  return (
    <section className={`${bgClass} py-12 sm:py-16`}>
      <div className={containerClass}>
        {layout === 'side-by-side' ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            <div className="lg:col-span-3">{videoContent}</div>
            {textContent && <div className="lg:col-span-2">{textContent}</div>}
          </div>
        ) : (
          <>
            {textContent && <div className="mb-6">{textContent}</div>}
            {videoContent}
          </>
        )}
      </div>
    </section>
  );
}
