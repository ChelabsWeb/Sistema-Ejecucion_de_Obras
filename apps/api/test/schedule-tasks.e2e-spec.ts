import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";

const PROJECT_ID = "project-1";
const BASE_PATH = `/projects/${PROJECT_ID}/tasks`;

const buildToken = (role: string, orgId = "org-123", projects: string[] = [PROJECT_ID]) =>
  `Bearer test:user-${role.toLowerCase()}:${role}:${orgId}:${projects.join(",")}`;

describe("Schedule tasks CRUD (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("blocks access without authorization", async () => {
    const response = await request(app.getHttpServer())
      .get(BASE_PATH)
      .set("x-org-id", "org-123");

    expect(response.status).toBe(401);
  });

  it("lists schedule tasks with metrics for authorized viewers", async () => {
    const response = await request(app.getHttpServer())
      .get(BASE_PATH)
      .set("Authorization", buildToken("VIEWER"))
      .set("x-org-id", "org-123");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.tasks)).toBe(true);
    expect(response.body.tasks.length).toBeGreaterThan(0);
    expect(response.body.metrics).toMatchObject({ projectDuration: expect.any(Number) });
  });

  it("allows SITE role to update progress", async () => {
    const listResponse = await request(app.getHttpServer())
      .get(BASE_PATH)
      .set("Authorization", buildToken("VIEWER"))
      .set("x-org-id", "org-123");

    const taskId = listResponse.body.tasks[0].id;

    const response = await request(app.getHttpServer())
      .patch(`${BASE_PATH}/${taskId}`)
      .send({ progress: 55 })
      .set("Authorization", buildToken("SITE"))
      .set("x-org-id", "org-123");

    expect(response.status).toBe(200);
    const updatedTask = response.body.tasks.find((task: { id: string }) => task.id === taskId);
    expect(updatedTask.progress).toBe(55);
  });

  it("prevents VIEWER role from creating tasks", async () => {
    const response = await request(app.getHttpServer())
      .post(BASE_PATH)
      .send({
        name: "Topografía",
        startDate: new Date("2025-10-01").toISOString(),
        durationDays: 3,
        predecessorIds: ["task-foundations"]
      })
      .set("Authorization", buildToken("VIEWER"))
      .set("x-org-id", "org-123");

    expect(response.status).toBe(403);
  });

  it("creates tasks for PM role and returns updated metrics", async () => {
    const response = await request(app.getHttpServer())
      .post(BASE_PATH)
      .send({
        name: "Paneles prefabricados",
        startDate: new Date("2025-10-05").toISOString(),
        durationDays: 4,
        predecessorIds: ["task-installations"]
      })
      .set("Authorization", buildToken("PM"))
      .set("x-org-id", "org-123");

    expect(response.status).toBe(201);
    expect(response.body.tasks.some((task: { name: string }) => task.name === "Paneles prefabricados")).toBe(
      true
    );
    expect(response.body.metrics.criticalPath.length).toBeGreaterThan(0);
  });

  it("detects cyclic dependencies during updates", async () => {
    const response = await request(app.getHttpServer())
      .patch(`${BASE_PATH}/task-foundations`)
      .send({ predecessorIds: ["task-installations"] })
      .set("Authorization", buildToken("PM"))
      .set("x-org-id", "org-123");

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/cycle/i);
  });

  it("provides the critical path summary endpoint", async () => {
    const response = await request(app.getHttpServer())
      .get(`${BASE_PATH}/critical-path`)
      .set("Authorization", buildToken("VIEWER"))
      .set("x-org-id", "org-123");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("criticalPath");
    expect(Array.isArray(response.body.criticalPath)).toBe(true);
  });
});
