'use client';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoplay?: boolean;
  muted?: boolean;
}

export default function VideoPlayer({ src, poster, autoplay = false, muted = true }: VideoPlayerProps) {
  return (
    <video
      src={src}
      poster={poster}
      autoPlay={autoplay}
      muted={muted}
      controls
      playsInline
      preload="metadata"
      className="w-full h-full object-cover"
    >
      Your browser does not support the video tag.
    </video>
  );
}
