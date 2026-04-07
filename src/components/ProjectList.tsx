import { useMemo } from "react";
import { SelectPopover } from "@/components/SelectPopover";
import { StatusChip } from "@/components/StatusChip";
import { getNotionColor } from "@/constants";
import { cn } from "@/lib/utils";
import type {
  Project,
  DbSchema,
  SchemaOption,
  ProjectUpdate,
} from "@/types";

interface ProjectListProps {
  projects: Project[];
  projectsSchema: DbSchema | null;
  pendingMutations: Set<string>;
  updateProject: (projectId: string, fields: ProjectUpdate) => void;
}

function deriveOptionsFromValues(
  values: Array<string | null>
): SchemaOption[] {
  const seen = new Set<string>();
  for (const v of values) if (v) seen.add(v);
  return Array.from(seen).map((name) => ({ name, color: "default" }));
}

function buildColorMap(options: SchemaOption[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const opt of options) {
    map[opt.name] = getNotionColor(opt.color).text;
  }
  return map;
}

export function ProjectList({
  projects,
  projectsSchema,
  pendingMutations,
  updateProject,
}: ProjectListProps) {
  const statusOptions = useMemo(
    () =>
      projectsSchema?.status ??
      deriveOptionsFromValues(projects.map((p) => p.status)),
    [projectsSchema, projects]
  );
  const priorityOptions = useMemo(
    () =>
      projectsSchema?.priority ??
      deriveOptionsFromValues(projects.map((p) => p.priority)),
    [projectsSchema, projects]
  );

  const statusColorMap = useMemo(
    () => buildColorMap(statusOptions),
    [statusOptions]
  );
  const priorityColorMap = useMemo(
    () => buildColorMap(priorityOptions),
    [priorityOptions]
  );

  const pendingByProject = useMemo(() => {
    const set = new Set<string>();
    for (const key of pendingMutations) {
      const colon = key.indexOf(":");
      if (colon > 0) set.add(key.slice(0, colon));
    }
    return set;
  }, [pendingMutations]);

  return (
    <>
      {/* Desktop/tablet: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs text-text-muted">
              <th className="pb-2 pr-4 font-medium">Proyecto</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 font-medium">Prioridad</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const isPending = pendingByProject.has(project.id);
              return (
                <tr
                  key={project.id}
                  className={cn(
                    "border-b border-border-subtle/50 transition-colors hover:bg-bg-hover",
                    isPending && "opacity-60"
                  )}
                >
                  <td className="py-3 pr-4 text-text-primary">
                    {project.name}
                  </td>
                  <td className="py-3 pr-4">
                    <SelectPopover
                      options={statusOptions}
                      value={project.status}
                      onChange={(v) => {
                        if (v) updateProject(project.id, { status: v });
                      }}
                    >
                      <StatusChip
                        label={project.status}
                        colorMap={statusColorMap}
                      />
                    </SelectPopover>
                  </td>
                  <td className="py-3">
                    <SelectPopover
                      options={priorityOptions}
                      value={project.priority}
                      allowClear
                      clearLabel="Sin prioridad"
                      onChange={(v) =>
                        updateProject(project.id, { priority: v })
                      }
                    >
                      {project.priority ? (
                        <StatusChip
                          label={project.priority}
                          colorMap={priorityColorMap}
                        />
                      ) : (
                        <span className="text-xs text-text-muted hover:text-text-secondary">
                          —
                        </span>
                      )}
                    </SelectPopover>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards stacked */}
      <div className="space-y-2 md:hidden">
        {projects.map((project) => {
          const isPending = pendingByProject.has(project.id);
          return (
            <div
              key={project.id}
              className={cn(
                "space-y-2 rounded-lg border border-border-subtle bg-bg-elevated p-3 transition-opacity",
                isPending && "opacity-60"
              )}
            >
              <p className="text-sm font-medium text-text-primary">
                {project.name}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <SelectPopover
                  options={statusOptions}
                  value={project.status}
                  onChange={(v) => {
                    if (v) updateProject(project.id, { status: v });
                  }}
                >
                  <StatusChip
                    label={project.status}
                    colorMap={statusColorMap}
                  />
                </SelectPopover>
                <SelectPopover
                  options={priorityOptions}
                  value={project.priority}
                  allowClear
                  clearLabel="Sin prioridad"
                  onChange={(v) => updateProject(project.id, { priority: v })}
                >
                  {project.priority ? (
                    <StatusChip
                      label={project.priority}
                      colorMap={priorityColorMap}
                    />
                  ) : (
                    <span className="text-xs text-text-muted hover:text-text-secondary">
                      Sin prioridad
                    </span>
                  )}
                </SelectPopover>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
