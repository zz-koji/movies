import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { User } from 'src/users/types';
import { UsersService } from 'src/users/users.service';
import {
  MovieRequestsService,
  AdminRequestFilters,
  PaginationOptions,
} from 'src/movie-requests/movie-requests.service';
import { AuditService } from 'src/audit/audit.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { AdminGuard } from './guards';
import type {
  AdminUpdateMovieRequestSchema,
  RequestStatus,
  RequestPriority,
} from 'src/movie-requests/types';

interface AdminRequestFiltersDto extends AdminRequestFilters, PaginationOptions {}

interface BulkStatusUpdateDto {
  ids: string[];
  status: RequestStatus;
}

interface BulkPriorityUpdateDto {
  ids: string[];
  priority: RequestPriority;
}

interface BulkDeleteDto {
  ids: string[];
}

interface ManualMatchDto {
  movieId: string;
}

@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly movieRequestsService: MovieRequestsService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  // ==================== Request Management ====================

  @Get('requests')
  async getRequests(@Query() query: AdminRequestFiltersDto) {
    const { page, limit, sortBy, sortOrder, ...filters } = query;

    // Parse status and priority arrays from query string
    const parsedFilters: AdminRequestFilters = {
      ...filters,
      status: filters.status
        ? (Array.isArray(filters.status) ? filters.status : [filters.status])
        : undefined,
      priority: filters.priority
        ? (Array.isArray(filters.priority) ? filters.priority : [filters.priority])
        : undefined,
    };

    return this.movieRequestsService.getAllWithFilters(parsedFilters, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get('requests/:id')
  async getRequest(@Param('id', ParseUUIDPipe) id: string) {
    return this.movieRequestsService.getByIdWithUser(id);
  }

  @Patch('requests/:id')
  async updateRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: AdminUpdateMovieRequestSchema,
    @CurrentUser() admin: User,
  ) {
    const existingRequest = await this.movieRequestsService.getById(id);
    const oldValues = {
      status: existingRequest.status,
      priority: existingRequest.priority,
    };

    const updatedRequest = await this.movieRequestsService.adminUpdate(
      id,
      data,
      admin.id,
    );

    // Log to audit
    await this.auditService.log({
      admin_id: admin.id,
      action: data.status !== oldValues.status ? 'status_update' : 'priority_update',
      entity_type: 'movie_request',
      entity_id: id,
      old_values: oldValues,
      new_values: data,
    });

    // Send notification if status changed
    if (data.status && data.status !== oldValues.status) {
      await this.notificationsService.notifyStatusChange(
        existingRequest.requested_by,
        existingRequest.title ?? 'Movie Request',
        oldValues.status,
        data.status,
        id,
      );
    }

    return updatedRequest;
  }

  @Delete('requests/:id')
  async deleteRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
  ) {
    const existingRequest = await this.movieRequestsService.getById(id);

    await this.auditService.log({
      admin_id: admin.id,
      action: 'delete',
      entity_type: 'movie_request',
      entity_id: id,
      old_values: existingRequest,
    });

    return this.movieRequestsService.adminDelete(id);
  }

  // ==================== Bulk Operations ====================

  @Post('requests/bulk-status')
  async bulkUpdateStatus(
    @Body() data: BulkStatusUpdateDto,
    @CurrentUser() admin: User,
  ) {
    const result = await this.movieRequestsService.bulkUpdateStatus(
      data.ids,
      data.status,
      admin.id,
    );

    // Log bulk operation
    await this.auditService.log({
      admin_id: admin.id,
      action: 'bulk_status_update',
      entity_type: 'movie_request',
      entity_id: data.ids[0], // Use first ID as reference
      new_values: { status: data.status, affectedIds: data.ids },
      metadata: { successful: result.successful, failed: result.failed },
    });

    // Send notifications for successful updates
    for (const item of result.results.filter((r) => r.success)) {
      try {
        const request = await this.movieRequestsService.getById(item.id);
        await this.notificationsService.notifyStatusChange(
          request.requested_by,
          request.title ?? 'Movie Request',
          'previous', // We don't track old status in bulk ops
          data.status,
          item.id,
        );
      } catch {
        // Ignore notification errors
      }
    }

    return result;
  }

  @Post('requests/bulk-priority')
  async bulkUpdatePriority(
    @Body() data: BulkPriorityUpdateDto,
    @CurrentUser() admin: User,
  ) {
    const result = await this.movieRequestsService.bulkUpdatePriority(
      data.ids,
      data.priority,
    );

    await this.auditService.log({
      admin_id: admin.id,
      action: 'priority_update',
      entity_type: 'movie_request',
      entity_id: data.ids[0],
      new_values: { priority: data.priority, affectedIds: data.ids },
      metadata: { successful: result.successful, failed: result.failed },
    });

    return result;
  }

  @Delete('requests/bulk')
  async bulkDelete(
    @Body() data: BulkDeleteDto,
    @CurrentUser() admin: User,
  ) {
    const result = await this.movieRequestsService.bulkDelete(data.ids);

    await this.auditService.log({
      admin_id: admin.id,
      action: 'bulk_delete',
      entity_type: 'movie_request',
      entity_id: data.ids[0],
      old_values: { deletedIds: data.ids },
      metadata: { successful: result.successful, failed: result.failed },
    });

    return result;
  }

  // ==================== Manual Matching ====================

  @Post('requests/:id/match')
  async manualMatch(
    @Param('id', ParseUUIDPipe) requestId: string,
    @Body() data: ManualMatchDto,
    @CurrentUser() admin: User,
  ) {
    const request = await this.movieRequestsService.getById(requestId);

    const fulfilled = await this.movieRequestsService.fulfillRequest(
      requestId,
      data.movieId,
      admin.id,
    );

    await this.auditService.log({
      admin_id: admin.id,
      action: 'manual_match',
      entity_type: 'movie_request',
      entity_id: requestId,
      old_values: { status: request.status },
      new_values: { status: 'completed', fulfilled_movie_id: data.movieId },
    });

    await this.notificationsService.notifyRequestFulfilled(
      request.requested_by,
      request.title ?? 'Movie Request',
      'Movie', // Would need movie title from movies service
      requestId,
    );

    return fulfilled;
  }

  // ==================== Search ====================

  @Get('requests/search')
  async searchRequests(
    @Query('term') term: string,
    @Query('type') type: 'title' | 'username' | 'omdb_id' = 'title',
  ) {
    return this.movieRequestsService.search(term, type);
  }

  // ==================== Audit Trail ====================

  @Get('audit')
  async getAuditLogs(@Query('limit') limit?: string) {
    return this.auditService.getRecent(limit ? parseInt(limit, 10) : 100);
  }

  @Get('audit/request/:id')
  async getRequestAuditTrail(@Param('id', ParseUUIDPipe) requestId: string) {
    return this.auditService.getByEntity('movie_request', requestId);
  }

  @Get('audit/admin/:id')
  async getAdminAuditTrail(@Param('id', ParseUUIDPipe) adminId: string) {
    return this.auditService.getByAdmin(adminId);
  }

  // ==================== User Management ====================

  @Get('users')
  async getUsers() {
    return this.usersService.getAllUsers();
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() data: { role: 'user' | 'admin' },
    @CurrentUser() admin: User,
  ) {
    const user = await this.usersService.getUser({ id: userId });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    const oldRole = user.role;

    const updatedUser = await this.usersService.updateUserRole(userId, data.role);

    await this.auditService.log({
      admin_id: admin.id,
      action: 'role_change',
      entity_type: 'user',
      entity_id: userId,
      old_values: { role: oldRole },
      new_values: { role: data.role },
    });

    // Notify user of role change
    await this.notificationsService.create({
      user_id: userId,
      type: 'role_changed',
      title: 'Role Changed',
      message: `Your role has been changed from ${oldRole} to ${data.role}`,
    });

    return updatedUser;
  }

  // ==================== Dashboard Stats ====================

  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.movieRequestsService.getDashboardStats();
  }
}
