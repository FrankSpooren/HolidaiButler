/**
 * Tip History Service
 * Tracks shown tips in localStorage to avoid repetition within session
 *
 * Storage key: holibot_tip_history
 * Format: { tipId: timestamp, ... }
 *
 * Session-based: clears on logout or when cookie expires
 */

const STORAGE_KEY = 'holibot_tip_history';

export interface TipHistoryEntry {
  tipId: string;
  timestamp: number;
  type: 'poi' | 'event';
}

/**
 * Get all shown tip IDs
 */
export function getShownTipIds(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const history: Record<string, TipHistoryEntry> = JSON.parse(stored);
    return Object.keys(history);
  } catch {
    return [];
  }
}

/**
 * Get shown tip IDs as comma-separated string for API
 */
export function getExcludeIdsParam(): string {
  return getShownTipIds().join(',');
}

/**
 * Record a tip as shown
 */
export function recordShownTip(tipId: string, type: 'poi' | 'event' = 'poi'): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const history: Record<string, TipHistoryEntry> = stored ? JSON.parse(stored) : {};

    history[tipId] = {
      tipId,
      timestamp: Date.now(),
      type
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('Failed to record tip history:', error);
  }
}

/**
 * Check if a tip was already shown
 */
export function wasTipShown(tipId: string): boolean {
  return getShownTipIds().includes(tipId);
}

/**
 * Clear all tip history (on logout/session end)
 */
export function clearTipHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear tip history:', error);
  }
}

/**
 * Get tip history count
 */
export function getTipHistoryCount(): number {
  return getShownTipIds().length;
}

export const tipHistoryService = {
  getShownTipIds,
  getExcludeIdsParam,
  recordShownTip,
  wasTipShown,
  clearTipHistory,
  getTipHistoryCount
};

export default tipHistoryService;
