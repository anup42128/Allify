import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface PostViewerModalProps {
    post: any;
    currentUser: any;
    onClose: () => void;
    onDelete: (postId: string) => void;
    onLikeUpdate?: (postId: string, isLiked: boolean, likeCount: number) => void;
    onSaveToggle?: (post: any, isSaved: boolean) => void;
}

export const PostDetailModal = ({ post, currentUser, onClose, onDelete, onLikeUpdate, onSaveToggle }: PostViewerModalProps) => {
    const [isLiked, setIsLiked] = useState(post.is_liked_by_me || false);
    const [likeCount, setLikeCount] = useState(post.likes_count || 0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'comments'>('details');
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isSaved, setIsSaved] = useState(post.is_saved_by_me || false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!post) return;
        fetchComments();
        checkIfSaved();
    }, [post]);
    const checkIfSaved = async () => {
        if (!currentUser || !post) return;
        const { data } = await supabase
            .from('saved_posts')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('post_id', post.id)
            .maybeSingle();
        setIsSaved(!!data);
    };

    const handleToggleSave = async () => {
        if (!currentUser || !post || isSaving) return;
        setIsSaving(true);

        // Optimistic update
        const newSavedState = !isSaved;
        setIsSaved(newSavedState);
        // Notify parent immediately for instant UI update
        onSaveToggle?.(post, newSavedState);

        try {
            if (newSavedState) {
                await supabase.from('saved_posts').insert({
                    user_id: currentUser.id,
                    post_id: post.id
                });
            } else {
                await supabase.from('saved_posts').delete()
                    .eq('user_id', currentUser.id)
                    .eq('post_id', post.id);
            }
        } catch (error) {
            console.error('Error toggling save:', error);
            setIsSaved(!newSavedState); // Revert on fail
        } finally {
            setIsSaving(false);
        }
    };

    const fetchComments = async () => {
        if (!post) return;
        const { data, error } = await supabase
            .from('comments')
            .select(`
                *,
                profiles:username (username, avatar_url)
            `)
            .eq('post_id', post.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching comments:", error);
            return;
        }
        setComments(data || []);
    };

    const handleToggleLike = async () => {
        if (!currentUser || !post) return;

        const newLikedState = !isLiked;
        const newLikeCount = newLikedState ? likeCount + 1 : likeCount - 1;

        setIsLiked(newLikedState);
        setLikeCount(newLikeCount);

        // Notify parent of the update
        onLikeUpdate?.(post.id, newLikedState, newLikeCount);

        try {
            if (newLikedState) {
                await supabase.from('likes').insert({
                    username: currentUser.username,
                    post_id: post.id,
                    post_author_username: post.username,
                    post_url: post.image_url
                });
            } else {
                await supabase.from('likes').delete()
                    .eq('username', currentUser.username)
                    .eq('post_id', post.id);
            }
        } catch (error) {
            console.error("Error toggling like:", error);
            // Revert on error
            setIsLiked(!newLikedState);
            setLikeCount((prev: number) => newLikedState ? prev - 1 : prev + 1);
            onLikeUpdate?.(post.id, !newLikedState, newLikedState ? likeCount : likeCount + 1);
        }
    };

    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUser || isSubmittingComment) return;

        setIsSubmittingComment(true);
        try {
            const { data, error } = await supabase
                .from('comments')
                .insert({
                    post_id: post.id,
                    username: currentUser.username,
                    post_author_username: post.username,
                    content: newComment.trim()
                })
                .select(`
                    *,
                    profiles:username (username, avatar_url)
                `)
                .single();

            if (error) throw error;

            setComments((prev: any[]) => [...prev, data]);
            setNewComment('');
        } catch (error) {
            console.error("Error posting comment:", error);
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId);

            if (error) throw error;

            setComments((prev: any[]) => prev.filter(c => c.id !== commentId));
        } catch (error) {
            console.error("Error deleting comment:", error);
            alert("Failed to delete comment");
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!post) return;
        setIsDeleting(true);
        try {
            // 1. Extract paths from URLs more robustly
            const pathsToRemove: { bucket: string, path: string }[] = [];

            // Helper to extract path after the bucket name
            const extractPath = (url: string, bucket: string) => {
                const searchString = `/public/${bucket}/`;
                const index = url.indexOf(searchString);
                if (index !== -1) {
                    return url.substring(index + searchString.length).split('?')[0];
                }
                return null;
            };

            // Handle video cleanup
            if (post.type === 'video' && post.video_url) {
                const videoPath = extractPath(post.video_url, 'videos');
                if (videoPath) pathsToRemove.push({ bucket: 'videos', path: videoPath });

                // Thumbnail is in posts bucket
                const thumbPath = extractPath(post.image_url, 'posts');
                if (thumbPath) pathsToRemove.push({ bucket: 'posts', path: thumbPath });
            } else {
                // Photo cleanup
                const photoPath = extractPath(post.image_url, 'posts');
                if (photoPath) pathsToRemove.push({ bucket: 'posts', path: photoPath });
            }

            // Remove all associated files
            for (const item of pathsToRemove) {
                const { error: storageError } = await supabase.storage
                    .from(item.bucket)
                    .remove([item.path]);

                if (storageError) {
                    console.error(`Storage deletion error (${item.bucket}):`, storageError);
                }
            }

            // 2. Delete database record
            const { error } = await supabase.from('posts').delete().eq('id', post.id);
            if (error) throw error;

            onDelete(post.id);
            onClose();
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete post");
            setIsDeleting(false);
        }
    };

    // Removed isPortrait layout branch entirely to enforce universal shrink-wrapping

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />

            <motion.div
                layoutId={`post-${post.id}`}
                className="relative bg-zinc-900 rounded-[2rem] overflow-hidden shadow-2xl border border-zinc-800 transition-all duration-300 flex flex-col md:flex-row w-full md:w-max mx-auto h-auto md:items-stretch max-h-[90vh] md:max-w-[95vw]"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-30 p-2 bg-black/50 backdrop-blur text-white rounded-full hover:bg-black/80 transition-colors md:hidden"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                {/* Left: Image Container */}
                <div className="relative bg-black flex items-center justify-center overflow-hidden transition-all duration-300 w-full md:w-auto shrink min-w-0">
                    {/* Loading State (Spinner + Pulse) */}
                    <div id={`modal-loader-${post.id}`} className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-20">
                        <div className="absolute inset-0 animate-pulse bg-zinc-800/50" />
                        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin relative z-30" />
                    </div>

                    {post.type === 'video' ? (
                        <video
                            src={post.video_url}
                            className="object-contain relative z-10 w-auto h-[85vh] md:h-[90vh] aspect-[9/16]"
                            autoPlay
                            loop
                            muted
                            playsInline
                            onLoadedData={() => {
                                document.getElementById(`modal-loader-${post.id}`)?.classList.add('hidden');
                            }}
                        />
                    ) : (
                        <img
                            src={post.image_url}
                            alt={post.caption}
                            className="object-contain relative z-10 opacity-0 transition-opacity duration-700 w-auto h-auto max-w-full max-h-[60vh] md:max-h-[90vh]"
                            onLoad={(e) => {
                                const img = e.target as HTMLImageElement;
                                img.classList.remove('opacity-0');
                                img.classList.add('opacity-100');
                                document.getElementById(`modal-loader-${post.id}`)?.classList.add('hidden');
                            }}
                        />
                    )}
                </div>

                {/* Right: Details */}
                <div className="w-full md:w-[400px] flex flex-col bg-zinc-950 shrink-0 md:border-l border-zinc-900">
                    {/* Header */}
                    <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                                {currentUser?.avatar_url ? (
                                    <img src={currentUser.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">{currentUser?.username || 'User'}</h3>
                                {post.created_at && (
                                    <p className="text-zinc-500 text-xs">
                                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Options */}
                        <div className="flex items-center gap-2">
                            {post.username === currentUser?.username && (
                                <button
                                    onClick={handleDeleteClick}
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                                    title="Delete Post"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="hidden md:block p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Content Area (Scrollable) */}
                    <div className="flex-1 overflow-y-auto">
                        {activeTab === 'details' ? (
                            <div className="p-6">
                                {post.caption ? (
                                    <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{post.caption}</p>
                                ) : (
                                    <p className="text-zinc-600 text-sm italic">No caption</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                <div className="flex-1 p-6 space-y-6">
                                    {comments.length > 0 ? (
                                        comments.map((comment) => (
                                            <div key={comment.id} className="flex gap-3">
                                                <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                                                    {comment.profiles?.avatar_url ? (
                                                        <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
                                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-white font-bold text-xs">{comment.profiles?.username}</span>
                                                            <span className="text-zinc-500 text-[10px]">
                                                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                                            </span>
                                                        </div>
                                                        {(comment.username === currentUser?.username || post.username === currentUser?.username) && (
                                                            <button
                                                                onClick={() => handleDeleteComment(comment.id)}
                                                                className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                                                            >
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-zinc-300 text-sm leading-snug">{comment.content}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                                            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-zinc-700">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                                                </svg>
                                            </div>
                                            <h4 className="text-white font-bold text-sm mb-1">No comments yet</h4>
                                            <p className="text-zinc-500 text-xs">Start the conversation by adding a comment below.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Comment Input */}
                                <form onSubmit={handlePostComment} className="p-4 border-t border-zinc-900 bg-zinc-950 sticky bottom-0">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                                            {currentUser?.avatar_url ? (
                                                <img src={currentUser.avatar_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                placeholder="Add a comment..."
                                                className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-full py-2 px-4 pr-12 focus:outline-none focus:border-blue-500/50 transition-colors"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!newComment.trim() || isSubmittingComment}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 font-bold text-xs px-2 disabled:opacity-50"
                                            >
                                                {isSubmittingComment ? '...' : 'Post'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Actions / Footer */}
                    <div className="p-6 border-t border-zinc-900 bg-zinc-950 mt-auto">
                        <div className="flex items-center gap-6 mb-4">
                            <button
                                onClick={handleToggleLike}
                                className="group flex items-center gap-2 outline-none"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    className={`w-7 h-7 transition-all ${isLiked ? 'fill-red-500 text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'fill-transparent text-white group-hover:text-zinc-300'}`}
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setActiveTab('details')}
                                className="group"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    className={`w-7 h-7 transition-all ${activeTab === 'details' ? 'fill-white text-white' : 'fill-transparent text-white group-hover:text-zinc-300'}`}
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <rect x="3" y="5" width="18" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setActiveTab('comments')}
                                className="group"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    className={`w-7 h-7 transition-all ${activeTab === 'comments' ? 'fill-white text-white' : 'fill-transparent text-white group-hover:text-zinc-300'}`}
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                                </svg>
                            </button>
                            <button
                                onClick={handleToggleSave}
                                disabled={isSaving}
                                className="group"
                                title="Favourite Post"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    className={`w-7 h-7 transition-all duration-300 ${
                                        isSaved
                                            ? 'fill-amber-400 text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                                            : 'fill-transparent text-white group-hover:text-amber-400 group-hover:fill-amber-400/20'
                                    }`}
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                </svg>
                            </button>
                            <button className="group ml-auto">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 text-white group-hover:text-zinc-300 transition-colors">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-white font-bold text-sm">
                            {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                        </p>

                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-2 opacity-60">
                            {new Date(post.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* Delete Confirmation Overlay */}
                <AnimatePresence>
                    {showDeleteConfirm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
                            >
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-red-500"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                </div>
                                <h3 className="text-white font-bold text-lg mb-2">Delete Post?</h3>
                                <p className="text-zinc-400 text-sm mb-6">
                                    This action cannot be undone. The post will be permanently removed from your profile.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 px-4 py-2 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmDelete}
                                        disabled={isDeleting}
                                        className="flex-1 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isDeleting ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : "Delete"}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
