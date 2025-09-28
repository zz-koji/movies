import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { PinLogin, pinLoginSchema } from './types';

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
			throw new UnauthorizedException()
		}
	}
}
