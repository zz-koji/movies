import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import type { PinLogin } from './types';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService, private readonly usersService: UsersService) { }

	@Post('login')
	async authenticateUser(@Body() body: PinLogin) {
		return await this.authService.validatePin(body)
	}
}
