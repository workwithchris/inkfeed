import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateConnectionDto {
  @IsIn(["devto", "hashnode", "github"])
  platform!: "devto" | "hashnode" | "github";

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
}

export class PublishArticleDto {
  @IsString()
  @IsNotEmpty()
  connectionId!: string;

  @IsOptional()
  @IsBoolean()
  includeCoverImage?: boolean;
}
