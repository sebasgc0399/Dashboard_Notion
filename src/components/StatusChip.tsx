interface StatusChipProps {
  label: string;
  colorMap: Record<string, string>;
}

const FALLBACK_COLOR = "#71717a";

export function StatusChip({ label, colorMap }: StatusChipProps) {
  const color = colorMap[label] || FALLBACK_COLOR;

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      {label}
    </span>
  );
}
