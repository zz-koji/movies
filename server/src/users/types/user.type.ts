import { Generated } from 'kysely';
import { z } from 'zod/v4';

export const roleSchema = z.enum(['user', 'admin']);
export type Role = z.infer<typeof roleSchema>;

export const usersSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  date_created: z.date(),
  pin: z.string().min(6),
  role: roleSchema.default('user'),
});

export const createUserSchema = usersSchema.omit({
  id: true,
  date_created: true,
  role: true,
});
export type CreateUserSchema = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.partial();
export type UpdateUserSchema = z.infer<typeof updateUserSchema>;

export type User = z.infer<typeof usersSchema>;
export type UsersTable = User & {
  id: Generated<string>;
  date_created: Generated<Date>;
  role: Generated<Role>;
};
