import { z } from 'zod/v4'

export const usersSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	date_created: z.date(),
})

export type User = z.infer<typeof usersSchema>
