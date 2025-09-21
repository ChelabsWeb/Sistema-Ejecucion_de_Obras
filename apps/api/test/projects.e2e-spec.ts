import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";

const buildToken = (role: string, orgId: string, projects: string[] = ["project-1"]) =>
  `Bearer test:user-${role.toLowerCase()}:${role}:${orgId}:${projects.join(",")}`;

describe("Projects routes (e2e)", () => {
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

  it("rejects unauthenticated access", async () => {
    const response = await request(app.getHttpServer())
      .get("/projects/project-1")
      .set("x-org-id", "org-123");

    expect(response.status).toBe(401);
  });

  it("rejects mismatched organization headers", async () => {
    const response = await request(app.getHttpServer())
      .get("/projects/project-1")
      .set("Authorization", buildToken("VIEWER", "org-123"))
      .set("x-org-id", "org-999");

    expect(response.status).toBe(403);
  });

  it("rejects insufficient roles for mutations", async () => {
    const response = await request(app.getHttpServer())
      .patch("/projects/project-1")
      .set("Authorization", buildToken("VIEWER", "org-123"))
      .set("x-org-id", "org-123");

    expect(response.status).toBe(403);
  });

  it("allows authorized roles within organization to mutate projects", async () => {
    const response = await request(app.getHttpServer())
      .patch("/projects/project-1")
      .set("Authorization", buildToken("PM", "org-123"))
      .set("x-org-id", "org-123");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      projectId: "project-1",
      status: "accepted"
    });
  });

  it("returns project data when scoped correctly", async () => {
    const response = await request(app.getHttpServer())
      .get("/projects/project-1")
      .set("Authorization", buildToken("SITE", "org-123"))
      .set("x-org-id", "org-123");

    expect(response.status).toBe(200);
    expect(response.body.project).toMatchObject({
      id: "project-1",
      orgId: "org-123"
    });
  });
});
