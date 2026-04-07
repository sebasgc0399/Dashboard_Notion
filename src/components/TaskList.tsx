import { useEffect, useMemo, useRef, useState } from "react";
import { SelectPopover } from "@/components/SelectPopover";
import { StatusChip } from "@/components/StatusChip";
import { getNotionColor } from "@/constants";
import { cn } from "@/lib/utils";
import type { Task, DbSchema, SchemaOption, TaskUpdate } from "@/types";

interface TaskListProps {
  tasks: Task[];
  tasksSchema: DbSchema | null;
  pendingMutations: Set<string>;
  updateTask: (taskId: string, fields: TaskUpdate) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es", { day: "numeric", month: "short" });
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

interface DateCellProps {
  value: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
}

/**
 * Click-to-edit date cell.
 *
 * UX contract:
 * - onChange (input event)  = "confirm and close" → fires updateTask
 * - onBlur (focus loss)     = "cancel and close"  → does NOT fire updateTask
 * - Escape key              = "cancel and close"  → does NOT fire updateTask
 *
 * This separation avoids the onChange/onBlur race some browsers exhibit
 * when the native picker is dismissed.
 */
function DateCell({ value, onChange, disabled = false }: DateCellProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      // Best-effort: try to open the native picker immediately.
      // showPicker() may not exist on older browsers — falls back to manual click.
      try {
        inputRef.current?.showPicker?.();
      } catch {
        /* swallow — picker will open on subsequent click */
      }
    }
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        value={value ?? ""}
        onChange={(e) => {
          // confirm and close
          onChange(e.target.value || null);
          setEditing(false);
        }}
        onBlur={() => {
          // cancel and close (does NOT call onChange)
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
        className="border-0 bg-transparent p-0 font-mono text-xs text-text-primary focus:outline-none"
        style={{ colorScheme: "dark" }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      className="cursor-pointer border-0 bg-transparent p-0 font-mono text-xs text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      {formatDate(value)}
    </button>
  );
}

export function TaskList({
  tasks,
  tasksSchema,
  pendingMutations,
  updateTask,
}: TaskListProps) {
  const statusOptions = useMemo(
    () =>
      tasksSchema?.status ??
      deriveOptionsFromValues(tasks.map((t) => t.status)),
    [tasksSchema, tasks]
  );
  const priorityOptions = useMemo(
    () =>
      tasksSchema?.priority ??
      deriveOptionsFromValues(tasks.map((t) => t.priority)),
    [tasksSchema, tasks]
  );

  const statusColorMap = useMemo(
    () => buildColorMap(statusOptions),
    [statusOptions]
  );
  const priorityColorMap = useMemo(
    () => buildColorMap(priorityOptions),
    [priorityOptions]
  );

  const pendingByTask = useMemo(() => {
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
              <th className="pb-2 pr-4 font-medium">Tarea</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Prioridad</th>
              <th className="pb-2 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const isPending = pendingByTask.has(task.id);
              return (
                <tr
                  key={task.id}
                  className={cn(
                    "border-b border-border-subtle/50 transition-colors hover:bg-bg-hover",
                    isPending && "opacity-60"
                  )}
                >
                  <td className="py-3 pr-4 text-text-primary">{task.name}</td>
                  <td className="py-3 pr-4">
                    <SelectPopover
                      options={statusOptions}
                      value={task.status}
                      onChange={(v) => {
                        if (v) updateTask(task.id, { status: v });
                      }}
                    >
                      <StatusChip
                        label={task.status}
                        colorMap={statusColorMap}
                      />
                    </SelectPopover>
                  </td>
                  <td className="py-3 pr-4">
                    <SelectPopover
                      options={priorityOptions}
                      value={task.priority}
                      allowClear
                      clearLabel="Sin prioridad"
                      onChange={(v) => updateTask(task.id, { priority: v })}
                    >
                      {task.priority ? (
                        <StatusChip
                          label={task.priority}
                          colorMap={priorityColorMap}
                        />
                      ) : (
                        <span className="text-xs text-text-muted hover:text-text-secondary">
                          —
                        </span>
                      )}
                    </SelectPopover>
                  </td>
                  <td className="py-3">
                    <DateCell
                      value={task.date}
                      onChange={(v) => updateTask(task.id, { date: v })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards stacked */}
      <div className="space-y-2 md:hidden">
        {tasks.map((task) => {
          const isPending = pendingByTask.has(task.id);
          return (
            <div
              key={task.id}
              className={cn(
                "space-y-2 rounded-lg border border-border-subtle bg-bg-elevated p-3 transition-opacity",
                isPending && "opacity-60"
              )}
            >
              <p className="text-sm font-medium text-text-primary">
                {task.name}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <SelectPopover
                  options={statusOptions}
                  value={task.status}
                  onChange={(v) => {
                    if (v) updateTask(task.id, { status: v });
                  }}
                >
                  <StatusChip label={task.status} colorMap={statusColorMap} />
                </SelectPopover>
                <SelectPopover
                  options={priorityOptions}
                  value={task.priority}
                  allowClear
                  clearLabel="Sin prioridad"
                  onChange={(v) => updateTask(task.id, { priority: v })}
                >
                  {task.priority ? (
                    <StatusChip
                      label={task.priority}
                      colorMap={priorityColorMap}
                    />
                  ) : (
                    <span className="text-xs text-text-muted hover:text-text-secondary">
                      Sin prioridad
                    </span>
                  )}
                </SelectPopover>
                <DateCell
                  value={task.date}
                  onChange={(v) => updateTask(task.id, { date: v })}
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
