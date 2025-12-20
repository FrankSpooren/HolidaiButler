import { useState, useEffect } from 'react';
import './QuickReplies.css';

interface QuickRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
  onAllVisible?: () => void;
  skipAnimation?: boolean; // Skip animation after reset
}

export function QuickReplies({ replies, onSelect, onAllVisible, skipAnimation = false }: QuickRepliesProps) {
  const [isVisible, setIsVisible] = useState(skipAnimation);

  useEffect(() => {
    // If skipAnimation, show immediately
    if (skipAnimation) {
      setIsVisible(true);
      onAllVisible?.();
      return;
    }

    const showTimer = setTimeout(() => {
      setIsVisible(true);
      if (onAllVisible) {
        setTimeout(() => onAllVisible(), 1000);
      }
    }, 800);
    return () => clearTimeout(showTimer);
  }, [skipAnimation]);

  const getClassName = (visible: boolean) => {
    return 'holibot-quick-reply-button' + (visible ? ' visible' : '') + (skipAnimation ? ' no-animation' : '');
  };

  return (
    <div className="holibot-quick-replies" role="group" aria-label="Snelle antwoorden">
      {replies.map((reply, index) => (
        <button
          key={index}
          type="button"
          className={getClassName(isVisible)}
          onClick={() => onSelect(reply)}
          aria-label={reply}
        >
          {reply}
        </button>
      ))}
    </div>
  );
}
