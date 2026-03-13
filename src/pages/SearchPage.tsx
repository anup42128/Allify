import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { SearchProfileView } from '../features/profile/components/SearchProfileView';

export const SearchPage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const timeoutId = setTimeout(async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, username, full_name, avatar_url')
                    .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
                    .limit(20);

                if (error) throw error;
                setSearchResults(data || []);
            } catch (err) {
                console.error('Error searching users:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);
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
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-4 py-2 bg-zinc-800 text-white rounded-lg focus:outline-none focus:bg-zinc-700 transition-colors placeholder-zinc-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pt-4 border-t border-zinc-800/50 mt-2">
                    {searchQuery.trim() === '' ? (
                        <div className="px-2">
                            <p className="text-zinc-500 text-sm font-semibold mb-3">Recent</p>
                            <p className="text-zinc-600 text-sm italic">No recent searches.</p>
                        </div>
                    ) : isSearching ? (
                        <div className="flex justify-center py-4">
                            <svg className="animate-spin h-6 w-6 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    ) : searchResults.length > 0 ? (
                        <div className="flex flex-col gap-1">
                            {searchResults.map((user) => (
                                <div 
                                    key={user.id} 
                                    onClick={() => setSelectedUser(user)}
                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedUser?.id === user.id ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'}`}
                                >
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-white font-semibold text-sm truncate">{user.username}</span>
                                        {user.full_name && (
                                            <span className="text-zinc-500 text-sm truncate">{user.full_name}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="px-2 py-4">
                            <p className="text-zinc-500 text-sm text-center">No results found.</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Right Main Content Area */}
            {selectedUser ? (
                <SearchProfileView 
                    username={selectedUser.username} 
                    onBack={() => setSelectedUser(null)} 
                />
            ) : (
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
            )}

        </div>
    );
};
