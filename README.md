# Segundo Cerebro Dashboard

Dashboard web de productividad que visualiza **y edita** datos de un workspace de Notion en tiempo real. Conecta con el sistema "Segundo Cerebro", muestra metricas de habitos, tareas y proyectos en graficos interactivos, y permite editar los campos mas frecuentes (status, prioridad, fechas, checkboxes de habitos) directamente desde el dashboard sin abrir Notion.

**Live:** [dashboard-productividad-e7c1d.web.app](https://dashboard-productividad-e7c1d.web.app)

## Vistas

- **General** - 4 KPIs + tendencia de habitos + distribucion de tareas + proyectos en progreso *(solo lectura)*
- **Habitos** - Heatmap dinamico (todos los checkboxes del database x 30 dias) + chart de consistencia. **Click en una celda** para togglear el checkbox del dia
- **Tareas** - Lista completa. Status, prioridad y fecha **editables inline** (click en el chip o la fecha)
- **Proyectos** - Distribucion por status + lista. Status y prioridad **editables inline**
- **Settings** - Configuracion del Notion Integration Token + override manual de IDs de databases

### Modo edicion

Las ediciones usan **optimistic updates con rollback**: el cambio se ve al instante en pantalla y en background se sincroniza con Notion. Si Notion rechaza la mutacion (token expirado, valor invalido, falta capability, timeout >12s, etc.), el UI hace rollback al ultimo valor confirmado y muestra un toast con la causa. Clicks rapidos sobre el mismo campo se **coalescen**: solo el ultimo valor llega a Notion, los intermedios se descartan.

Mientras hay mutaciones en vuelo, el boton de refresh queda deshabilitado para evitar clobbering del estado optimista.

### Habitos dinamicos

El dashboard descubre la lista de habitos automaticamente desde los checkboxes del database de Habitos en Notion. **No hay lista hardcodeada**: agregar, quitar, renombrar o reordenar checkboxes en Notion se refleja en el dashboard al refrescar, sin tocar codigo ni redesplegar.

- **Agregar un habito:** crea un nuevo checkbox en el database -> refresh -> aparece como nueva fila en el heatmap.
- **Quitar un habito:** borra el checkbox -> refresh -> desaparece. El `pct` se recalcula sobre el total nuevo.
- **Reordenar:** cambia el orden de las columnas en Notion -> refresh -> el heatmap respeta el nuevo orden.
- **Renombrar:** se trata como remover + agregar (la data historica del nombre viejo no se preserva visualmente).

Hay una unica excepcion hardcodeada: el checkbox `Archive` se ignora siempre porque es utilitario, no un habito. Si tu workspace tiene otros checkboxes utilitarios que quedan apareciendo como habitos, agregalos a `HABITS_PROP_BLACKLIST` en `src/services/notion.ts`.

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

La API de Notion bloquea CORS desde browsers. La Cloud Function recibe el request del frontend, lo reenvia a Notion con el token, y devuelve la respuesta. El proxy es restrictivo:

- **Paths permitidos:** `databases/` (lectura de databases + queries), `pages/` (PATCH a paginas para editar), `search` (auto-descubrimiento de databases).
- **Metodos permitidos:** `GET` (retrieve schemas), `POST` (queries y search), `PATCH` (editar paginas).
- Todos los demas paths/metodos retornan `403`/`405` desde el proxy sin tocar Notion.

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
  components/     # UI components: StatCard, Charts, Heatmap, Lists,
                  # SelectPopover (inline edit dropdowns), Toaster, etc.
  pages/          # Overview, Habits, Tasks, Projects, Settings
  hooks/          # useNotionData (fetch + state + mutations + optimistic updates)
  lib/            # utils.ts (cn helper), habitLabel.ts (chart label abbreviator)
  services/       # notion.ts (API + resolver + mutations), tokenStore.ts,
                  # dbIdsStore.ts, toastStore.ts (mini pub/sub for toasts)
  types/          # TypeScript interfaces
  constants.ts    # Colors, NOTION_COLOR_MAP, getNotionColor helper
functions/
  src/index.ts    # Cloud Function proxy (GET/POST/PATCH on databases/, pages/, search)
```

## Uso

1. Crear una [Notion Integration](https://www.notion.so/my-integrations) en tu workspace y copiar el Integration Token.
2. **Conectar la integracion a tus paginas.** En Notion, abri la pagina raiz del Segundo Cerebro -> menu `...` -> **Connections** -> seleccionar tu integracion. La conexion se hereda a todos los databases anidados (Habitos, Tareas, Proyectos), asi no hace falta hacerlo uno por uno.

   > **Para usar el modo edicion** (cambiar status, prioridades, fechas y togglear habitos desde el dashboard), tu integracion ademas necesita el capability **"Update content"** habilitado. Andá a [notion.so/my-integrations](https://www.notion.so/my-integrations) → tu integracion → tab **Capabilities** → marcá *"Update content"*. Sin esto, la app sigue funcionando en modo solo lectura y los intentos de edicion muestran un toast con instrucciones.

3. Abrir el dashboard, ir a Settings, pegar el Integration Token y **Guardar**.
4. La app intenta auto-descubrir los 3 databases por nombre (`Habitos`/`Tareas`/`Proyectos`) usando `POST /v1/search`. Si los encuentra sin ambiguedad, te lleva directo al dashboard.
5. Si alguno no se resuelve automaticamente (renombrado, ambiguo o sin acceso), el panel **Databases** en Settings te deja pegar los IDs faltantes a mano. Cada slot muestra el estado: `Resuelto` / `Ambiguo` / `No encontrado` / `Manual`.

> Para obtener el ID de un database manualmente: en Notion, abrir el database como pagina completa, copiar la URL y tomar el segmento de 32 caracteres (UUID) antes del `?v=`.
