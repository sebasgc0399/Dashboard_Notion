import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { ChartTooltip } from "@/components/ChartTooltip";
import { CHART_COLORS, STATUS_COLORS } from "@/constants";
import type { HabitTrend } from "@/types";

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es", { day: "numeric", month: "short" });
}

// --- TrendLineChart ---

interface TrendLineChartProps {
  data: HabitTrend[];
}

export function TrendLineChart({ data }: TrendLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateShort}
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip
          content={
            <ChartTooltip
              labelFormatter={formatDateShort}
              valueFormatter={(v: number) => `${v}%`}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="pct"
          name="Completado"
          stroke={CHART_COLORS.emerald}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: CHART_COLORS.emerald }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// --- TaskPieChart ---

interface TaskPieChartProps {
  data: Record<string, number>;
}

export function TaskPieChart({ data }: TaskPieChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
          dataKey="value"
          nameKey="name"
          paddingAngle={2}
          label={({ name, value }) => `${name} (${value})`}
          labelLine={false}
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.name}
              fill={STATUS_COLORS[entry.name] || "#71717a"}
            />
          ))}
        </Pie>
        <Tooltip
          content={
            <ChartTooltip valueFormatter={(v: number) => `${v} tareas`} />
          }
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// --- ProjectBarChart ---

interface ProjectBarChartProps {
  data: Record<string, number>;
}

export function ProjectBarChart({ data }: ProjectBarChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
      >
        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={100}
        />
        <Tooltip
          content={
            <ChartTooltip valueFormatter={(v: number) => `${v} proyectos`} />
          }
        />
        <Bar dataKey="value" name="Proyectos" radius={[0, 4, 4, 0]}>
          {chartData.map((entry) => (
            <Cell
              key={entry.name}
              fill={STATUS_COLORS[entry.name] || "#71717a"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
