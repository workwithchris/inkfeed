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
    let username: string | null = null;
    try {
      const clerk = createClerkClient({ secretKey });
      const u = await clerk.users.getUser(clerkUserId);
      email =
        u.emailAddresses[0]?.emailAddress ?? `${clerkUserId}@clerk.local`;
      name =
        [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
        u.username ||
        null;
      username = u.username || null;
    } catch {
      throw new UnauthorizedException("Unable to load Clerk user");
    }

    const user = await this.users.upsertFromClerk({ clerkUserId, email, name });

    // First-time users get a profile slug derived from their Clerk username
    // (falling back to the email local-part). It is editable later in Settings.
    if (!user.username) {
      const base = slugify(
        username ?? email.split("@")[0] ?? `user-${user.id.slice(0, 8)}`,
      );
      try {
        return await this.users.updateUsername(user.id, base);
      } catch {
        return await this.users.updateUsername(
          user.id,
          `${base}-${user.id.slice(0, 6)}`,
        );
      }
    }

    return user;
  }
}

// Lowercase, alphanumeric + hyphen, no leading/trailing hyphen.
function slugify(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return /^[a-z0-9][a-z0-9-]{2,31}$/.test(cleaned)
    ? cleaned
    : `user-${cleaned}`.slice(0, 32).replace(/-$/, "");
}
