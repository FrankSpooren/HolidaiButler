import { useEffect, useState, useRef } from 'react';
import { Chip } from '@mui/material';

/**
 * Score chip met animated count-up van 0 → score over ~400ms.
 * Gebruikt requestAnimationFrame voor een soepele animatie.
 * Re-anim bij wijziging van de score-waarde.
 */
export default function AnimatedScoreChip({ score, label, color, size = 'small', sx, ...rest }) {
  const target = Number.isFinite(score) ? Math.round(score) : 0;
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    const duration = 400;
    const from = 0;
    startRef.current = null;
    const tick = (ts) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  const text = label ? label.replace(/\d+/, String(display)) : `${display}/100`;

  return <Chip label={text} size={size} color={color} sx={sx} {...rest} />;
}
