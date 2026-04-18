import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Avatar } from './Avatar';
import type { Participant, Conversation } from '../../types/chat';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'now';
    if (hours < 1) return `${mins}m`;
    if (days < 1) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ─── Component ─────────────────────────────────────────────────────────────────
interface ConversationSidebarProps {
    currentUser: Partial<Participant> | null;
    conversations: Conversation[];
    activeConvId: string | null;
    isLoadingConvs: boolean;
    onStartNewChat: (user: Participant) => Promise<void>;
    onSelectConversation: (conv: Conversation) => void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
    currentUser,
    conversations,
    activeConvId,
    isLoadingConvs,
    onStartNewChat,
    onSelectConversation,
}) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Participant[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpeningChat, setIsOpeningChat] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    return (
        <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-[440px] flex-shrink-0 h-full border-r border-zinc-800/60 flex flex-col bg-black"
        >
            {/* Header */}
            <div className="px-5 pt-8 pb-4">
                <div className="flex items-center justify-between mb-5">
                    <h1 className="text-white text-xl font-bold tracking-tight">Messages</h1>
                    <button
                        title={isSearchOpen ? 'Close' : 'New Message'}
                        onClick={() => {
                            setIsSearchOpen(v => !v);
                            setSearchQuery('');
                            setSearchResults([]);
                            setTimeout(() => searchInputRef.current?.focus(), 80);
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            isSearchOpen
                                ? 'bg-zinc-700 text-white rotate-45'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white'
                        }`}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 transition-transform">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </button>
                </div>

                {/* Animated search-to-message panel */}
                <AnimatePresence>
                    {isSearchOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="overflow-hidden mb-3"
                        >
                            {/* Search input */}
                            <div className="relative mb-2">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                </svg>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => {
                                        const q = e.target.value;
                                        setSearchQuery(q);
                                        if (!q.trim()) { setSearchResults([]); return; }
                                        setIsSearching(true);
                                        clearTimeout((window as any).__msgSearchTimer);
                                        (window as any).__msgSearchTimer = setTimeout(async () => {
                                            const { data } = await supabase
                                                .from('profiles')
                                                .select('id, username, full_name, avatar_url')
                                                .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
                                                .neq('id', currentUser?.id ?? '')
                                                .limit(8);
                                            setSearchResults((data as Participant[]) ?? []);
                                            setIsSearching(false);
                                        }, 300);
                                    }}
                                    placeholder="Search people…"
                                    className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-700/60 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                                />
                                {isSearching && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>

                            {/* Search results */}
                            <AnimatePresence>
                                {searchResults.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden"
                                    >
                                        {searchResults.map((user, idx) => (
                                            <button
                                                key={user.id}
                                                onClick={async () => {
                                                    setIsOpeningChat(user.id);
                                                    try {
                                                        await onStartNewChat(user);
                                                        setIsSearchOpen(false);
                                                        setSearchQuery('');
                                                        setSearchResults([]);
                                                    } finally {
                                                        setIsOpeningChat(null);
                                                    }
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/80 transition-colors text-left ${
                                                    idx < searchResults.length - 1 ? 'border-b border-zinc-800/60' : ''
                                                }`}
                                            >
                                                <Avatar user={user} size="sm" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm font-semibold truncate">{user.full_name || user.username}</p>
                                                    <p className="text-zinc-500 text-xs truncate">@{user.username}</p>
                                                </div>
                                                {isOpeningChat === user.id ? (
                                                    <div className="w-4 h-4 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin flex-shrink-0" />
                                                ) : (
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-zinc-600 flex-shrink-0">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                                                    </svg>
                                                )}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                                {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-zinc-600 text-xs text-center py-3"
                                    >
                                        No users found for "{searchQuery}"
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Static search bar (shown when compose is closed) */}
                {!isSearchOpen && (
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search conversations"
                            className="w-full pl-9 pr-4 py-2 bg-zinc-900 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:bg-zinc-800 transition-colors"
                        />
                    </div>
                )}
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700">
                {isLoadingConvs ? (
                    <div className="flex flex-col gap-3 px-3 pt-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="w-11 h-11 rounded-full bg-zinc-800 flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-zinc-800 rounded-full w-2/3" />
                                    <div className="h-3 bg-zinc-800/60 rounded-full w-4/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full pb-16 text-center px-4">
                        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-zinc-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                            </svg>
                        </div>
                        <p className="text-zinc-400 text-sm font-semibold mb-1">No messages yet</p>
                        <p className="text-zinc-600 text-xs leading-relaxed">Find someone on the Search page and hit Message to start a conversation.</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {conversations.map((conv, idx) => (
                            <motion.button
                                key={conv.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                onClick={() => onSelectConversation(conv)}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left group ${activeConvId === conv.id ? 'bg-zinc-800/80' : 'hover:bg-zinc-900/70'}`}
                            >
                                <Avatar user={conv.other_user} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-white text-sm font-semibold truncate">{conv.other_user.full_name || conv.other_user.username}</span>
                                        {conv.last_message_time && (
                                            <span className="text-zinc-500 text-[11px] flex-shrink-0 ml-2">{formatTime(conv.last_message_time)}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className={`text-xs truncate pr-2 ${conv.unread_count > 0 ? 'text-white font-medium' : 'text-zinc-500'}`}>
                                            {conv.unread_count > 7 ? (
                                                <span className="text-blue-400 font-semibold">7+ New messages</span>
                                            ) : (
                                                conv.last_message || <span className="italic text-zinc-600">Say hello!</span>
                                            )}
                                        </p>
                                        {conv.unread_count > 0 && (
                                            <div className="min-w-[18px] h-[18px] px-1.5 flex flex-shrink-0 items-center justify-center bg-blue-500 text-white rounded-full text-[10px] font-bold shadow-md shadow-blue-500/20">
                                                {conv.unread_count > 7 ? '7+' : conv.unread_count}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </motion.div>
    );
};
