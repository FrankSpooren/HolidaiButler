'use client';

import { useEffect, useState } from 'react';
import type { TicketShopProps } from '@/types/blocks';
import type { Ticket } from '@/types/poi';
import { analytics } from '@/lib/analytics';

export default function TicketShop({ limit, layout = 'grid', showPrices = true }: TicketShopProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (limit) params.set('limit', String(limit));

        const res = await fetch(`/api/tickets?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setTickets(data.data ?? []);
        }
      } catch {
        // fail silently — tickets are optional
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [limit]);

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" style={{ containerType: 'inline-size' }} role="region" aria-label="Tickets">
        <div className="ticket-grid">
          {Array.from({ length: limit ?? 3 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-tenant overflow-hidden shadow-sm animate-pulse">
              <div className="h-48 bg-muted/20" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-muted/20 rounded w-3/4" />
                <div className="h-4 bg-muted/20 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (tickets.length === 0) return null;

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(cents / 100);
  };

  if (layout === 'list') {
    return (
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-4">
          {tickets.map(ticket => (
            <div key={ticket.id} className="flex items-center gap-4 bg-surface rounded-tenant shadow-sm p-4">
              {ticket.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ticket.image_url}
                  alt={ticket.name}
                  loading="lazy"
                  className="w-20 h-20 object-cover rounded-tenant shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-heading font-semibold text-foreground truncate">{ticket.name}</h3>
                <p className="text-sm text-muted line-clamp-1 mt-1">{ticket.description}</p>
                <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {ticket.category}
                </span>
              </div>
              <div className="text-right shrink-0">
                {showPrices && (
                  <p className="text-lg font-bold text-foreground">
                    {formatPrice(ticket.price_cents, ticket.currency)}
                  </p>
                )}
                <a
                  href={`/tickets/${ticket.id}`}
                  className="inline-block mt-2 px-4 py-2 text-sm bg-primary text-on-primary rounded-tenant hover:bg-primary-dark transition-colors"
                  onClick={() => analytics.ticket_buy_clicked(ticket.name)}
                >
                  Koop
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tickets.map(ticket => (
          <div key={ticket.id} className="bg-surface rounded-tenant overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {ticket.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ticket.image_url}
                alt={ticket.name}
                loading="lazy"
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-4">
              <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mb-2">
                {ticket.category}
              </span>
              <h3 className="text-lg font-heading font-semibold text-foreground">{ticket.name}</h3>
              <p className="text-sm text-muted line-clamp-2 mt-1">{ticket.description}</p>
              <div className="flex items-center justify-between mt-4">
                {showPrices && (
                  <p className="text-xl font-bold text-foreground">
                    {formatPrice(ticket.price_cents, ticket.currency)}
                  </p>
                )}
                {ticket.available_quantity <= 5 && ticket.available_quantity > 0 && (
                  <span className="text-xs text-red-600 font-medium">
                    Nog {ticket.available_quantity} beschikbaar
                  </span>
                )}
              </div>
              <a
                href={`/tickets/${ticket.id}`}
                className="block mt-4 text-center px-4 py-2.5 bg-primary text-on-primary rounded-tenant font-medium hover:bg-primary-dark transition-colors"
                onClick={() => analytics.ticket_buy_clicked(ticket.name)}
              >
                Koop ticket
              </a>
            </div>
          </div>
        ))}
      </div>
    
      <style dangerouslySetInnerHTML={{ __html: `
        .ticket-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @container (min-width: 600px) {
          .ticket-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @container (min-width: 900px) {
          .ticket-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}} />
    </section>
  );
}
