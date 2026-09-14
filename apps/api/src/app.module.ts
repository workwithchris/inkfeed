import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  ArticleEntity,
  UserEntity,
  ConnectionEntity,
  PublishEntity,
  ProviderEntity,
  DerivativeEntity,
} from "@repo/database";
import { TypeOrmArticleRepository } from "./infrastructure/database/typeorm-article.repository.js";
import { TypeOrmUserRepository } from "./infrastructure/database/typeorm-user.repository.js";
import { TypeOrmConnectionRepository } from "./infrastructure/database/typeorm-connection.repository.js";
import { TypeOrmPublishRepository } from "./infrastructure/database/typeorm-publish.repository.js";
import { TypeOrmProviderRepository } from "./infrastructure/database/typeorm-provider.repository.js";
import { TypeOrmDerivativeRepository } from "./infrastructure/database/typeorm-derivative.repository.js";
import { HttpConverterService } from "./infrastructure/http/converter.service.js";
import { AiRouteResolver } from "./infrastructure/ai/ai-route-resolver.js";
import { BullMQWorker } from "./infrastructure/queue/bullmq.worker.js";
import { PublishWorker } from "./infrastructure/queue/publish.worker.js";
import { DerivativeWorker } from "./infrastructure/queue/derivative.worker.js";
import { VideoWorker } from "./infrastructure/queue/video.worker.js";
import { AuthService } from "./infrastructure/auth/auth.service.js";
import { ClerkAuthGuard } from "./infrastructure/auth/clerk-auth.guard.js";
import { DevtoPublisher } from "./infrastructure/publishers/devto.publisher.js";
import { HashnodePublisher } from "./infrastructure/publishers/hashnode.publisher.js";
import { BloggerPublisher } from "./infrastructure/publishers/blogger.publisher.js";
import { LinkedInPublisher } from "./infrastructure/publishers/linkedin.publisher.js";
import { GitHubPublisher } from "./infrastructure/publishers/github.publisher.js";
import { SitePublisher } from "./infrastructure/publishers/site.publisher.js";
import { WebhookPublisher } from "./infrastructure/publishers/webhook.publisher.js";
import { PublisherRegistry } from "./infrastructure/publishers/publisher.registry.js";
import { ProcessArticleUseCase } from "./application/commands/process-article.command.js";
import { GenerateDerivativeUseCase } from "./application/commands/generate-derivative.command.js";
import { GenerateVideoUseCase } from "./application/commands/generate-video.command.js";
import { UpdateArticleUseCase } from "./application/commands/update-article.command.js";
import { ConnectPlatformUseCase } from "./application/commands/connect-platform.command.js";
import { CreateAiProviderUseCase } from "./application/commands/create-provider.command.js";
import { PublishArticleUseCase } from "./application/commands/publish-article.command.js";
import { GetArticleQuery, ListArticlesQuery } from "./application/queries/get-article.query.js";
import { ArticleController } from "./presentation/controllers/article.controller.js";
import { FeedController } from "./presentation/controllers/feed.controller.js";
import { ConnectionController } from "./presentation/controllers/connection.controller.js";
import { ProviderController } from "./presentation/controllers/provider.controller.js";
import { BloggerController } from "./presentation/controllers/blogger.controller.js";
import { LinkedInController } from "./presentation/controllers/linkedin.controller.js";
import { PublicationController } from "./presentation/controllers/publication.controller.js";
import { HealthController } from "./presentation/controllers/health.controller.js";
import { PublicArticleController } from "./presentation/controllers/public-article.controller.js";
import { PublicFeedController } from "./presentation/controllers/public-feed.controller.js";
import { MediaController } from "./presentation/controllers/media.controller.js";
import { PublicProfileController } from "./presentation/controllers/public-profile.controller.js";
import { ProfileController } from "./presentation/controllers/profile.controller.js";
import { SseService } from "./presentation/sse/sse.service.js";
import type { EventPublisher } from "./domain/index.js";

const ArticleRepoProvider = {
  provide: "ArticleRepository",
  useClass: TypeOrmArticleRepository,
};

const UserRepoProvider = {
  provide: "UserRepository",
  useClass: TypeOrmUserRepository,
};

const ConnectionRepoProvider = {
  provide: "ConnectionRepository",
  useClass: TypeOrmConnectionRepository,
};

const PublishRepoProvider = {
  provide: "PublishRepository",
  useClass: TypeOrmPublishRepository,
};

const DerivativeRepoProvider = {
  provide: "DerivativeRepository",
  useClass: TypeOrmDerivativeRepository,
};

const AiProviderRepoProvider = {
  provide: "AiProviderRepository",
  useClass: TypeOrmProviderRepository,
};

const ConverterProvider = {
  provide: "ConverterService",
  useClass: HttpConverterService,
};

const EventPublisherProvider = {
  provide: "EventPublisher",
  inject: [SseService],
  useFactory: (sse: SseService): EventPublisher => ({
    publishToUser: (userId, event) => sse.publishToUser(userId, event),
  }),
};

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      username: process.env.DB_USERNAME || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      database: process.env.DB_NAME || "youtube_to_article",
      entities: [
        ArticleEntity,
        UserEntity,
        ConnectionEntity,
        PublishEntity,
        ProviderEntity,
        DerivativeEntity,
      ],
      synchronize: false,
    }),
    TypeOrmModule.forFeature([
      ArticleEntity,
      UserEntity,
      ConnectionEntity,
      PublishEntity,
      ProviderEntity,
      DerivativeEntity,
    ]),
  ],
  controllers: [
    ArticleController,
    FeedController,
    ConnectionController,
    ProviderController,
    BloggerController,
    LinkedInController,
    PublicArticleController,
    PublicProfileController,
    PublicFeedController,
    ProfileController,
    MediaController,
    HealthController,
  ],
  providers: [
    ArticleRepoProvider,
    UserRepoProvider,
    ConnectionRepoProvider,
    PublishRepoProvider,
    DerivativeRepoProvider,
    AiProviderRepoProvider,
    ConverterProvider,
    EventPublisherProvider,
    SseService,
    AuthService,
    ClerkAuthGuard,
    DevtoPublisher,
    HashnodePublisher,
    BloggerPublisher,
    LinkedInPublisher,
    GitHubPublisher,
    SitePublisher,
    WebhookPublisher,
    PublisherRegistry,
    AiRouteResolver,
    ProcessArticleUseCase,
    GenerateDerivativeUseCase,
    GenerateVideoUseCase,
    UpdateArticleUseCase,
    ConnectPlatformUseCase,
    CreateAiProviderUseCase,
    PublishArticleUseCase,
    GetArticleQuery,
    ListArticlesQuery,
    BullMQWorker,
    PublishWorker,
    DerivativeWorker,
    VideoWorker,
  ],
})
export class AppModule {}
