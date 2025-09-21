# Obra‑SaaS — Contexto de Producto


## Objetivo
Mantener sincronizados cronograma y presupuesto, con visibilidad diaria de desvíos. Minimizar fricción en campo (mobile/offline) y proveer KPIs ejecutivos (SPI/CPI, desvíos, COs, RFIs) en un dashboard simple.


## Usuarios y roles
- ADMIN (org), PM (proyecto), SITE (campo), FINANCE (finanzas), VIEWER (cliente/propietario).


## Reglas no negociables
- Accesibilidad (focus-visible, alto contraste, soporte teclado).
- Tests unitarios y e2e (Vitest + Playwright) para módulos críticos.
- Auditoría de acciones sensibles (change orders, aprobaciones).
- Multi-tenant por `org_id` en todas las entidades.


## Stack
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui.
- Backend: NestJS + Prisma + PostgreSQL, BullMQ (Redis) para jobs.
- Storage: S3/R2 (planos/fotos). Auth: Clerk/Auth0. Billing: Stripe.
- Realtime: WebSockets. Observabilidad: Sentry + OpenTelemetry.


## Módulos MVP
- Proyectos/Equipos (multi-tenant)
- Cronograma (Gantt/Kanban, dependencias, ruta crítica)
- Presupuesto (baseline/current, cost codes)
- Change Orders (impacto tiempo/costo con cascada a schedule/budget)
- RFIs/Submittals (estados, SLA simples, notifs)
- EVM (EV, PV, AC → SPI/CPI) + dashboard


## Guía para el asistente (Codex)
- Proponer plan de cambios antes de ejecutar.
- Pedir aprobación para comandos y edición de archivos.
- Seguir el diseño: limpio, claro, focus en legibilidad y estado actual.
- Entregar commits pequeños y atómicos con mensajes descriptivos.