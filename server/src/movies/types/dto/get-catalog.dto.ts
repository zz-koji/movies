
export type GetCatalog = {
  query?: string;
  page?: number;
  limit?: number;
};

export class GetCatalogDto {
  query?: string;
  page?: number;
  limit?: number;

  constructor(partial: Partial<GetCatalog>) {
    this.query = partial.query;
    this.page = partial.page;
    this.limit = partial.limit;
  }
}
