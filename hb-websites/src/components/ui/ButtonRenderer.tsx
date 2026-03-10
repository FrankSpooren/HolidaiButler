'use client';

import type { HeroButton } from '@/types/blocks';
import Button from './Button';
import ChatbotButton from './ChatbotButton';

interface ButtonRendererProps {
  buttons: HeroButton[];
  align?: 'left' | 'center';
  size?: 'sm' | 'md' | 'lg';
  /** Use on-primary color scheme (for dark backgrounds like Hero/Cta) */
  onPrimary?: boolean;
}

export default function ButtonRenderer({
  buttons,
  align = 'left',
  size = 'md',
  onPrimary = false,
}: ButtonRendererProps) {
  if (!buttons || buttons.length === 0) return null;

  const alignClass = align === 'center' ? 'justify-center' : '';

  return (
    <div className={`flex flex-wrap gap-4 ${alignClass}`}>
      {buttons.map((btn, i) => {
        if (btn.variant === 'chatbot') {
          return (
            <ChatbotButton
              key={i}
              label={btn.label}
              message={btn.chatbotAction}
              className={
                onPrimary
                  ? (i === 0 ? 'bg-on-primary text-primary hover:bg-on-primary/90' : 'border-on-primary text-on-primary hover:bg-on-primary/10')
                  : (i === 0 ? 'bg-primary text-on-primary hover:bg-primary/90' : 'border border-primary text-primary hover:bg-primary/10')
              }
              size={size}
            />
          );
        }
        return (
          <Button
            key={i}
            href={btn.href}
            variant={btn.variant ?? (i === 0 ? 'primary' : 'outline')}
            size={size}
            className={
              onPrimary
                ? (i === 0 ? 'bg-on-primary text-primary hover:bg-on-primary/90' : 'border-on-primary text-on-primary hover:bg-on-primary/10')
                : undefined
            }
          >
            {btn.label}
          </Button>
        );
      })}
    </div>
  );
}
