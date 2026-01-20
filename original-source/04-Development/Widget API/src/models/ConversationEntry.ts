import { POIReference } from './POIReference';

export interface ConversationEntry {
  query: string;
  timestamp: string;
  searchType: string;
  resultCount: number;
  results: POIReference[];
}
