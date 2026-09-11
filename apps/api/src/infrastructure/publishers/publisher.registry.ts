import { Injectable, BadRequestException } from "@nestjs/common";
import type { BlogPublisher, PublishPlatform } from "../../domain/index.js";
import { DevtoPublisher } from "./devto.publisher.js";
import { HashnodePublisher } from "./hashnode.publisher.js";
import { BloggerPublisher } from "./blogger.publisher.js";
import { LinkedInPublisher } from "./linkedin.publisher.js";
import { GitHubPublisher } from "./github.publisher.js";
import { SitePublisher } from "./site.publisher.js";
import { WebhookPublisher } from "./webhook.publisher.js";

@Injectable()
export class PublisherRegistry {
  private readonly map: Map<PublishPlatform, BlogPublisher>;

  constructor(
    devto: DevtoPublisher,
    hashnode: HashnodePublisher,
    blogger: BloggerPublisher,
    linkedin: LinkedInPublisher,
    github: GitHubPublisher,
    site: SitePublisher,
    webhook: WebhookPublisher,
  ) {
    this.map = new Map<PublishPlatform, BlogPublisher>([
      [devto.platform, devto],
      [hashnode.platform, hashnode],
      [blogger.platform, blogger],
      [linkedin.platform, linkedin],
      [github.platform, github],
      [site.platform, site],
      [webhook.platform, webhook],
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
