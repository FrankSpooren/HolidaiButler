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
import DesktopHero from './DesktopHero';
import DesktopProgramTip from './DesktopProgramTip';
import DesktopEvents from './DesktopEvents';
import CategoryGrid from './CategoryGrid';
import TipOfTheDayBlock from './MobileTip';
import MobileMap from './MobileMap';
import AlertStatus from './AlertStatus';
import Search from './Search';
import FilterBar from './FilterBar';
import MapList from './MapList';
import RelatedItems from './RelatedItems';
import FeaturedItem from './FeaturedItem';
import AddToCalendar from './AddToCalendar';
import OpeningHours from './OpeningHours';
import LocationDetails from './LocationDetails';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

export const blockRegistry: Record<string, AnyComponent> = {
  hero: Hero,
  poi_grid: PoiGrid,
  poi_grid_filtered: PoiGridFiltered,
  event_calendar: EventCalendar,
  event_calendar_filtered: EventCalendarFiltered,
  rich_text: RichText,
  curated_cards: CardGroup,
  card_group: CardGroup, // alias -> CuratedCards (backwards-compat)
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
  alert_status: AlertStatus,
  partners: Partners,
  downloads: Downloads,
  desktop_hero: DesktopHero,
  hero_chatbot: DesktopHero,
  programme: DesktopProgramTip,
  desktop_program_tip: DesktopProgramTip, // alias -> Programme (E1.5)
  program_card: DesktopProgramTip,
  desktop_events: DesktopEvents,
  today_events: DesktopEvents,
  category_grid: CategoryGrid,
  popular_pois: PoiGrid,
  map_preview: MapWrapper,
  mobile_program: DesktopProgramTip, // alias -> Programme (E1.5 consolidation)
  tip_of_the_day: TipOfTheDayBlock,
  mobile_tip: TipOfTheDayBlock, // alias -> TipOfTheDay (E1.6)
  mobile_events: DesktopEvents, // alias -> TodayEvents (E1.4 consolidation)
  mobile_map: MobileMap,
  search: Search,
  filter_bar: FilterBar,
  map_list: MapList,
  related_items: RelatedItems,
  featured_item: FeaturedItem,
  add_to_calendar: AddToCalendar,
  opening_hours: OpeningHours,
  location_details: LocationDetails,
  // PascalCase aliases (WarreWijzer + Alicante DB compatibility)
  Hero: Hero,
  RichText: RichText,
  PoiGridFiltered: PoiGridFiltered,
  ContactForm: ContactForm,
  EventCalendarFiltered: EventCalendarFiltered,
};

export function getBlock(type: BlockType): AnyComponent | null {
  return blockRegistry[type] ?? null;
}
