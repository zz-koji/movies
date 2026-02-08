import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Kysely } from 'kysely';
import { Database } from 'src/database/types';
import { CommentWithUser, createCommentSchema, CreateCommentSchema } from './types';

@Injectable()
export class CommentsService {
  constructor(
    @Inject('MOVIES_DATABASE')
    private readonly db: Kysely<Database>,
  ) {}

  async getByRequestId(requestId: string): Promise<CommentWithUser[]> {
    const comments = await this.db
      .selectFrom('request_comments')
      .innerJoin('users', 'users.id', 'request_comments.user_id')
      .select([
        'request_comments.id',
        'request_comments.request_id',
        'request_comments.user_id',
        'request_comments.content',
        'request_comments.created_at',
        'request_comments.updated_at',
        'users.name as username',
      ])
      .where('request_comments.request_id', '=', requestId)
      .orderBy('request_comments.created_at', 'asc')
      .execute();

    return comments.map((c) => ({
      id: c.id,
      request_id: c.request_id,
      user_id: c.user_id,
      content: c.content,
      created_at: c.created_at,
      updated_at: c.updated_at,
      username: c.username,
    }));
  }

  async create(
    requestId: string,
    userId: string,
    data: CreateCommentSchema,
  ): Promise<CommentWithUser> {
    const parsedData = createCommentSchema.parse(data);

    const comment = await this.db
      .insertInto('request_comments')
      .values({
        request_id: requestId,
        user_id: userId,
        content: parsedData.content,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Get username
    const user = await this.db
      .selectFrom('users')
      .select('name')
      .where('id', '=', userId)
      .executeTakeFirst();

    return {
      id: comment.id,
      request_id: comment.request_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      username: user?.name ?? 'Unknown',
    };
  }

  async delete(
    commentId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<void> {
    const comment = await this.db
      .selectFrom('request_comments')
      .selectAll()
      .where('id', '=', commentId)
      .executeTakeFirst();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only allow deletion if user is the author or an admin
    if (comment.user_id !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.db
      .deleteFrom('request_comments')
      .where('id', '=', commentId)
      .execute();
  }

  async getRequestOwner(requestId: string): Promise<string | null> {
    const request = await this.db
      .selectFrom('movie_requests')
      .select('requested_by')
      .where('id', '=', requestId)
      .executeTakeFirst();

    return request?.requested_by ?? null;
  }
}
