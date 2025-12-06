/**
 * CommentList Component
 * Demonstrates proper usage of RLS-protected comment operations
 */

import { useState } from 'react';
import { Trash2, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useSoftDeleteComment,
} from '@/hooks/useComments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export function CommentList() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [newCommentContent, setNewCommentContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Fetch comments
  const { data: comments, isLoading, error } = useComments();

  // Mutations
  const createMutation = useCreateComment();
  const updateMutation = useUpdateComment();
  const deleteMutation = useSoftDeleteComment();

  // Handlers
  const handleCreate = async () => {
    if (!newCommentContent.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Comment cannot be empty',
      });
      return;
    }

    try {
      await createMutation.mutateAsync({ content: newCommentContent });
      setNewCommentContent('');
      toast({
        title: 'Success',
        description: 'Comment created successfully',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create comment',
      });
    }
  };

  const handleEdit = async (id: string) => {
    if (!editContent.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Comment cannot be empty',
      });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id,
        input: { content: editContent },
      });
      setEditingId(null);
      setEditContent('');
      toast({
        title: 'Success',
        description: 'Comment updated successfully',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update comment',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      toast({
        title: 'Success',
        description: 'Comment deleted successfully',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'You do not have permission to delete this comment',
      });
    }
  };

  const startEditing = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent('');
  };

  // Loading state
  if (isLoading) {
    return <div className="text-center py-8">Loading comments...</div>;
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Error loading comments: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Comment Form */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Add Comment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Write your comment..."
              value={newCommentContent}
              onChange={(e) => setNewCommentContent(e.target.value)}
              rows={3}
            />
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !newCommentContent.trim()}
            >
              {createMutation.isPending ? 'Posting...' : 'Post Comment'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments?.map((comment) => {
            const isOwner = user?.id === comment.user_id;
            const isEditing = editingId === comment.id;

            return (
              <Card key={comment.id}>
                <CardContent className="pt-6">
                  {isEditing ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEdit(comment.id)}
                          disabled={updateMutation.isPending}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          {updateMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div>
                      <p className="text-sm mb-3">{comment.content}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {new Date(comment.created_at).toLocaleString()}
                          {comment.updated_at !== comment.created_at && ' (edited)'}
                        </span>

                        {/* Action Buttons (only for comment owner) */}
                        {isOwner && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditing(comment.id, comment.content)}
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(comment.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
