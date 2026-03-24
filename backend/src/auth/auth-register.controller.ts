import {
  Body, Controller, HttpCode, HttpStatus, Post, UseGuards, UsePipes, ValidationPipe,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { RegistrationService } from './registration.service';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

// In development, allow many registrations for e2e tests.
// In production, keep it tight (5 per hour).
const isDev = process.env.NODE_ENV !== 'production';
const REGISTER_LIMIT = isDev ? 200 : 5;
const REGISTER_TTL = isDev ? 60_000 : 3_600_000;

@Controller('auth')
export class AuthRegisterController {
  constructor(private registration: RegistrationService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: REGISTER_LIMIT, ttl: REGISTER_TTL } })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async register(@Body() body: RegisterDto) {
    return this.registration.register(body.email, body.password);
  }
}
