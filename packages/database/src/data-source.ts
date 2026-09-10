import { join } from "path";
import { DataSource } from "typeorm";
import { UserEntity } from "./entity/UserEntity.js";
import { ArticleEntity } from "./entity/ArticleEntity.js";
import { ConnectionEntity } from "./entity/ConnectionEntity.js";
import { PublishEntity } from "./entity/PublishEntity.js";

// Running from dist (compiled) uses .js migrations; from ts-node uses .ts.
const migrationExt = __filename.endsWith(".ts") ? "ts" : "js";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "youtube_to_article",
  synchronize: false,
  logging: process.env.NODE_ENV !== "production",
  entities: [UserEntity, ArticleEntity, ConnectionEntity, PublishEntity],
  migrations: [join(__dirname, "migration", `*.${migrationExt}`)],
});
