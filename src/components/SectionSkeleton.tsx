import { Skeleton } from "@/components/ui/skeleton";

interface SectionSkeletonProps {
  type: "chart" | "list" | "heatmap" | "stats";
}

export function SectionSkeleton({ type }: SectionSkeletonProps) {
  if (type === "stats") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl bg-bg-elevated" />
        ))}
      </div>
    );
  }

  if (type === "chart") {
    return (
      <div className="space-y-3 rounded-xl border border-border-subtle bg-bg-card p-5">
        <Skeleton className="h-4 w-32 bg-bg-elevated" />
        <Skeleton className="h-48 w-full bg-bg-elevated" />
      </div>
    );
  }

  if (type === "heatmap") {
    return (
      <div className="space-y-3 rounded-xl border border-border-subtle bg-bg-card p-5">
        <Skeleton className="h-4 w-40 bg-bg-elevated" />
        <div className="grid grid-cols-10 gap-1.5 sm:grid-cols-15">
          {Array.from({ length: 60 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-sm bg-bg-elevated" />
          ))}
        </div>
      </div>
    );
  }

  // list
  return (
    <div className="space-y-2 rounded-xl border border-border-subtle bg-bg-card p-5">
      <Skeleton className="h-4 w-28 bg-bg-elevated" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full bg-bg-elevated" />
      ))}
    </div>
  );
}
