# Segundo Cerebro Dashboard

> Dashboard web de productividad que visualiza datos de un workspace de Notion en tiempo real via API directa.

## Visión General

App web personal estilo Vercel/Linear (dark, minimal, premium) que se conecta a un sistema de productividad en Notion llamado "Segundo Cerebro" y muestra métricas de hábitos, tareas y proyectos en gráficos interactivos. Cualquier persona con la misma plantilla de Notion puede usar el dashboard ingresando su Integration Token desde el frontend.

## Objetivos

- Visualizar productividad diaria/semanal de un vistazo
- Identificar patrones: qué hábitos se mantienen, cuáles se abandonan
- Ver el estado real de tareas y proyectos sin abrir Notion
- Que sea reutilizable: cualquier usuario con la plantilla "Segundo Cerebro" puede conectarse

## Alcance del MVP

### Incluido
- **Settings**: pantalla para ingresar/probar/borrar el Notion Integration Token
- **Vista General**: 4 KPIs + gráfico tendencia hábitos + pie chart tareas + lista compacta proyectos en progreso
- **Vista Hábitos**: heatmap (hábitos × días) + bar chart consistencia por hábito
- **Vista Tareas**: lista completa con badges de status y prioridad
- **Vista Proyectos**: distribución por status + lista completa
- **Refresh manual**: botón que recarga los 3 datasets siempre (no solo la vista activa)
- **Responsive**: desktop (≥1024px), tablet (≥768px) y mobile (<768px) con breakpoints definidos

### Excluido (futuras versiones)
- Editar datos de Notion desde el dashboard (solo lectura)
- Autenticación OAuth de Notion (por ahora es token manual)
- Notificaciones o alertas
- PWA / offline mode
- Histórico más allá de 30 días
- Resolver relaciones (Proyecto→nombre, Area→nombre) — requeriría N+1 queries adicionales
- Paginación automática para datasets > 100 items

## Arquitectura

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Frontend (SPA)    │────▶│  Firebase Cloud Fn    │────▶│   Notion API    │
│   React + Vite      │     │  (Proxy CORS)         │     │   v2022-06-28   │
│   Firebase Hosting  │     │  /notionProxy         │     │                 │
└─────────────────────┘     └──────────────────────┘     └─────────────────┘
```

**¿Por qué un proxy?** La API de Notion bloquea CORS desde browsers. La Cloud Function recibe el request del frontend, lo reenvía a Notion con el token, y devuelve la respuesta.

### Stack

| Capa | Tecnología |
|------|-----------|
| Framework | React 19 + TypeScript strict |
| Build | Vite |
| Estilos | Tailwind CSS v4 (sin config file, usa `@import "tailwindcss"`) |
| Componentes | shadcn/ui (los que se necesiten) |
| Gráficos | Recharts (LineChart, PieChart, BarChart) |
| Routing | React Router v7 (paquete: `react-router`, imports desde `"react-router"` — no usa `react-router-dom`) |
| Iconos | Lucide React |
| Hosting | Firebase Hosting |
| Proxy | Firebase Cloud Functions v2 (onRequest) |
| Deploy CLI | firebase-tools |

### Decisiones técnicas

- **Tailwind CSS v4 + shadcn/ui** en vez de MUI: control total del diseño, bundle más liviano.
- **Recharts** recibe colores como hex strings, NO tokens de Tailwind. Se necesita un objeto `CHART_COLORS` separado.
- **Token en frontend** (localStorage vía `tokenStore`): permite que cualquier usuario con la plantilla lo use. El token viaja como header `x-notion-token` al proxy.

## Diseño

**Dirección general:** Dashboard dark premium, estilo Vercel/Linear. Limpio, con buen contraste entre capas (fondo → cards → hover). Que se vea profesional, no genérico.

**Referencia de apps a imitar:** Vercel Dashboard, Linear App, Raycast.

**Fuentes (Google Fonts):** Outfit + JetBrains Mono.

**Tema:** Dark. El diseño de colores, contrastes, sombras, bordes, espaciado, animaciones y hover states queda a criterio del desarrollador. Lo único importante es que las cards se distingan del fondo, los hover sean perceptibles, y los textos secundarios sean legibles.

**Gráficos:** Recharts recibe colores como hex strings, NO tokens de Tailwind ni CSS variables. Definir un objeto `CHART_COLORS` con los hex necesarios. Los tooltips de Recharts deben usar custom components que respeten el design system (fondo oscuro, bordes sutiles, tipografía consistente con el resto de la app).

## Estructura del Proyecto

```
src/
  components/
    ui/                    # shadcn genera estos (elegir los que se necesiten)
    Layout.tsx             # Header + navegación + acciones
    StatCard.tsx           # KPI card
    StatusChip.tsx         # Badge coloreado por status/prioridad
    SectionSkeleton.tsx    # Skeleton/placeholder por sección mientras carga
    EmptyState.tsx         # Componente reutilizable: icono + mensaje para secciones sin datos
    ErrorInline.tsx        # Error inline por sección con botón "Reintentar"
    Charts.tsx             # TrendLineChart, TaskPieChart, ProjectBarChart
    HabitHeatmap.tsx       # Grid hábitos × días
    HabitConsistencyChart.tsx  # BarChart horizontal
    TaskList.tsx           # Lista de tareas — dual render: tabla en desktop/tablet, cards stacked en mobile
    ProjectList.tsx        # Lista de proyectos — dual render: tabla en desktop/tablet, cards stacked en mobile
  pages/
    Overview.tsx
    Habits.tsx
    Tasks.tsx
    Projects.tsx
    Settings.tsx           # Configuración del token de Notion
  hooks/
    useNotionData.ts       # Fetch + state + datos derivados
  services/
    notion.ts              # queryNotion(), fetchHabits/Tasks/Projects, testConnection
    tokenStore.ts          # Abstracción get/set/clear sobre localStorage
  types/
    index.ts               # HabitDay, Task, Project, LoadingState, ErrorState, etc.
  lib/
    utils.ts               # cn() helper (clsx + tailwind-merge)
  constants.ts             # HABITS_LIST, DB_IDS, CHART_COLORS, STATUS_COLORS
  globals.css              # Tailwind v4 imports + theme tokens + animaciones
  App.tsx
  main.tsx
functions/
  src/
    index.ts               # Cloud Function proxy
  package.json
  tsconfig.json
firebase.json
.firebaserc
.env                       # VITE_PROXY_URL para dev
.env.production            # VITE_PROXY_URL para prod
components.json            # Config shadcn
```

## Bases de Datos de Notion

### 1. Habit Tracker
**Database ID:** `240485e0-fe4f-83e4-86c3-018061a48f2e`

| Propiedad | Tipo | Nota |
|-----------|------|------|
| Name | title | Siempre "Daily Habits" |
| Date | date | `.date?.start` → "2026-04-01" |
| Ejercicio | checkbox | `.checkbox` → true/false |
| Codear | checkbox | |
| Leer | checkbox | |
| Meditar | checkbox | |
| Comer bien | checkbox | |
| Tomar agua | checkbox | |
| Planificar el día | checkbox | |
| Madrugar | checkbox | |
| Gratitud | checkbox | |
| Practicar inglés | checkbox | |
| Tiempo con pareja | checkbox | |
| Estirar | checkbox | |
| Tender la cama | checkbox | |
| No comer dulce | checkbox | |
| Progress | formula | % calculado por Notion |

**Query:**
```json
{
  "page_size": 30,
  "sorts": [{ "property": "Date", "direction": "descending" }]
}
```

**Parseo:**
```typescript
const HABITS = [
  "Ejercicio", "Codear", "Leer", "Meditar", "Comer bien", "Tomar agua",
  "Planificar el día", "Madrugar", "Gratitud", "Practicar inglés",
  "Tiempo con pareja", "Estirar", "Tender la cama", "No comer dulce"
];
// Para cada result:
const date = result.properties.Date.date?.start; // "2026-04-01"
const completed = HABITS.filter(h => result.properties[h]?.checkbox === true);
// → { date: "2026-04-01", completed: ["Madrugar", "Planificar el día"] }
```

### 2. Tareas
**Database ID:** `eed485e0-fe4f-83e8-a2a0-811192be957a`

| Propiedad | Tipo | Valores |
|-----------|------|---------|
| Nombre | title | `.title[0]?.plain_text` |
| Status | status | En proceso, Inbox, Esperando, Sin fecha, Delegada, Completed |
| Prioridad | select | Baja, Media, Alta, Urgente |
| Fecha | date | `.date?.start` |
| Proyecto | relation | `[{ id: "xxx" }]` — solo IDs, no resolver nombres en v1 |
| Descripción | text | `.rich_text[0]?.plain_text` |

**Query (no completadas):**
```json
{
  "page_size": 100,
  "filter": { "property": "Status", "status": { "does_not_equal": "Completed" } }
}
```

**Nota sobre paginación:** `page_size: 100` es el máximo que retorna Notion por request. Si la respuesta incluye `has_more: true` y `next_cursor`, hay más datos. En v1 NO se implementa paginación automática — se asume que el usuario tiene ≤100 tareas activas. Si esto se vuelve limitante, agregar loop de paginación en v2.

### 3. Proyectos
**Database ID:** `a70485e0-fe4f-83da-90ca-0199c37a69aa`

| Propiedad | Tipo | Valores |
|-----------|------|---------|
| Name | title | `.title[0]?.plain_text` |
| Status | status | Inbox, Not Started, In Progress, On Hold, Completed |
| Prioridad | select | Urgent, High, Medium, Low |
| Area | relation | Solo IDs — no resolver nombres en v1 |
| Archivo | checkbox | `.checkbox` → true/false |

**Query (no archivados):**
```json
{
  "page_size": 100,
  "filter": { "property": "Archivo", "checkbox": { "equals": false } }
}
```

## Cloud Function — Proxy CORS

```typescript
// functions/src/index.ts
import { onRequest } from "firebase-functions/v2/https";

// Paths permitidos para restringir el alcance del proxy
const ALLOWED_PATH_PREFIXES = ["databases/"];
const ALLOWED_METHODS = ["POST"];

export const notionProxy = onRequest({ cors: true }, async (req, res) => {
  // Solo permitir POST (queries a databases)
  if (!ALLOWED_METHODS.includes(req.method)) {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const token = req.headers["x-notion-token"] as string;
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const path = req.query.path as string;
  if (!path) {
    res.status(400).json({ error: "No path provided" });
    return;
  }

  // Validar que el path sea una operación permitida
  const isAllowed = ALLOWED_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
  if (!isAllowed) {
    res.status(403).json({ error: "Path not allowed" });
    return;
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/${path}`, {
      method: req.method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: "Proxy error" });
  }
});
```

**Seguridad del proxy:**
- Solo acepta `POST` (el único método necesario para queries).
- Solo permite paths que empiecen con `databases/` — bloquea acceso a `users/`, `pages/`, `blocks/`, etc.
- El token del usuario nunca se persiste en el servidor, solo se pasa como header de tránsito.

**Error tipado para diferenciar errores en el frontend:**
```typescript
// services/notion.ts
class NotionApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
```

**Frontend llama así:**
```typescript
const PROXY_URL = import.meta.env.VITE_PROXY_URL;

async function queryNotion(databaseId: string, body: object): Promise<any> {
  const token = tokenStore.get();
  if (!token) throw new Error("No token");

  const res = await fetch(`${PROXY_URL}?path=databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-notion-token": token,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new NotionApiError(res.status, err.message || `Error ${res.status}`);
  }

  return res.json();
}
```

> El frontend usa `instanceof NotionApiError` + `error.status` para diferenciar 401 (token inválido) vs 429 (rate limit) vs 500+ (server error). Los network errors (offline/timeout) se capturan como `TypeError` del `fetch` nativo.

**Test de conexión (Settings):**
```typescript
async function testConnection(): Promise<boolean> {
  // Query mínima al Habit Tracker para validar que el token funciona
  const res = await queryNotion(DB_IDS.habits, { page_size: 1 });
  return res.results?.length >= 0; // Si no lanza error, la conexión es válida
}
```

> **Nota:** Idealmente se validaría el token contra `GET /users/me` (más semántico), pero el proxy solo permite paths con prefijo `databases/`. Si en v2 se implementa OAuth, considerar agregar `users/me` al allowlist del proxy.

## Token Store

Abstracción sobre localStorage para centralizar el acceso al token. Evita `localStorage.getItem("notion_token")` regado por el código y facilita cambiar el storage en el futuro.

```typescript
// services/tokenStore.ts
const TOKEN_KEY = "notion_token";

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
  exists: (): boolean => localStorage.getItem(TOKEN_KEY) !== null,
};
```

## Flujo Principal

### Primera vez
1. Usuario abre la app → `tokenStore.exists()` es false → redirige a `/settings`
2. Ingresa su Notion Integration Token
3. Click "Probar conexión" → `testConnection()` query a Habit Tracker con `page_size: 1`
4. Si éxito → el botón cambia a estado success (check verde + "Conexión exitosa") por 2 segundos
5. Si error → el botón cambia a estado error (mensaje inline debajo: "Token inválido" o "Error de conexión")
6. `tokenStore.set(token)` → redirige al dashboard, carga datos

### Uso normal
1. App detecta token con `tokenStore.exists()` → carga los 3 datasets en paralelo
2. Cada sección muestra skeleton/placeholder mientras carga (NO pantalla bloqueante)
3. Conforme llega cada dataset, el skeleton se reemplaza por los datos reales (carga progresiva, NO Promise.all)
4. Si un dataset falla, esa sección muestra error inline con botón de retry — las demás secciones funcionan normal
5. Usuario navega por tabs: General, Hábitos, Tareas, Proyectos
6. Click en ⚙️ navega a `/settings`
7. Click en ↻ recarga los 3 datasets (siempre todos, independiente de la vista activa). El botón muestra spinner mientras carga y se desactiva para evitar doble-click

### Error de token
- Si cualquier fetch retorna 401 → mostrar mensaje claro: "Token inválido o expirado. Verificá en Settings."
- No borrar el token automáticamente — dejar que el usuario decida.

### Manejo de errores
| Error | Comportamiento |
|-------|---------------|
| 401 Unauthorized | Mensaje: "Token inválido o expirado. Verificá en Settings." con link a `/settings` |
| 429 Rate Limited | Mensaje: "Notion tiene límite de requests. Esperá unos segundos y recargá." No retry automático — el usuario decide cuándo reintentar |
| Network error (offline/timeout) | Mensaje: "No se pudo conectar. Revisá tu conexión a internet." |
| Error parcial (1 dataset falla) | Solo esa sección muestra error inline con botón "Reintentar". Las demás secciones funcionan normal con sus datos |
| 500+ Server error | Mensaje: "Error del servidor. Intentá de nuevo en unos minutos." |

### Cambiar token
1. Usuario va a Settings, ingresa nuevo token
2. Click "Probar conexión" → valida el nuevo token
3. Si éxito → `tokenStore.set(newToken)` → limpia datos en memoria → re-fetch automático de los 3 datasets
4. Redirige al dashboard

### Borrar token
1. Click "Desconectar" en Settings
2. Dialog de confirmación: "¿Seguro que querés desconectar tu cuenta de Notion?"
3. Si confirma → `tokenStore.clear()` → limpia datos en memoria → redirige a Settings

## Overview — KPIs y Composición

### 4 KPIs (StatCards)

| KPI | Fuente | Cálculo |
|-----|--------|---------|
| % hábitos hoy | Habit Tracker | `completed.length / 14 * 100` del registro más reciente |
| Promedio hábitos (30d) | Habit Tracker | Promedio del % de completitud de los últimos 30 días |
| Tareas activas | Tareas | Count donde Status != "Completed" |
| Proyectos en progreso | Proyectos | Count donde Status == "In Progress" |

### Composición de la vista Overview
1. **4 StatCards** con los KPIs arriba
2. **TrendLineChart** — tendencia de % hábitos últimos 30 días
3. **TaskPieChart** — distribución de tareas por status
4. **Lista compacta de proyectos en progreso** — solo los que tienen Status == "In Progress", con nombre + status badge. NO es un chart (pocos items harían un bar chart vacío). El `ProjectBarChart` con distribución completa por status va exclusivamente en la vista Proyectos.

## Navegación y Routing

**Router:** `react-router` v7 con las siguientes rutas:

| Ruta | Page | Notas |
|------|------|-------|
| `/` | Overview | Dashboard principal con KPIs |
| `/habits` | Habits | Heatmap + consistencia |
| `/tasks` | Tasks | Lista completa de tareas |
| `/projects` | Projects | Distribución + lista |
| `/settings` | Settings | Configuración del token |

**Header/Layout:**
- **Desktop:** Tabs horizontales en el header (General, Hábitos, Tareas, Proyectos) + botón refresh (↻) + botón settings (⚙️) a la derecha
- **Mobile:** Tabs scrolleables horizontalmente con `overflow-x-auto`. Mismo header pero los tabs se desplazan si no caben
- Settings es una ruta separada (`/settings`), no un modal ni un tab

**Guard de autenticación:** Implementado como wrapper condicional en `DashboardShell` (no como loader de React Router). Si `tokenStore.exists()` es false, renderiza `<Navigate to="/settings" />` en vez del layout con las rutas del dashboard. Settings siempre es accesible — queda fuera del guard.

## Custom Hook — useNotionData

**Principio clave: 3 fetches independientes, NO Promise.all.** Cada uno actualiza el estado al llegar.

**Ubicación del hook:** El hook se instancia UNA vez en `App.tsx` (dentro de `DashboardShell`) y los datos se pasan a las pages vía props o context. Las pages NO instancian su propio hook — esto evita re-fetches al cambiar de tab.

```typescript
// Estado
habits: HabitDay[] | null
tasks: Task[] | null
projects: Project[] | null
loading: { habits: boolean, tasks: boolean, projects: boolean }
errors: { habits?: string, tasks?: string, projects?: string }

// Datos derivados (useMemo)
habitTrend: { date: string, pct: number, count: number }[]
avgPct: number
todayData: { pct: number, count: number } | null
tasksByStatus: Record<string, number>
projectsByStatus: Record<string, number>
habitFreq: { name: string, full: string, pct: number }[]  // name = abreviación para ejes ("Ejerc."), full = nombre completo ("Ejercicio"), pct = % días cumplido

// Acciones
refresh: () => void  // Recarga los 3 datasets
```

## Heatmap — Consideraciones de Layout

El heatmap muestra 14 hábitos × 30 días = 420 celdas. Esto presenta un reto en pantallas pequeñas.

**Escala visual (por celda individual):**
- **Hecho** (checkbox true): color accent del tema (verde/esmeralda)
- **No hecho** (checkbox false): color muted (gris oscuro, perceptible pero no invasivo)
- **Sin registro** (día sin entrada en la DB): color más oscuro/neutro, distinto del "no hecho" — indica que no hay datos, no que falló

**Tooltip al hover:** Muestra fecha + nombre del hábito + estado ("Completado" / "No completado" / "Sin registro").

**Desktop (≥768px):** Grid completo, 30 columnas visibles. Labels de hábitos a la izquierda, fechas arriba.

**Mobile (<768px):** Scroll horizontal con `overflow-x-auto`, el grid mantiene su tamaño natural. Agregar fade gradient en el borde derecho como indicador visual de que hay más contenido.

## Recharts — Custom Tooltips

Los tooltips por defecto de Recharts usan estilos blancos genéricos que rompen con el tema dark. Crear un componente `ChartTooltip` reutilizable que:

- Fondo oscuro consistente con las cards del dashboard
- Borde sutil (1px solid con el color de borde del tema)
- Tipografía Outfit para labels, JetBrains Mono para valores numéricos
- Sombra sutil para distinguirlo del contenido detrás

```typescript
// Uso en Recharts:
<Tooltip content={<ChartTooltip />} />
```

## Responsive — Breakpoints y Layout

| Componente | Desktop (≥1024px) | Tablet (≥768px) | Mobile (<768px) |
|------------|-------------------|-----------------|-----------------|
| StatCards | Grid 4 columnas | Grid 2 columnas | Stack 1 columna |
| Tabs (nav) | Horizontal en header | Horizontal en header | Scroll horizontal con `overflow-x-auto` |
| Heatmap | Grid completo 30 cols | Grid completo con scroll | Scroll horizontal + fade |
| Charts | Ancho completo | Ancho completo | Ancho completo, altura reducida |
| TaskList / ProjectList | Tabla con columnas | Tabla con columnas reducidas | Cards stacked (una card por item). Cada componente maneja internamente ambos modos de render con un breakpoint via Tailwind (`hidden md:block` / `block md:hidden`) |
| Settings | Centered card, max-width | Centered card | Full width con padding |

## Empty States

Cada sección debe manejar el caso de no tener datos con un mensaje claro:

| Sección | Mensaje | CTA |
|---------|---------|-----|
| Hábitos (sin registros) | "No hay registros de hábitos en los últimos 30 días" | — |
| Tareas (sin tareas activas) | "No hay tareas activas. ¡Todo al día!" | — |
| Proyectos (sin proyectos) | "No hay proyectos activos" | — |
| Usuario nuevo (token OK, sin datos) | "Tu workspace está conectado pero aún no tiene datos en las bases esperadas" | Link a documentación de la plantilla si aplica |
| Overview (sin datos en ningún dataset) | Mostrar las 4 StatCards con valor "—" y las secciones de charts con su empty state individual | — |

Los empty states usan un icono relevante de Lucide + el mensaje en texto secundario, centrados en el espacio de la sección.

## Restricciones y Decisiones

| Decisión | Razón |
|----------|-------|
| Token en localStorage vía `tokenStore` | Permite que cualquier usuario con la plantilla lo use sin backend propio. Wrapper centralizado para flexibilidad futura |
| Proxy Cloud Function con path allowlist | Notion API bloquea CORS. Proxy restringido solo a `databases/` para evitar acceso a endpoints sensibles |
| 3 fetches independientes | Carga progresiva — no bloquear toda la UI si un fetch tarda |
| Hook único en App.tsx | Evita re-fetches al cambiar de tab. Los datos se pasan a las pages, no se re-instancia el hook |
| No resolver relaciones (Proyecto→nombre, Area→nombre) | Requeriría N+1 queries adicionales. En v1 solo mostramos datos directos |
| page_size: 100 sin paginación | Suficiente para uso personal. Limitación documentada, paginación en v2 si es necesario |
| Recharts con hex hardcodeados + custom tooltips | Recharts no acepta tokens CSS. Tooltips custom para mantener consistencia visual |
| shadcn/ui + Tailwind, no MUI | Control total del diseño, bundle más liviano |
| Refresh recarga los 3 datasets siempre | Simplicidad. No vale la pena la complejidad de refresh selectivo por vista |

## Plan de Implementación

### Fase 0 — Scaffolding
- Crear proyecto Vite + React 19 + TypeScript
- Instalar: tailwindcss, @tailwindcss/vite, class-variance-authority, clsx, tailwind-merge, lucide-react, recharts, react-router
- Configurar vite.config.ts con plugins react() + tailwindcss()
- Crear globals.css con Tailwind v4 imports y tokens del tema
- Crear lib/utils.ts con cn()
- Init shadcn: `npx shadcn@latest init` + agregar componentes necesarios
- index.html con Google Fonts (Outfit + JetBrains Mono)
- Configurar Firebase: `firebase init` (Hosting + Functions), crear `firebase.json` y `.firebaserc`
- Instalar en `/functions`: `firebase-functions` + dependencias del proxy

### Fase 1 — Tipos, constantes y servicios
- types/index.ts — interfaces (HabitDay, Task, Project, LoadingState, ErrorState)
- constants.ts — HABITS_LIST, DB_IDS, CHART_COLORS, STATUS_COLORS, PRIORITY_COLORS
- services/tokenStore.ts — abstracción get/set/clear/exists
- services/notion.ts — queryNotion (usa tokenStore), testConnection, fetchHabits, fetchTasks, fetchProjects
- hooks/useNotionData.ts — hook con fetch paralelo + datos derivados + refresh()

### Fase 2 — Componentes base
- StatCard, StatusChip, SectionSkeleton, EmptyState, ErrorInline
- ChartTooltip (tooltip custom reutilizable para Recharts)

### Fase 3 — Visualizaciones
- Charts.tsx (TrendLineChart, TaskPieChart, ProjectBarChart) — todos usando ChartTooltip
- HabitHeatmap.tsx (con scroll horizontal en mobile)
- HabitConsistencyChart.tsx
- TaskList.tsx, ProjectList.tsx

### Fase 4 — Layout y Pages
- Layout.tsx (header + tabs + refresh + settings trigger)
- Settings.tsx (input token + probar conexión + borrar token)
- Overview.tsx, Habits.tsx, Tasks.tsx, Projects.tsx
- Todas las pages reciben datos como props, NO instancian useNotionData

### Fase 5 — App entry e integración
- App.tsx con DashboardShell (wrapper que instancia useNotionData una vez)
- Si `tokenStore.exists()` es false → mostrar Settings
- Si token existe → cargar dashboard con datos pasados a las pages

### Fase 6 — Deploy
- Verificar proxy (Cloud Function) funciona con datos reales
- Probar que un 401 muestra mensaje claro y no rompe la UI
- `npm run build` exitoso
- `firebase deploy` (hosting + functions)
- Verificar las 4 vistas + Settings + responsive + refresh
- Verificar heatmap en mobile (scroll horizontal funciona)

## Variables de Entorno

```bash
# .env (desarrollo)
VITE_PROXY_URL=http://localhost:5001/{PROJECT_ID}/us-central1/notionProxy

# .env.production (producción)
VITE_PROXY_URL=https://us-central1-{PROJECT_ID}.cloudfunctions.net/notionProxy
```
