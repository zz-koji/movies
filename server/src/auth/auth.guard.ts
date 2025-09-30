import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private readonly jwtService: JwtService, private readonly configService: ConfigService, private readonly usersService: UsersService) { }
	async canActivate(
		context: ExecutionContext,
	): Promise<boolean> {
		const host = context.switchToHttp()
		const request = host.getRequest<Request>()
		const token = this.extractTokenFromCookies(request)

		if (!token) {
			throw new UnauthorizedException('No token provided.')
		}

		try {
			const secret = this.configService.getOrThrow('JWT_SECRET')
			const payload: { id: string } = await this.jwtService.verify(token, { secret })
			const user = await this.usersService.getUser({ id: payload.id })
			request.user = user
			return true
		} catch (error) {
			console.log(error)
			throw new UnauthorizedException('Invalid or expired token')
		}
	}

	private extractTokenFromCookies(request: Request) {
		const accessToken = request.cookies.accessToken
		return accessToken
	}
}
