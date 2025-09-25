import "dotenv/config";
import { Queue, Worker, JobsOptions } from "bullmq";
import { formatGreeting } from "@sistema/core";
import { ensurePrismaConnection, closePrismaConnection } from "@sistema/db";

const connection = {
  connection: {
    host: process.env.REDIS_HOST ?? "127.0.0.1",
    port: Number(process.env.REDIS_PORT ?? 6379)
  }
};

const queueName = process.env.JOB_QUEUE ?? "sistema-jobs";
const jobsQueue = new Queue(queueName, connection);

const defaultJobOptions: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: 50
};

async function seedJob() {
  await jobsQueue.add(
    "hello",
    {
      message: formatGreeting("Worker"),
      generatedAt: new Date().toISOString()
    },
    defaultJobOptions
  );
}

const worker = new Worker(
  queueName,
  async job => {
    const prisma = await ensurePrismaConnection();
    const payload = job.data as { message: string; generatedAt: string };
    // eslint-disable-next-line no-console
    console.log(`Processing job ${job.id}:`, payload);

    const totalProjects = await prisma.project.count().catch(() => 0);
    await closePrismaConnection();

    return {
      processedAt: new Date().toISOString(),
      totalProjects
    };
  },
  connection
);

worker.on("completed", job => {
  // eslint-disable-next-line no-console
  console.log(`Job ${job.id} completed.`);
});

worker.on("failed", (job, err) => {
  // eslint-disable-next-line no-console
  console.error(`Job ${job?.id} failed:`, err.message);
});

async function bootstrap() {
  await jobsQueue.waitUntilReady();
  await seedJob();
  // eslint-disable-next-line no-console
  console.log("Queue ready and sample job scheduled.");
}

void bootstrap();
