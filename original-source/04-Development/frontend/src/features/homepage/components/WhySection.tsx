/**
 * WhySection - Simple section with "Why HolidaiButler?" title
 *
 * Features:
 * - White background
 * - Centered text
 * - Separates hero from USP section
 */

export function WhySection() {
  return (
    <section className="bg-white py-6 text-center border-b border-gray-200">
      <h2 className="text-[20px] md:text-[24px] font-black text-gray-800 tracking-wide">
        Why HolidaiButler?
      </h2>
    </section>
  );
}
