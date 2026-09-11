import {
  Controller,
  Get,
  Param,
  Inject,
  NotFoundException,
} from "@nestjs/common";
import type {
  ArticleRepository,
  UserRepository,
} from "../../domain/index";

// Unauthenticated public profile page data for a user, addressed by their
// username (profile slug). Returns their info plus every article explicitly
// published to the built-in site.
@Controller("api/public/profiles")
export class PublicProfileController {
  constructor(
    @Inject("UserRepository") private readonly users: UserRepository,
    @Inject("ArticleRepository")
    private readonly articles: ArticleRepository,
  ) {}

  @Get(":username")
  async findOne(@Param("username") username: string) {
    const user = await this.users.findByUsername(username);
    if (!user) {
      throw new NotFoundException("Profile not found");
    }

    const published = await this.articles.findSitePublishedByUserId(user.id);

    return {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        bio: null,
      },
      articles: published.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        summary: a.summary,
        coverImageUrl: a.coverImageUrl,
        tags: a.tags,
        readingTimeMinutes: a.readingTimeMinutes,
        channel: a.channel,
        createdAt: a.createdAt,
      })),
    };
  }
}