import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely } from 'node_modules/kysely/dist/esm';
import { Database } from 'src/database/types';
import { createUserSchema, CreateUserSchema, updateUserSchema, UpdateUserSchema } from './types';

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

	async getUser({ name, id }: { name?: string, id?: string }) {
		let query = this.db.selectFrom('users')

		if (name) {
			query = query.where('name', '=', name)
		}

		if (id) {
			query = query.where('id', '=', id)
		}

		return query.select(['id', 'name', 'date_created']).executeTakeFirst()
	}

	async getUsers() {
		return await this.db.selectFrom('users').select(['id', 'name', 'date_created']).execute()
	}

	async updateUser(id: string, values: UpdateUserSchema) {
		updateUserSchema.parse(values)
		return await this.db.updateTable('users').where('id', '=', id).set(values).returning(['id', 'name', 'date_created']).executeTakeFirst()
	}
}
