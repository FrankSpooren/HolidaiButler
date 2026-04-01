/**
 * Detect if the admin portal is running in "Content Studio" standalone mode.
 * This is true when accessed via studio.holidaibutler.com (or studio.* subdomains).
 */
export function isStudioMode() {
  try {
    return window.location.hostname.startsWith('studio.');
  } catch {
    return false;
  }
}
