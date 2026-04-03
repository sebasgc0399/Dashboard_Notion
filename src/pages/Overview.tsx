import {
  Activity,
  TrendingUp,
  CheckSquare,
  FolderOpen,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { SectionSkeleton } from "@/components/SectionSkeleton";
import { ErrorInline } from "@/components/ErrorInline";
import { EmptyState } from "@/components/EmptyState";
import { StatusChip } from "@/components/StatusChip";
import { TrendLineChart, TaskPieChart } from "@/components/Charts";
import { STATUS_COLORS } from "@/constants";
import type { NotionData } from "@/types";

type OverviewProps = Pick<
  NotionData,
  | "habits"
  | "tasks"
  | "projects"
  | "loading"
  | "errors"
  | "habitTrend"
  | "avgPct"
  | "todayData"
  | "tasksByStatus"
  | "refresh"
>;

export function Overview({
  habits,
  tasks,
  projects,
  loading,
  errors,
  habitTrend,
  avgPct,
  todayData,
  tasksByStatus,
  refresh,
}: OverviewProps) {
  const activeTaskCount = tasks?.length ?? null;
  const inProgressProjects =
    projects?.filter((p) => p.status === "In Progress") ?? [];

  return (
    <div className="animate-fade-in space-y-6">
      {/* KPIs */}
      {loading.habits && loading.tasks && loading.projects ? (
        <SectionSkeleton type="stats" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Hábitos hoy"
            value={todayData ? `${todayData.pct}%` : null}
            subtitle={
              todayData ? `${todayData.count} de 14 completados` : undefined
            }
            icon={Activity}
          />
          <StatCard
            title="Promedio 30d"
            value={habits ? `${avgPct}%` : null}
            subtitle="Últimos 30 días"
            icon={TrendingUp}
          />
          <StatCard
            title="Tareas activas"
            value={activeTaskCount}
            subtitle="Sin completar"
            icon={CheckSquare}
          />
          <StatCard
            title="En progreso"
            value={
              projects
                ? inProgressProjects.length
                : null
            }
            subtitle="Proyectos activos"
            icon={FolderOpen}
          />
        </div>
      )}

      {/* Habit trend chart */}
      <section className="rounded-xl border border-border-subtle bg-bg-card p-5">
        <h2 className="mb-4 text-sm font-medium text-text-secondary">
          Tendencia de hábitos
        </h2>
        {loading.habits ? (
          <SectionSkeleton type="chart" />
        ) : errors.habits ? (
          <ErrorInline message={errors.habits} onRetry={refresh} />
        ) : habitTrend.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            message="No hay registros de hábitos en los últimos 30 días"
          />
        ) : (
          <TrendLineChart data={habitTrend} />
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Task pie chart */}
        <section className="rounded-xl border border-border-subtle bg-bg-card p-5">
          <h2 className="mb-4 text-sm font-medium text-text-secondary">
            Tareas por status
          </h2>
          {loading.tasks ? (
            <SectionSkeleton type="chart" />
          ) : errors.tasks ? (
            <ErrorInline message={errors.tasks} onRetry={refresh} />
          ) : Object.keys(tasksByStatus).length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              message="No hay tareas activas. ¡Todo al día!"
            />
          ) : (
            <TaskPieChart data={tasksByStatus} />
          )}
        </section>

        {/* In Progress projects list */}
        <section className="rounded-xl border border-border-subtle bg-bg-card p-5">
          <h2 className="mb-4 text-sm font-medium text-text-secondary">
            Proyectos en progreso
          </h2>
          {loading.projects ? (
            <SectionSkeleton type="list" />
          ) : errors.projects ? (
            <ErrorInline message={errors.projects} onRetry={refresh} />
          ) : inProgressProjects.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              message="No hay proyectos en progreso"
            />
          ) : (
            <div className="space-y-2">
              {inProgressProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between rounded-lg border border-border-subtle/50 bg-bg-elevated px-3 py-2.5"
                >
                  <span className="text-sm text-text-primary">
                    {project.name}
                  </span>
                  <StatusChip
                    label={project.status}
                    colorMap={STATUS_COLORS}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
