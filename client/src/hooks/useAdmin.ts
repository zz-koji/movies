import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import {
  getAdminRequests,
  getAdminRequest,
  updateAdminRequest,
  deleteAdminRequest,
  bulkUpdateStatus,
  bulkUpdatePriority,
  bulkDeleteRequests,
  getDashboardStats,
  getAuditLogs,
  getRequestAuditTrail,
  getUsers,
  updateUserRole,
  type AdminRequestFilters,
} from '../api/admin';

const REQUESTS_KEY = ['admin', 'requests'];
const STATS_KEY = ['admin', 'stats'];
const AUDIT_KEY = ['admin', 'audit'];
const USERS_KEY = ['admin', 'users'];

export function useAdminRequests(filters: AdminRequestFilters = {}) {
  return useQuery({
    queryKey: [...REQUESTS_KEY, filters],
    queryFn: () => getAdminRequests(filters),
    staleTime: 10000,
  });
}

export function useAdminRequest(id: string) {
  return useQuery({
    queryKey: [...REQUESTS_KEY, id],
    queryFn: () => getAdminRequest(id),
    enabled: !!id,
  });
}

export function useUpdateAdminRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; priority?: string; }; }) =>
      updateAdminRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
      notifications.show({
        title: 'Request Updated',
        message: 'The request has been updated successfully',
        color: 'teal',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update request',
        color: 'red',
      });
    },
  });
}

export function useDeleteAdminRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAdminRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
      notifications.show({
        title: 'Request Deleted',
        message: 'The request has been deleted',
        color: 'blue',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Delete Failed',
        message: error instanceof Error ? error.message : 'Failed to delete request',
        color: 'red',
      });
    },
  });
}

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string; }) =>
      bulkUpdateStatus(ids, status),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
      notifications.show({
        title: 'Bulk Update Complete',
        message: `${result.successful} of ${result.total} requests updated`,
        color: result.failed > 0 ? 'yellow' : 'teal',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Bulk Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update requests',
        color: 'red',
      });
    },
  });
}

export function useBulkUpdatePriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, priority }: { ids: string[]; priority: string; }) =>
      bulkUpdatePriority(ids, priority),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
      notifications.show({
        title: 'Bulk Update Complete',
        message: `${result.successful} of ${result.total} requests updated`,
        color: result.failed > 0 ? 'yellow' : 'teal',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Bulk Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update requests',
        color: 'red',
      });
    },
  });
}

export function useBulkDeleteRequests() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => bulkDeleteRequests(ids),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
      notifications.show({
        title: 'Bulk Delete Complete',
        message: `${result.successful} of ${result.total} requests deleted`,
        color: result.failed > 0 ? 'yellow' : 'blue',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Bulk Delete Failed',
        message: error instanceof Error ? error.message : 'Failed to delete requests',
        color: 'red',
      });
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: STATS_KEY,
    queryFn: getDashboardStats,
    staleTime: 30000,
  });
}

export function useAuditLogs(limit?: number) {
  return useQuery({
    queryKey: [...AUDIT_KEY, limit],
    queryFn: () => getAuditLogs(limit),
    staleTime: 10000,
  });
}

export function useRequestAuditTrail(requestId: string) {
  return useQuery({
    queryKey: [...AUDIT_KEY, 'request', requestId],
    queryFn: () => getRequestAuditTrail(requestId),
    enabled: !!requestId,
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: getUsers,
    staleTime: 30000,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'user' | 'admin'; }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      notifications.show({
        title: 'Role Updated',
        message: 'User role has been updated',
        color: 'teal',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update user role',
        color: 'red',
      });
    },
  });
}
