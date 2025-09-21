import type { Request } from "express";
import type { AuthContext } from "@sistema/core";
import type { Project } from "../../projects/project.entity";

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
  project?: Project;
}
