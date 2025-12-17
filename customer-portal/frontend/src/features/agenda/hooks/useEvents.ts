/**
 * Agenda Event Hooks
 * React Query hooks for fetching agenda events
 *
 * Sprint 3: Favorieten & Bezochte
 */

import { useQuery, useQueries } from '@tanstack/react-query';
import { agendaService, type AgendaEvent } from '../services/agendaService';
import { useLanguage } from '../../../i18n/LanguageContext';

/**
 * Hook to fetch all events with optional filtering
 */
export function useEvents(filters?: Record<string, unknown>) {
  const { language } = useLanguage();

  return useQuery({
    queryKey: ['events', { ...filters, lang: language }],
    queryFn: () => agendaService.getEvents({ ...filters, lang: language }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
}

/**
 * Hook to fetch a single event by ID
 */
export function useEvent(eventId: string) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => agendaService.getEventById(eventId),
    enabled: !!eventId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch featured events
 */
export function useFeaturedEvents(limit = 6) {
  return useQuery({
    queryKey: ['events', 'featured', limit],
    queryFn: () => agendaService.getFeaturedEvents(limit),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch multiple events by their IDs
 * Uses parallel queries for efficient fetching
 */
export function useEventsByIds(ids: string[]) {
  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['event', id],
      queryFn: () => agendaService.getEventById(id),
      enabled: !!id,
      staleTime: 10 * 60 * 1000,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const data: AgendaEvent[] = queries
    .filter((q) => q.data?.data)
    .map((q) => q.data!.data);

  return {
    data,
    isLoading,
    isError,
    queries,
  };
}

/**
 * Helper to get localized title from event
 */
export function getEventTitle(event: AgendaEvent, language: string): string {
  if (typeof event.title === 'string') {
    return event.title;
  }
  return event.title[language] || event.title.en || event.title.nl || '';
}

/**
 * Helper to get localized description from event
 */
export function getEventDescription(event: AgendaEvent, language: string): string {
  if (typeof event.description === 'string') {
    return event.description;
  }
  return event.description[language] || event.description.en || event.description.nl || '';
}

/**
 * Helper to get primary image URL from event
 */
export function getEventImage(event: AgendaEvent): string | undefined {
  if (!event.images || event.images.length === 0) {
    return undefined;
  }
  const primary = event.images.find((img) => img.isPrimary);
  return primary?.url || event.images[0]?.url;
}
