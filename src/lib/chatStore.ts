import type { Conversation, Message } from '../types/chat';
import { supabase } from './supabase';

// ─── Global State Variables ────────────────────────────────────────────────────────
// These variables live in memory outside the React lifecycle, ensuring that 
// even when "MessagesPage" is unmounted, they retain the latest data instantly.
export let cachedConversations: Conversation[] | null = null;
export const cachedMessages = new Map<string, Message[]>();

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

export const setCachedConversations = (c: Conversation[]) => {
    cachedConversations = c;
    notifyChatUpdates();
};

export const updateCachedConversationsSilently = (c: Conversation[]) => {
    cachedConversations = c;
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
            setCachedConversations([]);
            return;
        }

        const convIds = participantRows.map(r => r.conversation_id);

        const { data: convData } = await supabase
            .from('conversations')
            .select('*')
            .in('id', convIds)
            .order('last_message_time', { ascending: false, nullsFirst: false });

        if (!convData || convData.length === 0) {
            setCachedConversations([]);
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

            enriched.push({
                id: conv.id,
                last_message: conv.last_message,
                last_message_time: conv.last_message_time,
                other_user: otherProfile as any,
                unread_count: unreadMap.get(conv.id) || 0,
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

        const finalConvs = [...seen.values()];
        setCachedConversations(finalConvs);
    } catch (e) {
        console.error('Error in global fetch:', e);
    }
};

// ─── Global Background Sync Engine ───────────────────────────────────────────────
let isGlobalSyncActive = false;

// Mounted explicitly in MainLayout.tsx to run silently across ALL application routes
export const initGlobalChatSync = (userId: string) => {
    if (isGlobalSyncActive) return;
    isGlobalSyncActive = true;

    // Initial Fetch
    fetchGlobalConversations(userId);

    // Any incoming message triggers an exact cache rebuild silently
    // We strictly apply Optimistic UI updates first to eliminate all navigation-based loading lag!
    supabase
        .channel(`global-sync-msg-${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            const newMsg = payload.new;
            
            // ─── OPTIMISTIC INSTANT CACHE UPDATE ───
            let foundInCache = false;
            if (cachedConversations) {
                const updated = cachedConversations.map(c => {
                    if (c.id === newMsg.conversation_id) {
                        foundInCache = true;
                        const incomingUnread = newMsg.sender_id !== userId ? 1 : 0;
                        return {
                            ...c,
                            unread_count: c.unread_count + incomingUnread,
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

            // Only perform the formal API sync if this is a brand new invisible conversation
            if (!foundInCache) {
                setTimeout(() => fetchGlobalConversations(userId), 500); // Pad for PgBouncer replicas
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
            fetchGlobalConversations(userId);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, () => {
            fetchGlobalConversations(userId);
        })
        .subscribe();
    
    supabase
        .channel(`global-sync-conv-${userId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => {
            fetchGlobalConversations(userId);
        })
        .subscribe();
};
