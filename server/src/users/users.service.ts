import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely } from 'node_modules/kysely/dist/esm';
import { Database } from 'src/database/types';
import { createUserSchema, CreateUserSchema } from './types';

@Injectable()
export class UsersService {
	constructor(@Inject('MOVIES_DATABASE') private readonly db: Kysely<Database>) { }


	async createUser(data: CreateUserSchema) {
		const parsedValues = createUserSchema.parse(data)
		return await this.db.insertInto('users').values(parsedValues).returning(['id', 'name', 'date_created']).executeTakeFirst()
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
