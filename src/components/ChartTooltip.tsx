interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  label?: string;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number) => string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const displayLabel = labelFormatter ? labelFormatter(label ?? "") : label;

  return (
    <div className="rounded-lg border border-border-default bg-bg-card px-3 py-2 shadow-lg">
      {displayLabel && (
        <p className="mb-1 text-xs font-medium text-text-secondary">
          {displayLabel}
        </p>
      )}
      <div className="space-y-0.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {entry.color && (
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
            )}
            <span className="text-text-secondary">{entry.name}</span>
            <span className="ml-auto font-mono font-medium text-text-primary">
              {valueFormatter ? valueFormatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
