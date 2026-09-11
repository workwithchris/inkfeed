import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
  Inject,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import type { User, UserRepository } from "../../domain/index";
import { ClerkAuthGuard } from "../../infrastructure/auth/clerk-auth.guard";
import type { Request } from "express";

@Controller("api/profile")
@UseGuards(ClerkAuthGuard)
export class ProfileController {
  constructor(
    @Inject("UserRepository") private readonly users: UserRepository,
  ) {}

  @Get()
  async get(@Req() req: Request & { user: User }) {
    return { username: req.user.username, name: req.user.name };
  }

  @Patch()
  async update(
    @Req() req: Request & { userId: string },
    @Body() dto: { username?: string },
  ) {
    if (typeof dto.username !== "string" || !dto.username.trim()) {
      throw new BadRequestException("Username is required");
    }
    try {
      const user = await this.users.updateUsername(req.userId, dto.username);
      return { username: user.username };
    } catch (e) {
      if (e instanceof ConflictException) throw e;
      throw new BadRequestException("Invalid username");
    }
  }
}