import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Icon className="size-10 text-text-muted" strokeWidth={1.5} />
      <p className="max-w-xs text-sm text-text-secondary">{message}</p>
      {action}
    </div>
  );
}
