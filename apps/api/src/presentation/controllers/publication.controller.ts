import { Controller, Get, Req, Inject, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import type { PublishRepository } from "../../domain/index.js";
import { ClerkAuthGuard } from "../../infrastructure/auth/clerk-auth.guard.js";

@Controller("api/publications")
@UseGuards(ClerkAuthGuard)
export class PublicationController {
  constructor(
    @Inject("PublishRepository")
    private readonly publications: PublishRepository,
  ) {}

  @Get()
  async list(@Req() req: Request & { userId: string }) {
    return this.publications.findByUserId(req.userId);
  }
}
