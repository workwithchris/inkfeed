import { IsUrl, IsNotEmpty } from "class-validator";

export class CreateArticleDto {
  @IsUrl({}, { message: "Must be a valid URL" })
  @IsNotEmpty()
  youtubeUrl!: string;
}
