import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { getComments, addComment, deleteComment } from '../api/comments'

export function useComments(requestId: string) {
  return useQuery({
    queryKey: ['comments', requestId],
    queryFn: () => getComments(requestId),
    enabled: !!requestId,
  })
}

export function useAddComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ requestId, content }: { requestId: string; content: string }) =>
      addComment(requestId, content),
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', requestId] })
      notifications.show({
        title: 'Comment Added',
        message: 'Your comment has been posted',
        color: 'teal',
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Comment Failed',
        message: error instanceof Error ? error.message : 'Failed to add comment',
        color: 'red',
      })
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ commentId, requestId }: { commentId: string; requestId: string }) =>
      deleteComment(commentId).then(() => requestId),
    onSuccess: (requestId) => {
      queryClient.invalidateQueries({ queryKey: ['comments', requestId] })
      notifications.show({
        title: 'Comment Deleted',
        message: 'Your comment has been removed',
        color: 'blue',
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Delete Failed',
        message: error instanceof Error ? error.message : 'Failed to delete comment',
        color: 'red',
      })
    },
  })
}
