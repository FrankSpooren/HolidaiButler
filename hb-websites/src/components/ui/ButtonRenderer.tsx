'use client';

import type { HeroButton, ButtonStyle } from '@/types/blocks';
import Button from './Button';
import ChatbotButton from './ChatbotButton';
import { analytics } from '@/lib/analytics';

interface ButtonRendererProps {
  buttons: HeroButton[];
  align?: 'left' | 'center';
  size?: 'sm' | 'md' | 'lg';
  /** Use on-primary color scheme (for dark backgrounds like Hero/Cta) */
  onPrimary?: boolean;
}

const RADIUS_MAP: Record<string, string> = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '16px',
  full: '9999px',
};

function buttonStyleToCSS(bs?: ButtonStyle): React.CSSProperties {
  if (!bs) return {};
  const style: React.CSSProperties = {};
  if (bs.bgColor) style.backgroundColor = bs.bgColor;
  if (bs.textColor) style.color = bs.textColor;
  if (bs.borderColor) { style.borderColor = bs.borderColor; style.borderWidth = '2px'; style.borderStyle = 'solid'; }
  if (bs.borderRadius && RADIUS_MAP[bs.borderRadius]) style.borderRadius = RADIUS_MAP[bs.borderRadius];
  return style;
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
        const hasCustomStyle = btn.buttonStyle && (btn.buttonStyle.bgColor || btn.buttonStyle.textColor || btn.buttonStyle.borderColor || btn.buttonStyle.borderRadius);
        const customCSS = buttonStyleToCSS(btn.buttonStyle);
        const btnSize = btn.buttonStyle?.size || size;

        if (btn.variant === 'chatbot') {
          return (
            <ChatbotButton
              key={i}
              label={btn.label}
              message={btn.chatbotAction}
              className={
                hasCustomStyle ? '' :
                onPrimary
                  ? (i === 0 ? 'bg-on-primary text-primary hover:bg-on-primary/90' : 'border-on-primary text-on-primary hover:bg-on-primary/10')
                  : (i === 0 ? 'bg-primary text-on-primary hover:bg-primary/90' : 'border border-primary text-primary hover:bg-primary/10')
              }
              size={btnSize}
              style={customCSS}
            />
          );
        }
        return (
          <Button
            key={i}
            href={btn.href}
            variant={btn.variant ?? (i === 0 ? 'primary' : 'outline')}
            size={btnSize}
            className={
              hasCustomStyle ? '' :
              onPrimary
                ? (i === 0 ? 'bg-on-primary text-primary hover:bg-on-primary/90' : 'border-on-primary text-on-primary hover:bg-on-primary/10')
                : undefined
            }
            style={customCSS}
            onClick={() => analytics.cta_clicked(btn.label)}
          >
            {btn.label}
          </Button>
        );
      })}
    </div>
  );
}
