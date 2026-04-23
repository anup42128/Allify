import { AnimatePresence, motion } from 'framer-motion';
import { useSearchProfile } from '../hooks/useSearchProfile';
import { SearchProfileHeader } from './SearchProfileHeader';
import { SearchPostsGrid } from './SearchPostsGrid';
import { AvatarViewerModal } from './AvatarViewerModal';
import { PostDetailModal } from './PostDetailModal';

interface SearchProfileViewProps {
    username: string;
    onBack?: () => void;
}

export const SearchProfileView = ({ username, onBack }: SearchProfileViewProps) => {
    const {
        profile,
        posts,
        isLoading,
        selectedPost, setSelectedPost,
        currentUser,
        activeTab, setActiveTab,
        showAvatarViewer, setShowAvatarViewer,
        isFollowing,
        isAllied,
        followLoading,
        localAllies,
        localAlling,
        localAllied,
        isOwnProfile,
        scrollRef,
        buttonScale,
        buttonOpacity,
        handleFollowToggle,
        handleLikeUpdate,
        handleSaveToggle,
    } = useSearchProfile(username);

    if (isLoading) {
        return (
            <div className="flex-1 h-full flex items-center justify-center bg-black">
                <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex-1 h-full flex flex-col items-center justify-center bg-black text-center px-6">
                <p className="text-zinc-500 mb-4 text-lg">User not found.</p>
            </div>
        );
    }

    return (
        <div ref={scrollRef} className="flex-1 h-full overflow-y-auto custom-scrollbar bg-black relative">
            <div className="min-h-full flex flex-col pt-16 px-10 max-w-5xl mx-auto pb-20">

                {/* Scroll-shrinking close button */}
                {onBack && (
                    <motion.button
                        onClick={onBack}
                        title="Close profile"
                        animate={{ scale: buttonScale, opacity: buttonOpacity }}
                        whileHover={{ scale: Math.max(buttonScale, 0.75), opacity: 1 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="fixed top-5 right-8 p-3 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full border border-zinc-800/50 z-50 backdrop-blur-md shadow-xl"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </motion.button>
                )}

                <SearchProfileHeader
                    profile={profile}
                    posts={posts}
                    isOwnProfile={!!isOwnProfile}
                    isFollowing={isFollowing}
                    isAllied={isAllied}
                    followLoading={followLoading}
                    localAllies={localAllies}
                    localAlling={localAlling}
                    localAllied={localAllied}
                    onFollowToggle={handleFollowToggle}
                    onAvatarClick={() => setShowAvatarViewer(true)}
                />

                <SearchPostsGrid
                    posts={posts}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    setSelectedPost={setSelectedPost}
                    profileUsername={profile.username}
                />
            </div>

            {/* Post Detail Modal */}
            <AnimatePresence>
                {selectedPost && currentUser && (
                    <PostDetailModal
                        post={selectedPost}
                        currentUser={currentUser}
                        postAuthor={profile}
                        onClose={() => setSelectedPost(null)}
                        onDelete={() => {}}
                        onLikeUpdate={handleLikeUpdate}
                        onSaveToggle={handleSaveToggle}
                        hideDeleteButton={true}
                    />
                )}
            </AnimatePresence>

            {/* Avatar Fullscreen Viewer */}
            <AvatarViewerModal
                isOpen={showAvatarViewer}
                onClose={() => setShowAvatarViewer(false)}
                profile={profile}
            />
        </div>
    );
};
