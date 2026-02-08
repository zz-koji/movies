import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { Database } from 'src/database/types';
import {
  createMovieRequestSchema,
  CreateMovieRequestSchema,
  UpdateMovieRequestSchema,
  updateMovieRequestSchema,
  adminUpdateMovieRequestSchema,
  AdminUpdateMovieRequestSchema,
  MovieRequestWithUser,
  RequestStatus,
  RequestPriority,
} from './types';

export interface AdminRequestFilters {
  status?: RequestStatus[];
  priority?: RequestPriority[];
  userId?: string;
  fulfilledBy?: string;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: 'date_requested' | 'priority' | 'status' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BulkOperationResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{ id: string; success: boolean; error?: string }>;
}

@Injectable()
export class MovieRequestsService {
  constructor(
    @Inject('MOVIES_DATABASE')
    private readonly db: Kysely<Database>,
  ) {}

  async getAll() {
    return await this.db
      .selectFrom('movie_requests')
      .selectAll()
      .orderBy('date_requested', 'desc')
      .execute();
  }

  async getById(id: string) {
    const request = await this.db
      .selectFrom('movie_requests')
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();

    if (!request) {
      throw new NotFoundException(`Movie request with id ${id} not found`);
    }

    return request;
  }

  async getByIdWithUser(id: string): Promise<MovieRequestWithUser> {
    const request = await this.db
      .selectFrom('movie_requests')
      .innerJoin('users as requester', 'requester.id', 'movie_requests.requested_by')
      .leftJoin('users as fulfiller', 'fulfiller.id', 'movie_requests.fulfilled_by')
      .select([
        'movie_requests.id',
        'movie_requests.omdb_id',
        'movie_requests.title',
        'movie_requests.priority',
        'movie_requests.status',
        'movie_requests.notes',
        'movie_requests.date_requested',
        'movie_requests.date_completed',
        'movie_requests.requested_by',
        'movie_requests.fulfilled_by',
        'movie_requests.fulfilled_at',
        'movie_requests.fulfilled_movie_id',
        'requester.name as requester_name',
        'fulfiller.name as fulfilled_by_name',
      ])
      .where('movie_requests.id', '=', id)
      .executeTakeFirst();

    if (!request) {
      throw new NotFoundException(`Movie request with id ${id} not found`);
    }

    return {
      id: request.id,
      omdb_id: request.omdb_id,
      title: request.title,
      priority: request.priority as RequestPriority,
      status: request.status as RequestStatus,
      notes: request.notes,
      date_requested: request.date_requested,
      date_completed: request.date_completed,
      requested_by: request.requested_by,
      fulfilled_by: request.fulfilled_by,
      fulfilled_at: request.fulfilled_at,
      fulfilled_movie_id: request.fulfilled_movie_id,
      requester_name: request.requester_name,
      fulfilled_by_name: request.fulfilled_by_name,
    };
  }

  async create(data: CreateMovieRequestSchema, requestedBy: string) {
    const parsedValues = createMovieRequestSchema.parse({
      ...data,
      requested_by: requestedBy,
    });

    return await this.db
      .insertInto('movie_requests')
      .values({
        ...parsedValues,
        date_requested: new Date(),
      })
      .returningAll()
      .executeTakeFirst();
  }

  async update(id: string, data: UpdateMovieRequestSchema, userId: string) {
    // First check if the request exists and belongs to the user
    const existingRequest = await this.getById(id);

    if (existingRequest.requested_by !== userId) {
      throw new ForbiddenException(
        'You can only update your own movie requests',
      );
    }

    const parsedValues = updateMovieRequestSchema.parse(data);

    return await this.db
      .updateTable('movie_requests')
      .set(parsedValues)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  async delete(id: string, userId: string) {
    // First check if the request exists and belongs to the user
    const existingRequest = await this.getById(id);

    if (existingRequest.requested_by !== userId) {
      throw new ForbiddenException(
        'You can only delete your own movie requests',
      );
    }

    await this.db
      .deleteFrom('movie_requests')
      .where('id', '=', id)
      .execute();

    return { success: true };
  }

  // ==================== Admin Operations ====================

  async getAllWithFilters(
    filters: AdminRequestFilters,
    pagination: PaginationOptions = {},
  ): Promise<PaginatedResult<MovieRequestWithUser>> {
    const { page = 1, limit = 20, sortBy = 'date_requested', sortOrder = 'desc' } = pagination;
    const offset = (page - 1) * limit;

    let query = this.db
      .selectFrom('movie_requests')
      .innerJoin('users as requester', 'requester.id', 'movie_requests.requested_by')
      .leftJoin('users as fulfiller', 'fulfiller.id', 'movie_requests.fulfilled_by');

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      query = query.where('movie_requests.status', 'in', filters.status);
    }
    if (filters.priority && filters.priority.length > 0) {
      query = query.where('movie_requests.priority', 'in', filters.priority);
    }
    if (filters.userId) {
      query = query.where('movie_requests.requested_by', '=', filters.userId);
    }
    if (filters.fulfilledBy) {
      query = query.where('movie_requests.fulfilled_by', '=', filters.fulfilledBy);
    }
    if (filters.search) {
      query = query.where((eb) =>
        eb.or([
          eb('movie_requests.title', 'ilike', `%${filters.search}%`),
          eb('requester.name', 'ilike', `%${filters.search}%`),
        ]),
      );
    }

    // Get total count
    const countResult = await query
      .select((eb) => eb.fn.countAll<string>().as('total'))
      .executeTakeFirst();
    const total = countResult ? parseInt(countResult.total, 10) : 0;

    // Apply sorting
    const sortColumn = sortBy === 'title' ? 'movie_requests.title' :
      sortBy === 'priority' ? 'movie_requests.priority' :
      sortBy === 'status' ? 'movie_requests.status' :
      'movie_requests.date_requested';

    query = query.orderBy(sortColumn, sortOrder);

    // Get paginated results
    const results = await query
      .select([
        'movie_requests.id',
        'movie_requests.omdb_id',
        'movie_requests.title',
        'movie_requests.priority',
        'movie_requests.status',
        'movie_requests.notes',
        'movie_requests.date_requested',
        'movie_requests.date_completed',
        'movie_requests.requested_by',
        'movie_requests.fulfilled_by',
        'movie_requests.fulfilled_at',
        'movie_requests.fulfilled_movie_id',
        'requester.name as requester_name',
        'fulfiller.name as fulfilled_by_name',
      ])
      .limit(limit)
      .offset(offset)
      .execute();

    return {
      data: results.map((r) => ({
        id: r.id,
        omdb_id: r.omdb_id,
        title: r.title,
        priority: r.priority as RequestPriority,
        status: r.status as RequestStatus,
        notes: r.notes,
        date_requested: r.date_requested,
        date_completed: r.date_completed,
        requested_by: r.requested_by,
        fulfilled_by: r.fulfilled_by,
        fulfilled_at: r.fulfilled_at,
        fulfilled_movie_id: r.fulfilled_movie_id,
        requester_name: r.requester_name,
        fulfilled_by_name: r.fulfilled_by_name,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adminUpdate(
    id: string,
    data: AdminUpdateMovieRequestSchema,
    adminId: string,
  ) {
    const existingRequest = await this.getById(id);
    const parsedValues = adminUpdateMovieRequestSchema.parse(data);

    const updateData: Record<string, unknown> = { ...parsedValues };

    // If status is changing to completed, set fulfillment metadata
    if (data.status === 'completed' && existingRequest.status !== 'completed') {
      updateData.fulfilled_by = adminId;
      updateData.fulfilled_at = new Date();
      updateData.date_completed = new Date();
    }

    // If status is changing from completed to something else, clear fulfillment metadata
    if (data.status && data.status !== 'completed' && existingRequest.status === 'completed') {
      updateData.fulfilled_by = null;
      updateData.fulfilled_at = null;
      updateData.fulfilled_movie_id = null;
      updateData.date_completed = null;
    }

    return await this.db
      .updateTable('movie_requests')
      .set(updateData)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
  }

  async adminDelete(id: string) {
    await this.getById(id); // Verify it exists
    await this.db.deleteFrom('movie_requests').where('id', '=', id).execute();
    return { success: true };
  }

  async bulkUpdateStatus(
    ids: string[],
    status: RequestStatus,
    adminId: string,
  ): Promise<BulkOperationResult> {
    return this.executeBulk(ids, (id) => this.adminUpdate(id, { status }, adminId));
  }

  async bulkUpdatePriority(
    ids: string[],
    priority: RequestPriority,
  ): Promise<BulkOperationResult> {
    return this.executeBulk(ids, (id) => this.adminUpdate(id, { priority }, ''));
  }

  async bulkDelete(ids: string[]): Promise<BulkOperationResult> {
    return this.executeBulk(ids, (id) => this.adminDelete(id));
  }

  private async executeBulk(
    ids: string[],
    operation: (id: string) => Promise<unknown>,
  ): Promise<BulkOperationResult> {
    if (ids.length > 100) {
      throw new BadRequestException('Maximum 100 items per bulk operation');
    }

    const results: BulkOperationResult['results'] = [];

    for (const id of ids) {
      try {
        await operation(id);
        results.push({ id, success: true });
      } catch (error) {
        results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      total: ids.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  // ==================== Dashboard Stats ====================

  async getDashboardStats() {
    const statusRows = await this.db
      .selectFrom('movie_requests')
      .select('status')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .groupBy('status')
      .execute();

    const priorityRows = await this.db
      .selectFrom('movie_requests')
      .select('priority')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .groupBy('priority')
      .execute();

    const statusCounts = { queued: 0, processing: 0, completed: 0 };
    for (const row of statusRows) {
      statusCounts[row.status as keyof typeof statusCounts] = parseInt(row.count, 10);
    }

    const priorityCounts = { low: 0, medium: 0, high: 0 };
    for (const row of priorityRows) {
      priorityCounts[row.priority as keyof typeof priorityCounts] = parseInt(row.count, 10);
    }

    return {
      totalRequests: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      statusCounts,
      priorityCounts,
    };
  }

  // ==================== Auto-Matching ====================

  async findMatchingRequestsByOmdbId(omdbId: string) {
    return await this.db
      .selectFrom('movie_requests')
      .selectAll()
      .where('omdb_id', '=', omdbId)
      .where('status', '!=', 'completed')
      .execute();
  }

  async findMatchingRequestsByTitle(title: string, threshold = 0.85) {
    // Use pg_trgm for fuzzy matching
    const results = await this.db
      .selectFrom('movie_requests')
      .selectAll()
      .select(sql<number>`similarity(lower(title), lower(${title}))`.as('similarity'))
      .where('status', '!=', 'completed')
      .where('omdb_id', 'is', null)
      .where(sql<boolean>`similarity(lower(title), lower(${title})) >= ${threshold}`)
      .orderBy('similarity', 'desc')
      .execute();

    return results;
  }

  async fulfillRequest(
    requestId: string,
    movieId: string,
    adminId: string | null,
  ) {
    return await this.db
      .updateTable('movie_requests')
      .set({
        status: 'completed',
        fulfilled_by: adminId,
        fulfilled_at: new Date(),
        fulfilled_movie_id: movieId,
        date_completed: new Date(),
      })
      .where('id', '=', requestId)
      .returningAll()
      .executeTakeFirst();
  }

  async autoMatchAndFulfill(
    movieId: string,
    omdbId: string | null,
    title: string,
  ): Promise<{ matched: number; requestIds: string[] }> {
    const matchedIds: string[] = [];

    // First, try exact OMDb ID matching
    if (omdbId) {
      const exactMatches = await this.findMatchingRequestsByOmdbId(omdbId);
      for (const match of exactMatches) {
        await this.fulfillRequest(match.id, movieId, null); // null for system/auto
        matchedIds.push(match.id);
      }
    }

    // If no exact matches found, try fuzzy title matching
    if (matchedIds.length === 0 && title) {
      const fuzzyMatches = await this.findMatchingRequestsByTitle(title);
      for (const match of fuzzyMatches) {
        await this.fulfillRequest(match.id, movieId, null);
        matchedIds.push(match.id);
      }
    }

    return { matched: matchedIds.length, requestIds: matchedIds };
  }

  // ==================== Search ====================

  async search(term: string, type: 'title' | 'username' | 'omdb_id' = 'title') {
    let query = this.db
      .selectFrom('movie_requests')
      .innerJoin('users', 'users.id', 'movie_requests.requested_by')
      .select([
        'movie_requests.id',
        'movie_requests.omdb_id',
        'movie_requests.title',
        'movie_requests.priority',
        'movie_requests.status',
        'movie_requests.notes',
        'movie_requests.date_requested',
        'movie_requests.requested_by',
        'users.name as requester_name',
      ]);

    switch (type) {
      case 'title':
        query = query.where('movie_requests.title', 'ilike', `%${term}%`);
        break;
      case 'username':
        query = query.where('users.name', 'ilike', `%${term}%`);
        break;
      case 'omdb_id':
        query = query.where('movie_requests.omdb_id', '=', term);
        break;
    }

    return await query.limit(100).execute();
  }
}
