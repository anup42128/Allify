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
    try { 
        // DO NOT save optimistic drafts or empty conversations to localStorage. 
        // This ensures they persist during in-app navigation but vanish on hard refresh/reopen.
        const realAndNonEmpty = c.filter(conv => {
            if (conv.id.startsWith('optimistic_')) return false;
            if (!conv.last_message || conv.last_message.trim() === '' || conv.last_message === '🚫 This message was unsent.') return false;
            return true;
        });
        localStorage.setItem(CACHE_KEY(userId), JSON.stringify(realAndNonEmpty)); 
    } catch {}
};

// ─── Global State Variables ────────────────────────────────────────────────────────
export let activeSyncUserId: string | null = null;
export let cachedForUserId = _currentSessionUserId;  // exposed and mutable so components can validate stale cache
export let cachedConversations: Conversation[] | null = _currentSessionUserId ? loadCache(_currentSessionUserId) : null;
export const cachedMessages = new Map<string, Message[]>();

// ATOMIC BADGE TRACKING SYSTEM
// Instead of +1/-1 math which causes race conditions, we track EXACT unread message IDs.
export const unreadMessageIdsByConv = new Map<string, Set<string>>();
export const globallyDeletedMessageIds = new Set<string>();

export const clearUnreadMessageIdsForConversation = (convId: string) => {
    if (unreadMessageIdsByConv.has(convId)) {
        unreadMessageIdsByConv.get(convId)!.clear();
    }
};

export let currentlyViewingConvId: string | null = null;
export let currentlyViewingUserId: string | null = null;

export const setCurrentlyViewingConvId = (id: string | null) => {
    currentlyViewingConvId = id;
};
export const setCurrentlyViewingUserId = (id: string | null) => {
    currentlyViewingUserId = id;
};

// Track conversations marked read locally to prevent slow DB fetches from reverting them
export const optimisticallyReadConvs = new Map<string, number>();

export const markConversationAsReadOptimistically = (convId: string) => {
    optimisticallyReadConvs.set(convId, Date.now());
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

export const upgradeOptimisticConversation = (oldId: string, newId: string) => {
    if (cachedConversations) {
        const updatedConvs = cachedConversations.map(c => 
            c.id === oldId ? { ...c, id: newId } : c
        );
        updateCachedConversationsSilently(updatedConvs);
    }
    
    if (cachedMessages.has(oldId)) {
        const msgs = cachedMessages.get(oldId)!;
        cachedMessages.set(newId, msgs.map(m => ({ ...m, conversation_id: newId })));
        cachedMessages.delete(oldId);
    }
    
    if (currentlyViewingConvId === oldId) {
        currentlyViewingConvId = newId;
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

        const existingOptimistic = cachedConversations?.filter(c => c.id.startsWith('optimistic_')) || [];
        const existingEmptyReal = cachedConversations?.filter(c => 
            !c.id.startsWith('optimistic_') && (!c.last_message || c.last_message.trim() === '' || c.last_message === '🚫 This message was unsent.')
        ) || [];

        if (!participantRows || participantRows.length === 0) {
            setCachedConversations([...existingOptimistic, ...existingEmptyReal], userId);
            return;
        }

        const convIds = participantRows.map(r => r.conversation_id);

        const { data: convData } = await supabase
            .from('conversations')
            .select('id, last_message, last_message_time, initiated_by')
            .in('id', convIds)
            .order('last_message_time', { ascending: false, nullsFirst: false });

        if (!convData || convData.length === 0) {
            setCachedConversations([...existingOptimistic, ...existingEmptyReal], userId);
            return;
        }

        const { data: unreadData } = await supabase
            .from('messages')
            .select('id, conversation_id')
            .eq('seen', false)
            .neq('sender_id', userId)
            .in('conversation_id', convIds);
        
        // We rebuild the unread exact IDs mapping from the DB fetch,
        // while perfectly respecting any messages that were DELETED via realtime BEFORE the DB caught up!
        const newUnreadMessageIds = new Map<string, Set<string>>();
        
        if (unreadData) {
            unreadData.forEach(row => {
                if (globallyDeletedMessageIds.has(row.id)) return; // Reject ghost messages from slow replicas
                
                if (!newUnreadMessageIds.has(row.conversation_id)) {
                    newUnreadMessageIds.set(row.conversation_id, new Set());
                }
                newUnreadMessageIds.get(row.conversation_id)!.add(row.id);
            });
        }
        
        // Atomically commit the updated Set to the global state
        unreadMessageIdsByConv.clear();
        for (const [k, v] of newUnreadMessageIds) {
            unreadMessageIdsByConv.set(k, v);
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

            // ATOMIC TRUE UNREAD COUNT
            // Based exactly on the specific message IDs we know are currently unread, ignoring any fast-deleted messages!
            let finalUnreadCount = unreadMessageIdsByConv.get(conv.id)?.size || 0;

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

        // Clean up empty conversations on refresh by only accepting non-empty ones from the DB fetch
        const finalConvs = [...seen.values()].filter(c =>
            (c.last_message && c.last_message.trim() !== '') && c.last_message !== '🚫 This message was unsent.'
        );

        // PRESERVE IN-MEMORY STATE: If the user initiated a chat or emptied a chat,
        // we must preserve it in the UI so it doesn't disappear during SPA navigation/background sync!
        // We look at our existing in-memory cache to find these special cases.
        for (const optConv of existingOptimistic) {
            if (!finalConvs.some(realConv => realConv.other_user.id === optConv.other_user.id)) {
                finalConvs.push(optConv);
            }
        }

        // Also preserve empty real chats that are currently active in the user's session
        for (const emptyConv of existingEmptyReal) {
            if (!finalConvs.some(realConv => realConv.id === emptyConv.id)) {
                finalConvs.push(emptyConv);
            }
        }

        finalConvs.sort((a,b) => new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime());
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
            
            if (globallyDeletedMessageIds.has(newMsg.id)) return;

            // Globally cache the actual message so it's instantly available if the user opens the chat!
            if (cachedMessages.has(newMsg.conversation_id)) {
                const existingMsgs = cachedMessages.get(newMsg.conversation_id)!;
                if (!existingMsgs.some(m => m.id === newMsg.id)) {
                    cachedMessages.set(newMsg.conversation_id, [...existingMsgs, newMsg]);
                }
            } else {
                cachedMessages.set(newMsg.conversation_id, [newMsg]);
            }

            const isCurrentlyViewing = (currentlyViewingConvId === newMsg.conversation_id || currentlyViewingUserId === newMsg.sender_id) && document.visibilityState === 'visible';
            const isUnread = newMsg.sender_id !== userId && !isCurrentlyViewing;

            if (isUnread) {
                if (!unreadMessageIdsByConv.has(newMsg.conversation_id)) {
                    unreadMessageIdsByConv.set(newMsg.conversation_id, new Set());
                }
                unreadMessageIdsByConv.get(newMsg.conversation_id)!.add(newMsg.id);
            }

            const newUnreadCount = isCurrentlyViewing ? 0 : (unreadMessageIdsByConv.get(newMsg.conversation_id)?.size || 0);

            if (cachedConversations) {
                const updated = cachedConversations.map(c => {
                    if (c.id === newMsg.conversation_id) {
                        foundInCache = true;
                        
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
                // HARD CONSTRAINT: Never create a chat card if the sender is the current user!
                // If I sent the first message, my client handles the routing. We must not create a ghost self-chat card.
                if (newMsg.sender_id === userId) {
                    return; // Ignore - do not create a self-chat card
                }


                
                // Fix Issue 1: Fetch ONLY the sender's profile to instantly build the chat card without a massive global fetch
                (async () => {
                    try {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('id, username, full_name, avatar_url, last_seen')
                            .eq('id', newMsg.sender_id)
                            .single();
                            
                        if (profile && cachedConversations) {
                            // ATOMIC BADGE COUNT: use exact count from atomic memory Set
                            const finalCountToInject = unreadMessageIdsByConv.get(newMsg.conversation_id)?.size || 0;

                            // CLIENT-SIDE DEDUPLICATION PRE-CHECK
                            // Even if this specific conversation_id is new to the cache, we MUST verify
                            // that we don't already have a conversation with this exact sender.
                            const existingConvWithSender = cachedConversations.find(c => c.other_user?.id === newMsg.sender_id);

                            if (!existingConvWithSender && !cachedConversations.some(c => c.id === newMsg.conversation_id)) {
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
                            } else if (existingConvWithSender || cachedConversations.some(c => c.id === newMsg.conversation_id)) {
                                const updated = cachedConversations.map(c => {
                                    if (c.id === newMsg.conversation_id || c.other_user?.id === newMsg.sender_id) {
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
                // 1. Update cachedMessages if it exists in memory
                if (cachedMessages.has(newMsg.conversation_id)) {
                    const msgs = cachedMessages.get(newMsg.conversation_id)!;
                    const updatedMsgs = msgs.map(m => m.id === newMsg.id ? { ...m, ...newMsg } as Message : m);
                    cachedMessages.set(newMsg.conversation_id, updatedMsgs);
                }
                
                // 2. Determine the last valid message for the preview
                let lastValidMsgContent: string | null = '🚫 This message was unsent.';
                let lastValidMsgTime = newMsg.created_at || new Date().toISOString();
                
                if (cachedMessages.has(newMsg.conversation_id)) {
                    const msgs = cachedMessages.get(newMsg.conversation_id)!;
                    const lastValidMsg = [...msgs].reverse().find(m => m.content !== '🚫 This message was unsent.');
                    if (lastValidMsg) {
                        lastValidMsgContent = lastValidMsg.content || '🎤 Voice message';
                        lastValidMsgTime = lastValidMsg.created_at;
                    } else {
                        // If there are no valid messages left, clear it out so the UI shows "Say hello!"
                        lastValidMsgContent = '';
                    }
                }
                // ATOMIC BADGE SYNC: Instantly delete this specific message ID from the unread set
                globallyDeletedMessageIds.add(newMsg.id);
                if (unreadMessageIdsByConv.has(newMsg.conversation_id)) {
                    unreadMessageIdsByConv.get(newMsg.conversation_id)!.delete(newMsg.id);
                }
                const newUnreadCount = unreadMessageIdsByConv.get(newMsg.conversation_id)?.size || 0;

                // 3. Update global cachedConversations IMMEDIATELY, using exact badge size!
                if (cachedConversations) {
                    const updatedConvs = cachedConversations.map(c => {
                        if (c.id === newMsg.conversation_id) {
                            return {
                                ...c,
                                unread_count: newUnreadCount,
                                last_message: lastValidMsgContent,
                                last_message_time: lastValidMsgTime
                            };
                        }
                        return c;
                    });
                    
                    // Real-time Chat Card Removal: Instantly drop the conversation if all messages are gone and the current user didn't initiate it.
                    const filteredConvs = updatedConvs.filter(c => {
                        if (c.id === newMsg.conversation_id) {
                            const hasValidMessages = cachedMessages.get(newMsg.conversation_id)?.some(m => m.content !== '🚫 This message was unsent.') || false;
                            // If the chat has no valid messages, we delete it IF we didn't send the deleted message.
                            // This ensures the sender keeps their empty chat card, but the receiver's ghost card vanishes instantly.
                            if (!hasValidMessages && newMsg.sender_id !== userId) {
                                return false; // Instantly remove the ghost card!
                            }
                        }
                        return true;
                    });

                    filteredConvs.sort((a,b) => new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime());
                    setCachedConversations(filteredConvs);
                } else {
                    scheduleFallbackFetch(userId);
                }
            } else {
                // ATOMIC BADGE SYNC: If a message we received was just marked as 'seen: true', remove it from the unread set!
                if (newMsg && newMsg.seen && newMsg.sender_id !== userId) {
                    if (unreadMessageIdsByConv.has(newMsg.conversation_id)) {
                        unreadMessageIdsByConv.get(newMsg.conversation_id)!.delete(newMsg.id);
                    }
                    
                    if (cachedConversations) {
                        const newUnreadCount = unreadMessageIdsByConv.get(newMsg.conversation_id)?.size || 0;
                        const updatedConvs = cachedConversations.map(c => 
                            c.id === newMsg.conversation_id ? { ...c, unread_count: newUnreadCount } : c
                        );
                        setCachedConversations(updatedConvs);
                    }
                }

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
                    
                    // ATOMIC BADGE SYNC: Instantly delete this specific message ID from the unread set
                    globallyDeletedMessageIds.add(deletedId);
                    if (unreadMessageIdsByConv.has(convId)) {
                        unreadMessageIdsByConv.get(convId)!.delete(deletedId);
                    }
                    const newUnreadCount = unreadMessageIdsByConv.get(convId)?.size || 0;
                    
                    const updatedMsgs = msgs.filter(m => m.id !== deletedId);
                    cachedMessages.set(convId, updatedMsgs);
                    
                    const lastValidMsg = [...updatedMsgs].reverse().find(m => m.content !== '🚫 This message was unsent.');
                    
                    if (cachedConversations) {
                        const updatedConvs = cachedConversations.map(c => {
                            if (c.id === convId) {
                                return {
                                    ...c,
                                    unread_count: newUnreadCount,
                                    last_message: lastValidMsg ? (lastValidMsg.content || '🎤 Voice message') : 'Conversation started',
                                    last_message_time: lastValidMsg ? lastValidMsg.created_at : c.last_message_time
                                };
                            }
                            return c;
                        });

                        // Real-time Chat Card Removal: Instantly drop the conversation if all messages are gone and the current user didn't initiate it.
                        const filteredConvs = updatedConvs.filter(c => {
                            if (c.id === convId) {
                                const hasValidMessages = updatedMsgs.some(m => m.content !== '🚫 This message was unsent.');
                                if (!hasValidMessages && c.initiated_by !== userId) {
                                    return false; // Instantly remove the ghost card!
                                }
                            }
                            return true;
                        });

                        filteredConvs.sort((a,b) => new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime());
                        setCachedConversations(filteredConvs);
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
