import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import type { CreateUserSchema } from './types';

@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) { }

	@Post()
	async createUser(@Body() body: CreateUserSchema) {
		return await this.usersService.createUser(body)
	}
}
