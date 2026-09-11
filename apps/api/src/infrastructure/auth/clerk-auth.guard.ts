import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { verifyToken } from "@clerk/backend";
import type { Request } from "express";
import { AuthService } from "./auth.service.js";

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<
      Request & {
        userId?: string;
        user?: unknown;
        query: Record<string, string | undefined>;
      }
    >();

    const header = req.headers["authorization"];
    const token =
      typeof header === "string" && header.startsWith("Bearer ")
        ? header.slice(7)
        : req.query?.token;

    if (!token) {
      throw new UnauthorizedException("Missing authentication token");
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new InternalServerErrorException("CLERK_SECRET_KEY is not set");
    }

    let sub: string;
    try {
      const payload = await verifyToken(token, { secretKey });
      sub = payload.sub;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const user = await this.auth.resolveUser(sub);
    req.userId = user.id;
    req.user = user;
    return true;
  }
}
