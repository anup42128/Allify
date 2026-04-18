

export const NotificationRightPanel = () => {
    return (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-black relative overflow-hidden group">
            <div className="relative flex flex-col items-center text-center max-w-xl px-12 opacity-80 transition-opacity duration-1000 group-hover:opacity-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="w-40 h-40 text-zinc-700 mb-12">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.31 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
                <h2 className="text-xl font-light text-zinc-300 mb-6 tracking-[0.4em] uppercase">
                    Activity Stream
                </h2>
                <p className="text-sm md:text-base text-zinc-500 font-medium leading-relaxed max-w-sm mx-auto">
                    See what’s happening in your network.<br/>Likes, comments, new allies, and more — all in one spot.
                </p>
                <div className="w-[1px] h-20 bg-gradient-to-b from-zinc-800 to-transparent mt-16" />
            </div>
        </div>
    );
};
