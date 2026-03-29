import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { IsIn, IsString } from 'class-validator';
import { CurrentUser, SupabaseAuthGuard } from '@/auth';
import type { AuthUser } from './guards/supabase-auth.guard';
import type { CliAuthMode } from './cli-auth.service';
import { CliAuthService } from './cli-auth.service';

class StartCliAuthDto {
  @IsString()
  @IsIn(['sign-in', 'sign-up'])
  mode!: CliAuthMode;
}

class ExchangeCliAuthDto {
  @IsString()
  token!: string;
}

@Controller('auth/cli')
export class CliAuthController {
  constructor(private readonly cliAuthService: CliAuthService) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async start(@Body() body: StartCliAuthDto) {
    return this.cliAuthService.start(body.mode);
  }

  @Post('sessions/exchange')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 600, ttl: 60_000 } })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async exchange(@Body() body: ExchangeCliAuthDto) {
    return this.cliAuthService.exchange(body.token);
  }

  @Post('sessions/authorize')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SupabaseAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async authorize(
    @Body() body: ExchangeCliAuthDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cliAuthService.authorize(body.token, user.userId, user.email);
  }
}
