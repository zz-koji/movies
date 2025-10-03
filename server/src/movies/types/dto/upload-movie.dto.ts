import { z } from 'zod/v4'


export const uploadMovieDto = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string(),
  size: z.number(), // 5MB limit
  buffer: z.instanceof(Buffer), // If storing in memory
});

export type UploadMovieDto = z.infer<typeof uploadMovieDto>
