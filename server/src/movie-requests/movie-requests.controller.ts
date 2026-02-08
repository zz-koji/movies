import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MovieRequestsService } from './movie-requests.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { User } from 'src/users/types';
import type {
  CreateMovieRequestSchema,
  UpdateMovieRequestSchema,
} from './types';

@Controller('movie-requests')
export class MovieRequestsController {
  constructor(private readonly movieRequestsService: MovieRequestsService) {}

  @Get()
  async getAllRequests() {
    return await this.movieRequestsService.getAll();
  }

  @Get(':id')
  async getRequestById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.movieRequestsService.getById(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  async createRequest(
    @Body() data: CreateMovieRequestSchema,
    @CurrentUser() user: User,
  ) {
    return await this.movieRequestsService.create(data, user.id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async updateRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateMovieRequestSchema,
    @CurrentUser() user: User,
  ) {
    return await this.movieRequestsService.update(id, data, user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return await this.movieRequestsService.delete(id, user.id);
  }
}
