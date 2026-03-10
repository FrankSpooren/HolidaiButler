import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  href?: string;
  className?: string;
}

export default function Card({ children, href, className = '' }: CardProps) {
  const classes = `bg-surface rounded-tenant overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 ${className}`;

  if (href) {
    return (
      <a href={href} className={`block ${classes}`}>
        {children}
      </a>
    );
  }

  return <div className={classes}>{children}</div>;
}

interface CardImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function CardImage({ src, alt, className = '' }: CardImageProps) {
  return (
    <div className={`aspect-[4/3] overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-full object-cover animate-image-load"
      />
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}
