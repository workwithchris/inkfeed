import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class GenerateVideoDto {
  @IsOptional()
  @IsString()
  voice?: string;

  @IsOptional()
  @IsInt()
  @Min(-100)
  @Max(100)
  voiceRate?: number;

  @IsOptional()
  @IsInt()
  @Min(-50)
  @Max(50)
  voicePitch?: number;

  @IsOptional()
  @IsIn(["gradient", "cover"])
  background?: "gradient" | "cover";

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsIn(["ink", "slate", "noir", "light"])
  theme?: "ink" | "slate" | "noir" | "light";

  @IsOptional()
  @IsIn(["9:16", "1:1", "16:9"])
  aspect?: "9:16" | "1:1" | "16:9";

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(40)
  scenes?: number;

  @IsOptional()
  @IsIn(["preview", "final"])
  quality?: "preview" | "final";

  @IsOptional()
  @IsString()
  cta?: string;

  @IsOptional()
  @IsIn(["auto", "rewrite", "custom"])
  scriptSource?: "auto" | "rewrite" | "custom";

  @IsOptional()
  @IsString()
  customScript?: string;

  @IsOptional()
  @IsBoolean()
  kenBurns?: boolean;

  @IsOptional()
  @IsIn(["none", "fade"])
  transition?: "none" | "fade";

  @IsOptional()
  @IsString()
  musicUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  musicVolume?: number;

  @IsOptional()
  @IsIn(["sans", "serif", "mono"])
  font?: "sans" | "serif" | "mono";

  @IsOptional()
  @IsString()
  textColor?: string;

  @IsOptional()
  @IsIn(["top", "center", "bottom"])
  textPosition?: "top" | "center" | "bottom";

  @IsOptional()
  @IsBoolean()
  uppercase?: boolean;

  @IsOptional()
  @IsBoolean()
  watermark?: boolean;

  @IsOptional()
  @IsString()
  watermarkText?: string;

  @IsOptional()
  @IsIn(["short", "full"])
  format?: "short" | "full";
}
