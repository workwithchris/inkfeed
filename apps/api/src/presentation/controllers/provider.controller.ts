import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateAiProviderDto,
  UpdateAiProviderDto,
} from "../../application/dtos/provider.dto";
import { CreateAiProviderUseCase } from "../../application/commands/create-provider.command";
import type { AiProviderRepository } from "../../domain/index";
import { AiRouteResolver } from "../../infrastructure/ai/ai-route-resolver";
import { ClerkAuthGuard } from "../../infrastructure/auth/clerk-auth.guard";
import { testRoute } from "@repo/ai";
import type { Request } from "express";

@Controller("api/providers")
@UseGuards(ClerkAuthGuard)
export class ProviderController {
  constructor(
    private readonly createProvider: CreateAiProviderUseCase,
    @Inject("AiProviderRepository")
    private readonly providers: AiProviderRepository,
    private readonly aiRoutes: AiRouteResolver,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateAiProviderDto,
    @Req() req: Request & { userId: string },
  ) {
    return this.createProvider.execute(req.userId, dto);
  }

  @Get()
  async list(@Req() req: Request & { userId: string }) {
    return this.providers.findByUserId(req.userId);
  }

  @Post(":id/test")
  @HttpCode(HttpStatus.OK)
  async test(
    @Param("id") id: string,
    @Req() req: Request & { userId: string },
  ) {
    const provider = await this.providers.findById(id);
    if (!provider || provider.userId !== req.userId) {
      throw new NotFoundException(`Provider ${id} not found`);
    }

    try {
      return await testRoute(this.aiRoutes.toRoute(provider));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Test failed";
      return {
        ok: false,
        model: provider.model,
        latencyMs: 0,
        sample: "",
        error: message,
      };
    }
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateAiProviderDto,
    @Req() req: Request & { userId: string },
  ) {
    const provider = await this.providers.findById(id);
    if (!provider || provider.userId !== req.userId) {
      throw new NotFoundException(`Provider ${id} not found`);
    }
    return this.providers.update(id, {
      label: dto.label,
      model: dto.model,
      enabled: dto.enabled,
      priority: dto.priority,
    });
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("id") id: string,
    @Req() req: Request & { userId: string },
  ) {
    const provider = await this.providers.findById(id);
    if (!provider || provider.userId !== req.userId) {
      throw new NotFoundException(`Provider ${id} not found`);
    }
    await this.providers.delete(id);
  }
}
