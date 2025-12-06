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
} from "@/hooks/usePosts";
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

  // Form state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // Comment state
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Queries
  const { data: posts = [], isLoading: postsLoading } = usePosts(activeTab, debouncedSearch || undefined);
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
    return post.author?.nickname || post.author?.email?.split('@')[0] || '익명';
  };

  const getCommentAuthorName = (comment: CommentType) => {
    return comment.author?.nickname || comment.author?.email?.split('@')[0] || '익명';
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
    try {
      await toggleReaction.mutateAsync({
        postId,
        reactionType: isLike ? 'like' : 'dislike',
      });
    } catch (error) {
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
    if (!selectedPostId) return;

    try {
      await deleteComment.mutateAsync({
        commentId,
        postId: selectedPostId,
      });
    } catch (error) {
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

  // Check if current user is author
  const isAuthor = (post: Post) => {
    const userId = localStorage.getItem('supabase_user_id');
    return userId && post.user_id === userId;
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
                          <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                            currentTabConfig.iconBg
                          )}>
                            <span className={cn("text-sm font-semibold", currentTabConfig.accentColor)}>
                              {getAuthorName(post).charAt(0)}
                            </span>
                          </div>

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
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          tabConfig[selectedPost.tab].iconBg
                        )}>
                          <span className={cn("text-sm font-semibold", tabConfig[selectedPost.tab].accentColor)}>
                            {getAuthorName(selectedPost).charAt(0)}
                          </span>
                        </div>
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
                      {isAuthor(selectedPost) && (
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
                              onClick={() => handleDeletePost(selectedPost.id)}
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
                            <div className={cn(
                              "w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0",
                              comment.is_mine
                                ? "bg-primary"
                                : "bg-muted"
                            )}>
                              <span className={cn(
                                "text-xs font-semibold",
                                comment.is_mine ? "text-white" : "text-muted-foreground"
                              )}>
                                {getCommentAuthorName(comment).charAt(0)}
                              </span>
                            </div>
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
                                      onClick={() => handleDeleteComment(comment.id)}
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

        {/* Write/Edit View */}
        {(viewMode === "write" || viewMode === "edit") && (
          <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={handleBack} className="gap-1.5 -ml-2 hover:bg-destructive/10 hover:text-destructive rounded-lg h-8 text-sm">
                <X className="w-4 h-4" />
                <span>취소</span>
              </Button>
              <Button
                onClick={handleSavePost}
                disabled={!editTitle.trim() || !editContent.trim() || createPost.isPending || updatePost.isPending}
                className="gap-1.5 rounded-lg px-4 bg-primary hover:bg-primary/90"
              >
                {(createPost.isPending || updatePost.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {viewMode === "edit" ? "수정 완료" : "등록하기"}
              </Button>
            </div>

            {/* Form */}
            <div className="bg-white dark:bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
              {/* Header Bar */}
              <div className="h-1 bg-primary" />

              <div className="p-5">
                {/* Tab Badge */}
                <div className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium mb-4",
                  currentTabConfig.iconBg,
                  currentTabConfig.accentColor
                )}>
                  {(() => {
                    const Icon = currentTabConfig.icon;
                    return <Icon className="w-3.5 h-3.5" />;
                  })()}
                  {currentTabConfig.label}에 글쓰기
                </div>

                {/* Title Input */}
                <Input
                  placeholder="제목을 입력하세요"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mb-4 h-10 text-base font-medium rounded-lg border-0 bg-muted/30 focus:bg-white dark:focus:bg-muted transition-colors"
                />

                {/* Content Textarea */}
                <Textarea
                  placeholder="내용을 입력하세요..."
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[280px] rounded-lg border-0 bg-muted/30 focus:bg-white dark:focus:bg-muted transition-colors resize-none text-sm leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
