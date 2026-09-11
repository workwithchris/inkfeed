import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { CreateConnectionDto } from "../../application/dtos/connection.dto";
import { ConnectPlatformUseCase } from "../../application/commands/connect-platform.command";
import type { ConnectionRepository } from "../../domain/index";
import { ClerkAuthGuard } from "../../infrastructure/auth/clerk-auth.guard";
import type { Request } from "express";

@Controller("api/connections")
@UseGuards(ClerkAuthGuard)
export class ConnectionController {
  constructor(
    private readonly connectPlatform: ConnectPlatformUseCase,
    @Inject("ConnectionRepository")
    private readonly connections: ConnectionRepository,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateConnectionDto,
    @Req() req: Request & { userId: string },
  ) {
    const connection = await this.connectPlatform.execute({
      userId: req.userId,
      platform: dto.platform,
      credential: dto.credential,
      blogId: dto.blogId,
    });
    return connection;
  }

  @Get()
  async list(@Req() req: Request & { userId: string }) {
    // The built-in "this site" destination should always be available.
    await this.connectPlatform.ensureBuiltIn(req.userId);
    return this.connections.findByUserId(req.userId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("id") id: string,
    @Req() req: Request & { userId: string },
  ) {
    const connection = await this.connections.findById(id);
    if (!connection || connection.userId !== req.userId) {
      throw new NotFoundException(`Connection ${id} not found`);
    }
    if (connection.platform === "site") {
      throw new BadRequestException("The built-in site connection can't be removed");
    }
    await this.connections.delete(id);
  }
}
