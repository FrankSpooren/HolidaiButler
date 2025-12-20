/**
 * Lightweight Markdown Renderer for HoliBot Chat
 *
 * Supports:
 * - Bold text (**text**)
 * - Italic text (*text*)
 * - Bullet lists (- item or * item)
 * - Numbered lists (1. item)
 * - Line breaks
 * - Headers (##)
 *
 * Designed for chat messages, not full markdown documents.
 */

import React from 'react';

interface MarkdownSegment {
  type: 'text' | 'bold' | 'italic' | 'break';
  content: string;
}

/**
 * Parse inline markdown (bold, italic) within a line
 */
function parseInlineMarkdown(text: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Check for bold (**text**)
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      segments.push({ type: 'bold', content: boldMatch[1] });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Check for italic (*text*) - but not **
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      segments.push({ type: 'italic', content: italicMatch[1] });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Find next special character
    const nextSpecial = remaining.search(/\*{1,2}[^*]/);
    if (nextSpecial === -1) {
      // No more special characters
      segments.push({ type: 'text', content: remaining });
      break;
    } else if (nextSpecial === 0) {
      // Single asterisk at start (not matched as italic)
      segments.push({ type: 'text', content: remaining[0] });
      remaining = remaining.slice(1);
    } else {
      // Text before next special
      segments.push({ type: 'text', content: remaining.slice(0, nextSpecial) });
      remaining = remaining.slice(nextSpecial);
    }
  }

  return segments;
}

/**
 * Render a line with inline formatting
 */
function renderInlineLine(text: string, keyPrefix: string): React.ReactNode[] {
  const segments = parseInlineMarkdown(text);

  return segments.map((segment, idx) => {
    const key = `${keyPrefix}-${idx}`;
    switch (segment.type) {
      case 'bold':
        return <strong key={key} className="font-semibold">{segment.content}</strong>;
      case 'italic':
        return <em key={key}>{segment.content}</em>;
      default:
        return <span key={key}>{segment.content}</span>;
    }
  });
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Main Markdown Renderer Component
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;
  let listKey = 0;

  const flushList = () => {
    if (listItems) {
      const ListTag = listItems.type === 'ul' ? 'ul' : 'ol';
      elements.push(
        <ListTag
          key={`list-${listKey++}`}
          className={`${listItems.type === 'ul' ? 'list-disc' : 'list-decimal'} list-inside my-2 space-y-1`}
        >
          {listItems.items.map((item, i) => (
            <li key={i} className="text-inherit">{item}</li>
          ))}
        </ListTag>
      );
      listItems = null;
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmedLine = line.trim();

    // Empty line
    if (trimmedLine === '') {
      flushList();
      elements.push(<br key={`br-${lineIdx}`} />);
      return;
    }

    // Header (## text)
    const headerMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      flushList();
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      const headerClasses = level === 1
        ? 'text-lg font-bold mt-3 mb-2'
        : level === 2
          ? 'text-base font-semibold mt-2 mb-1'
          : 'font-semibold mt-1';
      elements.push(
        <div key={`h-${lineIdx}`} className={headerClasses}>
          {renderInlineLine(text, `h-${lineIdx}`)}
        </div>
      );
      return;
    }

    // Unordered list (- item or * item)
    const ulMatch = trimmedLine.match(/^[-*•]\s+(.+)$/);
    if (ulMatch) {
      if (!listItems || listItems.type !== 'ul') {
        flushList();
        listItems = { type: 'ul', items: [] };
      }
      listItems.items.push(renderInlineLine(ulMatch[1], `ul-${lineIdx}`));
      return;
    }

    // Ordered list (1. item)
    const olMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!listItems || listItems.type !== 'ol') {
        flushList();
        listItems = { type: 'ol', items: [] };
      }
      listItems.items.push(renderInlineLine(olMatch[1], `ol-${lineIdx}`));
      return;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <span key={`p-${lineIdx}`}>
        {renderInlineLine(trimmedLine, `p-${lineIdx}`)}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    );
  });

  // Flush any remaining list
  flushList();

  return <div className={`markdown-content ${className}`}>{elements}</div>;
}

export default MarkdownRenderer;
