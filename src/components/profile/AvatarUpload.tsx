import { useRef, useState, useCallback } from 'react';
import { useAvatar } from '@/hooks/useAvatar';
import { AvatarDisplay } from '@/components/ui/avatar-display';
import { Button } from '@/components/ui/button';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  name?: string | null;
  email?: string;
  onUploadComplete?: (url: string) => void;
  onDeleteComplete?: () => void;
  className?: string;
}

export function AvatarUpload({
  currentAvatarUrl,
  name,
  email,
  onUploadComplete,
  onDeleteComplete,
  className,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { uploadAvatar, deleteAvatar, isUploading, isDeleting, error } = useAvatar();

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Show preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      try {
        const url = await uploadAvatar({ file });
        onUploadComplete?.(url);
        setPreviewUrl(null);
      } catch (err) {
        setPreviewUrl(null);
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [uploadAvatar, onUploadComplete]
  );

  const handleDelete = useCallback(async () => {
    try {
      await deleteAvatar();
      onDeleteComplete?.();
    } catch (err) {
      // Error handled by hook
    }
  }, [deleteAvatar, onDeleteComplete]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const displayUrl = previewUrl || currentAvatarUrl;
  const isLoading = isUploading || isDeleting;

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className="relative">
        <AvatarDisplay
          src={displayUrl}
          name={name}
          email={email}
          size="xl"
          className={cn(isLoading && 'opacity-50')}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isLoading}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={isLoading}
        >
          <Camera className="w-4 h-4 mr-2" />
          {currentAvatarUrl ? '변경' : '업로드'}
        </Button>

        {currentAvatarUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isLoading}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            삭제
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <p className="text-xs text-muted-foreground">
        JPG, PNG, GIF, WebP (최대 5MB)
      </p>
    </div>
  );
}
