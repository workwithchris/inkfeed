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
import { ClerkAuthGuard } from "../../infrastructure/auth/clerk-auth.guard";
import type { ConnectionRepository } from "../../domain/index";
import { BloggerPublisher } from "../../infrastructure/publishers/blogger.publisher";
import { encryptSecret } from "../../infrastructure/crypto/secret-box";
import {
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  verifyState,
} from "../../infrastructure/oauth/google-blogger";

@Controller("api/connections/blogger")
export class BloggerController {
  private readonly logger = new Logger(BloggerController.name);

  constructor(
    @Inject("ConnectionRepository")
    private readonly connections: ConnectionRepository,
    private readonly blogger: BloggerPublisher,
  ) {}

  // Authenticated: returns the Google consent URL to redirect the browser to.
  @Get("authorize")
  @UseGuards(ClerkAuthGuard)
  authorize(@Req() req: Request & { userId: string }) {
    return { url: buildGoogleAuthUrl(req.userId) };
  }

  // Public: Google redirects here. Identity comes from the signed state.
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
      if (error) throw new Error(`Google denied access: ${error}`);
      if (!code || !state) throw new Error("Missing OAuth code/state");

      const userId = verifyState(state);
      const { refreshToken } = await exchangeGoogleCode(code);
      const { blogId, blogName } = await this.blogger.validate(refreshToken);

      await this.connections.create({
        userId,
        platform: "blogger",
        credentialEnc: encryptSecret(refreshToken),
        blogId,
        blogName,
      });

      res.redirect(`${web}/settings?connected=blogger`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Blogger connection failed";
      this.logger.warn(`Blogger OAuth callback failed: ${message}`);
      res.redirect(
        `${web}/settings?error=${encodeURIComponent(message)}`,
      );
    }
  }
}
