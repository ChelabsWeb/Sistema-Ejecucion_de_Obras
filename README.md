# Sistema de Ejecucion de Obras

Monorepo turbocargado para gestion de obras. Usa pnpm + Turborepo para orquestar Next.js, NestJS y BullMQ con paquetes compartidos de UI, dominio y datos. Integra Clerk para autenticacion multi-organizacion y ahora admite persistencia de planificacion via Supabase con calculo de ruta critica compartido (`@sistema/core`).

## Estructura

- `apps/web` - Next.js 14 (App Router) con Tailwind, shadcn/ui, Clerk y pagina Gantt virtualizada.
- `apps/api` - API NestJS con Clerk, middleware de organizacion/proyecto, CRUD de `schedule_tasks` y calculo de ruta critica.
- `apps/worker` - Worker BullMQ para tareas asincronas.
- `packages/ui` - Componentes UI compartidos.
- `packages/core` - Helpers de dominio, roles (`ADMIN`, `PM`, `SITE`, `FINANCE`, `VIEWER`), utilidades de auth y motor de ruta critica con pruebas.
- `packages/db` - Cliente Prisma (para uso local) y repositorios Supabase para `schedule_tasks`.
- `docs/` - Documentacion adicional.

## Requisitos

- Node.js 20+
- pnpm 9 (`corepack enable` recomendado)
- PostgreSQL (para trabajar local con Prisma) y/o proyecto Supabase.
- Redis local o gestionado para el worker.
- Credenciales Clerk (publishable + secret key) o `CLERK_FAKE_MODE=true` para tokens sinteticos.

## Primeros pasos

```bash
pnpm install
pnpm dev
```

Turborepo lanza los comandos `dev` de cada app en paralelo. Clerk protege `/dashboard` y los endpoints `/projects`. Si `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` estan definidos, la API persiste tareas en Supabase; de lo contrario usa el store in-memory con datos seed.

### Scripts principales

- `pnpm dev` - Arranca web, api y worker en desarrollo.
- `pnpm build` - Compila paquetes y apps.
- `pnpm test` - Ejecuta pruebas (Jest e2e + Vitest para core).
- `pnpm lint` - Corre ESLint en todo el monorepo.

Puedes filtrar scripts: `pnpm --filter @sistema/api test`, `pnpm --filter @sistema/core test`, etc.

## Variables de entorno

Clona `.env.example` y ajusta:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` / `CLERK_FAKE_MODE`.
- `NEXT_PUBLIC_API_URL` - URL base de la API Nest (`http://localhost:3001` en local).
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (y opcionalmente `SUPABASE_ANON_KEY`) para activar Supabase.
- `PORT` - Puerto de la API.
- `DATABASE_URL` - Cadena Prisma (si trabajas con Postgres local).
- `REDIS_HOST`, `REDIS_PORT`, `JOB_QUEUE` - Configuracion BullMQ.

## Persistencia en Supabase

1. Crea un proyecto en [Supabase](https://supabase.com) y copia el `Project URL` + `service_role key` desde **Project Settings → API**.
2. Define las variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en tu `.env`.
3. Ejecuta el siguiente SQL (puede ser desde el editor SQL o supabase CLI) para crear la tabla:

```sql
create extension if not exists "pgcrypto";

create table if not exists public.schedule_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  name text not null,
  start_date timestamptz not null,
  duration_days integer not null,
  progress integer not null default 0 check (progress between 0 and 100),
  predecessor_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schedule_tasks_project_idx on public.schedule_tasks (project_id);
```

4. Ajusta tus politicas RLS (por defecto Supabase las habilita). Para un backend de confianza puedes deshabilitar RLS o crear politicas segun rol.
5. (Opcional) Semilla las tareas iniciales:

```sql
insert into public.schedule_tasks (project_id, name, start_date, duration_days, progress, predecessor_ids)
values
  ('project-1', 'Cimentacion', '2025-09-01', 5, 40, '{}'),
  ('project-1', 'Estructura', '2025-09-07', 10, 20, '{"task-foundations"}'),
  ('project-1', 'Instalaciones', '2025-09-18', 7, 10, '{"task-structure"}'),
  ('project-1', 'Terminaciones', '2025-09-26', 6, 0, '{"task-installations"}');
```

Con la configuracion activa, la API usa `@supabase/supabase-js` para los CRUD y mantiene el fallback in-memory para entornos sin Supabase (incluidas las pruebas).

## Autenticacion y autorizacion

- **Middleware**: `AuthMiddleware` valida tokens Clerk, `OrganizationScopeMiddleware` exige `x-org-id` y valida pertenencia de proyecto, `RolesGuard` autoriza segun `@sistema/core`.
- **Roles**: viewers consultan datos; `SITE`, `PM` y `ADMIN` editan progreso; `PM` y `ADMIN` crean/eliminan tareas.

## Planificacion y ruta critica

- **API `schedule_tasks`**: `/projects/:projectId/tasks` expone CRUD con Supabase (o in-memory fallback) y endpoint `/critical-path` usando `computeCriticalPath`.
- **Utilidad core**: `packages/core/src/schedule.ts` calcula ruta critica, holgura y duracion; probado via Vitest (`packages/core/tests/critical-path.spec.ts`).
- **Web Gantt**: `/dashboard/gantt` consume la API, virtualiza mas de 100 filas via `@tanstack/react-virtual`, permite editar progreso (segun rol) y marca predecesores y tareas criticas.

## Pruebas

- API e2e (`apps/api/test/projects.e2e-spec.ts`, `apps/api/test/schedule-tasks.e2e-spec.ts`).
- Core (`pnpm --filter @sistema/core test`).
- Ejecuta todo con `pnpm test`.

## Desarrollo rapido

1. **Migraciones locales (opcional)**
   ```bash
   pnpm --filter @sistema/db prisma:push
   pnpm --filter @sistema/db prisma:generate
   ```
2. **Levantar servicios**
   ```bash
   pnpm dev
   ```
3. **Pruebas**
   ```bash
   pnpm --filter @sistema/api test
   pnpm --filter @sistema/core test
   ```

## Pipeline Turborepo

- `build` depende de `^build` y publica artefactos (`dist/`, `.next/`, `coverage/`).
- `test` depende de `build` y deja reportes en `coverage/`.
- `dev` sin cache para mejor DX.

## Proximos pasos sugeridos

- Completar migracion a Supabase/Postgres (policias RLS, seeds, vistas/materializaciones).
- UI para seleccionar organizacion/proyecto y mostrar KPIs (riesgos, ruta critica destacada).
- Integrar worker con Supabase (monitoreo de jobs, notificaciones) y cubrirlo con pruebas.
- Extender CI a ejecutar pruebas, `prisma generate` y despliegues automatizados.
