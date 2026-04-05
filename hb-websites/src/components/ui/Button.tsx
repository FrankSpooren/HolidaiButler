import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  href?: string;
}

const variants = {
  primary: 'bg-primary text-on-primary hover:bg-primary-dark',
  secondary: 'bg-secondary text-on-primary hover:opacity-90',
  outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-on-primary',
  ghost: 'text-primary hover:bg-primary-light',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-7 py-3.5 text-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  href,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center font-medium transition-colors duration-200 rounded-tenant ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    return (
      <a href={href} className={classes} style={style} onClick={props.onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} style={style} {...props}>
      {children}
    </button>
  );
}
