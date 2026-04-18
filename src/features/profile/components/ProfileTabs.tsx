
type TabType = 'Photos' | 'Videos' | 'Favourites' | 'Likes';

interface ProfileTabsProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
}

export const ProfileTabs = ({ activeTab, setActiveTab }: ProfileTabsProps) => {
    return (
        <div className="flex justify-center mb-8 bg-zinc-900/30 p-1 rounded-full w-fit mx-auto border border-zinc-800/50">
            {(['Photos', 'Videos', 'Favourites', 'Likes'] as TabType[]).map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-8 py-2 rounded-full text-xs font-bold tracking-widest transition-all ${activeTab === tab ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    {tab}
                </button>
            ))}
        </div>
    );
};
