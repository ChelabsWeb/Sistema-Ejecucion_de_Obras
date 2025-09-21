import { Controller, Get, Patch, Param, Req, UseGuards } from "@nestjs/common";
import type { AuthenticatedRequest } from "../common/interfaces/authenticated-request";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { ProjectsService } from "./projects.service";

@Controller({ path: "projects" })
@UseGuards(RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(":projectId")
  @Roles("VIEWER", "SITE", "PM", "FINANCE", "ADMIN")
  getProject(@Param("projectId") projectId: string, @Req() req: AuthenticatedRequest) {
    return {
      project: req.project ?? this.projectsService.findById(projectId)
    };
  }

  @Patch(":projectId")
  @Roles("PM", "ADMIN")
  updateProject(@Param("projectId") projectId: string, @Req() req: AuthenticatedRequest) {
    const project = req.project ?? this.projectsService.findById(projectId);
    return {
      projectId: project.id,
      status: "accepted"
    };
  }
}
