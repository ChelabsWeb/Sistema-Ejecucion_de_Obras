import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { hasRequiredRole, type AuthContext, type UserRole } from "@sistema/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { AuthenticatedRequest } from "../interfaces/authenticated-request";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const auth = request.auth as AuthContext | undefined;

    if (!auth) {
      throw new ForbiddenException("Auth context missing");
    }

    if (!hasRequiredRole(auth.role, requiredRoles)) {
      throw new ForbiddenException("Insufficient role to access this resource");
    }

    return true;
  }
}
