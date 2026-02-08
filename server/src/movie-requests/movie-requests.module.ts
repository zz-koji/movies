import { Module } from '@nestjs/common';
import { MovieRequestsService } from './movie-requests.service';
import { DatabaseModule } from 'src/database/database.module';
import { MovieRequestsController } from './movie-requests.controller';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [DatabaseModule, AuthModule, UsersModule],
  providers: [MovieRequestsService],
  controllers: [MovieRequestsController],
  exports: [MovieRequestsService],
})
export class MovieRequestsModule {}
