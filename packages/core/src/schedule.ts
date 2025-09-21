export interface ScheduleTaskInput {
  id: string;
  name?: string;
  duration: number;
  predecessors?: string[];
}

export interface CriticalPathEntry {
  id: string;
  duration: number;
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  slack: number;
  isCritical: boolean;
}

export interface CriticalPathResult {
  entries: CriticalPathEntry[];
  criticalPath: string[];
  projectDuration: number;
}

class CriticalPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CriticalPathError";
  }
}

export function computeCriticalPath(tasks: ScheduleTaskInput[]): CriticalPathResult {
  if (tasks.length === 0) {
    return {
      entries: [],
      criticalPath: [],
      projectDuration: 0
    };
  }

  const taskMap = new Map<string, ScheduleTaskInput>();
  const successors = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  for (const task of tasks) {
    if (task.duration <= 0) {
      throw new CriticalPathError(`Task ${task.id} must have a duration greater than zero`);
    }

    if (taskMap.has(task.id)) {
      throw new CriticalPathError(`Duplicate task id detected: ${task.id}`);
    }

    taskMap.set(task.id, task);
    successors.set(task.id, []);
    indegree.set(task.id, 0);
  }

  for (const task of tasks) {
    const predecessors = task.predecessors ?? [];
    for (const predecessorId of predecessors) {
      if (!taskMap.has(predecessorId)) {
        throw new CriticalPathError(
          `Task ${task.id} references unknown predecessor ${predecessorId}`
        );
      }
      successors.get(predecessorId)!.push(task.id);
      indegree.set(task.id, (indegree.get(task.id) ?? 0) + 1);
    }
  }

  const earliestStart = new Map<string, number>();
  const earliestFinish = new Map<string, number>();
  const queue: string[] = [];
  const topoOrder: string[] = [];

  for (const [taskId, degree] of indegree.entries()) {
    if (degree === 0) {
      queue.push(taskId);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    topoOrder.push(current);
    const task = taskMap.get(current)!;
    const predecessors = task.predecessors ?? [];
    const start = predecessors.reduce((acc, predecessorId) => {
      return Math.max(acc, earliestFinish.get(predecessorId) ?? 0);
    }, 0);

    const finish = start + task.duration;
    earliestStart.set(current, start);
    earliestFinish.set(current, finish);

    for (const successorId of successors.get(current) ?? []) {
      indegree.set(successorId, (indegree.get(successorId) ?? 0) - 1);
      if (indegree.get(successorId) === 0) {
        queue.push(successorId);
      }
    }
  }

  if (topoOrder.length !== tasks.length) {
    throw new CriticalPathError("Cycle detected in schedule tasks");
  }

  const projectDuration = Math.max(...Array.from(earliestFinish.values()));

  const latestFinish = new Map<string, number>();
  const latestStart = new Map<string, number>();

  for (let i = topoOrder.length - 1; i >= 0; i -= 1) {
    const taskId = topoOrder[i];
    const task = taskMap.get(taskId)!;
    const outgoing = successors.get(taskId) ?? [];

    if (outgoing.length === 0) {
      latestFinish.set(taskId, projectDuration);
    } else {
      const minLatestStart = outgoing.reduce((acc, successorId) => {
        const successorLatestStart = latestStart.get(successorId);
        if (successorLatestStart === undefined) {
          throw new CriticalPathError(
            `Missing latest start for successor ${successorId} while processing ${taskId}`
          );
        }
        return Math.min(acc, successorLatestStart);
      }, Number.POSITIVE_INFINITY);
      latestFinish.set(taskId, minLatestStart);
    }

    const taskLatestFinish = latestFinish.get(taskId)!;
    latestStart.set(taskId, taskLatestFinish - task.duration);
  }

  const entries: CriticalPathEntry[] = topoOrder.map(taskId => {
    const duration = taskMap.get(taskId)!.duration;
    const es = earliestStart.get(taskId)!;
    const ef = earliestFinish.get(taskId)!;
    const ls = latestStart.get(taskId)!;
    const lf = latestFinish.get(taskId)!;
    const slack = ls - es;

    return {
      id: taskId,
      duration,
      earliestStart: es,
      earliestFinish: ef,
      latestStart: ls,
      latestFinish: lf,
      slack,
      isCritical: slack === 0
    } satisfies CriticalPathEntry;
  });

  const criticalPath = entries
    .filter(entry => entry.isCritical)
    .sort((a, b) => a.earliestStart - b.earliestStart)
    .map(entry => entry.id);

  return {
    entries,
    criticalPath,
    projectDuration
  } satisfies CriticalPathResult;
}

export { CriticalPathError };
