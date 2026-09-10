import { IsIn, IsNotEmpty, IsString } from "class-validator";
import { DERIVATIVE_KINDS } from "@repo/types";
import type { DerivativeKind } from "@repo/types";

export class CreateDerivativeDto {
  @IsIn(DERIVATIVE_KINDS)
  kind!: DerivativeKind;
}

export class UpdateDerivativeDto {
  @IsString()
  @IsNotEmpty()
  content!: string;
}
