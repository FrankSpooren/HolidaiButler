interface RatingProps {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
}

export default function Rating({ value, count, size = 'md' }: RatingProps) {
  const stars = Math.round(value * 2) / 2; // Round to nearest 0.5
  const textSize = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <div className={`flex items-center gap-1 ${textSize}`}>
      <div className="flex" aria-label={`${value} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={i <= stars ? 'text-accent' : 'text-gray-300'}
          >
            ★
          </span>
        ))}
      </div>
      <span className="text-foreground font-medium">{value.toFixed(1)}</span>
      {count !== undefined && (
        <span className="text-muted">({count})</span>
      )}
    </div>
  );
}
