import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely } from 'kysely';
import { Database } from 'src/database/types';
import {
  createUserSchema,
  CreateUserSchema,
  updateUserSchema,
  UpdateUserSchema,
  Role,
} from './types';

@Injectable()
export class UsersService {
  constructor(
    @Inject('MOVIES_DATABASE') private readonly db: Kysely<Database>,
  ) {}

  async createUser(data: CreateUserSchema) {
    const parsedValues = createUserSchema.parse(data);
    return await this.db
      .insertInto('users')
      .values(parsedValues)
      .returning(['id', 'name', 'date_created', 'role'])
      .executeTakeFirst();
  }

  async getPin({ name }: { name: string }) {
    const user = await this.db
      .selectFrom('users')
      .where('name', 'ilike', name)
      .select('pin')
      .executeTakeFirstOrThrow(NotFoundException);
    return user.pin;
  }

  async getUser({ name, id }: { name?: string; id?: string }) {
    let query = this.db.selectFrom('users');

    if (name) {
      query = query.where('name', 'ilike', name);
    }

    if (id) {
      query = query.where('id', '=', id);
    }

    return query.select(['id', 'name', 'date_created', 'role']).executeTakeFirst();
  }

  async getUsers() {
    return await this.db
      .selectFrom('users')
      .select(['id', 'name', 'date_created', 'role'])
      .execute();
  }

  async getAllUsers() {
    return await this.db
      .selectFrom('users')
      .select(['id', 'name', 'date_created', 'role'])
      .orderBy('name', 'asc')
      .execute();
  }

  async updateUser(id: string, values: UpdateUserSchema) {
    updateUserSchema.parse(values);
    return await this.db
      .updateTable('users')
      .where('id', '=', id)
      .set(values)
      .returning(['id', 'name', 'date_created', 'role'])
      .executeTakeFirst();
  }

  async updateUserRole(id: string, role: Role) {
    return await this.db
      .updateTable('users')
      .where('id', '=', id)
      .set({ role })
      .returning(['id', 'name', 'date_created', 'role'])
      .executeTakeFirst();
  }

  async isAdmin(id: string): Promise<boolean> {
    const user = await this.getUser({ id });
    return user?.role === 'admin';
  }
}
