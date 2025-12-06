import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  MessageSquare,
  HelpCircle,
  Lightbulb,
  Plus,
  ThumbsDown,
  MessageCircle,
  Eye,
  Search,
  ChevronLeft,
  X,
  Send,
  MoreVertical,
  Pencil,
  Trash2,
  Sparkles,
  Users,
  Clock,
  Star,
  Heart,
  Flame,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  usePosts,
  usePost,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  useToggleReaction,
  useCreateComment,
  useDeleteComment,
  useIncrementViews,
  isHotPost,
  PAGE_SIZE,
} from "@/hooks/usePosts";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { AvatarDisplay } from "@/components/ui/avatar-display";
import type { Post, PostTab, PostComment as CommentType } from "@/types/domain";

// Tab configuration
const tabConfig: Record<PostTab, {
  label: string;
  icon: typeof HelpCircle;
  description: string;
  gradient: string;
  activeGradient: string;
  iconBg: string;
  accentColor: string;
}> = {
  qna: {
    label: "Q&A",
    icon: HelpCircle,
    description: "궁금한 점을 질문하세요",
    gradient: "from-primary/5 via-primary/10 to-transparent",
    activeGradient: "from-primary to-primary-glow",
    iconBg: "bg-primary/20",
    accentColor: "text-primary",
  },
  free: {
    label: "자유게시판",
    icon: MessageSquare,
    description: "자유롭게 이야기 나눠요",
    gradient: "from-secondary/5 via-secondary/10 to-transparent",
    activeGradient: "from-secondary to-coral-glow",
    iconBg: "bg-secondary/20",
    accentColor: "text-secondary",
  },
  info: {
    label: "다이어트 정보",
    icon: Lightbulb,
    description: "유용한 정보를 공유해요",
    gradient: "from-amber-500/5 via-amber-500/10 to-transparent",
    activeGradient: "from-amber-500 to-orange-400",
    iconBg: "bg-amber-500/20",
    accentColor: "text-amber-600",
  },
};

type ViewMode = "list" | "detail" | "write" | "edit";

export default function Board() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<PostTab>("qna");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Form state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // Comment state
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedSearch]);

  // Queries
  const { data: postsData, isLoading: postsLoading } = usePosts(activeTab, currentPage, debouncedSearch || undefined);
  const posts = postsData?.posts ?? [];
  const totalPages = postsData?.totalPages ?? 0;
  const totalCount = postsData?.totalCount ?? 0;
  const { data: selectedPost, isLoading: postLoading } = usePost(selectedPostId);

  // Mutations
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();
  const toggleReaction = useToggleReaction();
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const incrementViews = useIncrementViews();

  const currentTabConfig = tabConfig[activeTab];

  // Helper to get author display name
  const getAuthorName = (post: Post) => {
    return post.author?.nickname || '익명';
  };

  const getCommentAuthorName = (comment: CommentType) => {
    return comment.author?.nickname || '익명';
  };

  // View post detail
  const handleViewPost = (post: Post) => {
    setSelectedPostId(post.id);
    setViewMode("detail");
    incrementViews.mutate(post.id);
  };

  // Start writing
  const handleStartWrite = () => {
    setEditTitle("");
    setEditContent("");
    setEditingPostId(null);
    setViewMode("write");
  };

  // Start editing
  const handleStartEdit = (post: Post) => {
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditingPostId(post.id);
    setViewMode("edit");
  };

  // Save post (create/update)
  const handleSavePost = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;

    try {
      if (editingPostId) {
        await updatePost.mutateAsync({
          id: editingPostId,
          title: editTitle,
          content: editContent,
        });
        toast({ title: "수정 완료", description: "게시글이 수정되었습니다." });
      } else {
        await createPost.mutateAsync({
          tab: activeTab,
          title: editTitle,
          content: editContent,
        });
        toast({ title: "등록 완료", description: "게시글이 등록되었습니다." });
      }
      setViewMode("list");
      setSelectedPostId(null);
    } catch (error) {
      toast({
        title: "오류",
        description: "게시글 저장에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // Delete post
  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost.mutateAsync(postId);
      toast({ title: "삭제 완료", description: "게시글이 삭제되었습니다." });
      setViewMode("list");
      setSelectedPostId(null);
    } catch (error) {
      toast({
        title: "오류",
        description: "게시글 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // Like/Dislike
  const handleLike = async (postId: string, isLike: boolean) => {
    console.log('[Board.handleLike] Called with postId:', postId, 'isLike:', isLike);
    try {
      const result = await toggleReaction.mutateAsync({
        postId,
        reactionType: isLike ? 'like' : 'dislike',
      });
      console.log('[Board.handleLike] Success:', result);
    } catch (error) {
      console.error('[Board.handleLike] Error:', error);
      toast({
        title: "오류",
        description: "반응 처리에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // Add comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPostId) return;

    try {
      await createComment.mutateAsync({
        post_id: selectedPostId,
        content: newComment,
      });
      setNewComment("");
    } catch (error) {
      toast({
        title: "오류",
        description: "댓글 등록에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    console.log('[Board.handleDeleteComment] Called with commentId:', commentId, 'selectedPostId:', selectedPostId);
    if (!selectedPostId) return;

    try {
      const result = await deleteComment.mutateAsync({
        commentId,
        postId: selectedPostId,
      });
      console.log('[Board.handleDeleteComment] Success:', result);
    } catch (error) {
      console.error('[Board.handleDeleteComment] Error:', error);
      toast({
        title: "오류",
        description: "댓글 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // Back to list
  const handleBack = () => {
    setViewMode("list");
    setSelectedPostId(null);
    setEditingPostId(null);
  };


  return (
    <div className="min-h-screen">
      {/* Hero Section - only show in list view */}
      {viewMode === "list" && (
        <div className="bg-background border-b border-border/50">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  커뮤니티
                </h1>
                <p className="text-muted-foreground text-sm">
                  함께 나누고, 함께 성장해요
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-3">
              {(Object.keys(tabConfig) as PostTab[]).map((tab) => {
                const config = tabConfig[tab];
                const Icon = config.icon;
                const isActive = activeTab === tab;

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "group relative flex items-center gap-3 px-5 py-3.5 rounded-2xl font-medium text-sm transition-all duration-300",
                      isActive
                        ? "bg-white dark:bg-card shadow-lg border border-border/50"
                        : "bg-white/50 dark:bg-card/50 hover:bg-white dark:hover:bg-card border border-transparent hover:border-border/50 hover:shadow-md"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                      isActive
                        ? "bg-primary shadow-md"
                        : config.iconBg
                    )}>
                      <Icon className={cn(
                        "w-5 h-5 transition-colors",
                        isActive ? "text-white" : config.accentColor
                      )} />
                    </div>
                    <div className="text-left">
                      <span className={cn(
                        "font-semibold transition-colors",
                        isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {config.label}
                      </span>
                      <p className="text-xs text-muted-foreground hidden md:block">
                        {config.description}
                      </p>
                    </div>
                    {isActive && (
                      <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className={cn(
        "max-w-7xl mx-auto px-4 md:px-6 lg:px-8",
        viewMode === "list" ? "py-6" : "py-4"
      )}>
        {/* List View */}
        {viewMode === "list" && (
          <>
            {/* Search & Write */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="검색어를 입력하세요..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 rounded-2xl bg-white dark:bg-card border-border/50 shadow-sm focus:shadow-md transition-shadow text-base"
                />
              </div>
              <Button
                onClick={handleStartWrite}
                size="lg"
                className="gap-2 rounded-2xl h-12 px-6 shadow-md hover:shadow-lg transition-all bg-primary hover:bg-primary/90"
              >
                <Plus className="w-5 h-5" />
                <span className="font-semibold">글쓰기</span>
              </Button>
            </div>

            {/* Post List */}
            <div className="space-y-2">
              {postsLoading ? (
                <div className="text-center py-20 bg-white dark:bg-card rounded-3xl border border-border/50 shadow-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">게시글을 불러오는 중...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-card rounded-3xl border border-border/50 shadow-sm">
                  <div className={cn(
                    "w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center",
                    currentTabConfig.iconBg
                  )}>
                    <MessageSquare className={cn("w-10 h-10", currentTabConfig.accentColor)} />
                  </div>
                  <p className="text-xl font-semibold text-foreground mb-2">아직 게시글이 없어요</p>
                  <p className="text-muted-foreground mb-6">첫 번째 글을 작성해보세요!</p>
                  <Button
                    onClick={handleStartWrite}
                    className="gap-2 rounded-xl bg-primary hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                    글쓰기
                  </Button>
                </div>
              ) : (
                posts.map((post) => {
                  const postIsHot = isHotPost(post);
                  return (
                    <button
                      key={post.id}
                      onClick={() => handleViewPost(post)}
                      className={cn(
                        "group w-full text-left bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden",
                        post.is_pinned && "ring-1 ring-primary/30"
                      )}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Author Avatar */}
                          <AvatarDisplay
                            src={post.author?.avatar_url}
                            name={post.author?.nickname}
                            size="md"
                          />

                          <div className="flex-1 min-w-0">
                            {/* Title with Badges */}
                            <div className="flex items-center gap-2 mb-1">
                              {post.is_pinned && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                                  <Star className="w-2.5 h-2.5" />
                                  공지
                                </span>
                              )}
                              {postIsHot && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary/10 text-secondary">
                                  <Flame className="w-2.5 h-2.5" />
                                  HOT
                                </span>
                              )}
                              <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                {post.title}
                              </h3>
                            </div>

                            {/* Content Preview */}
                            <p className="text-muted-foreground line-clamp-1 mb-2 text-xs">
                              {post.content}
                            </p>

                            {/* Meta Info */}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="font-medium">{getAuthorName(post)}</span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {format(new Date(post.created_at), "MM.dd", { locale: ko })}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Eye className="w-3 h-3" />
                                {post.views}
                              </span>
                              <span className={cn(
                                "flex items-center gap-0.5",
                                post.likes > 10 ? "text-rose-500" : ""
                              )}>
                                <Heart className={cn("w-3 h-3", post.likes > 10 && "fill-current")} />
                                {post.likes}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <MessageCircle className="w-3 h-3" />
                                {post.comment_count}
                              </span>
                            </div>
                          </div>

                          {/* Arrow */}
                          <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180 opacity-0 group-hover:opacity-100 transition-opacity self-center" />
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col items-center gap-2">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={cn(
                          "cursor-pointer",
                          currentPage === 1 && "pointer-events-none opacity-50"
                        )}
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => {
                        if (totalPages <= 7) return true;
                        if (p === 1 || p === totalPages) return true;
                        if (Math.abs(p - currentPage) <= 1) return true;
                        return false;
                      })
                      .map((pageNum, idx, arr) => (
                        <span key={pageNum} className="contents">
                          {idx > 0 && arr[idx - 1] !== pageNum - 1 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={pageNum === currentPage}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        </span>
                      ))
                    }

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={cn(
                          "cursor-pointer",
                          currentPage === totalPages && "pointer-events-none opacity-50"
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
                <p className="text-xs text-muted-foreground">
                  총 {totalCount}개의 게시글
                </p>
              </div>
            )}
          </>
        )}

        {/* Detail View */}
        {viewMode === "detail" && (
          <div className="space-y-4 animate-fade-in">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={handleBack}
              className="gap-1.5 -ml-2 hover:bg-primary/10 rounded-lg h-8 text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>목록으로</span>
            </Button>

            {postLoading || !selectedPost ? (
              <div className="text-center py-20 bg-white dark:bg-card rounded-xl border border-border/50">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">게시글을 불러오는 중...</p>
              </div>
            ) : (
              <>
                {/* Post Content */}
                <div className="bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                  {/* Header Bar */}
                  <div className="h-1 bg-primary" />

                  <div className="p-5">
                    {/* Author & Actions */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <AvatarDisplay
                          src={selectedPost.author?.avatar_url}
                          name={selectedPost.author?.nickname}
                          size="lg"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
                              tabConfig[selectedPost.tab].iconBg,
                              tabConfig[selectedPost.tab].accentColor
                            )}>
                              {(() => {
                                const Icon = tabConfig[selectedPost.tab].icon;
                                return <Icon className="w-3 h-3" />;
                              })()}
                              {tabConfig[selectedPost.tab].label}
                            </span>
                            {isHotPost(selectedPost) && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary/10 text-secondary">
                                <Flame className="w-2.5 h-2.5" />
                                HOT
                              </span>
                            )}
                          </div>
                          <h2 className="text-lg font-bold text-foreground">{selectedPost.title}</h2>
                        </div>
                      </div>
                      {selectedPost.is_mine && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-lg">
                            <DropdownMenuItem onClick={() => handleStartEdit(selectedPost)} className="rounded text-sm">
                              <Pencil className="w-3.5 h-3.5 mr-2" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletePostId(selectedPost.id)}
                              className="text-destructive rounded text-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 pb-4 border-b border-border/50">
                      <span className="font-medium text-foreground">{getAuthorName(selectedPost)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(selectedPost.created_at), "yyyy.MM.dd HH:mm", { locale: ko })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {selectedPost.views}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="text-foreground whitespace-pre-wrap leading-relaxed text-sm mb-6 min-h-[120px]">
                      {selectedPost.content}
                    </div>

                    {/* Like/Dislike */}
                    <div className="flex items-center justify-center gap-3 py-4 border-t border-border/50">
                      <Button
                        variant={selectedPost.user_reaction === 'like' ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleLike(selectedPost.id, true)}
                        disabled={toggleReaction.isPending}
                        className={cn(
                          "gap-2 rounded-lg h-9 px-4 transition-all",
                          selectedPost.user_reaction === 'like'
                            ? "bg-rose-500 hover:bg-rose-600"
                            : "hover:border-rose-300 hover:text-rose-500"
                        )}
                      >
                        <Heart className={cn("w-4 h-4", selectedPost.user_reaction === 'like' && "fill-current")} />
                        <span className="font-semibold">{selectedPost.likes}</span>
                      </Button>
                      <Button
                        variant={selectedPost.user_reaction === 'dislike' ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => handleLike(selectedPost.id, false)}
                        disabled={toggleReaction.isPending}
                        className="gap-2 rounded-lg h-9 px-4"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        <span className="font-semibold">{selectedPost.dislikes}</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <div className="bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                  <div className="p-5">
                    <h3 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-primary" />
                      댓글
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                        {selectedPost.comment_count}
                      </span>
                    </h3>

                    {/* Comment Input */}
                    <div className="flex gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-semibold">나</span>
                      </div>
                      <div className="flex-1 flex gap-2">
                        <Input
                          placeholder="댓글을 남겨주세요..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
                          className="h-9 rounded-lg bg-muted/30 border-0 focus:bg-white dark:focus:bg-muted transition-colors text-sm"
                        />
                        <Button
                          onClick={handleAddComment}
                          size="icon"
                          disabled={createComment.isPending || !newComment.trim()}
                          className="h-9 w-9 rounded-lg bg-primary hover:bg-primary/90 shrink-0"
                        >
                          {createComment.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Comment List */}
                    <div className="space-y-2">
                      {!selectedPost.comments || selectedPost.comments.length === 0 ? (
                        <div className="text-center py-8">
                          <MessageCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm">첫 번째 댓글을 남겨보세요!</p>
                        </div>
                      ) : (
                        selectedPost.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="group flex gap-2 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                          >
                            <AvatarDisplay
                              src={comment.author?.avatar_url}
                              name={comment.author?.nickname}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-xs text-foreground">{getCommentAuthorName(comment)}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(comment.created_at), "MM.dd HH:mm", { locale: ko })}
                                  </span>
                                </div>
                                {comment.is_mine && (
                                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 rounded text-destructive hover:text-destructive"
                                      onClick={() => setDeleteCommentId(comment.id)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <p className="text-foreground text-sm">{comment.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Write/Edit View - Enhanced */}
        {(viewMode === "write" || viewMode === "edit") && (
          <div className="animate-fade-in">
            {/* Header with better visual hierarchy */}
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="gap-2 -ml-3 hover:bg-muted rounded-xl h-10 px-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="font-medium">돌아가기</span>
              </Button>

              <div className="flex items-center gap-3">
                {/* Character count badge */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <span>{editContent.length}</span>
                  <span>/</span>
                  <span>2000자</span>
                </div>

                <Button
                  onClick={handleSavePost}
                  disabled={!editTitle.trim() || !editContent.trim() || createPost.isPending || updatePost.isPending}
                  className={cn(
                    "gap-2 rounded-xl px-6 h-10 font-semibold transition-all duration-300",
                    editTitle.trim() && editContent.trim()
                      ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {(createPost.isPending || updatePost.isPending) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {viewMode === "edit" ? "수정 완료" : "등록하기"}
                </Button>
              </div>
            </div>

            {/* Main Content - Two Column Layout on Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Editor Section - Takes 2/3 on desktop */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                  {/* Gradient Header Bar */}
                  <div className={cn(
                    "h-1.5 bg-gradient-to-r",
                    activeTab === 'qna' ? "from-primary to-primary/60" :
                    activeTab === 'free' ? "from-secondary to-secondary/60" :
                    "from-amber-500 to-orange-400"
                  )} />

                  <div className="p-6">
                    {/* Tab Context Header */}
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/30">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        currentTabConfig.iconBg
                      )}>
                        {(() => {
                          const Icon = currentTabConfig.icon;
                          return <Icon className={cn("w-6 h-6", currentTabConfig.accentColor)} />;
                        })()}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">
                          {currentTabConfig.label}에 글쓰기
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {currentTabConfig.description}
                        </p>
                      </div>
                    </div>

                    {/* Title Input - Enhanced */}
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        제목
                        <span className="text-destructive ml-1">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          placeholder={
                            activeTab === 'qna' ? "예: 정체기 탈출 방법이 궁금해요" :
                            activeTab === 'free' ? "예: 드디어 -3kg 달성했어요!" :
                            "예: 저탄수화물 식단 한 달 후기"
                          }
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value.slice(0, 100))}
                          className={cn(
                            "h-12 text-base font-medium rounded-xl border-2 transition-all duration-200 pr-10",
                            "bg-muted/30 border-transparent",
                            "focus:bg-white dark:focus:bg-muted focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
                            editTitle.trim().length >= 5 && "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20"
                          )}
                        />
                        {editTitle.trim().length >= 5 && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                              <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="text-xs text-muted-foreground">
                          명확하고 구체적인 제목이 더 많은 관심을 받아요
                        </span>
                        <span className={cn(
                          "text-xs",
                          editTitle.length > 80 ? "text-amber-500" : "text-muted-foreground"
                        )}>
                          {editTitle.length}/100
                        </span>
                      </div>
                    </div>

                    {/* Content Textarea - Enhanced */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        내용
                        <span className="text-destructive ml-1">*</span>
                      </label>
                      <Textarea
                        placeholder={
                          activeTab === 'qna'
                            ? "현재 상황, 식단, 운동 루틴 등을 자세히 적어주시면 더 도움이 되는 답변을 받을 수 있어요..."
                            : activeTab === 'free'
                            ? "여러분과 나누고 싶은 이야기를 자유롭게 적어주세요..."
                            : "유용한 다이어트 정보, 식단 팁, 운동 방법 등을 공유해주세요..."
                        }
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value.slice(0, 2000))}
                        className={cn(
                          "min-h-[320px] rounded-xl border-2 transition-all duration-200 resize-none text-sm leading-relaxed",
                          "bg-muted/30 border-transparent",
                          "focus:bg-white dark:focus:bg-muted focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
                          editContent.trim().length >= 20 && "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20"
                        )}
                      />
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            예상 읽기 시간: {Math.max(1, Math.ceil(editContent.length / 500))}분
                          </span>
                        </div>
                        <span className={cn(
                          "text-xs font-medium",
                          editContent.length > 1800 ? "text-amber-500" :
                          editContent.length > 1500 ? "text-amber-400" :
                          "text-muted-foreground"
                        )}>
                          {editContent.length}/2000
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Progress Bar */}
                  <div className="px-6 py-4 bg-muted/20 border-t border-border/30">
                    {(() => {
                      const progress = Math.min(100,
                        (editTitle.trim().length >= 5 ? 30 : 0) +
                        (editTitle.trim().length >= 10 ? 10 : 0) +
                        (editContent.trim().length >= 20 ? 30 : 0) +
                        (editContent.trim().length >= 100 ? 20 : 0) +
                        (editContent.trim().length >= 200 ? 10 : 0)
                      );
                      return (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">작성 진행도</span>
                            <span className={cn(
                              "text-xs font-semibold",
                              progress >= 80 ? "text-emerald-500" : progress >= 50 ? "text-amber-500" : "text-muted-foreground"
                            )}>
                              {progress}%
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500 ease-out",
                                progress >= 80 ? "bg-emerald-500" : progress >= 50 ? "bg-amber-500" : "bg-primary"
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Sidebar - Tips & Motivation */}
              <div className="lg:col-span-1 space-y-4">
                {/* Writing Tips Card */}
                <div className="bg-white dark:bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                  <div className={cn(
                    "px-4 py-3 border-b border-border/30",
                    currentTabConfig.iconBg
                  )}>
                    <div className="flex items-center gap-2">
                      <Lightbulb className={cn("w-4 h-4", currentTabConfig.accentColor)} />
                      <span className="text-sm font-semibold text-foreground">작성 팁</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <ul className="space-y-3">
                      {(activeTab === 'qna' ? [
                        "구체적인 상황을 설명해주세요",
                        "시도해본 방법이 있다면 함께 알려주세요",
                        "목표 체중이나 기간을 명시하면 더 정확한 답변을 받을 수 있어요",
                      ] : activeTab === 'free' ? [
                        "오늘의 다이어트 일상을 나눠보세요",
                        "작은 성공도 큰 응원이 됩니다",
                        "서로 격려하며 함께 성장해요",
                      ] : [
                        "출처가 있다면 함께 공유해주세요",
                        "직접 경험한 정보라면 더욱 신뢰받아요",
                        "간단명료하게 핵심을 전달해주세요",
                      ]).map((tip, index) => (
                        <li key={index} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-semibold text-primary">{index + 1}</span>
                          </div>
                          <span className="text-sm text-muted-foreground leading-relaxed">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Motivation Card */}
                <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 rounded-2xl border border-primary/20 p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-card shadow-sm flex items-center justify-center flex-shrink-0">
                      <Heart className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        나눔의 힘
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        당신의 경험이 누군가에게 큰 힘이 됩니다.
                        함께 나누면 다이어트도 즐거워져요!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Guide Card */}
                <div className="bg-white dark:bg-card rounded-2xl border border-border/50 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-foreground">좋은 글 작성법</span>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>제목은 5자 이상으로 작성</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>내용은 20자 이상 상세하게</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>경험담은 구체적으로</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Post Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePostId} onOpenChange={(open) => !open && setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게시글 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 이 게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletePostId) {
                  handleDeletePost(deletePostId);
                  setDeletePostId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Comment Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCommentId} onOpenChange={(open) => !open && setDeleteCommentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>댓글 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 이 댓글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteCommentId) {
                  handleDeleteComment(deleteCommentId);
                  setDeleteCommentId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
