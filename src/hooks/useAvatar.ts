import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import { profileKeys } from './useProfile';

const BUCKET_NAME = 'avatars';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

interface UploadAvatarParams {
  file: File;
}

interface UseAvatarReturn {
  uploadAvatar: (params: UploadAvatarParams) => Promise<string>;
  deleteAvatar: () => Promise<void>;
  isUploading: boolean;
  isDeleting: boolean;
  error: string | null;
}

export function useAvatar(): UseAvatarReturn {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async ({ file }: UploadAvatarParams): Promise<string> => {
      const userId = getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('지원하지 않는 파일 형식입니다. (JPG, PNG, GIF, WebP만 가능)');
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('파일 크기는 5MB 이하여야 합니다.');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Delete existing avatar first
      const { data: existingFiles } = await supabase.storage
        .from(BUCKET_NAME)
        .list(userId);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
        await supabase.storage.from(BUCKET_NAME).remove(filesToDelete);
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      // Update user profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return avatarUrl;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const userId = getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      // List and delete all files in user's folder
      const { data: existingFiles } = await supabase.storage
        .from(BUCKET_NAME)
        .list(userId);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
        const { error: deleteError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove(filesToDelete);

        if (deleteError) throw deleteError;
      }

      // Update user profile to remove avatar_url
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: null })
        .eq('user_id', userId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const uploadAvatar = useCallback(
    async (params: UploadAvatarParams) => {
      return uploadMutation.mutateAsync(params);
    },
    [uploadMutation]
  );

  const deleteAvatar = useCallback(async () => {
    return deleteMutation.mutateAsync();
  }, [deleteMutation]);

  return {
    uploadAvatar,
    deleteAvatar,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    error,
  };
}
