/**
 * React Query hooks for comment CRUD operations
 * Handles soft delete with proper RLS authentication
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Comment, CommentCreateInput, CommentUpdateInput } from '@/types/comment';
import { useAuth } from '@/contexts/AuthContext';

const COMMENTS_KEY = 'comments';

/**
 * Fetch all active comments (not soft-deleted)
 */
export function useComments() {
  return useQuery({
    queryKey: [COMMENTS_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .is('deleted_at', null) // Only non-deleted comments
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch comments:', error);
        throw error;
      }

      return data as Comment[];
    },
  });
}

/**
 * Create a new comment
 */
export function useCreateComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CommentCreateInput) => {
      if (!user) {
        throw new Error('User must be authenticated to create comments');
      }

      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: user.id,
          content: input.content,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create comment:', error);
        throw error;
      }

      return data as Comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENTS_KEY] });
    },
  });
}

/**
 * Update an existing comment
 * ⚠️ CRITICAL: RLS policy ensures only the owner can update
 */
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CommentUpdateInput }) => {
      // IMPORTANT: Supabase client automatically includes auth header
      // No need to manually add user_id - RLS handles authorization
      const { data, error } = await supabase
        .from('comments')
        .update({
          content: input.content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update comment:', error);
        throw error;
      }

      return data as Comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENTS_KEY] });
    },
  });
}

/**
 * Soft delete a comment
 * Sets deleted_at timestamp instead of actual deletion
 * ⚠️ CRITICAL: RLS policy ensures only the owner can delete
 */
export function useSoftDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      // Soft delete by setting deleted_at timestamp
      const { data, error } = await supabase
        .from('comments')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .select()
        .single();

      if (error) {
        console.error('Failed to soft delete comment:', error);
        // Check if it's an RLS error
        if (error.code === 'PGRST116') {
          throw new Error('You do not have permission to delete this comment');
        }
        throw error;
      }

      return data as Comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENTS_KEY] });
    },
  });
}

/**
 * Hard delete a comment (admin only - requires service role)
 * ⚠️ WARNING: This bypasses RLS. Only use in admin context.
 */
export function useHardDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('Failed to hard delete comment:', error);
        throw error;
      }

      return commentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENTS_KEY] });
    },
  });
}
