
import { AnimatePresence } from 'framer-motion';
import { PostDetailModal } from '../features/profile/components/PostDetailModal';
import { NotificationItem } from '../components/notifications/NotificationItem';
import { NotificationRightPanel } from '../components/notifications/NotificationRightPanel';
import { useNotificationsManager } from '../hooks/useNotificationsManager';

export const NotificationsPage = () => {
    const {
        notifs,
        unread,
        currentUser,
        isRefreshing,
        serverConfirmed,
        selectedPost,
        isFetchingPost,
        modalInitialTabRef,
        setSelectedPost,
        handleSelectPost,
        handleMarkAllRead
    } = useNotificationsManager();

    return (
        <div className="flex h-screen bg-black overflow-hidden relative">
            
            {/* Left Sidebar - Notifications List */}
            <div className="w-full md:w-[400px] xl:w-[450px] border-r border-zinc-900/50 flex flex-col bg-black flex-shrink-0 z-10 transition-all">
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-zinc-900/50 px-6 py-5 flex items-center justify-between">
                    <h1 className="text-2xl font-black text-white tracking-tight">Notifications</h1>
                    {unread > 0 && (
                        <button 
                            onClick={handleMarkAllRead}
                            className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2 flex items-center justify-center rounded-full tracking-wide"
                        >
                            Mark all as read
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 md:pb-4 relative">
                    {/* Subtle indigo shimmer bar at top — never hides the list */}
                    {isRefreshing && (
                        <div className="sticky top-0 z-10 h-0.5 w-full overflow-hidden bg-transparent">
                            <div className="h-full bg-indigo-500 rounded-full w-1/3"
                                style={{ animation: 'slideRight 1.2s ease-in-out infinite' }}
                            />
                        </div>
                    )}
                    <div className="p-4 space-y-1.5">
                    {notifs.length > 0 ? (
                        // Has data — always show it, whether refreshing or not
                        notifs.map(n => <NotificationItem key={n.id} notif={n} currentUser={currentUser} onSelectPost={handleSelectPost} />)
                    ) : serverConfirmed && !isRefreshing ? (
                        // Server confirmed AND refresh complete: genuinely no notifications
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center opacity-70">
                            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border-4 border-zinc-800">
                                <span className="text-5xl opacity-50">🔔</span>
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Caught up!</h3>
                            <p className="text-zinc-500 text-sm max-w-[200px] leading-relaxed font-medium">You have no new notifications right now. Go make some noise!</p>
                        </div>
                    ) : (
                        // Still loading / refreshing — show spinner, NEVER the empty bell
                        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                            <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                            <p className="text-zinc-500 text-sm font-medium">Loading notifications...</p>
                        </div>
                    )}
                    </div>
                </div>
            </div>

            {/* Right Content Area */}
            <NotificationRightPanel />

            {/* Post Viewer Modal */}
            <AnimatePresence>
                {selectedPost && currentUser && (
                    <PostDetailModal
                        key={selectedPost.id} post={selectedPost}
                        currentUser={currentUser}
                        postAuthor={
                            selectedPost?.username === currentUser?.username
                                ? currentUser
                                : selectedPost?.author_profile
                        }
                        initialTab={modalInitialTabRef.current}
                        onClose={() => setSelectedPost(null)}
                        onDelete={() => setSelectedPost(null)}
                    />
                )}
            </AnimatePresence>

            {/* Loading Overlay when fetching the post */}
            {isFetchingPost && (
                <div className="fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin mb-4" />
                    <p className="text-white font-bold">Loading post...</p>
                </div>
            )}
        </div>
    );
};
