// ─────────────────────────────────────────────────────────────
// Recent Search Store — Supabase-synced, localStorage-cached
// ─────────────────────────────────────────────────────────────

import { supabase } from './supabase';

const MAX_RECENTS = 10;

/** Returns a per-user localStorage key so accounts never share searches */
const getKey = (currentUserId: string) => `allify_recent_searches_${currentUserId}`;

export interface RecentSearchUser {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string | null;
}

/** Read all recent searches synchronously from local cache for instant UI */
export function getLocalRecentSearches(currentUserId: string): RecentSearchUser[] {
    try {
        const raw = localStorage.getItem(getKey(currentUserId));
        if (!raw) return [];
        return JSON.parse(raw) as RecentSearchUser[];
    } catch {
        return [];
    }
}

/** Fetch from Supabase database to ensure cross-device sync */
export async function fetchRecentSearches(currentUserId: string): Promise<RecentSearchUser[]> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('recent_searches')
            .eq('id', currentUserId)
            .single();

        if (!error && data?.recent_searches) {
            // Update local cache with fresh data from database
            localStorage.setItem(getKey(currentUserId), JSON.stringify(data.recent_searches));
            return data.recent_searches as RecentSearchUser[];
        }
    } catch (err) {
        console.error('Error fetching recent searches from Supabase:', err);
    }
    // Fallback to local cache if offline or error
    return getLocalRecentSearches(currentUserId);
}

/** Internal helper: Update local cache instantly, then sync to DB */
async function saveToSupabase(currentUserId: string, next: RecentSearchUser[]) {
    // 1. Optimistic instant local update
    localStorage.setItem(getKey(currentUserId), JSON.stringify(next));
    
    // 2. Background sync to database
    try {
        await supabase
            .from('profiles')
            .update({ recent_searches: next })
            .eq('id', currentUserId);
    } catch (err) {
        console.error('Error saving recent searches to Supabase:', err);
    }
}

/** Add a user to the front of the recents list (dedupes, caps at MAX) */
export async function addRecentSearch(currentUserId: string, user: RecentSearchUser): Promise<void> {
    const current = getLocalRecentSearches(currentUserId);
    const filtered = current.filter(u => u.id !== user.id);
    const next = [user, ...filtered].slice(0, MAX_RECENTS);
    await saveToSupabase(currentUserId, next);
}

/** Remove a single user from recents by ID */
export async function removeRecentSearch(currentUserId: string, userId: string): Promise<void> {
    const current = getLocalRecentSearches(currentUserId);
    const next = current.filter(u => u.id !== userId);
    await saveToSupabase(currentUserId, next);
}

/** Clear all recent searches for the given user */
export async function clearRecentSearches(currentUserId: string): Promise<void> {
    localStorage.removeItem(getKey(currentUserId));
    try {
        await supabase
            .from('profiles')
            .update({ recent_searches: [] })
            .eq('id', currentUserId);
    } catch (err) {
        console.error('Error clearing recent searches in Supabase:', err);
    }
}
