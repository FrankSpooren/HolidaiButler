'use client';

import { useEffect, useRef } from 'react';

interface HeroVideoProps {
  videoUrl: string;
  posterImage?: string;
}

export default function HeroVideo({ videoUrl, posterImage }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches && videoRef.current) {
      videoRef.current.pause();
    }
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) videoRef.current?.pause();
      else videoRef.current?.play();
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      poster={posterImage}
      autoPlay
      muted
      loop
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}
