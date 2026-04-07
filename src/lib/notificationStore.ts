import { supabase } from './supabase';

export interface AppNotification {
    id: string;
    recipient_username: string;
    actor_username: string;
    type: 'like' | 'comment' | 'reply' | 'ally_follow' | 'allied' | 'thanks';
    entity_id: string;
    is_read: boolean;
    created_at: string;
}

// ─── Global State ────────────────────────────────────────────────────────

// Per-user cache key to prevent cross-user notification leakage
const CACHE_KEY = (userId: string) => `allify_notif_cache_${userId}`;
const BADGE_KEY = (userId: string) => `allify_badge_count_${userId}`;
const LAST_USER_KEY = 'allify_last_user_id';

const persistCache = (data: AppNotification[], userId: string) => {
    try { localStorage.setItem(CACHE_KEY(userId), JSON.stringify(data)); } catch {}
};
const loadCache = (userId: string): AppNotification[] => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY(userId)) || '[]'); } catch { return []; }
};
const persistBadge = (count: number, userId: string) => {
    try { localStorage.setItem(BADGE_KEY(userId), String(count)); } catch {}
};
const loadBadge = (userId: string): number => {
    try { return parseInt(localStorage.getItem(BADGE_KEY(userId)) || '0', 10); } catch { return 0; }
};

// Pre-seed from last known user's cache so hard refresh never shows blank
const _lastUserId = (() => { try { return localStorage.getItem(LAST_USER_KEY) || ''; } catch { return ''; } })();

// Synchronously read the current auth session userId from Supabase's localStorage entry
// This prevents cross-user leakage when a different user logs in on the same device
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

// Only pre-seed if the auth session matches our last-known user — never leak across users
const _canPreSeed = !!_lastUserId && !!_currentSessionUserId && _lastUserId === _currentSessionUserId;
export let cachedNotifications: AppNotification[] = _canPreSeed ? loadCache(_lastUserId) : [];
export let unreadNotificationCount: number = _canPreSeed ? loadBadge(_lastUserId) : 0;

type Listener = () => void;
const listeners = new Set<Listener>();

export const subscribeToNotifications = (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const notifyUpdates = () => {
    listeners.forEach(l => l());
};

// ─── Global Broadcast Ping for Ultra-Fast Realtime ───────────────────────────
export const broadcastNotificationPing = async (recipientUsername: string) => {
    // Send a lightweight ping over Supabase Broadcast to bypass Postgres lag
    supabase.channel('system_broadcasts').send({
        type: 'broadcast',
        event: 'notification_ping',
        payload: { recipient_username: recipientUsername }
    }).catch(() => {});
};

// ─── Global Background Sync Engine ───────────────────────────────────────────────
let activeSyncUsername: string | null = null;
let activeSyncUserId: string | null = null;

// ─── Exported Fetch Functions (callable from pages for on-demand refresh) ───
export const refreshNotifications = async () => {
    if (!activeSyncUsername || !activeSyncUserId) {
        throw new Error('not_ready');
    }
    const username = activeSyncUsername;
    const userId = activeSyncUserId;

    const [countResult, listResult] = await Promise.all([
        supabase.from('notifications').select('*', { count: 'exact', head: true })
            .eq('recipient_username', username).eq('is_read', false),
        supabase.from('notifications').select('*')
            .eq('recipient_username', username).order('created_at', { ascending: false }).limit(50)
    ]);

    if (countResult.count !== null) {
        unreadNotificationCount = countResult.count;
        persistBadge(unreadNotificationCount, userId);
    }
    if (listResult.data) {
        cachedNotifications = listResult.data as AppNotification[];
        persistCache(cachedNotifications, userId);
    }
    notifyUpdates();
};

export const initGlobalNotificationSync = async (userId: string) => {
    // 1. Resolve full username from ID
    const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

    if (!profile?.username) return;
    const username = profile.username;

    // Guard: only subscribe once per username
    if (activeSyncUsername === username) return;
    activeSyncUsername = username;
    activeSyncUserId = userId;

    // Save this userId as the last known user for instant pre-seeding on next refresh
    try { localStorage.setItem(LAST_USER_KEY, userId); } catch {}

    // If the pre-seeded cache was for a different user, clear it now and re-seed
    if (_lastUserId && _lastUserId !== userId) {
        cachedNotifications = [];
        unreadNotificationCount = 0;
        notifyUpdates();
    } else if (cachedNotifications.length > 0) {
        // Cache already pre-seeded correctly — just notify so components update
        notifyUpdates();
    }

        // 2 & 3. Initial fetch — reuse the exported refreshNotifications
        await refreshNotifications();

        // 4. Supabase Realtime Bindings
        supabase
            .channel(`global-notifications-${userId}`)
            .on(
                'postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, 
                (payload) => {
                    const newNotif = payload.new as AppNotification;
                    cachedNotifications = [newNotif, ...cachedNotifications];
                    persistCache(cachedNotifications, userId);
                    if (!newNotif.is_read) {
                        unreadNotificationCount++;
                    }
                    notifyUpdates();
                }
            )
            .on(
                'postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, 
                (payload) => {
                    const updated = payload.new as AppNotification;
                    const old = payload.old as AppNotification;
                    
                    cachedNotifications = cachedNotifications.map(n => n.id === updated.id ? updated : n);
                    persistCache(cachedNotifications, userId);
                    if (old.is_read === false && updated.is_read === true) {
                        unreadNotificationCount = Math.max(0, unreadNotificationCount - 1);
                    }
                    notifyUpdates();
                }
            )
            .on(
                'postgres_changes', 
                { event: 'DELETE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, 
                () => {
                    // Always re-fetch exactly on delete to prevent state drift
                    refreshNotifications();
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[NotificationStore] Postgres channel connected ✅');
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error('[NotificationStore] Postgres channel failed:', status);
                    activeSyncUsername = null; // Allow retry
                }
            });

        // 5. High-Speed Broadcast Bindings (Bypasses RLS Replication Lag)
        supabase
            .channel('system_broadcasts')
            .on(
                'broadcast',
                { event: 'notification_ping' },
                (payload) => {
                    if (payload.payload?.recipient_username === username) {
                        console.log('[NotificationStore] Received ultra-fast P2P ping!');
                        refreshNotifications();
                    }
                }
            )
            .subscribe();
};

export const markNotificationAsRead = async (notificationId: string) => {
    // Optimistic UI update
    unreadNotificationCount = Math.max(0, unreadNotificationCount - 1);
    cachedNotifications = cachedNotifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
    );
    persistCache(cachedNotifications, activeSyncUserId ?? 'anon');
    notifyUpdates();

    // Background DB update
    await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
};

export const markAllNotificationsAsRead = async (username: string) => {
    unreadNotificationCount = 0;
    cachedNotifications = cachedNotifications.map(n => ({ ...n, is_read: true }));
    persistCache(cachedNotifications, activeSyncUserId ?? 'anon');
    notifyUpdates();

    await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_username', username)
        .eq('is_read', false);
};
