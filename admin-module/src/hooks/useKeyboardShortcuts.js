import { useEffect, useRef } from 'react';

/**
 * Global keyboard shortcuts hook with sequence support.
 *
 * Supports:
 * - Single keys: '?' , '/'
 * - Modifier combos: 'ctrl+k', 'cmd+shift+d'
 * - Sequences: 'g d' (press g, then d within 2 seconds)
 *
 * Automatically skips when user is typing in input/textarea/contenteditable.
 *
 * @param {Object} shortcuts - Map of shortcut string to handler function
 * @param {Object} options - { enabled: true }
 */
export default function useKeyboardShortcuts(shortcuts, options) {
  const enabled = (!options || options.enabled !== false);
  const pendingRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const handler = (e) => {
      // Skip when user is typing in an input
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      // Skip when a dialog/modal is open (check for MUI dialog backdrop)
      if (document.querySelector('.MuiDialog-root')) return;

      // Build the key representation
      const parts = [];
      if (e.metaKey || e.ctrlKey) parts.push('ctrl');
      if (e.shiftKey) parts.push('shift');
      if (e.altKey) parts.push('alt');

      let key = e.key.toLowerCase();
      // Normalize special keys
      if (key === ' ') key = 'space';
      if (key === 'escape') key = 'esc';

      // Don't add modifier keys themselves as the key part
      if (!['control', 'meta', 'shift', 'alt'].includes(key)) {
        parts.push(key);
      } else {
        return; // Modifier-only press, ignore
      }

      const combo = parts.join('+');

      // 1. Check if this completes a pending sequence
      if (pendingRef.current) {
        const sequence = pendingRef.current + ' ' + key;
        pendingRef.current = null;
        clearTimeout(timerRef.current);

        if (shortcuts[sequence]) {
          e.preventDefault();
          shortcuts[sequence]();
          return;
        }
      }

      // 2. Check for direct match (single key or modifier combo)
      // For '?' we need to check the actual character
      const actualChar = e.key;
      if (shortcuts[actualChar] && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        shortcuts[actualChar]();
        return;
      }

      if (shortcuts[combo]) {
        e.preventDefault();
        shortcuts[combo]();
        return;
      }

      // 3. Check if this could be the START of a sequence
      // Look for any shortcut that starts with this key + space
      const isSequenceStart = Object.keys(shortcuts).some(s => {
        const seqParts = s.split(' ');
        return seqParts.length === 2 && seqParts[0] === key;
      });

      if (isSequenceStart) {
        e.preventDefault();
        pendingRef.current = key;
        timerRef.current = setTimeout(() => {
          pendingRef.current = null;
        }, 2000); // 2 second window
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      clearTimeout(timerRef.current);
    };
  }, [shortcuts, enabled]);
}
