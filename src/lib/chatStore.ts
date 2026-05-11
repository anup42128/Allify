import type { Conversation, Message } from '../types/chat';
import { supabase } from './supabase';

// Synchronously read the current auth session userId from Supabase's localStorage entry
const _currentSessionUserId = (() => {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('auth-token')) {
                const val = JSON.parse(localStorage.getItem(key) || '{}');
                const uid = val?.user?.id;
                if (uid) return uid as string;
            }
        }
    } catch {}
    return '';
})();

const CACHE_KEY = (userId: string) => `allify_chat_cache_${userId}`;

const loadCache = (userId: string): Conversation[] | null => {
    try { 
        const data = localStorage.getItem(CACHE_KEY(userId));
        return data ? JSON.parse(data) : null;
    } catch { return null; }
};

const persistCache = (c: Conversation[], userId: string | null) => {
    if (!userId) return;
    try { localStorage.setItem(CACHE_KEY(userId), JSON.stringify(c)); } catch {}
};

// ─── Global State Variables ────────────────────────────────────────────────────────
export let activeSyncUserId: string | null = null;
export let cachedForUserId = _currentSessionUserId;  // exposed and mutable so components can validate stale cache
export let cachedConversations: Conversation[] | null = _currentSessionUserId ? loadCache(_currentSessionUserId) : null;
export const cachedMessages = new Map<string, Message[]>();
export let currentlyViewingConvId: string | null = null;
export const setCurrentlyViewingConvId = (id: string | null) => {
    currentlyViewingConvId = id;
};

// Track conversations marked read locally to prevent slow DB fetches from reverting them
export const optimisticallyReadConvs = new Map<string, number>();

export const markConversationAsReadOptimistically = (convId: string) => {
    optimisticallyReadConvs.set(convId, Date.now());
};

// Track conversations marked UNREAD via realtime to prevent slow DB fetches from erasing the badge
export const optimisticallyUnreadConvs = new Map<string, { time: number, count: number }>();

export const markConversationAsUnreadOptimistically = (convId: string, count: number) => {
    optimisticallyUnreadConvs.set(convId, { time: Date.now(), count });
};

let fallbackFetchTimeout: ReturnType<typeof setTimeout> | null = null;
const scheduleFallbackFetch = (userId: string) => {
    if (fallbackFetchTimeout) clearTimeout(fallbackFetchTimeout);
    fallbackFetchTimeout = setTimeout(() => fetchGlobalConversations(userId), 1500);
};

// A simple event emitter to re-render MessagesPage when background updates occur
type Listener = () => void;
const listeners = new Set<Listener>();

export const subscribeToChatUpdates = (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const notifyChatUpdates = () => {
    listeners.forEach(l => l());
};

export const setCachedConversations = (c: Conversation[], userId?: string) => {
    cachedConversations = c;
    const targetUserId = userId || activeSyncUserId || _currentSessionUserId;
    if (targetUserId) {
        cachedForUserId = targetUserId;
        persistCache(c, targetUserId);
    }
    notifyChatUpdates();
};

export const updateCachedConversationsSilently = (c: Conversation[], userId?: string) => {
    cachedConversations = c;
    const targetUserId = userId || activeSyncUserId || _currentSessionUserId;
    if (targetUserId) {
        cachedForUserId = targetUserId;
        persistCache(c, targetUserId);
    }
};

export const getCachedConversations = () => cachedConversations;

// ─── Centralized Database Fetcher ────────────────────────────────────────────────
// Fetches the latest conversations and unread markers, mutating the cache
export const fetchGlobalConversations = async (userId: string) => {
    try {
        const { data: participantRows } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', userId);

        if (!participantRows || participantRows.length === 0) {
            setCachedConversations([], userId);
            return;
        }

        const convIds = participantRows.map(r => r.conversation_id);

        const { data: convData } = await supabase
            .from('conversations')
            .select('id, last_message, last_message_time, initiated_by')
            .in('id', convIds)
            .order('last_message_time', { ascending: false, nullsFirst: false });

        if (!convData || convData.length === 0) {
            setCachedConversations([], userId);
            return;
        }

        const { data: unreadData } = await supabase
            .from('messages')
            .select('conversation_id')
            .eq('seen', false)
            .neq('sender_id', userId)
            .in('conversation_id', convIds);
        
        const unreadMap = new Map<string, number>();
        if (unreadData) {
            unreadData.forEach(row => {
                unreadMap.set(row.conversation_id, (unreadMap.get(row.conversation_id) || 0) + 1);
            });
        }

        const enriched: Conversation[] = [];
        for (const conv of convData) {
            const { data: allParticipants } = await supabase
                .from('conversation_participants')
                .select('user_id')
                .eq('conversation_id', conv.id);

            const otherUserId = allParticipants?.find(p => p.user_id !== userId)?.user_id;
            if (!otherUserId) continue;

            const { data: otherProfile } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url, last_seen')
                .eq('id', otherUserId)
                .single();

            if (!otherProfile) continue;

            // If we optimistically marked this conversation as unread via realtime, 
            // protect it from being erased by a stale DB read replica!
            let finalUnreadCount = unreadMap.get(conv.id) || 0;
            const optimisticUnread = optimisticallyUnreadConvs.get(conv.id);
            if (optimisticUnread && Date.now() - optimisticUnread.time < 15000) {
                if (Date.now() - optimisticUnread.time < 5000) {
                    // Lock is very fresh (< 5s). Unconditionally trust it!
                    // This prevents lagging read-replicas from corrupting the badge during rapid delete operations where the mathematical lock DECREASES.
                    finalUnreadCount = optimisticUnread.count;
                } else if (optimisticUnread.count > finalUnreadCount) {
                    // Lock is older (5s - 15s). Only trust it if it's GREATER than the DB.
                    // This protects against missed INSERT events, but allows the DB to correct any stuck locks.
                    finalUnreadCount = optimisticUnread.count;
                }
            }

            // If we optimistically marked this conversation as read within the last 15 seconds, 
            // ignore the database's stale unread count (prevents race conditions flashing the badge)
            const optimisticReadTime = optimisticallyReadConvs.get(conv.id);
            if (optimisticReadTime && Date.now() - optimisticReadTime < 15000) {
                finalUnreadCount = 0;
            }

            enriched.push({
                id: conv.id,
                last_message: conv.last_message,
                last_message_time: conv.last_message_time,
                other_user: otherProfile as any,
                unread_count: finalUnreadCount,
                initiated_by: conv.initiated_by ?? null,
            });
        }

        const seen = new Map<string, Conversation>();
        for (const c of enriched) {
            const existing = seen.get(c.other_user.id);
            if (!existing) {
                seen.set(c.other_user.id, c);
            } else {
                const existingTime = existing.last_message_time ? new Date(existing.last_message_time).getTime() : 0;
                const thisTime = c.last_message_time ? new Date(c.last_message_time).getTime() : 0;
                if (thisTime > existingTime) seen.set(c.other_user.id, c);
            }
        }

        // Show a conversation if it has at least one message, OR if the current user initiated it (cross-device sync via DB!)
        const finalConvs = [...seen.values()].filter(c =>
            (c.last_message && c.last_message.trim() !== '') || c.initiated_by === userId
        );
        setCachedConversations(finalConvs, userId);
    } catch (e) {
        console.error('Error in global fetch:', e);
    }
};

// ─── Global Background Sync Engine ───────────────────────────────────────────────
let activeChannels: any[] = [];

export const clearGlobalChatCache = () => {
    cachedConversations = null;
    cachedMessages.clear();
    activeChannels.forEach(ch => supabase.removeChannel(ch));
    activeChannels = [];
    activeSyncUserId = null;
    notifyChatUpdates();
};

// Mounted explicitly in MainLayout.tsx to run silently across ALL application routes
export const initGlobalChatSync = async (userId: string) => {
    if (activeSyncUserId === userId) return; // already syncing for this user

    if (activeSyncUserId && activeSyncUserId !== userId) {
        clearGlobalChatCache();
    }

    activeSyncUserId = userId;

    // Initial Fetch - Wait for this to complete before resolving
    await fetchGlobalConversations(userId);

    // Any incoming message triggers an exact cache rebuild silently
    // We strictly apply Optimistic UI updates first to eliminate all navigation-based loading lag!
    const msgChannel = supabase
        .channel(`global-sync-msg-${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            const newMsg = payload.new as Message;
            
            // ─── OPTIMISTIC INSTANT CACHE UPDATE ───
            let foundInCache = false;
            
            // Globally cache the actual message so it's instantly available if the user opens the chat!
            if (cachedMessages.has(newMsg.conversation_id)) {
                const existingMsgs = cachedMessages.get(newMsg.conversation_id)!;
                if (!existingMsgs.some(m => m.id === newMsg.id)) {
                    cachedMessages.set(newMsg.conversation_id, [...existingMsgs, newMsg]);
                }
            } else {
                cachedMessages.set(newMsg.conversation_id, [newMsg]);
            }

            if (cachedConversations) {
                const updated = cachedConversations.map(c => {
                    if (c.id === newMsg.conversation_id) {
                        foundInCache = true;
                        const isCurrentlyViewing = currentlyViewingConvId === newMsg.conversation_id && document.visibilityState === 'visible';
                        const incomingUnread = (newMsg.sender_id !== userId && !isCurrentlyViewing) ? 1 : 0;
                        const newUnreadCount = isCurrentlyViewing ? 0 : (c.unread_count + incomingUnread);
                        markConversationAsUnreadOptimistically(newMsg.conversation_id, newUnreadCount);
                        
                        return {
                            ...c,
                            unread_count: newUnreadCount,
                            last_message: newMsg.content,
                            last_message_time: newMsg.created_at || new Date().toISOString()
                        };
                    }
                    return c;
                });
                
                if (foundInCache) {
                    updated.sort((a,b) => new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime());
                    setCachedConversations(updated);
                }
            }

            // If it's a brand new conversation from an unknown sender, construct the chat card on the fly instantly!
            if (!foundInCache) {
                // Fix Issue 2: Aggregate rapid incoming messages into the unread lock
                const existingLock = optimisticallyUnreadConvs.get(newMsg.conversation_id);
                let currentLockCount = 0;
                if (existingLock && Date.now() - existingLock.time < 15000) {
                    currentLockCount = existingLock.count;
                }
                const isCurrentlyViewing = currentlyViewingConvId === newMsg.conversation_id && document.visibilityState === 'visible';
                const incomingUnread = (newMsg.sender_id !== userId && !isCurrentlyViewing) ? 1 : 0;
                const aggregatedUnread = isCurrentlyViewing ? 0 : (currentLockCount + incomingUnread);
                markConversationAsUnreadOptimistically(newMsg.conversation_id, aggregatedUnread);
                
                // Fix Issue 1: Fetch ONLY the sender's profile to instantly build the chat card without a massive global fetch
                (async () => {
                    try {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('id, username, full_name, avatar_url, last_seen')
                            .eq('id', newMsg.sender_id)
                            .single();
                            
                        if (profile && cachedConversations) {
                            // Read absolute latest lock to prevent out-of-order async overwrites
                            const latestLock = optimisticallyUnreadConvs.get(newMsg.conversation_id);
                            const finalCountToInject = latestLock ? latestLock.count : aggregatedUnread;

                            if (!cachedConversations.some(c => c.id === newMsg.conversation_id)) {
                                const newConv: Conversation = {
                                    id: newMsg.conversation_id,
                                    last_message: newMsg.content,
                                    last_message_time: newMsg.created_at || new Date().toISOString(),
                                    unread_count: finalCountToInject,
                                    initiated_by: newMsg.sender_id,
                                    other_user: profile as any
                                };
                                const updated = [...cachedConversations, newConv];
                                updated.sort((a,b) => new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime());
                                setCachedConversations(updated);
                            } else {
                                const updated = cachedConversations.map(c => {
                                    if (c.id === newMsg.conversation_id) {
                                        const isNewer = new Date(newMsg.created_at || 0) >= new Date(c.last_message_time || 0);
                                        return {
                                            ...c,
                                            unread_count: finalCountToInject,
                                            last_message: isNewer ? newMsg.content : c.last_message,
                                            last_message_time: isNewer ? (newMsg.created_at || new Date().toISOString()) : c.last_message_time
                                        };
                                    }
                                    return c;
                                });
                                updated.sort((a,b) => new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime());
                                setCachedConversations(updated);
                            }
                        } else {
                            scheduleFallbackFetch(userId);
                        }
                    } catch(e) {
                        scheduleFallbackFetch(userId);
                    }
                })();
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
            const newMsg = payload.new as Message;
            
            if (newMsg && newMsg.content === '🚫 This message was unsent.') {
                const wasUnread = !newMsg.seen && newMsg.sender_id !== userId;
                
                // 1. Update cachedMessages if it exists in memory
                if (cachedMessages.has(newMsg.conversation_id)) {
                    const msgs = cachedMessages.get(newMsg.conversation_id)!;
                    const updatedMsgs = msgs.map(m => m.id === newMsg.id ? { ...m, ...newMsg } as Message : m);
                    cachedMessages.set(newMsg.conversation_id, updatedMsgs);
                }
                
                // 2. Determine the last valid message for the preview
                let lastValidMsgContent = '🚫 This message was unsent.';
                let lastValidMsgTime = newMsg.created_at || new Date().toISOString();
                
                if (cachedMessages.has(newMsg.conversation_id)) {
                    const msgs = cachedMessages.get(newMsg.conversation_id)!;
                    const lastValidMsg = [...msgs].reverse().find(m => m.content !== '🚫 This message was unsent.');
                    if (lastValidMsg) {
                        lastValidMsgContent = lastValidMsg.content || '🎤 Voice message';
                        lastValidMsgTime = lastValidMsg.created_at;
                    }
                }
                
                // 3. Update global cachedConversations IMMEDIATELY, reducing badge if it was unread!
                if (cachedConversations) {
                    const updatedConvs = cachedConversations.map(c => {
                        if (c.id === newMsg.conversation_id) {
                            const newUnread = wasUnread ? Math.max(0, c.unread_count - 1) : c.unread_count;
                            markConversationAsUnreadOptimistically(newMsg.conversation_id, newUnread);
                            return {
                                ...c,
                                unread_count: newUnread,
                                last_message: lastValidMsgContent,
                                last_message_time: lastValidMsgTime
                            };
                        }
                        return c;
                    });
                    updatedConvs.sort((a,b) => new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime());
                    setCachedConversations(updatedConvs);
                } else {
                    scheduleFallbackFetch(userId);
                }
            } else {
                // Globally update the cached message so the UI doesn't require a refresh for read receipts
                if (newMsg && cachedMessages.has(newMsg.conversation_id)) {
                    const msgs = cachedMessages.get(newMsg.conversation_id)!;
                    cachedMessages.set(
                        newMsg.conversation_id,
                        msgs.map(m => m.id === newMsg.id ? { ...m, ...newMsg } as Message : m)
                    );
                    notifyChatUpdates();
                }
            }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
            const deletedId = payload.old.id;
            let foundConvId: string | null = null;
            
            // Search memory to find the conversation and update instantly without hitting a stale replica
            for (const [convId, msgs] of cachedMessages.entries()) {
                const targetMsg = msgs.find(m => m.id === deletedId);
                if (targetMsg) {
                    foundConvId = convId;
                    
                    // Prevent double-decrementing: The UPDATE payload already decrements the badge when changing content to 'unsent'.
                    // If the message is already marked as unsent in our cache, we should NOT decrement again on DELETE.
                    const isAlreadyUnsent = targetMsg.content === '🚫 This message was unsent.';
                    const wasUnread = !isAlreadyUnsent && !targetMsg.seen && targetMsg.sender_id !== userId;
                    
                    const updatedMsgs = msgs.filter(m => m.id !== deletedId);
                    cachedMessages.set(convId, updatedMsgs);
                    
                    const lastValidMsg = [...updatedMsgs].reverse().find(m => m.content !== '🚫 This message was unsent.');
                    
                    if (cachedConversations) {
                        const updatedConvs = cachedConversations.map(c => {
                            if (c.id === convId) {
                                const newUnread = wasUnread ? Math.max(0, c.unread_count - 1) : c.unread_count;
                                markConversationAsUnreadOptimistically(convId, newUnread);
                                return {
                                    ...c,
                                    unread_count: newUnread,
                                    last_message: lastValidMsg ? (lastValidMsg.content || '🎤 Voice message') : 'Conversation started',
                                    last_message_time: lastValidMsg ? lastValidMsg.created_at : c.last_message_time
                                };
                            }
                            return c;
                        });
                        updatedConvs.sort((a,b) => new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime());
                        setCachedConversations(updatedConvs);
                    }
                    break;
                }
            }
            
            if (!foundConvId) {
                scheduleFallbackFetch(userId);
            }
        })
        .subscribe();

    // Listen for new conversation_participants rows — this fires on ALL devices when a new
    // chat is created (even an empty one with no messages), giving us instant cross-device sync!
    const participantChannel = supabase
        .channel(`global-sync-participants-${userId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${userId}` },
            () => {
                // A new conversation was just added for this user — refetch immediately!
                setTimeout(() => fetchGlobalConversations(userId), 300);
            }
        )
        .subscribe();

    activeChannels.push(msgChannel, participantChannel);
};
