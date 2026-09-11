import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  Inject,
  UseGuards,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ClerkAuthGuard } from "../../infrastructure/auth/clerk-auth.guard.js";
import type { ConnectionRepository } from "../../domain/index.js";
import { LinkedInPublisher } from "../../infrastructure/publishers/linkedin.publisher.js";
import { encryptSecret } from "../../infrastructure/crypto/secret-box.js";
import { signState, verifyState } from "../../infrastructure/oauth/google-blogger.js";
import {
  buildLinkedInAuthUrl,
  exchangeLinkedInCode,
} from "../../infrastructure/oauth/linkedin.js";

@Controller("api/connections/linkedin")
export class LinkedInController {
  private readonly logger = new Logger(LinkedInController.name);

  constructor(
    @Inject("ConnectionRepository")
    private readonly connections: ConnectionRepository,
    private readonly linkedin: LinkedInPublisher,
  ) {}

  @Get("authorize")
  @UseGuards(ClerkAuthGuard)
  authorize(@Req() req: Request & { userId: string }) {
    return { url: buildLinkedInAuthUrl(signState(req.userId)) };
  }

  @Get("callback")
  async callback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error: string,
    @Res() res: Response,
  ) {
    const web = (
      process.env.FRONTEND_URL || "http://localhost:3000"
    ).replace(/\/$/, "");

    try {
      if (error) throw new Error(`LinkedIn denied access: ${error}`);
      if (!code || !state) throw new Error("Missing OAuth code/state");

      const userId = verifyState(state);
      const accessToken = await exchangeLinkedInCode(code);
      const { blogId, blogName } = await this.linkedin.validate(accessToken);

      await this.connections.create({
        userId,
        platform: "linkedin",
        credentialEnc: encryptSecret(accessToken),
        blogId,
        blogName,
      });

      res.redirect(`${web}/settings?connected=linkedin`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "LinkedIn connection failed";
      this.logger.warn(`LinkedIn OAuth callback failed: ${message}`);
      res.redirect(`${web}/settings?error=${encodeURIComponent(message)}`);
    }
  }
}
