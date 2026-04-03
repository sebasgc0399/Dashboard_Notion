import { FolderKanban } from "lucide-react";
import { SectionSkeleton } from "@/components/SectionSkeleton";
import { ErrorInline } from "@/components/ErrorInline";
import { EmptyState } from "@/components/EmptyState";
import { ProjectBarChart } from "@/components/Charts";
import { ProjectList } from "@/components/ProjectList";
import type { Project } from "@/types";

interface ProjectsProps {
  projects: Project[] | null;
  projectsByStatus: Record<string, number>;
  loading: boolean;
  error?: string;
  onRetry: () => void;
}

export function Projects({
  projects,
  projectsByStatus,
  loading,
  error,
  onRetry,
}: ProjectsProps) {
  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <SectionSkeleton type="chart" />
        <SectionSkeleton type="list" />
      </div>
    );
  }

  if (error) {
    return <ErrorInline message={error} onRetry={onRetry} />;
  }

  if (!projects || projects.length === 0) {
    return (
      <EmptyState icon={FolderKanban} message="No hay proyectos activos" />
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Distribution chart */}
      {Object.keys(projectsByStatus).length > 0 && (
        <section className="rounded-xl border border-border-subtle bg-bg-card p-5">
          <h2 className="mb-4 text-sm font-medium text-text-secondary">
            Distribución por status
          </h2>
          <ProjectBarChart data={projectsByStatus} />
        </section>
      )}

      {/* Project list */}
      <section className="rounded-xl border border-border-subtle bg-bg-card p-5">
        <h2 className="mb-4 text-sm font-medium text-text-secondary">
          Todos los proyectos
          <span className="ml-2 font-mono text-text-muted">
            ({projects.length})
          </span>
        </h2>
        <ProjectList projects={projects} />
      </section>
    </div>
  );
}
