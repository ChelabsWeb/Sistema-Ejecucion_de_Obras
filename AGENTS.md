# Agents de trabajo (prompts reutilizables)


## scaffold-monorepo
Objetivo: Crear monorepo con Turborepo, apps/web (Next 14), apps/api (NestJS), apps/worker (BullMQ), packages/ui, packages/db (Prisma), packages/core. Configurar pnpm workspaces y scripts básicos de desarrollo.


## auth-rbac
Objetivo: Añadir Clerk/Auth0 a web y API. Middleware de scoping por organización y proyecto. Roles: ADMIN, PM, SITE, FINANCE, VIEWER. Pruebas de acceso.


## schedule-module
Objetivo: CRUD de `schedule_tasks` + util de ruta crítica. API amigable para Gantt (start, finish, predecessors[], progress, critical). Vista inicial Timeline/Gantt en web.


## budget-module
Objetivo: Matriz presupuesto con baseline/current, cost codes y totales por grupo. Endpoint de import/export.


## change-orders
Objetivo: Flujo CO (draft → submitted → approved). Al aprobar: sumar `impact_cost` a budget.current y aplicar `impact_days` al schedule, recomputar ruta crítica y snapshot EVM.


## evm-core
Objetivo: Utilidades EV/PV/AC → SPI/CPI, snapshots diarios, tests.


## rfis-submittals
Objetivo: RFIs/Submittals con estados y due dates. Notificaciones por atraso. Export PDF.


## infra-deploy
Objetivo: Vercel (web), Fly.io (api/worker), Neon Postgres, Upstash Redis, R2. CI con GitHub Actions. Health checks + runbook.