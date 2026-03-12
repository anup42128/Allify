import { motion } from 'framer-motion';

export const SearchPage = () => {
    return (
        <div className="flex h-full w-full bg-black overflow-hidden relative">
            
            {/* Sliding Sidebar Drawer */}
            <motion.div 
                initial={{ x: -375, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-[375px] flex-shrink-0 h-full border-r border-l border-zinc-800 bg-black flex flex-col z-10"
            >
                <div className="pt-8 pb-4 px-6">
                    <h1 className="text-white text-2xl font-bold mb-6">Search</h1>
                    
                    {/* Search Input Box */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-zinc-500 group-focus-within:text-zinc-300 transition-colors">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search"
                            readOnly // Inactive for now
                            className="block w-full pl-10 pr-4 py-2 bg-zinc-800 text-white rounded-lg focus:outline-none focus:bg-zinc-700 transition-colors placeholder-zinc-500 cursor-not-allowed"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pt-4 border-t border-zinc-800/50 mt-2">
                    <p className="text-zinc-500 text-sm font-semibold mb-3">Recent</p>
                    <p className="text-zinc-600 text-sm italic">No recent searches.</p>
                </div>
            </motion.div>

            {/* Right Main Content Area (Empty State) */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="flex-1 h-full flex flex-col items-center justify-center bg-black relative overflow-hidden"
            >
                <div className="flex flex-col items-center text-center max-w-sm px-6 relative z-10">
                    <div className="mb-8 p-6 rounded-full border border-zinc-800/50 bg-gradient-to-br from-zinc-900 to-black shadow-[0_0_40px_rgba(0,0,0,0.8)]">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-zinc-300">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                    </div>
                    
                    <h2 className="text-3xl font-bold mb-3 tracking-tight bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                        Discover Allify
                    </h2>
                    <p className="text-zinc-400 text-base leading-relaxed tracking-wide font-light">
                        Search for creators, explore tags, and find new inspiration from around the world.
                    </p>
                </div>
            </motion.div>

        </div>
    );
};
