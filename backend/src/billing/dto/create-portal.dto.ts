import { IsOptional, IsString } from 'class-validator';

export class CreatePortalDto {
  @IsOptional()
  @IsString()
  returnUrl?: string;
}
