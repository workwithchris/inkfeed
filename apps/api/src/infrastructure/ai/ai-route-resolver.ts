import { Injectable, Inject } from "@nestjs/common";
import type { AiProvider, AiProviderRepository } from "../../domain/index.js";
import type { AiRoute } from "@repo/types";
import { decryptSecret } from "../crypto/secret-box.js";

type StoredProvider = AiProvider & { apiKeyEnc: string };

// OpenCode Zen's gateway rejects requests without a session id header. The
// env-based router attaches the same header (see @repo/ai).
const OPENCODE_SESSION = `inkfeed-${Date.now()}`;

function routeHeadersFor(
  baseUrl: string | null,
): Record<string, string> | undefined {
  if (!baseUrl) return undefined;
  try {
    const host = new URL(baseUrl).hostname;
    if (host === "opencode.ai" || host.endsWith(".opencode.ai")) {
      return {
        "x-opencode-session": OPENCODE_SESSION,
        "user-agent": "inkfeed/1.0",
      };
    }
  } catch {
    // Ignore malformed base URLs; the router will surface the error.
  }
  return undefined;
}

@Injectable()
export class AiRouteResolver {
  constructor(
    @Inject("AiProviderRepository")
    private readonly providers: AiProviderRepository,
  ) {}

  // Build a routing candidate from a single stored provider (used for testing).
  toRoute(p: StoredProvider): AiRoute {
    const headers = routeHeadersFor(p.baseUrl);
    return {
      id: p.id,
      provider: p.provider,
      model: p.model,
      apiKey: decryptSecret(p.apiKeyEnc),
      ...(p.baseUrl ? { baseUrl: p.baseUrl } : {}),
      ...(headers ? { headers } : {}),
    };
  }

  // BYOK: prefer the user's enabled providers; return undefined to fall back
  // to the env-based defaults inside @repo/ai.
  async resolve(userId: string): Promise<AiRoute[] | undefined> {
    const providers = await this.providers.findEnabledByUserId(userId);
    if (providers.length === 0) return undefined;

    return providers.map((p) => this.toRoute(p));
  }
}
