export type GetMovieDto =
  | { id: string; title?: never }
  | { title: string; id?: never };

