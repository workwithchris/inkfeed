import {
  Injectable,
  Inject,
  UnauthorizedException,
  InternalServerErrorException,
} from "@nestjs/common";
import { createClerkClient } from "@clerk/backend";
import type { User, UserRepository } from "../../domain/index";

@Injectable()
export class AuthService {
  constructor(
    @Inject("UserRepository") private readonly users: UserRepository,
  ) {}

  async resolveUser(clerkUserId: string): Promise<User> {
    const existing = await this.users.findByClerkId(clerkUserId);
    if (existing) return existing;

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new InternalServerErrorException("CLERK_SECRET_KEY is not set");
    }

    let email: string;
    let name: string | null = null;
    try {
      const clerk = createClerkClient({ secretKey });
      const u = await clerk.users.getUser(clerkUserId);
      email =
        u.emailAddresses[0]?.emailAddress ?? `${clerkUserId}@clerk.local`;
      name =
        [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
        u.username ||
        null;
    } catch {
      throw new UnauthorizedException("Unable to load Clerk user");
    }

    return this.users.upsertFromClerk({ clerkUserId, email, name });
  }
}
