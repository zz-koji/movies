import { Generated } from 'kysely'
import { z } from 'zod/v4'

export const usersSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	date_created: z.date(),
	pin: z.string().min(6)
})

export const createUserSchema = usersSchema.omit({ id: true, date_created: true })
export type CreateUserSchema = z.infer<typeof createUserSchema>

export type User = z.infer<typeof usersSchema>
export type UsersTable = User & { id: Generated<string>, date_created: Generated<Date> }

