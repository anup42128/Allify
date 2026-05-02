import { useNavigate } from 'react-router-dom';

export const SettingsPage = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-full bg-black relative w-full overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-zinc-900/50 px-4 md:px-6 py-4 md:py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="md:hidden w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-zinc-800/80 transition-colors text-white"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-black text-white tracking-tight">Settings</h1>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center flex-1 gap-4">
                <p className="text-zinc-500 text-lg font-medium">Coming Soon</p>
            </div>
        </div>
    );
};
