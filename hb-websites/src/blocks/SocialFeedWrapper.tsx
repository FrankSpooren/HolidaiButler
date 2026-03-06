'use client';

import dynamic from 'next/dynamic';
import type { SocialFeedProps } from '@/types/blocks';

const SocialFeed = dynamic(() => import('./SocialFeed'), { ssr: false });

export default function SocialFeedWrapper(props: SocialFeedProps) {
  return <SocialFeed {...props} />;
}
