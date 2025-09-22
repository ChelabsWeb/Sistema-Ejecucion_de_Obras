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
  type ScheduleTaskEntity,
  type ScheduleTaskInput
} from "@sistema/core";
import {
  createSupabaseScheduleTasksRepository,
  type ScheduleTasksRepository
} from "@sistema/db";
import { CreateScheduleTaskDto } from "./dto/create-schedule-task.dto";
import { UpdateScheduleTaskDto } from "./dto/update-schedule-task.dto";

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
  private readonly repository: ScheduleTasksRepository;
  private readonly supabaseEnabled: boolean;

  constructor() {
    this.supabaseEnabled = Boolean(
      process.env.SUPABASE_URL &&
        (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY)
    );

    this.repository = this.supabaseEnabled
      ? createSupabaseScheduleTasksRepository()
      : new InMemoryScheduleTasksRepository(DEFAULT_TASKS);
  }

  async list(projectId: string): Promise<ScheduleTasksResponse> {
    const tasks = await this.repository.list(projectId);
    const metrics = this.computeMetrics(tasks);
    return { tasks, metrics };
  }

  async create(projectId: string, payload: CreateScheduleTaskDto): Promise<ScheduleTasksResponse> {
    const existingTasks = await this.repository.list(projectId);
    const predecessorIds = payload.predecessorIds ?? [];
    this.assertPredecessorsExist(existingTasks, predecessorIds);

    const newTask: ScheduleTaskEntity = {
      id: randomUUID(),
      projectId,
      name: payload.name,
      startDate: payload.startDate,
      durationDays: payload.durationDays,
      progress: payload.progress ?? 0,
      predecessorIds
    };

    await this.repository.create(newTask);

    try {
      const updatedTasks = await this.repository.list(projectId);
      const metrics = this.computeMetrics(updatedTasks);
      return {
        tasks: updatedTasks,
        metrics
      };
    } catch (error) {
      await this.repository.remove(projectId, newTask.id).catch(() => undefined);
      throw error;
    }
  }

  async update(
    projectId: string,
    taskId: string,
    payload: UpdateScheduleTaskDto
  ): Promise<ScheduleTasksResponse> {
    const existingTasks = await this.repository.list(projectId);
    const current = existingTasks.find(task => task.id === taskId);

    if (!current) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const updated: ScheduleTaskEntity = {
      ...current,
      ...payload,
      progress: payload.progress ?? current.progress,
      predecessorIds: payload.predecessorIds ?? current.predecessorIds
    };

    this.assertPredecessorsExist(existingTasks, updated.predecessorIds, taskId);

    await this.repository.update(updated);

    try {
      const updatedTasks = await this.repository.list(projectId);
      const metrics = this.computeMetrics(updatedTasks);
      return {
        tasks: updatedTasks,
        metrics
      };
    } catch (error) {
      await this.repository.update(current).catch(() => undefined);
      throw error;
    }
  }

  async remove(projectId: string, taskId: string): Promise<ScheduleTasksResponse> {
    const existingTasks = await this.repository.list(projectId);
    const current = existingTasks.find(task => task.id === taskId);

    if (!current) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const dependents = existingTasks.filter(task => task.predecessorIds.includes(taskId));
    for (const dependent of dependents) {
      const updatedDependent: ScheduleTaskEntity = {
        ...dependent,
        predecessorIds: dependent.predecessorIds.filter(id => id !== taskId)
      };
      await this.repository.update(updatedDependent);
    }

    await this.repository.remove(projectId, taskId);

    const updatedTasks = await this.repository.list(projectId);
    const metrics = this.computeMetrics(updatedTasks);
    return {
      tasks: updatedTasks,
      metrics
    };
  }

  async criticalPath(projectId: string): Promise<CriticalPathResult> {
    const tasks = await this.repository.list(projectId);
    return this.computeMetrics(tasks);
  }

  private assertPredecessorsExist(
    tasks: ScheduleTaskEntity[],
    predecessorIds: string[],
    currentTaskId?: string
  ) {
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

  private computeMetrics(tasks: ScheduleTaskEntity[]): CriticalPathResult {
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

class InMemoryScheduleTasksRepository implements ScheduleTasksRepository {
  private readonly store = new Map<string, ScheduleTaskEntity[]>();

  constructor(seed: ScheduleTaskEntity[]) {
    for (const task of seed) {
      const projectTasks = this.getMutable(task.projectId);
      projectTasks.push(cloneTask(task));
    }
  }

  async list(projectId: string): Promise<ScheduleTaskEntity[]> {
    return this.getMutable(projectId)
      .map(cloneTask)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  async create(task: ScheduleTaskEntity): Promise<ScheduleTaskEntity> {
    const tasks = this.getMutable(task.projectId);
    tasks.push(cloneTask(task));
    return cloneTask(task);
  }

  async update(task: ScheduleTaskEntity): Promise<ScheduleTaskEntity> {
    const tasks = this.getMutable(task.projectId);
    const index = tasks.findIndex(item => item.id === task.id);
    if (index === -1) {
      throw new Error(`Task ${task.id} not found`);
    }
    tasks[index] = cloneTask(task);
    return cloneTask(task);
  }

  async remove(projectId: string, taskId: string): Promise<void> {
    const tasks = this.getMutable(projectId);
    const index = tasks.findIndex(item => item.id === taskId);
    if (index !== -1) {
      tasks.splice(index, 1);
    }
  }

  private getMutable(projectId: string): ScheduleTaskEntity[] {
    if (!this.store.has(projectId)) {
      this.store.set(projectId, []);
    }
    return this.store.get(projectId)!;
  }
}

function cloneTask(task: ScheduleTaskEntity): ScheduleTaskEntity {
  return {
    ...task,
    predecessorIds: [...task.predecessorIds]
  };
}
