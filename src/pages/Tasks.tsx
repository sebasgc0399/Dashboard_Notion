import { ListChecks } from "lucide-react";
import { SectionSkeleton } from "@/components/SectionSkeleton";
import { ErrorInline } from "@/components/ErrorInline";
import { EmptyState } from "@/components/EmptyState";
import { TaskList } from "@/components/TaskList";
import type { Task, DbSchema, TaskUpdate } from "@/types";

interface TasksProps {
  tasks: Task[] | null;
  loading: boolean;
  error?: string;
  onRetry: () => void;
  tasksSchema: DbSchema | null;
  pendingMutations: Set<string>;
  updateTask: (taskId: string, fields: TaskUpdate) => void;
}

export function Tasks({
  tasks,
  loading,
  error,
  onRetry,
  tasksSchema,
  pendingMutations,
  updateTask,
}: TasksProps) {
  if (loading) {
    return (
      <div className="animate-fade-in">
        <SectionSkeleton type="list" />
      </div>
    );
  }

  if (error) {
    return <ErrorInline message={error} onRetry={onRetry} />;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        message="No hay tareas activas. ¡Todo al día!"
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <section className="rounded-xl border border-border-subtle bg-bg-card p-5">
        <h2 className="mb-4 text-sm font-medium text-text-secondary">
          Tareas activas
          <span className="ml-2 font-mono text-text-muted">({tasks.length})</span>
        </h2>
        <TaskList
          tasks={tasks}
          tasksSchema={tasksSchema}
          pendingMutations={pendingMutations}
          updateTask={updateTask}
        />
      </section>
    </div>
  );
}
