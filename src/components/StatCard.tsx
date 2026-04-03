import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number | null | undefined;
  subtitle?: string;
  icon?: LucideIcon;
}

export function StatCard({ title, value, subtitle, icon: Icon }: StatCardProps) {
  const displayValue = value == null ? "—" : value;

  return (
    <Card className="animate-fade-in border-border-subtle bg-bg-card px-5 py-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-text-muted uppercase">
          {title}
        </span>
        {Icon && <Icon className="size-4 text-text-muted" />}
      </div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight",
          displayValue === "—" ? "text-text-muted" : "text-text-primary font-mono"
        )}
      >
        {displayValue}
      </div>
      {subtitle && (
        <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
      )}
    </Card>
  );
}
