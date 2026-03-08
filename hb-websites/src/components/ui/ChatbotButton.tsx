'use client';

import { openChatbotWithMessage } from '@/lib/chatbot-actions';

interface ChatbotButtonProps {
  label: string;
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-7 py-3.5 text-lg',
};

export default function ChatbotButton({ label, message, className = '', size = 'md' }: ChatbotButtonProps) {
  return (
    <button
      type="button"
      onClick={() => openChatbotWithMessage(message)}
      className={`inline-flex items-center justify-center font-medium transition-colors duration-200 rounded-tenant ${sizes[size]} ${className}`}
    >
      {label}
    </button>
  );
}
