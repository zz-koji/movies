import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../api/notifications'

const NOTIFICATIONS_KEY = ['notifications']

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: getNotifications,
    staleTime: 10000,
    refetchInterval: 30000, // Poll every 30 seconds
  })
}

export function useUnreadNotifications() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'unread'],
    queryFn: getUnreadNotifications,
    staleTime: 10000,
    refetchInterval: 30000,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'unread', 'count'],
    queryFn: getUnreadCount,
    staleTime: 10000,
    refetchInterval: 30000,
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
    },
  })
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
    },
  })
}
