'use client';

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  blockType: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class BlockErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[BlockErrorBoundary] Block "${this.props.blockType}" crashed:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-600 text-sm">
              This section could not be loaded.
            </p>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
