import type { ScheduleTaskEntity } from "@sistema/core";
import { getSupabaseClient } from "./supabase-client";

const TABLE = "schedule_tasks";

type ScheduleTaskRow = {
  id: string;
  project_id: string;
  name: string;
  start_date: string;
  duration_days: number;
  progress: number;
  predecessor_ids: string[] | null;
  created_at?: string;
  updated_at?: string;
};

export interface ScheduleTasksRepository {
  list(projectId: string): Promise<ScheduleTaskEntity[]>;
  create(task: ScheduleTaskEntity): Promise<ScheduleTaskEntity>;
  update(task: ScheduleTaskEntity): Promise<ScheduleTaskEntity>;
  remove(projectId: string, taskId: string): Promise<void>;
}

export function createSupabaseScheduleTasksRepository(): ScheduleTasksRepository {
  const client = getSupabaseClient();
  return {
    async list(projectId) {
      const { data, error } = await client
        .from(TABLE)
        .select("*")
        .eq("project_id", projectId)
        .order("start_date", { ascending: true });

      if (error) {
        throw new Error(`Supabase list error: ${error.message}`);
      }

      return (data ?? []).map(mapRowToEntity);
    },
    async create(task) {
      const row = mapEntityToRow(task);
      const { data, error } = await client
        .from(TABLE)
        .insert([row])
        .select()
        .single();

      if (error) {
        throw new Error(`Supabase insert error: ${error.message}`);
      }

      return mapRowToEntity(data);
    },
    async update(task) {
      const row = mapEntityToRow(task);
      const { data, error } = await client
        .from(TABLE)
        .update({
          name: row.name,
          start_date: row.start_date,
          duration_days: row.duration_days,
          progress: row.progress,
          predecessor_ids: row.predecessor_ids,
          updated_at: new Date().toISOString()
        })
        .eq("id", task.id)
        .eq("project_id", task.projectId)
        .select()
        .single();

      if (error) {
        throw new Error(`Supabase update error: ${error.message}`);
      }

      return mapRowToEntity(data);
    },
    async remove(projectId, taskId) {
      const { error } = await client
        .from(TABLE)
        .delete()
        .eq("id", taskId)
        .eq("project_id", projectId);

      if (error) {
        throw new Error(`Supabase delete error: ${error.message}`);
      }
    }
  } satisfies ScheduleTasksRepository;
}

function mapRowToEntity(row: ScheduleTaskRow): ScheduleTaskEntity {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    startDate: row.start_date,
    durationDays: row.duration_days,
    progress: row.progress,
    predecessorIds: row.predecessor_ids ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapEntityToRow(task: ScheduleTaskEntity): ScheduleTaskRow {
  return {
    id: task.id,
    project_id: task.projectId,
    name: task.name,
    start_date: task.startDate,
    duration_days: task.durationDays,
    progress: task.progress,
    predecessor_ids: task.predecessorIds ?? []
  };
}
