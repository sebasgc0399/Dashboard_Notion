import { StatusChip } from "@/components/StatusChip";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/constants";
import type { Project } from "@/types";

interface ProjectListProps {
  projects: Project[];
}

export function ProjectList({ projects }: ProjectListProps) {
  return (
    <>
      {/* Desktop/tablet: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs text-text-muted">
              <th className="pb-2 pr-4 font-medium">Proyecto</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 font-medium">Prioridad</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                className="border-b border-border-subtle/50 transition-colors hover:bg-bg-hover"
              >
                <td className="py-3 pr-4 text-text-primary">{project.name}</td>
                <td className="py-3 pr-4">
                  <StatusChip label={project.status} colorMap={STATUS_COLORS} />
                </td>
                <td className="py-3">
                  {project.priority ? (
                    <StatusChip label={project.priority} colorMap={PRIORITY_COLORS} />
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards stacked */}
      <div className="space-y-2 md:hidden">
        {projects.map((project) => (
          <div
            key={project.id}
            className="rounded-lg border border-border-subtle bg-bg-elevated p-3 space-y-2"
          >
            <p className="text-sm font-medium text-text-primary">
              {project.name}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip label={project.status} colorMap={STATUS_COLORS} />
              {project.priority && (
                <StatusChip label={project.priority} colorMap={PRIORITY_COLORS} />
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
