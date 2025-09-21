import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GanttClient } from "./gantt-client";

const DEFAULT_PROJECT_ID = "project-1";

export default function GanttPage() {
  const { userId, orgId, orgRole } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Planificación Gantt</h1>
        <p className="text-sm text-muted-foreground">
          Visualiza y actualiza tareas críticas del proyecto con cálculo de ruta crítica en tiempo real.
        </p>
      </header>

      <Suspense fallback={<div className="rounded-md border border-border p-6">Cargando planificación…</div>}>
        <GanttClient orgId={orgId ?? "org-123"} orgRole={orgRole ?? "VIEWER"} projectId={DEFAULT_PROJECT_ID} />
      </Suspense>
    </section>
  );
}
