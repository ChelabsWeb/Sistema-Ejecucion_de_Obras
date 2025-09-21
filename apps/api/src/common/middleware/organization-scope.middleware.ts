import { Injectable, NestMiddleware, ForbiddenException } from "@nestjs/common";
import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../interfaces/authenticated-request";
import { ProjectsService } from "../../projects/projects.service";

@Injectable()
export class OrganizationScopeMiddleware implements NestMiddleware {
  constructor(private readonly projectsService: ProjectsService) {}

  use(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
    const orgHeader = req.headers["x-org-id"];
    const requestedOrg = Array.isArray(orgHeader) ? orgHeader[0] : orgHeader;
    const projectId = req.params.projectId;

    if (!req.auth) {
      throw new ForbiddenException("Auth context missing");
    }

    const { orgId } = req.auth;

    if (!requestedOrg || requestedOrg !== orgId) {
      throw new ForbiddenException("Organization mismatch");
    }

    if (projectId) {
      const project = this.projectsService.findById(projectId);
      if (project.orgId !== orgId) {
        throw new ForbiddenException("Project not accessible for this organization");
      }
      req.project = project;
    }

    next();
  }
}
