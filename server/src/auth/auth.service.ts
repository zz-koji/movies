import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { PinLogin, pinLoginSchema } from './types';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
	constructor(private readonly usersService: UsersService, private readonly jwtService: JwtService) { }

	async validatePin(data: PinLogin) {
		const parsedValues = pinLoginSchema.parse(data)
		const validPin = await this.usersService.getPin({ name: parsedValues.name })
		if (validPin !== parsedValues.pin) throw new UnauthorizedException()
	}

	async login(data: PinLogin, response: Response) {
		await this.validatePin(data)
		const user = await this.usersService.getUser({ name: data.name })
		if (!user) throw new UnauthorizedException()
		response.user = user
		const accessToken = this.jwtService.sign({ id: user.id })
		response.cookie('accessToken', accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: 'lax',
			expires: new Date(Date.now() + 3600000)
		})
		return { user: response.user, accessToken: accessToken }
	}
}
