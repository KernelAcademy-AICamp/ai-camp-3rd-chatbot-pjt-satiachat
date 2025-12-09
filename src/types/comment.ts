/**
 * Domain model for comment system
 */

export interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null; // Soft delete timestamp
  is_deleted: boolean; // Helper flag for UI filtering
}

export interface CommentCreateInput {
  content: string;
}

export interface CommentUpdateInput {
  content?: string;
  deleted_at?: string | null;
}
