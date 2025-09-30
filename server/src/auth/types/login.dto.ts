import z from "zod/v4";

export const pinLoginSchema = z.object({
  name: z.string().toLowerCase().min(1),
  pin: z.string().min(6)
})

export type PinLogin = z.infer<typeof pinLoginSchema>
