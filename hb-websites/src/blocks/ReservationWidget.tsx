'use client';

import { useState, useEffect } from 'react';
import type { ReservationWidgetProps } from '@/types/blocks';
import type { ReservationSlot } from '@/types/poi';
import type { POI } from '@/types/poi';
import { analytics } from '@/lib/analytics';

export default function ReservationWidget({ defaultPoiId, showSearch = true }: ReservationWidgetProps) {
  const [pois, setPois] = useState<POI[]>([]);
  const [selectedPoiId, setSelectedPoiId] = useState<number | null>(defaultPoiId ?? null);
  const [date, setDate] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [poisLoading, setPoisLoading] = useState(!defaultPoiId && showSearch);

  // Fetch reservable POIs for the dropdown
  useEffect(() => {
    if (defaultPoiId || !showSearch) return;

    const fetchPois = async () => {
      try {
        const res = await fetch('/api/reservable-pois');
        if (res.ok) {
          const data = await res.json();
          setPois(data.data ?? []);
        }
      } catch {
        // fail silently
      } finally {
        setPoisLoading(false);
      }
    };
    fetchPois();
  }, [defaultPoiId, showSearch]);

  // Set default date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const searchSlots = async () => {
    if (!selectedPoiId || !date) return;
    setLoading(true);
    setSlots([]);

    try {
      const params = new URLSearchParams({ date, partySize: String(partySize) });
      const res = await fetch(`/api/reservation-slots/${selectedPoiId}?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.data ?? []);
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // "14:30:00" → "14:30"
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-surface rounded-tenant shadow-sm p-6">
        {/* Search Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {showSearch && !defaultPoiId && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">Restaurant / Locatie</label>
              {poisLoading ? (
                <div className="h-10 bg-muted/20 rounded-tenant animate-pulse" />
              ) : (
                <select
                  className="w-full border border-border rounded-tenant px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  value={selectedPoiId ?? ''}
                  onChange={e => setSelectedPoiId(Number(e.target.value) || null)}
                >
                  <option value="">Kies een locatie...</option>
                  {pois.map(poi => (
                    <option key={poi.id} value={poi.id}>{poi.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Datum</label>
            <input
              type="date"
              className="w-full border border-border rounded-tenant px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={date}
              min={today}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Aantal personen</label>
            <select
              className="w-full border border-border rounded-tenant px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={partySize}
              onChange={e => setPartySize(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'persoon' : 'personen'}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              className="w-full px-4 py-2.5 bg-primary text-on-primary rounded-tenant font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => { analytics.reservation_search_clicked(); searchSlots(); }}
              disabled={!selectedPoiId || !date || loading}
            >
              {loading ? 'Zoeken...' : 'Zoek beschikbaarheid'}
            </button>
          </div>
        </div>

        {/* Available Slots */}
        {slots.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-base font-heading font-semibold text-foreground mb-3">
              Beschikbare tijden
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {slots.map(slot => (
                <a
                  key={slot.id}
                  href={`/reservations/book?poiId=${selectedPoiId}&slotId=${slot.id}&date=${date}&partySize=${partySize}`}
                  className="border border-border rounded-tenant p-3 text-center hover:border-primary hover:bg-primary/5 transition-colors group"
                  onClick={() => analytics.reservation_slot_clicked(slot.time.slice(0, 5))}
                >
                  <p className="text-lg font-bold text-foreground group-hover:text-primary">
                    {formatTime(slot.time)}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {slot.duration_minutes} min
                  </p>
                  <p className="text-xs text-muted">
                    {slot.available_seats} {slot.available_seats === 1 ? 'plek' : 'plekken'} vrij
                  </p>
                  {slot.price_cents !== null && slot.price_cents > 0 && (
                    <p className="text-sm font-medium text-foreground mt-1">
                      {formatPrice(slot.price_cents)}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {!loading && slots.length === 0 && selectedPoiId && date && (
          <p className="mt-4 text-sm text-muted text-center">
            Zoek beschikbare tijden door op de knop te klikken.
          </p>
        )}
      </div>
    </section>
  );
}
