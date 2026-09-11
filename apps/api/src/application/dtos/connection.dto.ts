import {
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateConnectionDto {
  @IsIn(["devto", "hashnode", "github", "webhook"])
  platform!: "devto" | "hashnode" | "github" | "webhook";

  @IsString()
  @IsNotEmpty()
  credential!: string;

  @IsOptional()
  @IsString()
  blogId?: string;
}

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  coverImageUrl?: string;
}

export class PublishArticleDto {
  @IsString()
  @IsNotEmpty()
  connectionId!: string;

  @IsOptional()
  @IsBoolean()
  includeCoverImage?: boolean;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsISO8601()
  scheduledFor?: string;
}
