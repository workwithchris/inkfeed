import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
} from "@nestjs/common";
import { InspectFeedDto } from "../../application/dtos/create-article.dto";
import type { ConverterService } from "../../domain/index";
import { ClerkAuthGuard } from "../../infrastructure/auth/clerk-auth.guard";

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
