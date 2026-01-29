/**
 * Calendar (.ics) file generation utilities
 * Compatible with iPhone Calendar, Outlook, Google Calendar
 */

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  url?: string;
  startDate: Date;
  endDate?: Date;
  /** Duration in hours if no end date (default: 2) */
  durationHours?: number;
}

/**
 * Format date for iCalendar format (YYYYMMDDTHHMMSS)
 */
function formatICalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Escape special characters for iCalendar format
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate .ics calendar file content
 */
export function generateICalContent(event: CalendarEvent): string {
  const startDate = event.startDate;
  const endDate = event.endDate || new Date(
    startDate.getTime() + (event.durationHours || 2) * 60 * 60 * 1000
  );

  const now = new Date();
  const dtstamp = formatICalDate(now);

  // Generate unique identifier
  const uid = `${Date.now()}-${Math.random().toString(36).substring(7)}@holidaibutler.com`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HolidaiButler//POI Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${formatICalDate(startDate)}`,
    `DTEND:${formatICalDate(endDate)}`,
    `SUMMARY:${escapeICalText(event.title)}`,
  ];

  // Add optional fields
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`);
  }

  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  lines.push(
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  );

  return lines.join('\r\n');
}

/**
 * Download .ics file
 */
export function downloadICalFile(content: string, filename: string): void {
  // Create blob
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });

  // Create download link
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;

  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(link.href);
}

/**
 * Create default calendar event for a POI visit
 * Sets start time to next day at 10:00 AM, duration 2 hours
 */
export function createPOICalendarEvent(
  poiName: string,
  poiAddress: string | null,
  poiDescription: string | null,
  poiUrl: string,
  destinationName?: string
): CalendarEvent {
  // Create start date: tomorrow at 10:00 AM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  // Use destination name if provided, otherwise use generic text
  const locationText = destinationName || 'your destination';

  return {
    title: `Visit ${poiName}`,
    description: poiDescription || `Plan to visit ${poiName} in ${locationText}`,
    location: poiAddress || undefined,
    url: poiUrl,
    startDate: tomorrow,
    durationHours: 2
  };
}

/**
 * Main function: Add POI to calendar
 * Generates .ics file and triggers download
 */
export function addPOIToCalendar(
  poiName: string,
  poiAddress: string | null,
  poiDescription: string | null,
  poiUrl: string,
  destinationName?: string
): void {
  const event = createPOICalendarEvent(poiName, poiAddress, poiDescription, poiUrl, destinationName);
  const content = generateICalContent(event);
  const filename = `${poiName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-visit.ics`;

  downloadICalFile(content, filename);
}
