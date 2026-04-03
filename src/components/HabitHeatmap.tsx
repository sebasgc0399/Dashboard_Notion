import { useMemo, useState } from "react";
import { HABITS_LIST } from "@/constants";
import type { HabitDay } from "@/types";

const COLOR_DONE = "#10b981";
const COLOR_NOT_DONE = "#27272a";
const COLOR_NO_DATA = "#131316";

interface HabitHeatmapProps {
  habits: HabitDay[];
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

export function HabitHeatmap({ habits }: HabitHeatmapProps) {
  const [tooltip, setTooltip] = useState<CellInfo | null>(null);

  // Dates sorted ascending (oldest first for left-to-right)
  const dates = useMemo(
    () => [...habits].reverse().map((h) => h.date),
    [habits]
  );

  // Quick lookup: date -> Set of completed habits
  const completedMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const day of habits) {
      map.set(day.date, new Set(day.completed));
    }
    return map;
  }, [habits]);

  function getCellState(habit: string, date: string): CellInfo["state"] {
    const dayData = completedMap.get(date);
    if (!dayData) return "no_data";
    return dayData.has(habit) ? "done" : "not_done";
  }

  const colCount = dates.length;

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
          {HABITS_LIST.map((habit) => (
            <div key={habit} className="contents">
              {/* Habit label */}
              <div className="flex items-center pr-2 text-xs text-text-secondary truncate">
                {habit}
              </div>
              {/* Cells */}
              {dates.map((date) => {
                const state = getCellState(habit, date);
                return (
                  <div
                    key={`${habit}-${date}`}
                    className="size-[22px] rounded-sm cursor-pointer transition-transform hover:scale-110"
                    style={{ backgroundColor: cellColor(state) }}
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
