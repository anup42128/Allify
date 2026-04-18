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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-20 px-4 md:px-0">
                {filteredPosts.map((post) => (
                    <div
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className="relative aspect-square bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-900 group/post hover:border-zinc-700 transition-colors cursor-pointer"
                    >
                        <div id={`loader-${post.id}`} className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-20">
                            <div className="absolute inset-0 animate-pulse bg-zinc-800/50" />
                            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin relative z-30" />
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
            onClick={() => activeTab === 'Photos' ? navigate('/create', { state: { type: 'photo' } }) : null}
            className={`flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-800/50 rounded-[2.5rem] bg-zinc-900/20 group/empty transition-all ${activeTab === 'Photos' ? 'hover:bg-zinc-900/30 cursor-pointer' : 'cursor-default'}`}
        >
            {activeTab === 'Videos' ? (
                <div className="flex flex-col items-center justify-center gap-4 text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-500/10 to-orange-500/10 flex items-center justify-center border border-red-500/20 mb-2">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-red-500/80">
                            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Videos Coming Soon</h3>
                    <p className="text-zinc-500 font-medium text-sm max-w-[250px] leading-relaxed">
                        We're building an incredible new video experience! Sit tight, we'll be ready soon.
                    </p>
                </div>
            ) : activeTab === 'Favourites' ? (
                <div className="flex flex-col items-center justify-center gap-4 text-center px-4">
                    <div 
                        className="w-20 h-20 rounded-full border-2 border-zinc-700 flex items-center justify-center mb-2 cursor-pointer transition-colors duration-300 hover:border-zinc-500 hover:bg-zinc-800/50"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsStarClicked(true);
                            setTimeout(() => setIsStarClicked(false), 1000);
                        }}
                    >
                        <svg 
                            viewBox="0 0 24 24" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            className={`w-10 h-10 transition-all duration-700 ease-out ${isStarClicked ? 'fill-amber-400 text-amber-400 scale-125 -rotate-[180deg] drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'fill-transparent text-zinc-500'}`}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                    </div>
                    <p className="text-zinc-500 font-bold tracking-widest text-xs uppercase">
                        Favourite the moments that inspire you
                    </p>
                </div>
            ) : activeTab === 'Likes' ? (
                <div className="flex flex-col items-center justify-center gap-4 text-center px-4">
                    <div 
                        className="w-20 h-20 rounded-full border-2 border-zinc-700 flex items-center justify-center mb-2 cursor-pointer transition-colors duration-300 hover:border-zinc-500 hover:bg-zinc-800/50"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsHeartClicked(true);
                            setTimeout(() => setIsHeartClicked(false), 800);
                        }}
                    >
                        <svg 
                            viewBox="0 0 24 24" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            className={`w-10 h-10 transition-all duration-500 ease-out ${isHeartClicked ? 'fill-red-500 text-red-500 scale-125 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'fill-transparent text-zinc-500'}`}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                    </div>
                    <p className="text-zinc-500 font-bold tracking-widest text-xs uppercase">
                        Spread the love! Like posts to see them here
                    </p>
                </div>
            ) : (
                <>
                    <div className={`w-20 h-20 rounded-full border-2 border-zinc-700 flex items-center justify-center mb-6 transition-all duration-300 ${activeTab === 'Photos' ? 'group-hover/empty:scale-110 group-hover/empty:border-white group-hover/empty:bg-white/5' : ''}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10 text-zinc-500 group-hover/empty:text-white transition-colors">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </div>
                    <p className="text-zinc-500 font-bold tracking-widest text-xs uppercase group-hover/empty:text-zinc-300 transition-colors">
                        {activeTab === 'Photos' ? 'Capture and share your world! Post your first photo' : 'No content here yet'}
                    </p>
                </>
            )}
        </div>
    );
};
