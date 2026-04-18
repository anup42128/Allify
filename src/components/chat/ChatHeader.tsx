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

export const ChatHeader = ({ user }: { user: Partial<Participant> }) => {
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
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/60 flex-shrink-0 bg-black/80 backdrop-blur-md">
            <Avatar user={user} />
            <div>
                <p className="text-white font-bold text-sm">@{user.username}</p>
                <AnimatePresence mode="wait">
                    {isOnline ? (
                        <motion.p
                            key="online"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2 }}
                            className="text-green-400 text-[13px] font-semibold flex items-center gap-1.5"
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
                            className="text-zinc-500 text-[14px]"
                        >
                            {formatLastSeen(lastSeen)}
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
