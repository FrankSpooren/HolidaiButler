/**
 * Web Share API utilities
 * Handles native sharing on mobile and fallback on desktop
 */

export interface ShareData {
  title: string;
  text?: string;
  url: string;
}

/**
 * Check if Web Share API is supported
 */
export function isWebShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Share using Web Share API (native sharing on mobile)
 * Falls back to copying URL to clipboard on desktop
 *
 * @param data - Share data
 * @returns Promise that resolves when sharing is complete
 */
export async function shareContent(data: ShareData): Promise<{
  success: boolean;
  method: 'native' | 'clipboard' | 'failed';
  error?: string;
}> {
  try {
    // Try Web Share API first (mobile native sharing)
    if (isWebShareSupported()) {
      await navigator.share({
        title: data.title,
        text: data.text,
        url: data.url
      });

      return {
        success: true,
        method: 'native'
      };
    }

    // Fallback: Copy to clipboard
    await copyToClipboard(data.url);

    return {
      success: true,
      method: 'clipboard'
    };
  } catch (error) {
    // User cancelled or error occurred
    if (error instanceof Error && error.name === 'AbortError') {
      // User cancelled the share dialog - not really an error
      return {
        success: false,
        method: 'failed',
        error: 'cancelled'
      };
    }

    return {
      success: false,
      method: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/**
 * Generate share URL for a POI
 */
export function generatePOIShareURL(poiId: number): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/pois/${poiId}`;
}
