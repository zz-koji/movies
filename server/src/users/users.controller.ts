import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import type { CreateUserSchema, UpdateUserSchema } from './types';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() body: CreateUserSchema) {
    return await this.usersService.createUser(body);
  }

  @Get()
  async getUsers() {
    return await this.usersService.getUsers();
  }

  @Patch()
  async updateUser(@Query('id') id: string, @Body() data: UpdateUserSchema) {
    return await this.usersService.updateUser(id, data);
  }
}
