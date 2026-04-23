import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { usePostActions } from '../hooks/usePostActions';
import { PostMediaPanel } from './PostMediaPanel';
import { PostCommentsPanel } from './PostCommentsPanel';
import { PostDeleteConfirm } from './PostDeleteConfirm';

interface PostViewerModalProps {
    post: any;
    currentUser: any;
    postAuthor?: any;
    onClose: () => void;
    onDelete: (postId: string) => void;
    onLikeUpdate?: (postId: string, isLiked: boolean, likeCount: number) => void;
    onSaveToggle?: (post: any, isSaved: boolean) => void;
    hideDeleteButton?: boolean;
    initialTab?: 'details' | 'comments';
}

export const PostDetailModal = ({
    post,
    currentUser,
    postAuthor,
    onClose,
    onDelete,
    onLikeUpdate,
    onSaveToggle,
    hideDeleteButton = false,
    initialTab = 'details',
}: PostViewerModalProps) => {
    const {
        isLiked, likeCount,
        isDeleting, showDeleteConfirm, setShowDeleteConfirm,
        activeTab, setActiveTab,
        comments,
        newComment, setNewComment,
        isSubmittingComment,
        isSaved, isSaving,
        isLoadingComments,
        fetchComments,
        handleToggleLike,
        handleToggleSave,
        handlePostComment,
        handleDeleteComment,
        handleDeleteClick,
        handleConfirmDelete,
    } = usePostActions({ post, currentUser, initialTab, onClose, onDelete, onLikeUpdate, onSaveToggle });

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />

            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative bg-zinc-900 rounded-[2rem] overflow-hidden shadow-2xl border border-zinc-800 flex flex-col md:flex-row w-full md:w-max mx-auto h-auto md:items-stretch max-h-[90vh] md:max-w-[95vw] z-50"
            >
                {/* Mobile close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-30 p-2 bg-black/50 backdrop-blur text-white rounded-full hover:bg-black/80 transition-colors md:hidden"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                {/* Left: Media (photo or video) */}
                <PostMediaPanel post={post} />

                {/* Right: Details Panel */}
                <div className="w-full md:w-[400px] flex flex-col bg-zinc-950 shrink-0 md:border-l border-zinc-900">

                    {/* Header: Author + Options */}
                    <div className={`p-6 flex items-center justify-between ${activeTab === 'details' ? 'border-b border-zinc-900' : ''}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                                {postAuthor?.avatar_url ? (
                                    <img src={postAuthor.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">{postAuthor?.username || post.username || 'User'}</h3>
                                {post.created_at && (
                                    <p className="text-zinc-500 text-xs">
                                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {!hideDeleteButton && post.username === currentUser?.username && (
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
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {activeTab === 'details' ? (
                            <div className="p-6">
                                {post.caption ? (
                                    <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{post.caption}</p>
                                ) : (
                                    <p className="text-zinc-600 text-sm italic">No caption</p>
                                )}
                            </div>
                        ) : (
                            <PostCommentsPanel
                                post={post}
                                currentUser={currentUser}
                                comments={comments}
                                isLoadingComments={isLoadingComments}
                                newComment={newComment}
                                setNewComment={setNewComment}
                                isSubmittingComment={isSubmittingComment}
                                fetchComments={fetchComments}
                                handlePostComment={handlePostComment}
                                handleDeleteComment={handleDeleteComment}
                            />
                        )}
                    </div>

                    {/* Action Footer */}
                    <div className="p-6 border-t border-zinc-900 bg-zinc-950 mt-auto">
                        <div className="flex items-center gap-6 mb-4">
                            {/* Like */}
                            <button onClick={handleToggleLike} className="group flex items-center gap-2 outline-none">
                                <svg
                                    viewBox="0 0 24 24"
                                    className={`w-7 h-7 transition-all ${isLiked ? 'fill-red-500 text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'fill-transparent text-white group-hover:text-zinc-300'}`}
                                    stroke="currentColor" strokeWidth="2"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                            </button>

                            {/* Details Tab Toggle */}
                            <button onClick={() => setActiveTab('details')} className="group">
                                <svg
                                    viewBox="0 0 24 24"
                                    className={`w-7 h-7 transition-all ${activeTab === 'details' ? 'fill-white text-white' : 'fill-transparent text-white group-hover:text-zinc-300'}`}
                                    stroke="currentColor" strokeWidth="2"
                                >
                                    <rect x="3" y="5" width="18" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>

                            {/* Comments Tab Toggle */}
                            <button onClick={() => setActiveTab('comments')} className="group">
                                <svg
                                    viewBox="0 0 24 24"
                                    className={`w-7 h-7 transition-all ${activeTab === 'comments' ? 'fill-white text-white' : 'fill-transparent text-white group-hover:text-zinc-300'}`}
                                    stroke="currentColor" strokeWidth="2"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                                </svg>
                            </button>

                            {/* Save / Favourite */}
                            <button onClick={handleToggleSave} disabled={isSaving} className="group" title="Favourite Post">
                                <svg
                                    viewBox="0 0 24 24"
                                    className={`w-7 h-7 transition-all duration-300 ${isSaved ? 'fill-amber-400 text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'fill-transparent text-white group-hover:text-amber-400 group-hover:fill-amber-400/20'}`}
                                    stroke="currentColor" strokeWidth="2"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                </svg>
                            </button>

                            {/* Share placeholder */}
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
                <PostDeleteConfirm
                    isOpen={showDeleteConfirm}
                    isDeleting={isDeleting}
                    onCancel={() => setShowDeleteConfirm(false)}
                    onConfirm={handleConfirmDelete}
                />
            </motion.div>
        </div>
    );
};
