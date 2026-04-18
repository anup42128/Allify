import { AnimatePresence } from 'framer-motion';
import { useProfileManager } from '../hooks/useProfileManager';
import { ProfileHeader } from '../components/ProfileHeader';
import { ProfileTabs } from '../components/ProfileTabs';
import { ProfilePostsGrid } from '../components/ProfilePostsGrid';
import { AvatarViewerModal } from '../components/AvatarViewerModal';
import { PostDetailModal } from '../components/PostDetailModal';

export const ProfilePage = () => {
    const {
        profile, setProfile,
        isLoading,
        isLoadingPosts,
        activeTab, setActiveTab,
        showImageViewer, setShowImageViewer,
        selectedPost, setSelectedPost,
        filteredPosts,
        stats,
        handleLikeUpdate,
        handlePostDelete,
        handleSaveToggle,
    } = useProfileManager();

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center h-full">
                <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <p className="text-zinc-500 mb-4">Please log in to view your profile.</p>
                <button
                    onClick={() => window.location.href = '/Allify/auth/login'}
                    className="px-6 py-2 bg-white text-black rounded-full font-bold"
                >
                    Log In
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-full flex flex-col pt-16 px-10 max-w-5xl mx-auto pb-20">
                <ProfileHeader
                    profile={profile}
                    stats={stats}
                    onAvatarClick={() => setShowImageViewer(true)}
                    setProfile={setProfile}
                />

                <ProfileTabs
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />

                <ProfilePostsGrid
                    isLoadingPosts={isLoadingPosts}
                    filteredPosts={filteredPosts}
                    activeTab={activeTab}
                    setSelectedPost={setSelectedPost}
                />
            </div>

            {/* Post Detail Modal */}
            <AnimatePresence>
                {selectedPost && profile && (
                    <PostDetailModal
                        post={selectedPost}
                        currentUser={profile}
                        postAuthor={
                            selectedPost?.username === profile?.username
                                ? profile
                                : selectedPost?.author_profile
                        }
                        onClose={() => setSelectedPost(null)}
                        onDelete={handlePostDelete}
                        onLikeUpdate={handleLikeUpdate}
                        onSaveToggle={handleSaveToggle}
                    />
                )}
            </AnimatePresence>

            {/* Avatar Fullscreen Viewer */}
            <AvatarViewerModal
                isOpen={showImageViewer}
                onClose={() => setShowImageViewer(false)}
                profile={profile}
            />
        </>
    );
};
