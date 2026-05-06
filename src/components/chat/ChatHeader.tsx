import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnlineStatus, useLastSeen, firePresencePing } from '../../lib/presenceStore';
import { Avatar } from './Avatar';
import type { Participant } from '../../types/chat';

const formatLastSeen = (iso: string | null | undefined): string => {
    if (!iso) return 'Offline';
    const d = new Date(iso);
    const now = new Date();
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) return `was online at ${timeStr}`;
    if (isYesterday) return `was online yesterday at ${timeStr}`;
    return `was online ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${timeStr}`;
};

export const ChatHeader = ({ user, onBack }: { user: Partial<Participant>, onBack?: () => void }) => {
    const isOnline = useOnlineStatus(user?.id);
    // Reads last_seen timestamp delivered via broadcast — no DB query
    const broadcastLastSeen = useLastSeen(user?.id);
    // Fall back to the value baked into the user object from chatStore cache
    const lastSeen = broadcastLastSeen ?? (user as any)?.last_seen ?? null;

    // Fire a fresh ping the moment this header mounts (i.e. when a chat is opened)
    // so online status resolves instantly rather than waiting for the 15s heartbeat
    useEffect(() => {
        firePresencePing();
    }, [user?.id]);

    return (
        <div className="flex items-center gap-2 md:gap-3 px-2 md:px-5 py-2.5 md:py-4 border-b border-zinc-800/60 flex-shrink-0 bg-black/80 backdrop-blur-md">
            {onBack && (
                <button
                    onClick={onBack}
                    className="md:hidden w-8 h-8 md:w-10 md:h-10 -ml-1 rounded-full flex items-center justify-center hover:bg-zinc-800/80 transition-colors text-white"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 md:w-6 md:h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            )}
            <div className="flex-shrink-0">
                <Avatar user={user} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-[13px] md:text-sm truncate">@{user.username}</p>
                <AnimatePresence mode="wait">
                    {isOnline ? (
                        <motion.p
                            key="online"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2 }}
                            className="text-green-400 text-[11px] md:text-[13px] font-semibold flex items-center gap-1.5"
                        >
                            is online
                        </motion.p>
                    ) : (
                        <motion.p
                            key="offline"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2 }}
                            className="text-zinc-500 text-[11px] md:text-[14px]"
                        >
                            {formatLastSeen(lastSeen)}
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>
            {onBack && (
                <button
                    onClick={onBack}
                    title="Close chat"
                    className="hidden md:flex w-9 h-9 rounded-full items-center justify-center hover:bg-zinc-800/80 transition-colors text-zinc-400 hover:text-white ml-2"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
};
