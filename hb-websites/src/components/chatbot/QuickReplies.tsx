'use client';

interface QuickAction {
  id: string;
  label: string;
  message: string;
}

interface QuickRepliesProps {
  actions: QuickAction[];
  visible: boolean;
  onSelect: (message: string, id: string) => void;
}

export default function QuickReplies({ actions, visible, onSelect }: QuickRepliesProps) {
  return (
    <div className="holibot-quick-replies" role="group" aria-label="Quick actions">
      {actions.map((qa, index) => (
        <button
          key={qa.id}
          type="button"
          className={`holibot-quick-reply-button${visible ? ' visible' : ''}`}
          onClick={() => onSelect(qa.message, qa.id)}
          aria-label={qa.label}
          style={{ animationDelay: visible ? `${index * 150}ms` : undefined }}
        >
          {qa.label}
        </button>
      ))}
    </div>
  );
}
