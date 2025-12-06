import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import type {
  Post,
  PostComment,
  PostTab,
  ReactionType,
  CreatePostRequest,
  UpdatePostRequest,
  CreateCommentRequest
} from '@/types/domain';

// Query keys
export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (tab: PostTab, search?: string) => [...postKeys.lists(), { tab, search }] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
};

// Helper: Check if post is HOT
export function isHotPost(post: Pick<Post, 'likes' | 'created_at'>): boolean {
  const createdAt = new Date(post.created_at);
  const now = new Date();
  const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  const isWithin24Hours = hoursDiff <= 24;

  return post.likes >= 10 || (isWithin24Hours && post.likes >= 5);
}

// Fetch posts list
export function usePosts(tab: PostTab, search?: string) {
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: postKeys.list(tab, search),
    queryFn: async (): Promise<Post[]> => {
      let query = supabase
        .from('posts')
        .select('*')
        .eq('tab', tab)
        .eq('is_deleted', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
      }

      const { data: posts, error } = await query;
      if (error) throw error;

      if (!posts || posts.length === 0) {
        return [];
      }

      // Fetch authors by user_id column
      const userIds = [...new Set(posts.map(p => p.user_id))];

      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, nickname, avatar_url')
        .in('user_id', userIds);

      // Build profile map
      const profileMap = new Map(
        profiles?.map(p => [p.user_id, { nickname: p.nickname, avatar_url: p.avatar_url || null }]) || []
      );

      // Fetch user's reactions for all posts
      let reactionMap = new Map<string, ReactionType>();
      if (userId) {
        const postIds = posts.map(p => p.id);
        const { data: reactions } = await supabase
          .from('post_reactions')
          .select('post_id, reaction_type')
          .eq('user_id', userId)
          .in('post_id', postIds);

        reactionMap = new Map(
          reactions?.map(r => [r.post_id, r.reaction_type as ReactionType])
        );
      }

      return posts.map(post => ({
        ...post,
        author: profileMap.get(post.user_id) || { nickname: null, avatar_url: null },
        user_reaction: reactionMap.get(post.id) || null,
      }));
    },
  });
}

// Fetch single post with comments
export function usePost(id: string | null) {
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: postKeys.detail(id || ''),
    queryFn: async (): Promise<Post | null> => {
      if (!id) return null;

      // Fetch post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single();

      if (postError) throw postError;

      // Fetch post author by user_id
      const { data: postAuthor } = await supabase
        .from('user_profiles')
        .select('nickname, avatar_url')
        .eq('user_id', post.user_id)
        .maybeSingle();

      // Fetch comments
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      // Fetch comment authors by user_id
      let commentAuthorMap = new Map<string, { nickname: string | null; avatar_url: string | null }>();
      if (comments && comments.length > 0) {
        const commentUserIds = [...new Set(comments.map(c => c.user_id))];

        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, nickname, avatar_url')
          .in('user_id', commentUserIds);

        profiles?.forEach(p => {
          if (p.user_id) {
            commentAuthorMap.set(p.user_id, { nickname: p.nickname, avatar_url: p.avatar_url || null });
          }
        });
      }

      // Get user's reaction
      let userReaction: ReactionType | null = null;
      if (userId) {
        const { data: reaction } = await supabase
          .from('post_reactions')
          .select('reaction_type')
          .eq('post_id', id)
          .eq('user_id', userId)
          .maybeSingle();

        userReaction = reaction?.reaction_type as ReactionType || null;
      }

      return {
        ...post,
        author: postAuthor || { nickname: null, avatar_url: null },
        user_reaction: userReaction,
        comments: comments?.map(c => ({
          ...c,
          author: commentAuthorMap.get(c.user_id) || { nickname: null, avatar_url: null },
          is_mine: c.user_id === userId,
        })) || [],
      };
    },
    enabled: !!id,
  });
}

// Create post
export function useCreatePost() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async (request: CreatePostRequest): Promise<Post> => {
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          tab: request.tab,
          title: request.title,
          content: request.content,
        })
        .select('*')
        .single();

      if (error) throw error;

      // Fetch author profile by user_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('nickname, avatar_url')
        .eq('user_id', userId)
        .maybeSingle();

      return {
        ...data,
        author: profile || { nickname: null, avatar_url: null },
        user_reaction: null,
        comments: [],
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: postKeys.list(data.tab) });
    },
  });
}

// Update post
export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...request
    }: UpdatePostRequest & { id: string }): Promise<Post> => {
      const { data, error } = await supabase
        .from('posts')
        .update({
          ...(request.title && { title: request.title }),
          ...(request.content && { content: request.content }),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      // Fetch author profile by user_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('nickname, avatar_url')
        .eq('user_id', data.user_id)
        .maybeSingle();

      return {
        ...data,
        author: profile || { nickname: null, avatar_url: null },
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: postKeys.list(data.tab) });
    },
  });
}

// Delete post (soft delete)
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ id: string; tab: PostTab }> => {
      // Get post to know the tab for cache invalidation
      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('tab')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('posts')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) throw error;
      return { id, tab: post.tab };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: postKeys.list(data.tab) });
    },
  });
}

// Toggle reaction (like/dislike)
export function useToggleReaction() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async ({
      postId,
      reactionType
    }: {
      postId: string;
      reactionType: ReactionType;
    }): Promise<{ postId: string; newReaction: ReactionType | null }> => {
      if (!userId) throw new Error('User not authenticated');

      // Check existing reaction
      const { data: existing } = await supabase
        .from('post_reactions')
        .select('id, reaction_type')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        if (existing.reaction_type === reactionType) {
          // Same reaction - remove it
          const { error } = await supabase
            .from('post_reactions')
            .delete()
            .eq('id', existing.id);

          if (error) throw error;
          return { postId, newReaction: null };
        } else {
          // Different reaction - update it
          const { error } = await supabase
            .from('post_reactions')
            .update({ reaction_type: reactionType })
            .eq('id', existing.id);

          if (error) throw error;
          return { postId, newReaction: reactionType };
        }
      } else {
        // No existing reaction - create new
        const { error } = await supabase
          .from('post_reactions')
          .insert({
            post_id: postId,
            user_id: userId,
            reaction_type: reactionType,
          });

        if (error) throw error;
        return { postId, newReaction: reactionType };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(data.postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

// Increment views
export function useIncrementViews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string): Promise<void> => {
      const { error } = await supabase.rpc('increment_post_views', {
        post_id: postId
      });

      if (error) throw error;
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
    },
  });
}

// Create comment
export function useCreateComment() {
  const queryClient = useQueryClient();
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async (request: CreateCommentRequest): Promise<PostComment> => {
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: request.post_id,
          user_id: userId,
          content: request.content,
        })
        .select('*')
        .single();

      if (error) throw error;

      // Fetch author profile by user_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('nickname, avatar_url')
        .eq('user_id', userId)
        .maybeSingle();

      return {
        ...data,
        author: profile || { nickname: null, avatar_url: null },
        is_mine: true,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(data.post_id) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}

// Delete comment (soft delete)
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      postId
    }: {
      commentId: string;
      postId: string;
    }): Promise<{ commentId: string; postId: string }> => {
      const { error } = await supabase
        .from('comments')
        .update({ is_deleted: true })
        .eq('id', commentId);

      if (error) throw error;
      return { commentId, postId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(data.postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
    },
  });
}
