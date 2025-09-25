import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { AuthContext, UserRole } from "@sistema/core";
import { ensureRole } from "@sistema/core";
import { createClerkClient } from "@clerk/clerk-sdk-node";

type ClerkClient = ReturnType<typeof createClerkClient>;
type ClerkJwtPayload = Awaited<ReturnType<ClerkClient["verifyToken"]>> & {
  org_id?: string;
  orgId?: string;
  org_role?: string;
  orgs?: Array<{ id?: string; role?: string }>;
  custom?: { role?: string; project_ids?: string[] } | null;
  metadata?: { project_ids?: string[] } | null;
  email?: string | null;
  user_id?: string;
  sub?: string;
};

@Injectable()
export class ClerkAuthService {
  private readonly client: ClerkClient | null;
  private readonly shouldUseFakeMode: boolean;

  constructor() {
    const secretKey = process.env.CLERK_SECRET_KEY;
    this.shouldUseFakeMode = !secretKey || process.env.CLERK_FAKE_MODE === "true";
    this.client = this.shouldUseFakeMode
      ? null
      : createClerkClient({
          secretKey
        });
  }

  async verifyToken(rawToken: string | undefined): Promise<AuthContext> {
    if (!rawToken) {
      throw new UnauthorizedException("Authorization token missing");
    }

    const token = rawToken.replace(/^Bearer\s+/i, "");

    if (this.shouldUseFakeMode) {
      return this.parseFakeToken(token);
    }

    try {
      const payload = (await this.client!.verifyToken(token)) as ClerkJwtPayload;
      const orgIdCandidate = payload.org_id ?? payload.orgId ?? payload.orgs?.[0]?.id;
      const orgId = typeof orgIdCandidate === "string" ? orgIdCandidate : undefined;
      if (!orgId) {
        throw new UnauthorizedException("Organization context missing");
      }

      const roleClaim =
        (typeof payload.org_role === "string" ? payload.org_role : undefined) ??
        (typeof payload.orgs?.[0]?.role === "string" ? payload.orgs?.[0]?.role : undefined) ??
        (typeof payload.custom?.role === "string" ? payload.custom?.role : undefined) ??
        "VIEWER";

      const projectIdsClaim =
        (Array.isArray(payload.custom?.project_ids) ? payload.custom?.project_ids : undefined) ??
        (Array.isArray(payload.metadata?.project_ids) ? payload.metadata?.project_ids : undefined);

      const email = typeof payload.email === "string" ? payload.email : undefined;
      const userId =
        typeof payload.sub === "string"
          ? payload.sub
          : typeof payload.user_id === "string"
            ? payload.user_id
            : undefined;

      if (!userId) {
        throw new UnauthorizedException("User identifier missing");
      }

      return {
        userId,
        email,
        orgId,
        role: ensureRole(roleClaim),
        projectIds: projectIdsClaim
      } satisfies AuthContext;
    } catch (error) {
      throw new UnauthorizedException("Invalid Clerk token", {
        cause: error as Error
      });
    }
  }

  private parseFakeToken(token: string): AuthContext {
    const segments = token.split(":");
    if (segments.length < 4 || segments[0] !== "test") {
      throw new UnauthorizedException("Invalid fake token format");
    }

    const [, userId, roleSegment, orgId, projectsSegment] = segments;
    const role = ensureRole(roleSegment);
    const projectIds = projectsSegment ? projectsSegment.split(",") : undefined;

    return {
      userId,
      orgId,
      role,
      projectIds
    } satisfies AuthContext;
  }
}
