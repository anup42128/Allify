import { formatDistanceToNow } from 'date-fns';

interface PostCommentsPanelProps {
    post: any;
    currentUser: any;
    comments: any[];
    isLoadingComments: boolean;
    newComment: string;
    setNewComment: (val: string) => void;
    isSubmittingComment: boolean;
    fetchComments: () => void;
    handlePostComment: (e: React.FormEvent) => void;
    handleDeleteComment: (id: string) => void;
}

export const PostCommentsPanel = ({
    post,
    currentUser,
    comments,
    isLoadingComments,
    newComment,
    setNewComment,
    isSubmittingComment,
    fetchComments,
    handlePostComment,
    handleDeleteComment,
}: PostCommentsPanelProps) => {
    return (
        <div className="flex flex-col h-full">
            {/* Refresh Header */}
            <div
                onClick={() => {
                    if (isLoadingComments) return;
                    fetchComments();
                }}
                className={`group sticky top-0 z-10 bg-zinc-950 transition-all border-t border-b border-zinc-900 ${!isLoadingComments ? 'cursor-pointer hover:bg-zinc-900/40 hover:border-zinc-800/50' : 'cursor-default'}`}
            >
                <div className="flex items-start justify-between px-6 pt-4 pb-1">
                    <div>
                        <p className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Comments</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Tap ↻ to load new comments</p>
                    </div>
                    <div className={`p-1.5 mt-0.5 ${isLoadingComments ? 'opacity-40' : 'text-zinc-400'}`}>
                        <svg
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            className={`w-4 h-4 ${isLoadingComments ? 'animate-spin text-indigo-400' : 'text-zinc-500'}`}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                </div>

                <div className="relative flex items-end w-full">
                    {isLoadingComments && (
                        <div className="flex items-center gap-1.5 w-full h-2 px-6 pb-0.5">
                            {[0,1,2,3,4,5,6,7,8,9].map(i => (
                                <div
                                    key={i}
                                    className="flex-1 h-1 rounded-full bg-indigo-500"
                                    style={{
                                        animation: 'dotWave 1.2s ease-in-out infinite',
                                        animationDelay: `${i * 0.1}s`,
                                        opacity: 0.3,
                                    }}
                                />
                            ))}
                        </div>
                    )}
                    {!isLoadingComments && <div className="h-2" />}
                </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 p-6 pt-2 space-y-6">
                {isLoadingComments ? (
                    <div className="flex flex-col items-center justify-center h-56 gap-2">
                        <p className="text-zinc-700 text-xs font-medium tracking-wide">Fetching comments...</p>
                    </div>
                ) : comments.length > 0 ? (
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

            {/* Sticky Comment Input */}
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
    );
};
