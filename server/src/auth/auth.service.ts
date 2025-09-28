import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { PinLogin, pinLoginSchema } from './types';
import { Request } from 'express';
import { User } from 'src/users/types';

@Injectable()
export class AuthService {
	constructor(private readonly usersService: UsersService) { }

	async validatePin(data: PinLogin) {
		try {
			const parsedValues = pinLoginSchema.parse(data)
			const validPin = await this.usersService.getPin({ name: parsedValues.name })
			if (!validPin) throw new UnauthorizedException()
			return parsedValues.pin === validPin
		} catch (error) {
			throw new Error('Invalid Pin')
		}
	}

	async login(data: PinLogin, request: Request) {
		try {
			await this.validatePin(data)
			const user = await this.usersService.getUser({ name: data.name })
			if (!user) throw new UnauthorizedException()
			request.user = user
		} catch (error) {
			if (error instanceof Error) {
				switch (error.message) {
					case "Invalid Pin":
						throw new UnauthorizedException('Invalid Pin')
					default:
						throw new BadRequestException()
				}
			}
		}
	}
}
