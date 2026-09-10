import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  ArticleEntity,
  UserEntity,
  ConnectionEntity,
  PublishEntity,
  ProviderEntity,
} from "@repo/database";
import { TypeOrmArticleRepository } from "./infrastructure/database/typeorm-article.repository";
import { TypeOrmUserRepository } from "./infrastructure/database/typeorm-user.repository";
import { TypeOrmConnectionRepository } from "./infrastructure/database/typeorm-connection.repository";
import { TypeOrmPublishRepository } from "./infrastructure/database/typeorm-publish.repository";
import { TypeOrmProviderRepository } from "./infrastructure/database/typeorm-provider.repository";
import { HttpConverterService } from "./infrastructure/http/converter.service";
import { BullMQWorker } from "./infrastructure/queue/bullmq.worker";
import { PublishWorker } from "./infrastructure/queue/publish.worker";
import { AuthService } from "./infrastructure/auth/auth.service";
import { ClerkAuthGuard } from "./infrastructure/auth/clerk-auth.guard";
import { DevtoPublisher } from "./infrastructure/publishers/devto.publisher";
import { HashnodePublisher } from "./infrastructure/publishers/hashnode.publisher";
import { BloggerPublisher } from "./infrastructure/publishers/blogger.publisher";
import { LinkedInPublisher } from "./infrastructure/publishers/linkedin.publisher";
import { GitHubPublisher } from "./infrastructure/publishers/github.publisher";
import { PublisherRegistry } from "./infrastructure/publishers/publisher.registry";
import { ProcessArticleUseCase } from "./application/commands/process-article.command";
import { UpdateArticleUseCase } from "./application/commands/update-article.command";
import { ConnectPlatformUseCase } from "./application/commands/connect-platform.command";
import { CreateAiProviderUseCase } from "./application/commands/create-provider.command";
import { PublishArticleUseCase } from "./application/commands/publish-article.command";
import { GetArticleQuery, ListArticlesQuery } from "./application/queries/get-article.query";
import { ArticleController } from "./presentation/controllers/article.controller";
import { ConnectionController } from "./presentation/controllers/connection.controller";
import { ProviderController } from "./presentation/controllers/provider.controller";
import { BloggerController } from "./presentation/controllers/blogger.controller";
import { LinkedInController } from "./presentation/controllers/linkedin.controller";
import { PublicationController } from "./presentation/controllers/publication.controller";
import { HealthController } from "./presentation/controllers/health.controller";
import { PublicArticleController } from "./presentation/controllers/public-article.controller";
import { SseService } from "./presentation/sse/sse.service";
import type { EventPublisher } from "./domain/index";

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
      ],
      synchronize: false,
    }),
    TypeOrmModule.forFeature([
      ArticleEntity,
      UserEntity,
      ConnectionEntity,
      PublishEntity,
      ProviderEntity,
    ]),
  ],
  controllers: [
    ArticleController,
    ConnectionController,
    ProviderController,
    BloggerController,
    LinkedInController,
    PublicArticleController,
    HealthController,
  ],
  providers: [
    ArticleRepoProvider,
    UserRepoProvider,
    ConnectionRepoProvider,
    PublishRepoProvider,
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
    PublisherRegistry,
    ProcessArticleUseCase,
    UpdateArticleUseCase,
    ConnectPlatformUseCase,
    CreateAiProviderUseCase,
    PublishArticleUseCase,
    GetArticleQuery,
    ListArticlesQuery,
    BullMQWorker,
    PublishWorker,
  ],
})
export class AppModule {}
