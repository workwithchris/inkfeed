import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
} from "@nestjs/common";
import { InspectFeedDto } from "../../application/dtos/create-article.dto.js";
import type { ConverterService } from "../../domain/index.js";
import { ClerkAuthGuard } from "../../infrastructure/auth/clerk-auth.guard.js";

@Controller("api/feeds")
@UseGuards(ClerkAuthGuard)
export class FeedController {
  constructor(
    @Inject("ConverterService") private readonly converter: ConverterService,
  ) {}

  @Post("inspect")
  @HttpCode(HttpStatus.OK)
  async inspect(@Body() dto: InspectFeedDto) {
    return this.converter.listFeedItems(dto.url);
  }
}
