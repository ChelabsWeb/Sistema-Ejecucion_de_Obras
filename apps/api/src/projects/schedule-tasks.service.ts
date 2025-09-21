import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  CriticalPathError,
  computeCriticalPath,
  type CriticalPathResult,
  type ScheduleTaskInput
} from "@sistema/core";
import { CreateScheduleTaskDto } from "./dto/create-schedule-task.dto";
import { UpdateScheduleTaskDto } from "./dto/update-schedule-task.dto";

export interface ScheduleTaskEntity {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  durationDays: number;
  progress: number;
  predecessorIds: string[];
}

export interface ScheduleTasksResponse {
  tasks: ScheduleTaskEntity[];
  metrics: CriticalPathResult;
}

const DEFAULT_TASKS: ScheduleTaskEntity[] = [
  {
    id: "task-foundations",
    projectId: "project-1",
    name: "Cimentacion",
    startDate: new Date("2025-09-01").toISOString(),
    durationDays: 5,
    progress: 40,
    predecessorIds: []
  },
  {
    id: "task-structure",
    projectId: "project-1",
    name: "Estructura",
    startDate: new Date("2025-09-07").toISOString(),
    durationDays: 10,
    progress: 20,
    predecessorIds: ["task-foundations"]
  },
  {
    id: "task-installations",
    projectId: "project-1",
    name: "Instalaciones",
    startDate: new Date("2025-09-18").toISOString(),
    durationDays: 7,
    progress: 10,
    predecessorIds: ["task-structure"]
  },
  {
    id: "task-finishes",
    projectId: "project-1",
    name: "Terminaciones",
    startDate: new Date("2025-09-26").toISOString(),
    durationDays: 6,
    progress: 0,
    predecessorIds: ["task-installations"]
  }
];

@Injectable()
export class ScheduleTasksService {
  private readonly store = new Map<string, ScheduleTaskEntity[]>();

  constructor() {
    this.bootstrapDefaults();
  }

  list(projectId: string): ScheduleTasksResponse {
    const tasks = this.getTasks(projectId);
    const metrics = this.computeMetrics(projectId);
    return {
      tasks,
      metrics
    };
  }

  create(projectId: string, payload: CreateScheduleTaskDto): ScheduleTasksResponse {
    const tasks = this.ensureProjectStore(projectId);
    const predecessorIds = payload.predecessorIds ?? [];
    this.assertPredecessorsExist(projectId, predecessorIds);

    const newTask: ScheduleTaskEntity = {
      id: randomUUID(),
      projectId,
      name: payload.name,
      startDate: payload.startDate,
      durationDays: payload.durationDays,
      progress: payload.progress ?? 0,
      predecessorIds
    };

    tasks.push(newTask);

    try {
      const metrics = this.computeMetrics(projectId);
      return {
        tasks: this.cloneTasks(projectId),
        metrics
      };
    } catch (error) {
      tasks.pop();
      throw error;
    }
  }

  update(
    projectId: string,
    taskId: string,
    payload: UpdateScheduleTaskDto
  ): ScheduleTasksResponse {
    const tasks = this.ensureProjectStore(projectId);
    const index = tasks.findIndex(item => item.id === taskId);

    if (index === -1) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const current = tasks[index];
    const updated: ScheduleTaskEntity = {
      ...current,
      ...payload,
      progress: payload.progress ?? current.progress,
      predecessorIds: payload.predecessorIds ?? current.predecessorIds
    };

    this.assertPredecessorsExist(projectId, updated.predecessorIds, taskId);

    tasks[index] = updated;

    try {
      const metrics = this.computeMetrics(projectId);
      return {
        tasks: this.cloneTasks(projectId),
        metrics
      };
    } catch (error) {
      tasks[index] = current;
      throw error;
    }
  }

  remove(projectId: string, taskId: string): ScheduleTasksResponse {
    const tasks = this.ensureProjectStore(projectId);
    const index = tasks.findIndex(item => item.id === taskId);

    if (index === -1) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const [removed] = tasks.splice(index, 1);

    for (const task of tasks) {
      task.predecessorIds = task.predecessorIds.filter(id => id !== removed.id);
    }

    const metrics = this.computeMetrics(projectId);
    return {
      tasks: this.cloneTasks(projectId),
      metrics
    };
  }

  criticalPath(projectId: string): CriticalPathResult {
    return this.computeMetrics(projectId);
  }

  private bootstrapDefaults() {
    for (const task of DEFAULT_TASKS) {
      const tasks = this.ensureProjectStore(task.projectId);
      tasks.push({ ...task });
    }
  }

  private ensureProjectStore(projectId: string): ScheduleTaskEntity[] {
    if (!this.store.has(projectId)) {
      this.store.set(projectId, []);
    }
    return this.store.get(projectId)!;
  }

  private getTasks(projectId: string): ScheduleTaskEntity[] {
    const tasks = this.store.get(projectId) ?? [];
    return [...tasks]
      .map(task => ({ ...task, predecessorIds: [...task.predecessorIds] }))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  private cloneTasks(projectId: string): ScheduleTaskEntity[] {
    return this.getTasks(projectId);
  }

  private assertPredecessorsExist(
    projectId: string,
    predecessorIds: string[],
    currentTaskId?: string
  ) {
    const tasks = this.ensureProjectStore(projectId);
    const ids = new Set(tasks.map(task => task.id));
    if (currentTaskId) {
      ids.delete(currentTaskId);
    }

    for (const predecessorId of predecessorIds) {
      if (!ids.has(predecessorId)) {
        throw new BadRequestException(`Predecessor ${predecessorId} does not exist`);
      }
    }
  }

  private computeMetrics(projectId: string): CriticalPathResult {
    const tasks = this.ensureProjectStore(projectId);
    const inputs: ScheduleTaskInput[] = tasks.map(task => ({
      id: task.id,
      name: task.name,
      duration: task.durationDays,
      predecessors: task.predecessorIds
    }));

    try {
      return computeCriticalPath(inputs);
    } catch (error) {
      if (error instanceof CriticalPathError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
