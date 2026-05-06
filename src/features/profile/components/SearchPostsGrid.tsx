import { motion } from 'framer-motion';

type TabType = 'All' | 'Photos' | 'Videos';

interface SearchPostsGridProps {
    posts: any[];
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    setSelectedPost: (post: any) => void;
    profileUsername: string;
}

export const SearchPostsGrid = ({
    posts,
    activeTab,
    setActiveTab,
    setSelectedPost,
    profileUsername,
}: SearchPostsGridProps) => {
    const filteredPosts = posts.filter(post => {
        if (activeTab === 'All') return true;
        if (activeTab === 'Photos') return post.type === 'photo' || !post.type;
        if (activeTab === 'Videos') return post.type === 'video';
        return false;
    });

    const getTabIcon = (tab: TabType, isActive: boolean) => {
        switch (tab) {
            case 'All':
                return isActive ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[24px] h-[24px]">
                        <rect x="3" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="14" width="7" height="7" rx="1.5" />
                        <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-[24px] h-[24px]">
                        <rect x="3" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="14" width="7" height="7" rx="1.5" />
                        <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    </svg>
                );
            case 'Photos':
                return isActive ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[24px] h-[24px]">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" fill="black" />
                        <path d="M21 15l-5-5L5 21" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-[24px] h-[24px]">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                );
            case 'Videos':
                return isActive ? (
                    <svg viewBox="0 0 24 24" className="w-[25px] h-[25px]">
                        <defs>
                            <mask id="search-diamond-cutout">
                                <rect x="0" y="0" width="24" height="24" fill="white" />
                                <polygon points="10 9 15 12 10 15 10 9" fill="black" stroke="black" strokeWidth="1.5" strokeLinejoin="round" />
                            </mask>
                        </defs>
                        <rect x="4" y="4" width="16" height="16" rx="4.5" transform="rotate(45 12 12)" fill="currentColor" mask="url(#search-diamond-cutout)" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-[25px] h-[25px]">
                        <rect x="4" y="4" width="16" height="16" rx="4.5" transform="rotate(45 12 12)" />
                        <polygon points="10 9 15 12 10 15 10 9" strokeLinejoin="round" strokeLinecap="round" />
                    </svg>
                );
        }
    };

    const tabs: TabType[] = ['All', 'Photos', 'Videos'];

    return (
        <div className="w-full">
            {/* Desktop: Original floating text tabs */}
            <div className="hidden md:flex items-center justify-center gap-10 md:gap-40 border-t border-zinc-800/50 mb-8 pt-6">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-all relative ${activeTab === tab ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <motion.div
                                layoutId="searchTabIndicator"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Mobile: Premium icon tabs */}
            <div className="flex relative w-full md:hidden border-b border-zinc-800/60 mb-0.5 mt-2">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            title={tab}
                            className={`flex-1 flex items-center justify-center py-3.5 relative transition-colors ${isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-400'}`}
                        >
                            {getTabIcon(tab, isActive)}
                            {isActive && (
                                <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white rounded-t-full shadow-[0_-2px_8px_rgba(255,255,255,0.4)]" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Grid or Empty State */}
            {filteredPosts.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                    {activeTab === 'Videos' ? (
                        <div className="flex flex-col items-center justify-center gap-2 text-center px-4 mb-4">
                            {/* Mobile: icon without box. Desktop: icon with box */}
                            <div className="w-16 h-16 md:rounded-2xl md:bg-gradient-to-tr md:from-rose-500/10 md:to-orange-500/10 flex items-center justify-center md:border border-rose-500/20 mb-3 md:shadow-[0_0_30px_rgba(244,63,94,0.1)] relative overflow-hidden">
                                <div className="hidden md:block absolute inset-0 bg-rose-500/20" />
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 md:w-7 md:h-7 text-rose-500 relative z-10">
                                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z" />
                                </svg>
                            </div>
                            <h3 className="text-[17px] font-black text-white tracking-tight">Videos Coming Soon</h3>
                            <p className="text-zinc-500 font-medium text-[13px] max-w-[260px] leading-[1.6]">
                                There are no videos here yet.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 text-center px-4 mb-4">
                            {/* Mobile: icon without box. Desktop: icon with box */}
                            <div className="w-16 h-16 md:rounded-2xl md:border border-zinc-800 md:bg-zinc-900/50 flex items-center justify-center mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8 md:w-7 md:h-7 text-zinc-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                </svg>
                            </div>
                            <h3 className="text-[17px] font-black text-white tracking-tight">No {activeTab === 'Photos' ? 'Photos' : 'Posts'} Yet</h3>
                            <p className="text-zinc-500 font-medium text-[13px] max-w-[240px] leading-[1.6]">
                                {profileUsername} hasn't posted any {activeTab === 'Photos' ? 'photos' : 'posts'} yet.
                            </p>
                        </div>
                    )}
                </div>
            ) : (
            <div className="grid grid-cols-3 gap-1 px-2 md:px-0 md:gap-6 auto-rows-[1fr] mt-1 md:mt-2">
                {filteredPosts.map((post) => (
                    <motion.div
                        key={post.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative aspect-square group cursor-pointer w-full rounded-md md:rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/60 md:border-zinc-800/50 hover:border-zinc-700 transition-colors shadow-sm"
                        onClick={() => setSelectedPost(post)}
                        >
                            {post.type === 'video' ? (
                                <video
                                    src={post.video_url}
                                    className="w-full h-full object-cover relative z-10"
                                    muted
                                    loop
                                    playsInline
                                    onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                                    onMouseOut={(e) => {
                                        const video = e.target as HTMLVideoElement;
                                        video.pause();
                                        video.currentTime = 0;
                                    }}
                                />
                            ) : (
                                <>
                                    <div id={`search-loader-${post.id}`} className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-20">
                                        <div className="absolute inset-0 animate-pulse bg-zinc-800/50" />
                                        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin relative z-30" />
                                    </div>
                                    <img
                                        src={post.image_url}
                                        alt="Post"
                                        className="w-full h-full object-cover relative z-10 opacity-0 transition-opacity duration-700"
                                        onLoad={(e) => {
                                            const img = e.target as HTMLImageElement;
                                            img.classList.remove('opacity-0');
                                            img.classList.add('opacity-100');
                                            document.getElementById(`search-loader-${post.id}`)?.classList.add('hidden');
                                        }}
                                    />
                                </>
                            )}

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-6 backdrop-blur-[2px]">
                                <div className="flex items-center gap-2 text-white font-bold transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                    <svg viewBox="0 0 24 24" fill={post.is_liked_by_me ? "#ef4444" : "currentColor"} className="w-6 h-6">
                                        <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                                    </svg>
                                    <span className="text-lg">{post.likes_count || 0}</span>
                                </div>
                            </div>

                            {/* Video badge */}
                            {post.type === 'video' && (
                                <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 group-hover:opacity-0 transition-opacity">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                                        <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06Z" />
                                    </svg>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};
