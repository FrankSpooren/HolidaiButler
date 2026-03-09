interface FeatureListProps {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
}

/** Normalize items that may be strings or objects like {key: boolean} */
function normalizeItem(item: unknown): string | null {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    // Format: {"Wheelchair accessible entrance": true}
    const entries = Object.entries(item as Record<string, unknown>);
    if (entries.length === 0) return null;
    const [key, val] = entries[0];
    if (val === false) return null; // Skip features marked as unavailable
    return key;
  }
  return null;
}

export default function FeatureList({ title, items }: FeatureListProps) {
  if (!items || items.length === 0) return null;

  const normalized = items.map(normalizeItem).filter((s): s is string => s !== null);
  if (normalized.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {normalized.map((item) => (
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
