import { useState, useEffect } from 'react';
import './QuickReplies.css';

interface QuickRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
  onAllVisible?: () => void;
}

export function QuickReplies({ replies, onSelect, onAllVisible }: QuickRepliesProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => {
      setIsVisible(true);
      if (onAllVisible) {
        setTimeout(() => onAllVisible(), 1000);
      }
    }, 800);
    return () => clearTimeout(showTimer);
  }, []);

  const getClassName = (visible: boolean) => {
    return 'holibot-quick-reply-button' + (visible ? ' visible' : '');
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
