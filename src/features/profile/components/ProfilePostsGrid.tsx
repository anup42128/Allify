import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type TabType = 'Photos' | 'Videos' | 'Favourites' | 'Likes';

interface ProfilePostsGridProps {
    isLoadingPosts: boolean;
    filteredPosts: any[];
    activeTab: TabType;
    setSelectedPost: React.Dispatch<React.SetStateAction<any>>;
}

export const ProfilePostsGrid = ({ 
    isLoadingPosts, 
    filteredPosts, 
    activeTab, 
    setSelectedPost 
}: ProfilePostsGridProps) => {
    const navigate = useNavigate();
    const [isStarClicked, setIsStarClicked] = useState(false);
    const [isHeartClicked, setIsHeartClicked] = useState(false);

    if (isLoadingPosts) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin h-8 w-8 border-4 border-zinc-800 border-t-white rounded-full"></div>
            </div>
        );
    }

    if (filteredPosts.length > 0) {
        return (
            <div className="grid grid-cols-3 gap-1 px-2 md:px-0 md:gap-6 mb-[calc(5rem+env(safe-area-inset-bottom))] md:mb-20 mt-2">
                {filteredPosts.map((post) => (
                    <div
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className="relative aspect-square bg-zinc-900 rounded-md md:rounded-3xl overflow-hidden border border-zinc-800/60 md:border-zinc-900 group/post hover:border-zinc-700 transition-colors cursor-pointer shadow-sm"
                    >
                        <div id={`loader-${post.id}`} className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-20">
                            <div className="absolute inset-0 animate-pulse bg-zinc-800/50" />
                            <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-white/20 border-t-white rounded-full animate-spin relative z-30" />
                        </div>

                        <img
                            src={post.image_url}
                            alt={post.caption}
                            className="w-full h-full object-cover relative z-10 opacity-0 transition-opacity duration-700"
                            onLoad={(e) => {
                                const img = e.target as HTMLImageElement;
                                img.classList.remove('opacity-0');
                                img.classList.add('opacity-100');
                                document.getElementById(`loader-${post.id}`)?.classList.add('hidden');
                            }}
                        />

                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/post:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-30">
                            <div className="flex gap-4 text-white font-bold">
                                <div className="flex items-center gap-1">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div
            className={`relative flex flex-col items-center justify-center py-16 md:py-12 md:min-h-[280px] px-6 md:mx-0 md:border-2 md:border-dashed md:border-zinc-800/50 md:rounded-[2rem] md:bg-transparent group/empty transition-all ${activeTab === 'Photos' ? 'md:hover:bg-zinc-900/30 md:cursor-pointer' : 'cursor-default'}`}
        >
            {/* Desktop-only clickable overlay for Photos tab */}
            {activeTab === 'Photos' && (
                <div
                    className="hidden md:block absolute inset-0 cursor-pointer z-10"
                    onClick={() => navigate('/create', { state: { type: 'photo' } })}
                />
            )}
            {activeTab === 'Videos' ? (
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500/10 to-orange-500/10 flex items-center justify-center border border-rose-500/20 mb-3 shadow-[0_0_30px_rgba(244,63,94,0.1)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-rose-500/20" />
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-rose-500 relative z-10">
                            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z" />
                        </svg>
                    </div>
                    <h3 className="text-[17px] font-black text-white tracking-tight">Videos Coming Soon</h3>
                    <p className="text-zinc-500 font-medium text-[13px] max-w-[260px] leading-[1.6]">
                        We're crafting a beautiful new video experience. Get ready to share your world in motion.
                    </p>
                </div>
            ) : activeTab === 'Favourites' ? (
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                    {/* Mobile: icon inside box */}
                    <div 
                        className="md:hidden w-16 h-16 rounded-2xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-center mb-3 cursor-pointer transition-all duration-300 hover:border-amber-500/40 hover:bg-amber-500/10 hover:shadow-[0_0_20px_rgba(251,191,36,0.15)]"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsStarClicked(true);
                            setTimeout(() => setIsStarClicked(false), 1000);
                        }}
                    >
                        <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className={`w-7 h-7 transition-all duration-700 ease-out ${isStarClicked ? 'fill-amber-400 text-amber-400 scale-125 -rotate-[180deg] drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'fill-transparent text-zinc-500'}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                    </div>
                    {/* Desktop: large standalone icon, no box */}
                    <div
                        className="hidden md:flex items-center justify-center mb-4 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsStarClicked(true);
                            setTimeout(() => setIsStarClicked(false), 1000);
                        }}
                    >
                        <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className={`w-16 h-16 transition-all duration-700 ease-out ${isStarClicked ? 'fill-amber-400 text-amber-400 scale-110 -rotate-[180deg] drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]' : 'fill-transparent text-zinc-700 hover:text-zinc-500'}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                    </div>
                    <h3 className="text-[17px] font-black text-white tracking-tight">No Favourites Yet</h3>
                    <p className="text-zinc-500 font-medium text-[13px] max-w-[240px] leading-[1.6]">
                        Star the posts that inspire you the most, and they'll live forever right here.
                    </p>
                </div>
            ) : activeTab === 'Likes' ? (
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                    {/* Mobile: icon inside box */}
                    <div 
                        className="md:hidden w-16 h-16 rounded-2xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-center mb-3 cursor-pointer transition-all duration-300 hover:border-red-500/40 hover:bg-red-500/10 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsHeartClicked(true);
                            setTimeout(() => setIsHeartClicked(false), 800);
                        }}
                    >
                        <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className={`w-7 h-7 transition-all duration-500 ease-out ${isHeartClicked ? 'fill-red-500 text-red-500 scale-125 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'fill-transparent text-zinc-500'}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                    </div>
                    {/* Desktop: large standalone icon, no box */}
                    <div
                        className="hidden md:flex items-center justify-center mb-4 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsHeartClicked(true);
                            setTimeout(() => setIsHeartClicked(false), 800);
                        }}
                    >
                        <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className={`w-16 h-16 transition-all duration-500 ease-out ${isHeartClicked ? 'fill-red-500 text-red-500 scale-110 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'fill-transparent text-zinc-700 hover:text-zinc-500'}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                    </div>
                    <h3 className="text-[17px] font-black text-white tracking-tight">Show Some Love</h3>
                    <p className="text-zinc-500 font-medium text-[13px] max-w-[240px] leading-[1.6]">
                        When you like someone's post, it will be saved beautifully in this collection.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                    {/* Mobile: only this icon button navigates. Desktop: whole box does via overlay above */}
                    <div
                        onClick={() => navigate('/create', { state: { type: 'photo' } })}
                        className="w-16 h-16 rounded-2xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-center mb-3 cursor-pointer transition-all duration-300 hover:scale-105 hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] relative z-20"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-7 h-7 text-zinc-500 group-hover/empty:text-indigo-400 transition-colors">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </div>
                    <h3 className="text-[17px] font-black text-white tracking-tight">Your Canvas Awaits</h3>
                    <p className="text-zinc-500 font-medium text-[13px] max-w-[240px] leading-[1.6]">
                        Capture your world and share your first masterpiece with your community.
                    </p>
                </div>
            )}
        </div>
    );
};
