import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { broadcastNotificationPing } from '../../../lib/notificationStore';
import { broadcastPostUpdate, subscribeToPostUpdates } from '../../../lib/postSyncStore';

interface UsePostActionsProps {
    post: any;
    currentUser: any;
    initialTab?: 'details' | 'comments';
    onClose: () => void;
    onDelete: (postId: string) => void;
    onLikeUpdate?: (postId: string, isLiked: boolean, likeCount: number) => void;
    onSaveToggle?: (post: any, isSaved: boolean) => void;
}

export const usePostActions = ({
    post,
    currentUser,
    initialTab = 'details',
    onClose,
    onDelete,
    onLikeUpdate,
    onSaveToggle,
}: UsePostActionsProps) => {
    const [isLiked, setIsLiked] = useState(post.is_liked_by_me || false);
    const [likeCount, setLikeCount] = useState(post.likes_count || 0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'comments'>(initialTab);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isSaved, setIsSaved] = useState(post.is_saved_by_me || false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingComments, setIsLoadingComments] = useState(true);

    // Sync from parent when post prop changes (optimistic updates from parent)
    useEffect(() => {
        setIsLiked(post.is_liked_by_me || false);
        setLikeCount(post.likes_count || 0);
    }, [post.is_liked_by_me, post.likes_count]);

    useEffect(() => {
        if (!post) return;
        fetchComments();
    }, [post.id]);

    useEffect(() => {
        setIsSaved(post.is_saved_by_me || false);
    }, [post.is_saved_by_me]);

    // Real-time broadcast subscription
    useEffect(() => {
        if (!post) return;
        const unsubscribe = subscribeToPostUpdates((payload) => {
            if (payload.postId !== post.id) return;
            switch (payload.action) {
                case 'like':
                case 'unlike':
                    setLikeCount(payload.data?.likes_count ?? likeCount);
                    break;
                case 'comment_add':
                    // Append the new comment from another user in real-time
                    if (payload.data) {
                        setComments(prev => {
                            // Guard: don't duplicate if we already have it (our own posts)
                            if (prev.some(c => c.id === payload.data.id)) return prev;
                            return [...prev, payload.data];
                        });
                    }
                    break;
                case 'comment_delete':
                    if (payload.data?.comment_id) {
                        setComments(prev => prev.filter(c => c.id !== payload.data!.comment_id));
                    }
                    break;
            }
        });
        return () => { unsubscribe(); };
    }, [post?.id, likeCount]);

    const fetchComments = async () => {
        if (!post) return;
        setIsLoadingComments(true);
        const [{ data, error }] = await Promise.all([
            supabase
                .from('comments')
                .select(`*, profiles:username (username, avatar_url)`)
                .eq('post_id', post.id)
                .order('created_at', { ascending: true }),
            new Promise(res => setTimeout(res, 800))
        ]);
        if (error) {
            console.error("Error fetching comments:", error);
            setIsLoadingComments(false);
            return;
        }
        setComments(data || []);
        setIsLoadingComments(false);
    };

    const handleToggleLike = async () => {
        if (!currentUser || !post) return;
        const newLikedState = !isLiked;
        const newLikeCount = newLikedState ? likeCount + 1 : likeCount - 1;

        setIsLiked(newLikedState);
        setLikeCount(newLikeCount);
        onLikeUpdate?.(post.id, newLikedState, newLikeCount);
        broadcastPostUpdate({ postId: post.id, action: newLikedState ? 'like' : 'unlike', data: { likes_count: newLikeCount } });

        try {
            if (newLikedState) {
                const { error } = await supabase.from('likes').insert({
                    username: currentUser.username,
                    post_id: post.id,
                    post_author_username: post.username,
                    post_url: post.image_url
                });
                if (error) throw error;
                if (currentUser.username !== post.username) {
                    broadcastNotificationPing(post.username);
                }
            } else {
                const { error } = await supabase.from('likes').delete()
                    .eq('username', currentUser.username)
                    .eq('post_id', post.id);
                if (error) throw error;
            }
        } catch (error) {
            console.error("Error toggling like:", error);
            setIsLiked(!newLikedState);
            const revertedCount = newLikedState ? likeCount : likeCount + 1;
            setLikeCount(revertedCount);
            onLikeUpdate?.(post.id, !newLikedState, revertedCount);
            broadcastPostUpdate({ postId: post.id, action: !newLikedState ? 'like' : 'unlike', data: { likes_count: revertedCount } });
        }
    };

    const handleToggleSave = async () => {
        if (!currentUser || !post || isSaving) return;
        setIsSaving(true);
        const newSavedState = !isSaved;
        setIsSaved(newSavedState);
        onSaveToggle?.(post, newSavedState);
        broadcastPostUpdate({ postId: post.id, action: newSavedState ? 'save' : 'unsave' });

        try {
            if (newSavedState) {
                await supabase.from('saved_posts').insert({
                    user_id: currentUser.id,
                    post_id: post.id,
                    username: currentUser.username
                });
            } else {
                await supabase.from('saved_posts').delete()
                    .eq('user_id', currentUser.id)
                    .eq('post_id', post.id);
            }
        } catch (error) {
            console.error('Error toggling save:', error);
            setIsSaved(!newSavedState);
        } finally {
            setIsSaving(false);
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
                .select(`*, profiles:username (username, avatar_url)`)
                .single();
            if (error) throw error;
            setComments((prev: any[]) => [...prev, data]);
            setNewComment('');
            broadcastPostUpdate({ postId: post.id, action: 'comment_add', data });
        } catch (error) {
            console.error("Error posting comment:", error);
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            const { error } = await supabase.from('comments').delete().eq('id', commentId);
            if (error) throw error;
            setComments((prev: any[]) => prev.filter(c => c.id !== commentId));
            broadcastPostUpdate({ postId: post.id, action: 'comment_delete', data: { comment_id: commentId } });
        } catch (error) {
            console.error("Error deleting comment:", error);
            alert("Failed to delete comment");
        }
    };

    const handleDeleteClick = () => setShowDeleteConfirm(true);

    const handleConfirmDelete = async () => {
        if (!post) return;
        setIsDeleting(true);
        try {
            const extractPath = (url: string, bucket: string) => {
                const searchString = `/public/${bucket}/`;
                const index = url.indexOf(searchString);
                if (index !== -1) return url.substring(index + searchString.length).split('?')[0];
                return null;
            };

            const pathsToRemove: { bucket: string; path: string }[] = [];
            if (post.type === 'video' && post.video_url) {
                const videoPath = extractPath(post.video_url, 'videos');
                if (videoPath) pathsToRemove.push({ bucket: 'videos', path: videoPath });
                const thumbPath = extractPath(post.image_url, 'posts');
                if (thumbPath) pathsToRemove.push({ bucket: 'posts', path: thumbPath });
            } else {
                const photoPath = extractPath(post.image_url, 'posts');
                if (photoPath) pathsToRemove.push({ bucket: 'posts', path: photoPath });
            }

            for (const item of pathsToRemove) {
                const { error: storageError } = await supabase.storage.from(item.bucket).remove([item.path]);
                if (storageError) console.error(`Storage deletion error (${item.bucket}):`, storageError);
            }

            const { error } = await supabase.from('posts').delete().eq('id', post.id);
            if (error) throw error;

            onDelete(post.id);
            broadcastPostUpdate({ postId: post.id, action: 'delete' });
            onClose();
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete post");
            setIsDeleting(false);
        }
    };

    return {
        isLiked,
        likeCount,
        isDeleting,
        showDeleteConfirm, setShowDeleteConfirm,
        activeTab, setActiveTab,
        comments,
        newComment, setNewComment,
        isSubmittingComment,
        isSaved,
        isSaving,
        isLoadingComments,
        fetchComments,
        handleToggleLike,
        handleToggleSave,
        handlePostComment,
        handleDeleteComment,
        handleDeleteClick,
        handleConfirmDelete,
    };
};
