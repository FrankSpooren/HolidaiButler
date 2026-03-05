import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'accent';
  className?: string;
}

const variants = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-primary-light text-primary-dark',
  accent: 'bg-accent/10 text-accent',
};

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
