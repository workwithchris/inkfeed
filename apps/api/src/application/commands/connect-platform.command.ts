import { Injectable, Inject, BadRequestException, Logger } from "@nestjs/common";
import type {
  Connection,
  ConnectionRepository,
  PublishPlatform,
} from "../../domain/index";
import { PublisherRegistry } from "../../infrastructure/publishers/publisher.registry";
import { encryptSecret } from "../../infrastructure/crypto/secret-box";

@Injectable()
export class ConnectPlatformUseCase {
  private readonly logger = new Logger(ConnectPlatformUseCase.name);

  constructor(
    @Inject("ConnectionRepository")
    private readonly connections: ConnectionRepository,
    private readonly registry: PublisherRegistry,
  ) {}

  async execute(input: {
    userId: string;
    platform: PublishPlatform;
    credential: string;
    blogId?: string;
  }): Promise<Connection> {
    const publisher = this.registry.get(input.platform);

    // Validate the credential against the platform before persisting anything.
    let blogId: string | null;
    let blogName: string | null;
    try {
      const result = await publisher.validate(input.credential);
      blogId = result.blogId;
      blogName = result.blogName;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Validation failed";
      this.logger.warn(`Connect ${input.platform} failed: ${message}`);
      throw new BadRequestException(message);
    }

    return this.connections.create({
      userId: input.userId,
      platform: input.platform,
      credentialEnc: encryptSecret(input.credential),
      blogId: input.blogId ?? blogId,
      blogName,
    });
  }
}
