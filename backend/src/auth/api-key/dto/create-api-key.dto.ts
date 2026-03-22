import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
