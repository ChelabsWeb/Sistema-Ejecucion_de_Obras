import { PrismaClient } from "@prisma/client";
import {
  closePrismaConnection,
  ensurePrismaConnection,
  getPrismaClient,
  getPrismaStatus
} from "./client";

export { PrismaClient };
export { closePrismaConnection, ensurePrismaConnection, getPrismaClient, getPrismaStatus };

export const prisma = getPrismaClient();