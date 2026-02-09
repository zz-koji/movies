import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { PinLogin } from './types';
import type { Request, Response } from 'express';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() body: PinLogin,
    @Res({ passthrough: true }) response: Response,
  ) {
    return await this.authService.register(body, response);
  }

  @Post('login')
  async authenticateUser(
    @Body() body: PinLogin,
    @Res({ passthrough: true }) response: Response,
  ) {
    return await this.authService.login(body, response);
  }

  @UseGuards(AuthGuard)
  @Get('whoami')
  async whoami(@Req() request: Request) {
    return request.user;
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('accessToken');
    return { message: 'Logged out successfully' };
  }
}
