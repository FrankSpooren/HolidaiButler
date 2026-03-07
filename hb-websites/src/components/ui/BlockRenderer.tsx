'use client';

import type { ReactNode } from 'react';
import BlockErrorBoundary from './BlockErrorBoundary';

interface BlockRendererProps {
  blockType: string;
  children: ReactNode;
}

export default function BlockRenderer({ blockType, children }: BlockRendererProps) {
  return (
    <BlockErrorBoundary blockType={blockType}>
      {children}
    </BlockErrorBoundary>
  );
}
