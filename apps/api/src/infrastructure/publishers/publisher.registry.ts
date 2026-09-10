import { Injectable, BadRequestException } from "@nestjs/common";
import type { BlogPublisher, PublishPlatform } from "../../domain/index";
import { DevtoPublisher } from "./devto.publisher";
import { HashnodePublisher } from "./hashnode.publisher";
import { BloggerPublisher } from "./blogger.publisher";
import { LinkedInPublisher } from "./linkedin.publisher";

@Injectable()
export class PublisherRegistry {
  private readonly map: Map<PublishPlatform, BlogPublisher>;

  constructor(
    devto: DevtoPublisher,
    hashnode: HashnodePublisher,
    blogger: BloggerPublisher,
    linkedin: LinkedInPublisher,
  ) {
    this.map = new Map<PublishPlatform, BlogPublisher>([
      [devto.platform, devto],
      [hashnode.platform, hashnode],
      [blogger.platform, blogger],
      [linkedin.platform, linkedin],
    ]);
  }

  get(platform: PublishPlatform): BlogPublisher {
    const publisher = this.map.get(platform);
    if (!publisher) {
      throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
    return publisher;
  }
}
