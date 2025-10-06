import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ConfigService } from '@nestjs/config';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

@Module({
  providers: [
    DatabaseService,
    {
      provide: 'MOVIES_DATABASE',
      useFactory: (configService: ConfigService) => {
        const dialect = new PostgresDialect({
          pool: new Pool({
            host: configService.getOrThrow('DB_HOST'),
            user: configService.getOrThrow('POSTGRES_USER'),
            password: configService.getOrThrow('POSTGRES_PASSWORD'),
            database: configService.getOrThrow('POSTGRES_DB'),
            port: configService.getOrThrow('DB_PORT'),
          }),
        });
        return new Kysely({ dialect });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['MOVIES_DATABASE'],
})
export class DatabaseModule {}
