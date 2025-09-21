import { Injectable, NotFoundException } from "@nestjs/common";
import type { Project } from "./project.entity";

const PROJECTS: Project[] = [
  { id: "project-1", name: "Hospital Regional", orgId: "org-123" },
  { id: "project-2", name: "Escuela Técnica", orgId: "org-456" }
];

@Injectable()
export class ProjectsService {
  findById(projectId: string): Project {
    const project = PROJECTS.find(item => item.id === projectId);
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    return project;
  }
}
