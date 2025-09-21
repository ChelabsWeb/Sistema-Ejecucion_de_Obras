# Sistema de Ejecucion de Obras

Monorepo turbocargado para gestion de obras. Usa pnpm + Turborepo para orquestar Next.js, NestJS y BullMQ con paquetes compartidos de UI, dominio y datos. Se integra con Clerk para autenticacion multi-organizacion y expone planificacion de tareas con ruta critica.

## Estructura

- `apps/web` - Next.js 14 (App Router) con Tailwind, shadcn/ui, Clerk y pagina Gantt virtualizada.
- `apps/api` - API NestJS con Clerk, middleware de organizacion/proyecto, CRUD de `schedule_tasks` y calculo de ruta critica.
- `apps/worker` - Worker BullMQ para tareas asincronas.
- `packages/ui` - Componentes UI compartidos.
- `packages/core` - Helpers de dominio, roles (`ADMIN`, `PM`, `SITE`, `FINANCE`, `VIEWER`), utilidades de auth y `computeCriticalPath` con pruebas.
- `packages/db` - Cliente Prisma y esquema base (`Project`).
- `docs/` - Documentacion adicional.

## Requisitos

- Node.js 20+
- pnpm 9 (`corepack enable` recomendado)
- PostgreSQL y Redis locales o gestionados.
- Credenciales Clerk (publishable + secret key) o `CLERK_FAKE_MODE=true` para tokens sinteticamente generados.

## Primeros pasos

```bash
pnpm install
pnpm dev
```

Turborepo lanza los comandos `dev` de cada app en paralelo. Clerk protege `/dashboard` y los endpoints `/projects`.

### Scripts principales

- `pnpm dev` - Arranca web, api y worker en desarrollo.
- `pnpm build` - Compila paquetes y apps.
- `pnpm test` - Ejecuta pruebas (Jest e2e + Vitest para core).
- `pnpm lint` - Corre ESLint en todo el monorepo.

Puedes filtrar scripts: `pnpm --filter @sistema/api test` o `pnpm --filter @sistema/core test`.

## Variables de entorno

Clona `.env.example` y ajusta:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` - Claves de Clerk.
- `CLERK_FAKE_MODE` - `true` permite tokens `test:user-{slug}:{ROLE}:{orgId}:{projectIds}`.
- `NEXT_PUBLIC_API_URL` - URL base hacia la API Nest (`http://localhost:3001` en local).
- `PORT` - Puerto para la API.
- `DATABASE_URL` - Cadena Prisma.
- `REDIS_HOST`, `REDIS_PORT`, `JOB_QUEUE` - Configuracion BullMQ.

## Autenticacion y autorizacion

- **Middleware**: `AuthMiddleware` valida el token Clerk y adjunta `auth` al request. `OrganizationScopeMiddleware` exige `x-org-id` y valida pertenencia del proyecto. `RolesGuard` usa `@sistema/core` para autorizar acciones.
- **Roles**: viewers pueden consultar datos, mientras `SITE`, `PM` y `ADMIN` pueden actualizar progreso de tareas; `PM` y `ADMIN` crean/eliminan.

## Planificacion y ruta critica

- **API `schedule_tasks`**: `/projects/:projectId/tasks` ofrece CRUD in-memory (semillas para `project-1`) y endpoint `/critical-path` usando `computeCriticalPath`.
- **Utilidad core**: `packages/core/src/schedule.ts` calcula ruta critica, holgura y duracion total; probado via Vitest (`packages/core/tests/critical-path.spec.ts`).
- **Web Gantt**: `/dashboard/gantt` consume la API con headers Clerk, virtualiza mas de 100 filas via `@tanstack/react-virtual`, permite editar progreso (segun rol) y destaca predecesores/actividades criticas.

## Pruebas

- API e2e (`apps/api/test/projects.e2e-spec.ts`, `apps/api/test/schedule-tasks.e2e-spec.ts`) validan auth, scoping y roles.
- Core (`pnpm --filter @sistema/core test`) ejecuta Vitest para la ruta critica.
- Ejecuta todo con `pnpm test` (orquesta Turbo).

## Desarrollo rapido

1. **Preparar base de datos**
   ```bash
   pnpm --filter @sistema/db prisma:push
   ```
2. **Generar cliente Prisma**
   ```bash
   pnpm --filter @sistema/db prisma:generate
   ```
3. **Levantar servicios**
   ```bash
   pnpm dev
   ```
4. **Probar**
   ```bash
   pnpm --filter @sistema/api test
   pnpm --filter @sistema/core test
   ```

## Pipeline Turborepo

- `build` depende de `^build` y publica artefactos (`dist/`, `.next/`, `coverage/`).
- `test` depende de `build` y deja reportes en `coverage/`.
- `dev` sin cache, procesos persistentes para mejor DX.

## Proximos pasos sugeridos

- Persistir `schedule_tasks` en Prisma/PostgreSQL con relaciones reales.
- Incluir seleccion de organizacion/proyecto en la UI y sincronizarla con Clerk.
- Extender pruebas (Vitest/Jest) y agregar despliegues en CI/CD.
