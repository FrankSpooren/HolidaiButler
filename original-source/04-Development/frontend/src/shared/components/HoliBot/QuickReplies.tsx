import { useState, useEffect } from 'react';
import './QuickReplies.css';

/**
 * QuickReplies - Sequential animated suggestion tiles
 *
 * User Requirements (2025-11-09):
 * - Show tiles one by one after welcome messages
 * - Sequential fade-in animation
 * - Scroll to show all tiles after last one appears
 *
 * Design: Vertical stack with sequential animation
 */

interface QuickRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
  onAllVisible?: () => void;
}

export function QuickReplies({ replies, onSelect, onAllVisible }: QuickRepliesProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  // Show tiles one by one: first after 1.5s, then every 0.75s
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    replies.forEach((_, index) => {
      // First tile after 1500ms, subsequent tiles every 750ms
      const delay = index === 0 ? 1500 : 1500 + (index * 750);

      timers.push(
        setTimeout(() => {
          setVisibleCount(index + 1);

          // Notify parent when last tile is visible
          if (index === replies.length - 1 && onAllVisible) {
            setTimeout(() => onAllVisible(), 300); // Small delay for animation
          }
        }, delay)
      );
    });

    return () => timers.forEach(timer => clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  return (
    <div className="holibot-quick-replies" role="group" aria-label="Snelle antwoorden">
      {replies.map((reply, index) => (
        <button
          key={index}
          type="button"
          className={`holibot-quick-reply-button ${index < visibleCount ? 'visible' : ''}`}
          onClick={() => onSelect(reply)}
          aria-label={reply}
          style={{ opacity: index < visibleCount ? 1 : 0 }}
        >
          {reply}
        </button>
      ))}
    </div>
  );
}
