import { Injectable, Inject, BadRequestException } from "@nestjs/common";
import type { AiProvider, AiProviderRepository } from "../../domain/index";
import type { CreateAiProviderDto } from "../dtos/provider.dto";
import { encryptSecret } from "../../infrastructure/crypto/secret-box";

@Injectable()
export class CreateAiProviderUseCase {
  constructor(
    @Inject("AiProviderRepository")
    private readonly providers: AiProviderRepository,
  ) {}

  async execute(userId: string, dto: CreateAiProviderDto): Promise<AiProvider> {
    const baseUrl = dto.baseUrl?.trim() || null;

    // "openai-compatible" has no known endpoint; an explicit base URL is required.
    if (dto.provider === "openai-compatible" && !baseUrl) {
      throw new BadRequestException(
        "baseUrl is required for the openai-compatible provider",
      );
    }

    const existing = await this.providers.findByUserId(userId);
    const priority = existing.reduce((max, p) => Math.max(max, p.priority), -1) + 1;

    return this.providers.create({
      userId,
      provider: dto.provider,
      model: dto.model.trim(),
      label: dto.label?.trim() || null,
      baseUrl,
      apiKeyEnc: encryptSecret(dto.apiKey.trim()),
      priority,
    });
  }
}
