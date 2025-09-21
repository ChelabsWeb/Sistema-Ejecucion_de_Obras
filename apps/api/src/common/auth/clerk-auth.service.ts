import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { AuthContext, UserRole } from "@sistema/core";
import { ensureRole } from "@sistema/core";
import { createClerkClient, type ClerkClient } from "@clerk/clerk-sdk-node";

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
      const { payload } = await this.client!.verifyToken(token);
      const orgId = (payload.org_id ?? payload.orgId ?? payload.orgs?.[0]?.id) as string | undefined;
      if (!orgId) {
        throw new UnauthorizedException("Organization context missing");
      }

      const roleClaim =
        (payload.org_role as string | undefined) ??
        (payload.orgs?.[0]?.role as string | undefined) ??
        (payload.custom?.role as string | undefined) ??
        "VIEWER";

      const projectIdsClaim =
        (payload.custom?.project_ids as string[] | undefined) ??
        (payload.metadata?.project_ids as string[] | undefined);

      return {
        userId: payload.sub ?? payload.user_id,
        email: payload.email,
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
