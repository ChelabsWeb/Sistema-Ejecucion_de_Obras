import { PrismaClient } from "@prisma/client";
import {
  closePrismaConnection,
  ensurePrismaConnection,
  getPrismaClient,
  getPrismaStatus
} from "./client";
import { createSupabaseScheduleTasksRepository, type ScheduleTasksRepository } from "./schedule-tasks.supabase";

export { PrismaClient };
export { closePrismaConnection, ensurePrismaConnection, getPrismaClient, getPrismaStatus };
export { createSupabaseScheduleTasksRepository };
export type { ScheduleTasksRepository };

export const prisma = getPrismaClient();