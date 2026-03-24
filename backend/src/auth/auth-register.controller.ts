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

@Controller('auth')
export class AuthRegisterController {
  constructor(private registration: RegistrationService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async register(@Body() body: RegisterDto) {
    return this.registration.register(body.email, body.password);
  }
}
