import { PrismaClient } from "@prisma/client";

let prismaSingleton: PrismaClient | null = null;
let lastStatus: "disconnected" | "connecting" | "connected" = "disconnected";

export function getPrismaClient() {
  if (!prismaSingleton) {
    prismaSingleton = new PrismaClient();
  }

  return prismaSingleton;
}

export async function ensurePrismaConnection() {
  const prisma = getPrismaClient();
  if (lastStatus === "connected") {
    return prisma;
  }

  try {
    lastStatus = "connecting";
    await prisma.$connect();
    lastStatus = "connected";
  } catch (error) {
    lastStatus = "disconnected";
    throw error;
  }

  return prisma;
}

export async function closePrismaConnection() {
  if (!prismaSingleton) {
    return;
  }
  await prismaSingleton.$disconnect();
  lastStatus = "disconnected";
}

export function getPrismaStatus() {
  return lastStatus;
}