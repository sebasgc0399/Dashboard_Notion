export const HABITS_LIST = [
  "Ejercicio",
  "Codear",
  "Leer",
  "Meditar",
  "Comer bien",
  "Tomar agua",
  "Planificar el día",
  "Madrugar",
  "Gratitud",
  "Practicar inglés",
  "Tiempo con pareja",
  "Estirar",
  "Tender la cama",
  "No comer dulce",
] as const;

/** Hex colors for Recharts — NOT Tailwind tokens */
export const CHART_COLORS = {
  emerald: "#10b981",
  emeraldLight: "#34d399",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  amber: "#f59e0b",
  rose: "#f43f5e",
  cyan: "#06b6d4",
  pink: "#ec4899",
  lime: "#84cc16",
  orange: "#f97316",
  teal: "#14b8a6",
  indigo: "#6366f1",
  fuchsia: "#d946ef",
  sky: "#0ea5e9",
} as const;

export const STATUS_COLORS: Record<string, string> = {
  // Task statuses
  "En proceso": "#3b82f6",
  "Inbox": "#71717a",
  "Esperando": "#f59e0b",
  "Sin fecha": "#a1a1aa",
  "Delegada": "#8b5cf6",
  "Completed": "#10b981",
  // Project statuses
  "Not Started": "#a1a1aa",
  "In Progress": "#3b82f6",
  "On Hold": "#f59e0b",
} as const;

export const PRIORITY_COLORS: Record<string, string> = {
  // Task priorities
  "Urgente": "#ef4444",
  "Alta": "#f97316",
  "Media": "#f59e0b",
  "Baja": "#71717a",
  // Project priorities
  "Urgent": "#ef4444",
  "High": "#f97316",
  "Medium": "#f59e0b",
  "Low": "#71717a",
} as const;

/** Notion option color names → hex tokens compatibles con el tema dark */
export const NOTION_COLOR_MAP: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  default: { bg: "rgba(113, 113, 122, 0.15)", text: "#a1a1aa", border: "rgba(113, 113, 122, 0.3)" },
  gray:    { bg: "rgba(113, 113, 122, 0.15)", text: "#a1a1aa", border: "rgba(113, 113, 122, 0.3)" },
  brown:   { bg: "rgba(146, 64, 14, 0.15)",   text: "#d97706", border: "rgba(146, 64, 14, 0.3)" },
  orange:  { bg: "rgba(249, 115, 22, 0.15)",  text: "#fb923c", border: "rgba(249, 115, 22, 0.3)" },
  yellow:  { bg: "rgba(245, 158, 11, 0.15)",  text: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" },
  green:   { bg: "rgba(16, 185, 129, 0.15)",  text: "#34d399", border: "rgba(16, 185, 129, 0.3)" },
  blue:    { bg: "rgba(59, 130, 246, 0.15)",  text: "#60a5fa", border: "rgba(59, 130, 246, 0.3)" },
  purple:  { bg: "rgba(139, 92, 246, 0.15)",  text: "#a78bfa", border: "rgba(139, 92, 246, 0.3)" },
  pink:    { bg: "rgba(236, 72, 153, 0.15)",  text: "#f472b6", border: "rgba(236, 72, 153, 0.3)" },
  red:     { bg: "rgba(239, 68, 68, 0.15)",   text: "#f87171", border: "rgba(239, 68, 68, 0.3)" },
};

export function getNotionColor(color: string | undefined) {
  return NOTION_COLOR_MAP[color ?? "default"] ?? NOTION_COLOR_MAP.default;
}

/** Abbreviations for habit names (chart axes) */
export const HABIT_ABBREVIATIONS: Record<string, string> = {
  "Ejercicio": "Ejerc.",
  "Codear": "Codear",
  "Leer": "Leer",
  "Meditar": "Medit.",
  "Comer bien": "Comer",
  "Tomar agua": "Agua",
  "Planificar el día": "Planif.",
  "Madrugar": "Madrug.",
  "Gratitud": "Grat.",
  "Practicar inglés": "Inglés",
  "Tiempo con pareja": "Pareja",
  "Estirar": "Estir.",
  "Tender la cama": "Cama",
  "No comer dulce": "NoDulce",
} as const;
