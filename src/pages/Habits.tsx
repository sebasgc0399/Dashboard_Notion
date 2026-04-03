import { CalendarDays, BarChart3 } from "lucide-react";
import { SectionSkeleton } from "@/components/SectionSkeleton";
import { ErrorInline } from "@/components/ErrorInline";
import { EmptyState } from "@/components/EmptyState";
import { HabitHeatmap } from "@/components/HabitHeatmap";
import { HabitConsistencyChart } from "@/components/HabitConsistencyChart";
import type { HabitDay, HabitFreq } from "@/types";

interface HabitsProps {
  habits: HabitDay[] | null;
  habitFreq: HabitFreq[];
  loading: boolean;
  error?: string;
  onRetry: () => void;
}

export function Habits({ habits, habitFreq, loading, error, onRetry }: HabitsProps) {
  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <SectionSkeleton type="heatmap" />
        <SectionSkeleton type="chart" />
      </div>
    );
  }

  if (error) {
    return <ErrorInline message={error} onRetry={onRetry} />;
  }

  if (!habits || habits.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        message="No hay registros de hábitos en los últimos 30 días"
      />
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Heatmap */}
      <section className="rounded-xl border border-border-subtle bg-bg-card p-5">
        <h2 className="mb-4 text-sm font-medium text-text-secondary">
          Hábitos diarios
        </h2>
        <HabitHeatmap habits={habits} />
      </section>

      {/* Consistency chart */}
      <section className="rounded-xl border border-border-subtle bg-bg-card p-5">
        <h2 className="mb-4 text-sm font-medium text-text-secondary">
          Consistencia por hábito
        </h2>
        {habitFreq.length === 0 ? (
          <EmptyState icon={BarChart3} message="Sin datos de consistencia" />
        ) : (
          <HabitConsistencyChart data={habitFreq} />
        )}
      </section>
    </div>
  );
}
