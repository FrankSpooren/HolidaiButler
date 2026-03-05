'use client';

import dynamic from 'next/dynamic';
import type { ReservationWidgetProps } from '@/types/blocks';

const ReservationWidget = dynamic(() => import('./ReservationWidget'), { ssr: false });

export default function ReservationWidgetWrapper(props: ReservationWidgetProps) {
  return <ReservationWidget {...props} />;
}
