/**
 * WhySection - Simple section with "Why [Destination]?" title
 *
 * Features:
 * - Multi-destination aware
 * - White background
 * - Centered text
 * - Separates hero from USP section
 */

import { useDestination } from '@/shared/contexts/DestinationContext';

export function WhySection() {
  const destination = useDestination();

  return (
    <section className="bg-white py-6 text-center border-b border-gray-200">
      <h2 className="text-[20px] md:text-[24px] font-black text-gray-800 tracking-wide">
        Waarom {destination.name}?
      </h2>
    </section>
  );
}
