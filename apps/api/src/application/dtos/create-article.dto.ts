import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { SOURCE_TYPES } from "@repo/types";
import type { SourceType } from "@repo/types";

export class CreateArticleDto {
  @IsIn(SOURCE_TYPES)
  sourceType!: SourceType;

  // YouTube/watch URL, article URL, or feed URL depending on sourceType.
  @IsUrl({}, { message: "Must be a valid URL" })
  @IsNotEmpty()
  url!: string;

  // Required for "feed": the chosen episode/item URL.
  @IsOptional()
  @IsUrl({}, { message: "Must be a valid URL" })
  itemUrl?: string;
}

export class UploadArticleDto {
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsString()
  @IsNotEmpty()
  contentBase64!: string;
}

export class CreateManualArticleDto {
  @IsOptional()
  @IsString()
  title?: string;
}

export class InspectFeedDto {
  @IsUrl({}, { message: "Must be a valid URL" })
  @IsNotEmpty()
  url!: string;
}

export class BulkArticleItemDto {
  @IsUrl({}, { message: "Must be a valid URL" })
  url!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  channel?: string;
}

export class BulkCreateArticlesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BulkArticleItemDto)
  items!: BulkArticleItemDto[];
}
