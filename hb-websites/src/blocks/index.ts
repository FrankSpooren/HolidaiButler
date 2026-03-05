import type { ComponentType } from 'react';
import type { BlockType } from '@/types/blocks';
import Hero from './Hero';
import PoiGrid from './PoiGrid';
import EventCalendar from './EventCalendar';
import RichText from './RichText';
import CardGroup from './CardGroup';
import MapWrapper from './MapWrapper';
import Testimonials from './Testimonials';
import Cta from './Cta';
import Gallery from './Gallery';
import Faq from './Faq';
import TicketShopWrapper from './TicketShopWrapper';
import ReservationWidgetWrapper from './ReservationWidgetWrapper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

export const blockRegistry: Record<string, AnyComponent> = {
  hero: Hero,
  poi_grid: PoiGrid,
  event_calendar: EventCalendar,
  rich_text: RichText,
  card_group: CardGroup,
  map: MapWrapper,
  testimonials: Testimonials,
  cta: Cta,
  gallery: Gallery,
  faq: Faq,
  ticket_shop: TicketShopWrapper,
  reservation_widget: ReservationWidgetWrapper,
};

export function getBlock(type: BlockType): AnyComponent | null {
  return blockRegistry[type] ?? null;
}
