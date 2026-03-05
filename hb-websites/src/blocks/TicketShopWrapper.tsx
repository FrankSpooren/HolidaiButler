'use client';

import dynamic from 'next/dynamic';
import type { TicketShopProps } from '@/types/blocks';

const TicketShop = dynamic(() => import('./TicketShop'), { ssr: false });

export default function TicketShopWrapper(props: TicketShopProps) {
  return <TicketShop {...props} />;
}
