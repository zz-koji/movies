import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { PinLogin } from './types';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) { }

	@Post('login')
	async authenticateUser(@Body() body: PinLogin, @Req() request: Request) {
		return await this.authService.login(body, request)
	}
}
