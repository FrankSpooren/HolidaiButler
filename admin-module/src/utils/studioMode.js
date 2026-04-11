/**
 * Detect if the admin portal is running in "Content Studio" standalone mode.
 * This is true when accessed via studio.holidaibutler.com, or Publiqio branded domains.
 */
export function isStudioMode() {
  try {
    const host = window.location.hostname;
    return host.startsWith('studio.') || host.startsWith('publiqio.') || host.endsWith('.publiqio.com') || host === 'publiqio.com' || host === 'publiqio.nl' || host === 'publiqio.es';
  } catch {
    return false;
  }
}
