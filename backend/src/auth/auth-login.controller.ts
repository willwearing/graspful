import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthLoginService } from './auth-login.service';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

const isDev = process.env.NODE_ENV !== 'production';
const LOGIN_LIMIT = isDev ? 200 : 20;
const LOGIN_TTL = isDev ? 60_000 : 60_000;

@Controller('auth')
export class AuthLoginController {
  private readonly logger = new Logger(AuthLoginController.name);

  constructor(private readonly loginService: AuthLoginService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LOGIN_LIMIT, ttl: LOGIN_TTL } })
  async login(@Body() body: LoginDto) {
    return this.loginService.login(body.email, body.password);
  }
}
