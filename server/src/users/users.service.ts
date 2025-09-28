import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely } from 'node_modules/kysely/dist/esm';
import { Database } from 'src/database/types';
import { createUserSchema, CreateUserSchema } from './types';
import { ZodError } from 'zod';

@Injectable()
export class UsersService {
	constructor(@Inject('MOVIES_DATABASE') private readonly db: Kysely<Database>) { }


	async createUser(data: CreateUserSchema) {
		try {
			const parsedValues = createUserSchema.parse(data)
			return await this.db.insertInto('users').values(parsedValues).returning(['id', 'name', 'date_created']).executeTakeFirst()
		} catch (error) {
			if (error instanceof Error) {
				if (
					error.message.includes(
						'duplicate key value violates unique constraint',
					)
				) {
					const constraintMatch = error.message.match(
						/unique constraint "([^"]+)"/,
					);
					const constraintName = constraintMatch ? constraintMatch[1] : 'unknown';

					const conflictException = new ConflictException(
						`The submitted data violates the ${constraintName} rule of the users table.`,
					);

					throw conflictException
				}

				if (error instanceof ZodError) {
					throw new BadRequestException(error.issues)
				} else {
					console.log(error)
					throw new BadRequestException()
				}
			}
		}
	}

	async getPin({ name }: { name: string }) {
		const user = await this.db.selectFrom('users').where('name', '=', name).select('pin').executeTakeFirst()
		return user?.pin ?? new NotFoundException()
	}

	async getUser({ name }: { name: string }) {
		return await this.db.selectFrom('users')
			.$if(name !== undefined, (qb) => {
				return qb.where('name', '=', name)
			})
			.select(['id', 'name', 'date_created'])
			.executeTakeFirst()
	}

	async getUsers() {
		return await this.db.selectFrom('users').select(['id', 'name', 'date_created']).execute()
	}
}
