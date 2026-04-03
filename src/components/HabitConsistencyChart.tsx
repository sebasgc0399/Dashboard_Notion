import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { ChartTooltip } from "@/components/ChartTooltip";
import { CHART_COLORS } from "@/constants";
import type { HabitFreq } from "@/types";

interface HabitConsistencyChartProps {
  data: HabitFreq[];
}

export function HabitConsistencyChart({ data }: HabitConsistencyChartProps) {
  const sorted = [...data].sort((a, b) => b.pct - a.pct);

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 32)}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
      >
        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip
          content={
            <ChartTooltip
              valueFormatter={(v: number) => `${v}%`}
            />
          }
        />
        <Bar dataKey="pct" name="Consistencia" radius={[0, 4, 4, 0]}>
          {sorted.map((entry) => (
            <Cell
              key={entry.full}
              fill={entry.pct >= 70 ? CHART_COLORS.emerald : entry.pct >= 40 ? CHART_COLORS.amber : "#71717a"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
