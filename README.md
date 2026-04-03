# Segundo Cerebro Dashboard

Dashboard web de productividad que visualiza datos de un workspace de Notion en tiempo real. Conecta con el sistema "Segundo Cerebro" y muestra metricas de habitos, tareas y proyectos en graficos interactivos.

**Live:** [dashboard-productividad-e7c1d.web.app](https://dashboard-productividad-e7c1d.web.app)

## Vistas

- **General** - 4 KPIs + tendencia de habitos + distribucion de tareas + proyectos en progreso
- **Habitos** - Heatmap (14 habitos x 30 dias) + chart de consistencia por habito
- **Tareas** - Lista completa con badges de status y prioridad
- **Proyectos** - Distribucion por status + lista completa
- **Settings** - Configuracion del Notion Integration Token

## Stack

| Capa | Tecnologia |
|------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| Graficos | Recharts |
| Routing | React Router v7 |
| Iconos | Lucide React |
| Hosting | Firebase Hosting |
| Proxy | Firebase Cloud Functions v2 |

## Arquitectura

```
Frontend (SPA)  -->  Firebase Cloud Function  -->  Notion API
React + Vite        (Proxy CORS)                   v2022-06-28
```

La API de Notion bloquea CORS desde browsers. La Cloud Function recibe el request del frontend, lo reenvia a Notion con el token, y devuelve la respuesta. Solo permite paths con prefijo `databases/`.

## Setup local

```bash
# Instalar dependencias
npm install

# Variables de entorno
cp .env.example .env
# Editar .env con la URL de tu Cloud Function

# Desarrollo
npm run dev
```

## Deploy

```bash
# Cloud Function
cd functions && npm install && cd ..
firebase deploy --only functions

# Frontend
npm run build
firebase deploy --only hosting
```

## Estructura del proyecto

```
src/
  components/     # UI components (StatCard, Charts, Heatmap, Lists, etc.)
  pages/          # Overview, Habits, Tasks, Projects, Settings
  hooks/          # useNotionData (fetch + state + derived data)
  services/       # notion.ts (API), tokenStore.ts (localStorage)
  types/          # TypeScript interfaces
  constants.ts    # Habits list, DB IDs, colors
functions/
  src/index.ts    # Cloud Function proxy
```

## Uso

1. Crear una [Notion Integration](https://www.notion.so/my-integrations) con acceso a las bases de datos del Segundo Cerebro
2. Abrir el dashboard y ir a Settings
3. Ingresar el Integration Token y probar la conexion
4. El dashboard carga automaticamente los datos de habitos, tareas y proyectos
