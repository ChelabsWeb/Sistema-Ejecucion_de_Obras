"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface ScheduleTask {
  id: string;
  name: string;
  startDate: string;
  durationDays: number;
  progress: number;
  predecessorIds: string[];
}

interface CriticalPathEntry {
  id: string;
  duration: number;
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  slack: number;
  isCritical: boolean;
}

interface CriticalPathResult {
  entries: CriticalPathEntry[];
  criticalPath: string[];
  projectDuration: number;
}

interface ScheduleTasksResponse {
  tasks: ScheduleTask[];
  metrics: CriticalPathResult;
}

interface GanttClientProps {
  projectId: string;
  orgId: string;
  orgRole: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const DAY_WIDTH = 18;

export function GanttClient({ projectId, orgId, orgRole }: GanttClientProps) {
  const { getToken, userId, orgRole: runtimeOrgRole } = useAuth();
  const effectiveOrgRole = (runtimeOrgRole ?? orgRole ?? "VIEWER").toUpperCase();
  const effectiveOrgId = orgId ?? "org-123";
  const canEditProgress = ["ADMIN", "PM", "SITE"].includes(effectiveOrgRole);

  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [metrics, setMetrics] = useState<CriticalPathResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }),
    []
  );

  const timelineDays = useMemo(() => {
    if (metrics && metrics.projectDuration > 0) {
      return metrics.projectDuration;
    }
    const maxDuration = tasks.reduce(
      (acc, task) => Math.max(acc, task.durationDays),
      1
    );
    return Math.max(1, maxDuration);
  }, [metrics, tasks]);

  const timelineWidth = Math.max(timelineDays * DAY_WIDTH, 320);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    overscan: 6
  });

  const resolveToken = useCallback(async () => {
    const bearerToken = await getToken();
    if (bearerToken) {
      return `Bearer ${bearerToken}`;
    }
    const fallbackRole = effectiveOrgRole || "VIEWER";
    return `Bearer test:${userId ?? "web-user"}:${fallbackRole}:${effectiveOrgId}:${projectId}`;
  }, [effectiveOrgId, effectiveOrgRole, getToken, projectId, userId]);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await resolveToken();
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`, {
        method: "GET",
        headers: {
          Authorization: token,
          "x-org-id": effectiveOrgId
        }
      });

      if (!response.ok) {
        throw new Error(`Error al cargar tareas (${response.status})`);
      }

      const payload = (await response.json()) as ScheduleTasksResponse;
      setTasks(payload.tasks);
      setMetrics(payload.metrics);
    } catch (fetchError) {
      setError((fetchError as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveOrgId, projectId, resolveToken]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const updateTask = useCallback(
    async (taskId: string, body: Partial<ScheduleTask>) => {
      setSavingTaskId(taskId);
      setError(null);

      try {
        const token = await resolveToken();
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks/${taskId}`, {
          method: "PATCH",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
            "x-org-id": effectiveOrgId
          },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          throw new Error(`No se pudo actualizar la tarea (${response.status})`);
        }

        const payload = (await response.json()) as ScheduleTasksResponse;
        setTasks(payload.tasks);
        setMetrics(payload.metrics);
      } catch (updateError) {
        setError((updateError as Error).message);
        await fetchTasks();
      } finally {
        setSavingTaskId(null);
      }
    },
    [effectiveOrgId, fetchTasks, projectId, resolveToken]
  );

  const handleProgressChange = useCallback((taskId: string, value: number) => {
    setTasks(previous =>
      previous.map(task =>
        task.id === taskId
          ? {
              ...task,
              progress: value
            }
          : task
      )
    );
  }, []);

  const handleProgressCommit = useCallback(
    (taskId: string, value: number) => {
      if (!canEditProgress) {
        return;
      }
      void updateTask(taskId, { progress: value });
    },
    [canEditProgress, updateTask]
  );

  const metricsByTask = useMemo(() => {
    if (!metrics) {
      return new Map<string, CriticalPathEntry>();
    }
    return new Map(metrics.entries.map(entry => [entry.id, entry] as const));
  }, [metrics]);

  const metricsSummary =
    metrics?.criticalPath?.length ? metrics.criticalPath.join(" -> ") : "N/A";

  if (isLoading && tasks.length === 0) {
    return (
      <div className="rounded-md border border-border p-6 text-sm text-muted-foreground">
        Cargando planificacion...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>Organización: {effectiveOrgId}</span>
        <span>Rol: {effectiveOrgRole}</span>
        {metrics ? <span>Duracion estimada: {metrics.projectDuration} dias</span> : null}
      </div>

      <div className="rounded-md border border-border bg-card px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Ruta Critica: {metricsSummary}
      </div>

      <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 rounded-md border border-border bg-card px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Tarea</span>
        <span>Progreso</span>
        <span className="text-right">Cronograma</span>
      </div>

      <div
        ref={parentRef}
        className="h-[520px] overflow-auto rounded-lg border border-border bg-card"
      >
        <div
          style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const task = tasks[virtualRow.index];
            if (!task) {
              return null;
            }

            const metricsEntry = metricsByTask.get(task.id);
            const offsetDays = metricsEntry?.earliestStart ?? 0;
            const barWidthDays = metricsEntry?.duration ?? task.durationDays;
            const barOffset = offsetDays * DAY_WIDTH;
            const barWidth = Math.max(barWidthDays * DAY_WIDTH, 6);

            return (
              <div
                key={virtualRow.key}
                className="absolute left-0 right-0 border-b border-border/60 px-4 py-4"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <div className="grid grid-cols-[2fr_1fr_1fr] items-start gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{task.name}</span>
                      {metricsEntry?.isCritical ? (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                          Critica
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Inicio: {dateFormatter.format(new Date(task.startDate))}</span>
                      <span>Duracion: {task.durationDays} dias</span>
                    </div>

                    {task.predecessorIds.length > 0 ? (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {task.predecessorIds.map(predecessorId => (
                          <span
                            key={predecessorId}
                            className="rounded-full border border-border bg-muted px-2 py-0.5 font-medium text-muted-foreground"
                          >
                            ↳ {predecessorId}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin predecesores</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progreso</span>
                      <span>{task.progress}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={task.progress}
                      onChange={event => handleProgressChange(task.id, Number(event.target.value))}
                      onPointerUp={event =>
                        handleProgressCommit(task.id, Number((event.target as HTMLInputElement).value))
                      }
                      onKeyUp={event => {
                        if (event.key === "Enter" || event.key === "Tab") {
                          handleProgressCommit(task.id, Number((event.target as HTMLInputElement).value));
                        }
                      }}
                      onBlur={event =>
                        handleProgressCommit(task.id, Number((event.target as HTMLInputElement).value))
                      }
                      disabled={!canEditProgress}
                      className="w-full accent-primary"
                    />
                    {!canEditProgress ? (
                      <p className="text-[10px] text-muted-foreground">
                        Necesitas rol SITE, PM o ADMIN para editar.
                      </p>
                    ) : savingTaskId === task.id ? (
                      <p className="text-[10px] text-muted-foreground">Guardando…</p>
                    ) : null}
                  </div>

                  <div className="relative overflow-auto rounded-md bg-muted p-2" style={{ minWidth: `${timelineWidth}px` }}>
                    <div
                      className={`absolute top-1/2 h-6 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] font-semibold text-background shadow-sm transition-colors duration-200 ${
                        metricsEntry?.isCritical ? "bg-primary" : "bg-secondary"
                      }`}
                      style={{
                        width: `${barWidth}px`,
                        marginLeft: `${barOffset}px`,
                        minWidth: "6px"
                      }}
                    >
                      {task.durationDays}d
                    </div>

                    {metricsEntry ? (
                      <div className="mt-10 flex justify-between text-[10px] text-muted-foreground">
                        <span>ES {metricsEntry.earliestStart}</span>
                        <span>LS {metricsEntry.latestStart}</span>
                        <span>Holgura {metricsEntry.slack}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
