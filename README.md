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

La API de Notion bloquea CORS desde browsers. La Cloud Function recibe el request del frontend, lo reenvia a Notion con el token, y devuelve la respuesta. Solo permite paths con prefijo `databases/` o el path `search` (usado para auto-descubrir los databases del usuario).

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
  services/       # notion.ts (API + resolver), tokenStore.ts, dbIdsStore.ts
  types/          # TypeScript interfaces
  constants.ts    # Habits list, colors
functions/
  src/index.ts    # Cloud Function proxy
```

## Uso

1. Crear una [Notion Integration](https://www.notion.so/my-integrations) en tu workspace y copiar el Integration Token.
2. **Conectar la integracion a tus paginas.** En Notion, abri la pagina raiz del Segundo Cerebro -> menu `...` -> **Connections** -> seleccionar tu integracion. La conexion se hereda a todos los databases anidados (Habitos, Tareas, Proyectos), asi no hace falta hacerlo uno por uno.

   > **Para usar el modo edicion** (cambiar status, prioridades, fechas y togglear habitos desde el dashboard), tu integracion ademas necesita el capability **"Update content"** habilitado. Andá a [notion.so/my-integrations](https://www.notion.so/my-integrations) → tu integracion → tab **Capabilities** → marcá *"Update content"*. Sin esto, la app sigue funcionando en modo solo lectura y los intentos de edicion muestran un toast con instrucciones.

3. Abrir el dashboard, ir a Settings, pegar el Integration Token y **Guardar**.
4. La app intenta auto-descubrir los 3 databases por nombre (`Habitos`/`Tareas`/`Proyectos`) usando `POST /v1/search`. Si los encuentra sin ambiguedad, te lleva directo al dashboard.
5. Si alguno no se resuelve automaticamente (renombrado, ambiguo o sin acceso), el panel **Databases** en Settings te deja pegar los IDs faltantes a mano. Cada slot muestra el estado: `Resuelto` / `Ambiguo` / `No encontrado` / `Manual`.

> Para obtener el ID de un database manualmente: en Notion, abrir el database como pagina completa, copiar la URL y tomar el segmento de 32 caracteres (UUID) antes del `?v=`.
