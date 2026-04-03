import { StatusChip } from "@/components/StatusChip";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/constants";
import type { Task } from "@/types";

interface TaskListProps {
  tasks: Task[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es", { day: "numeric", month: "short" });
}

export function TaskList({ tasks }: TaskListProps) {
  return (
    <>
      {/* Desktop/tablet: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs text-text-muted">
              <th className="pb-2 pr-4 font-medium">Tarea</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Prioridad</th>
              <th className="pb-2 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                className="border-b border-border-subtle/50 transition-colors hover:bg-bg-hover"
              >
                <td className="py-3 pr-4 text-text-primary">{task.name}</td>
                <td className="py-3 pr-4">
                  <StatusChip label={task.status} colorMap={STATUS_COLORS} />
                </td>
                <td className="py-3 pr-4">
                  {task.priority ? (
                    <StatusChip label={task.priority} colorMap={PRIORITY_COLORS} />
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="py-3 font-mono text-xs text-text-secondary">
                  {formatDate(task.date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards stacked */}
      <div className="space-y-2 md:hidden">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-lg border border-border-subtle bg-bg-elevated p-3 space-y-2"
          >
            <p className="text-sm font-medium text-text-primary">{task.name}</p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip label={task.status} colorMap={STATUS_COLORS} />
              {task.priority && (
                <StatusChip label={task.priority} colorMap={PRIORITY_COLORS} />
              )}
              {task.date && (
                <span className="font-mono text-xs text-text-muted">
                  {formatDate(task.date)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
