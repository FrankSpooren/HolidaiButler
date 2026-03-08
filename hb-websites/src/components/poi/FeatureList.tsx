interface FeatureListProps {
  title: string;
  items: string[];
}

export default function FeatureList({ title, items }: FeatureListProps) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center px-2.5 py-1 text-xs rounded-full bg-gray-100 text-foreground/70"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
