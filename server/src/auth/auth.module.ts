import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from './auth.guard';

@Module({
	imports: [JwtModule.registerAsync({
		useFactory: (configService: ConfigService) => ({
			secret: configService.getOrThrow('SECRET'),
			signOptions: { expiresIn: configService.getOrThrow('EXPIRES_IN') || '1h' }
		}), inject: [ConfigService]
	}), UsersModule],
	controllers: [AuthController],
	providers: [AuthService, AuthGuard],
})
export class AuthModule { }
