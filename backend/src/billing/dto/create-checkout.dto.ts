import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @IsIn(['individual', 'team'])
  plan!: 'individual' | 'team';

  @IsOptional()
  @IsIn(['month', 'year'])
  interval?: 'month' | 'year';

  @IsOptional()
  @IsString()
  returnUrl?: string;
}
