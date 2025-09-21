import { Injectable, NestMiddleware, UnauthorizedException } from "@nestjs/common";
import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../interfaces/authenticated-request";
import { ClerkAuthService } from "../auth/clerk-auth.service";

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly clerkAuthService: ClerkAuthService) {}

  async use(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    try {
      req.auth = await this.clerkAuthService.verifyToken(authHeader);
      next();
    } catch (error) {
      throw new UnauthorizedException((error as Error).message);
    }
  }
}
