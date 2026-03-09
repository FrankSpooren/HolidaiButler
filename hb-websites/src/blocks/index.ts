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
import Video from './Video';
import SocialFeedWrapper from './SocialFeedWrapper';
import ContactForm from './ContactForm';
import Newsletter from './Newsletter';
import WeatherWidget from './WeatherWidget';
import Banner from './Banner';
import Partners from './Partners';
import Downloads from './Downloads';
import PoiGridFiltered from './PoiGridFiltered';
import EventCalendarFiltered from './EventCalendarFiltered';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

export const blockRegistry: Record<string, AnyComponent> = {
  hero: Hero,
  poi_grid: PoiGrid,
  poi_grid_filtered: PoiGridFiltered,
  event_calendar: EventCalendar,
  event_calendar_filtered: EventCalendarFiltered,
  rich_text: RichText,
  card_group: CardGroup,
  map: MapWrapper,
  testimonials: Testimonials,
  cta: Cta,
  gallery: Gallery,
  faq: Faq,
  ticket_shop: TicketShopWrapper,
  reservation_widget: ReservationWidgetWrapper,
  video: Video,
  social_feed: SocialFeedWrapper,
  contact_form: ContactForm,
  newsletter: Newsletter,
  weather_widget: WeatherWidget,
  banner: Banner,
  partners: Partners,
  downloads: Downloads,
};

export function getBlock(type: BlockType): AnyComponent | null {
  return blockRegistry[type] ?? null;
}
