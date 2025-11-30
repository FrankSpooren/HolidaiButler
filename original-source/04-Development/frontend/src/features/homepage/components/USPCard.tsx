/**
 * USPCard - Individual USP (Unique Selling Point) card
 *
 * Features:
 * - Icon or logo display
 * - Title and description
 * - Hover effect
 * - Consistent min-height
 */

interface USPCardProps {
  icon?: string;
  title: string;
  description: string;
  logoSrc?: string;
}

export function USPCard({ icon, title, description, logoSrc }: USPCardProps) {
  return (
    <div className="bg-gray-50 rounded-2xl p-6 md:p-5 text-center transition-all duration-300 border-2 border-transparent hover:border-holibot-primary hover:shadow-xl hover:-translate-y-1 min-h-[220px] flex flex-col justify-start items-center">
      {/* Icon or Logo */}
      {logoSrc ? (
        <img
          src={logoSrc}
          alt={title}
          className="w-20 h-20 object-contain mb-3"
        />
      ) : (
        <div className="text-6xl leading-[80px] mb-3">{icon}</div>
      )}

      {/* Title */}
      <h3 className="text-[18px] md:text-[18px] font-bold text-gray-800 mb-2 leading-tight">
        {title}
      </h3>

      {/* Description */}
      <p className="text-[15px] text-gray-600 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
