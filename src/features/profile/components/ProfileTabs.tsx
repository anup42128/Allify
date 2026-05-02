import React from 'react';

type TabType = 'Photos' | 'Videos' | 'Favourites' | 'Likes';

const getTabIcon = (tab: TabType, isActive: boolean): React.ReactNode => {
    switch (tab) {
        case 'Photos':
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
        case 'Videos':
            return isActive ? (
                <svg viewBox="0 0 24 24" className="w-[25px] h-[25px]">
                    <defs>
                        <mask id="diamond-cutout">
                            <rect x="0" y="0" width="24" height="24" fill="white" />
                            <polygon points="10 9 15 12 10 15 10 9" fill="black" stroke="black" strokeWidth="1.5" strokeLinejoin="round" />
                        </mask>
                    </defs>
                    <rect x="4" y="4" width="16" height="16" rx="4.5" transform="rotate(45 12 12)" fill="currentColor" mask="url(#diamond-cutout)" />
                </svg>
            ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-[25px] h-[25px]">
                    <rect x="4" y="4" width="16" height="16" rx="4.5" transform="rotate(45 12 12)" />
                    <polygon points="10 9 15 12 10 15 10 9" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
            );
        case 'Favourites':
            return isActive ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-[25px] h-[25px] text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[25px] h-[25px]">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
            );
        case 'Likes':
            return isActive ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-[25px] h-[25px] text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
            ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[25px] h-[25px]">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
            );
    }
};

interface ProfileTabsProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
}

export const ProfileTabs = ({ activeTab, setActiveTab }: ProfileTabsProps) => {
    const tabs: TabType[] = ['Photos', 'Videos', 'Favourites', 'Likes'];

    return (
        <div className="relative flex border-b border-zinc-800/60 md:border-none mb-0.5 mt-2">
            {/* Desktop: pill-style tabs */}
            <div className="hidden md:flex justify-center mb-8 -mt-5 bg-zinc-900/30 p-1 rounded-full w-fit mx-auto border border-zinc-800/50">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-8 py-2 rounded-full text-xs font-bold tracking-widest transition-all ${activeTab === tab ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Mobile: Premium icon tabs */}
            <div className="flex w-full md:hidden">
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
        </div>
    );
};
