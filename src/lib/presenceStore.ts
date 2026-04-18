import { supabase } from './supabase';
import { useState, useEffect } from 'react';

// ──────────────────────────────────────────────────────────────────────────────
// Global state — lives outside React for zero-overhead cross-component sharing
// ──────────────────────────────────────────────────────────────────────────────
const onlineUsers = new Set<string>();
const lastSeenTimes = new Map<string, number>();   // heartbeat timestamps (ms)
const lastSeenDb = new Map<string, string>();       // ISO strings from broadcasts

type Listener = () => void;
const listeners = new Set<Listener>();

let isPresenceActive = false;
let globalChannel: any = null;
let currentUserId: string | null = null;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Synchronous peek — read current online state without a React hook */
export const onlineUsers_peek = (userId: string): boolean => onlineUsers.has(userId);

/** Synchronous read of the last-seen ISO string received via broadcast */
export const getLastSeen = (userId: string): string | null => lastSeenDb.get(userId) ?? null;

/** Fire an immediate presence ping — call this when opening a conversation to get instant online status */
export const firePresencePing = () => {
    if (!globalChannel || !currentUserId) return;
    // Re-announce ourselves first, then ask others to respond
    globalChannel.send({ type: 'broadcast', event: 'pong', payload: { id: currentUserId } });
    globalChannel.send({ type: 'broadcast', event: 'ping', payload: {} });
    // Fire a second ping after a slight delay for slow mobile connections
    setTimeout(() => globalChannel?.send({ type: 'broadcast', event: 'ping', payload: {} }), 1200);
};

// ──────────────────────────────────────────────────────────────────────────────
// Engine
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Initializes the global presence synchronization via Instant Broadcast.
 * Should be called once upon user login (e.g., in MainLayout).
 * Safe to call multiple times — will cleanly tear down and re-initialize.
 */
export const initGlobalPresenceSync = (userId: string) => {
    // Guard: skip if already active for the SAME user (normal navigation).
    // But always re-initialize if the user changed (account switch).
    if (isPresenceActive && currentUserId === userId) return;

    // Tear down any stale channel before re-subscribing.
    if (globalChannel) {
        supabase.removeChannel(globalChannel);
        globalChannel = null;
    }

    isPresenceActive = true;
    currentUserId = userId;

    globalChannel = supabase.channel('global:status');

    globalChannel
        .on('broadcast', { event: 'ping' }, () => {
            // If we are artificially offline (hidden), ignore the ping so we don't resurrect ourselves!
            if (document.visibilityState === 'hidden') return;
            
            // Otherwise, reply instantly with our online status
            globalChannel.send({
                type: 'broadcast',
                event: 'pong',
                payload: { id: currentUserId }
            });
        })
        .on('broadcast', { event: 'pong' }, (payload: any) => {
            const id = payload?.payload?.id;
            if (id && id !== currentUserId) {
                onlineUsers.add(id);
                lastSeenTimes.set(id, Date.now());
                listeners.forEach(l => l());
            }
        })
        .on('broadcast', { event: 'offline' }, (payload: any) => {
            const id = payload?.payload?.id;
            const ts = payload?.payload?.last_seen as string | undefined;
            if (id) {
                onlineUsers.delete(id);
                lastSeenTimes.delete(id);
                // ✅ Store the timestamp that arrived via broadcast — no DB query needed
                if (ts) lastSeenDb.set(id, ts);
                listeners.forEach(l => l());
            }
        })
        .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
                await globalChannel.send({
                    type: 'broadcast',
                    event: 'pong',
                    payload: { id: currentUserId }
                });

                // Staggered pings to beat race conditions on slow mobile connections
                const firePing = () => globalChannel.send({
                    type: 'broadcast',
                    event: 'ping',
                    payload: {}
                });
                firePing();
                setTimeout(firePing, 1000);
                setTimeout(firePing, 3000);
                setTimeout(firePing, 8000);
            }
        });

    // ── Shared offline sender ─────────────────────────────────────────────────
    const goOffline = () => {
        if (!globalChannel || !currentUserId) return;
        const ts = new Date().toISOString();
        // Write to DB
        supabase.from('profiles').update({ last_seen: ts }).eq('id', currentUserId).then();
        // Broadcast
        globalChannel.send({
            type: 'broadcast',
            event: 'offline',
            payload: { id: currentUserId, last_seen: ts }
        });
    };

    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            goOffline();
        } else if (document.visibilityState === 'visible') {
            // Instantly broadcast online state upon returning
            globalChannel?.send({
                type: 'broadcast',
                event: 'pong',
                payload: { id: currentUserId }
            });
            // Force others to report back
            globalChannel?.send({
                type: 'broadcast',
                event: 'ping',
                payload: {}
            });
        }
    };

    // BeforeUnload is notoriously unreliable, but we try anyway.
    window.addEventListener('beforeunload', goOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ── Heartbeat anti-ghosting loop ──────────────────────────────────────────
    setInterval(() => {
        if (currentUserId && document.visibilityState === 'visible') {
            // 1. Announce ourselves
            globalChannel?.send({
                type: 'broadcast',
                event: 'pong',
                payload: { id: currentUserId }
            });
            // 2. Ask background tabs to respond — their WebSocket listeners are
            //    NEVER throttled by Chrome, only their setIntervals are.
            //    This keeps background-tab users showing as online correctly.
            globalChannel?.send({
                type: 'broadcast',
                event: 'ping',
                payload: {}
            });
        }

        // Cull ghosts — 90s TTL to safely account for Chrome's 60s timer throttle
        const now = Date.now();
        const culled: string[] = [];
        for (const [id, timestamp] of lastSeenTimes.entries()) {
            if (now - timestamp > 90000) {
                onlineUsers.delete(id);
                lastSeenTimes.delete(id);
                culled.push(id);
            }
        }

        if (culled.length > 0) {
            listeners.forEach(l => l());
            culled.forEach(id => {
                if (!lastSeenDb.has(id)) {
                    supabase
                        .from('profiles')
                        .select('last_seen')
                        .eq('id', id)
                        .single()
                        .then(({ data }) => {
                            if (data?.last_seen) {
                                lastSeenDb.set(id, data.last_seen);
                                listeners.forEach(l => l());
                            }
                        });
                }
            });
        }
    }, 15000);
};

// ──────────────────────────────────────────────────────────────────────────────
// React Hooks
// ──────────────────────────────────────────────────────────────────────────────

/** Reactively tracks if a specific user is currently online. */
export const useOnlineStatus = (userId: string | null | undefined): boolean => {
    const [isOnline, setIsOnline] = useState(() => userId ? onlineUsers.has(userId) : false);

    useEffect(() => {
        if (!userId) { setIsOnline(false); return; }
        const handleChange = () => setIsOnline(onlineUsers.has(userId));
        handleChange();
        listeners.add(handleChange);
        return () => { listeners.delete(handleChange); };
    }, [userId]);

    return isOnline;
};

/** Reactively returns the last-seen ISO string for a user, received via broadcast. */
export const useLastSeen = (userId: string | null | undefined): string | null => {
    const [ts, setTs] = useState<string | null>(() => userId ? (lastSeenDb.get(userId) ?? null) : null);

    useEffect(() => {
        if (!userId) { setTs(null); return; }
        const handleChange = () => setTs(lastSeenDb.get(userId) ?? null);
        handleChange();
        listeners.add(handleChange);
        return () => { listeners.delete(handleChange); };
    }, [userId]);

    return ts;
};
