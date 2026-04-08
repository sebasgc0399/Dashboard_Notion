import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { HabitDay } from "@/types";

const COLOR_DONE = "#10b981";
const COLOR_NOT_DONE = "#27272a";
const COLOR_NO_DATA = "#131316";

interface HabitHeatmapProps {
  habits: HabitDay[];
  habitNames: string[];
  pendingMutations: Set<string>;
  updateHabit: (dayPageId: string, habit: string, value: boolean) => void;
}

interface CellInfo {
  habit: string;
  date: string;
  state: "done" | "not_done" | "no_data";
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es", { day: "numeric", month: "short" });
}

function stateLabel(state: CellInfo["state"]): string {
  switch (state) {
    case "done":
      return "Completado";
    case "not_done":
      return "No completado";
    case "no_data":
      return "Sin registro";
  }
}

function cellColor(state: CellInfo["state"]): string {
  switch (state) {
    case "done":
      return COLOR_DONE;
    case "not_done":
      return COLOR_NOT_DONE;
    case "no_data":
      return COLOR_NO_DATA;
  }
}

export function HabitHeatmap({ habits, habitNames, pendingMutations, updateHabit }: HabitHeatmapProps) {
  const [tooltip, setTooltip] = useState<CellInfo | null>(null);

  // Days sorted ascending (oldest first for left-to-right)
  const days = useMemo(() => [...habits].reverse(), [habits]);
  const dates = useMemo(() => days.map((d) => d.date), [days]);

  // Quick lookup: date -> HabitDay (gives us id + completed list)
  const dayMap = useMemo(() => {
    const map = new Map<string, HabitDay>();
    for (const day of habits) map.set(day.date, day);
    return map;
  }, [habits]);

  function getCellState(habit: string, date: string): CellInfo["state"] {
    const day = dayMap.get(date);
    if (!day) return "no_data";
    return day.completed.includes(habit) ? "done" : "not_done";
  }

  const colCount = dates.length;

  if (habitNames.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No hay hábitos configurados en tu database de Notion. Agregá
        propiedades de tipo checkbox al database para que aparezcan acá.
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Scroll container for mobile */}
      <div className="overflow-x-auto pb-2">
        <div
          className="min-w-max"
          style={{
            display: "grid",
            gridTemplateColumns: `120px repeat(${colCount}, 24px)`,
            gap: "2px",
          }}
        >
          {/* Header row: empty corner + date labels */}
          <div />
          {dates.map((date) => (
            <div
              key={date}
              className="text-center text-[9px] leading-tight text-text-muted"
              title={date}
            >
              {formatDateHeader(date).split(" ")[0]}
            </div>
          ))}

          {/* Habit rows */}
          {habitNames.map((habit) => (
            <div key={habit} className="contents">
              {/* Habit label */}
              <div className="flex items-center pr-2 text-xs text-text-secondary truncate">
                {habit}
              </div>
              {/* Cells */}
              {dates.map((date) => {
                const state = getCellState(habit, date);
                const day = dayMap.get(date);
                const isClickable = state !== "no_data" && day !== undefined;
                const isPending = day
                  ? pendingMutations.has(`${day.id}:${habit}`)
                  : false;
                return (
                  <div
                    key={`${habit}-${date}`}
                    className={cn(
                      "size-[22px] rounded-sm transition-transform",
                      isClickable
                        ? "cursor-pointer hover:scale-110"
                        : "cursor-not-allowed",
                      isPending && "opacity-50"
                    )}
                    style={{ backgroundColor: cellColor(state) }}
                    onClick={() => {
                      if (!isClickable || !day) return;
                      updateHabit(day.id, habit, state === "not_done");
                    }}
                    onMouseEnter={() =>
                      setTooltip({ habit, date, state })
                    }
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Fade gradient for mobile scroll hint */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-bg-base to-transparent md:hidden" />

      {/* Tooltip */}
      {tooltip && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-border-default bg-bg-card px-3 py-2 shadow-lg">
          <p className="text-xs text-text-secondary">{tooltip.date}</p>
          <p className="text-xs font-medium text-text-primary">
            {tooltip.habit}
          </p>
          <p
            className="text-xs font-medium"
            style={{ color: cellColor(tooltip.state) === COLOR_NO_DATA ? "#71717a" : cellColor(tooltip.state) }}
          >
            {stateLabel(tooltip.state)}
          </p>
        </div>
      )}
    </div>
  );
}
