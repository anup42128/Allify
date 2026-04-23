// ─────────────────────────────────────────────────────────────
// Recent Search Store — localStorage-backed, per-user isolated
// ─────────────────────────────────────────────────────────────

const MAX_RECENTS = 10;

/** Returns a per-user localStorage key so accounts never share searches */
const getKey = (currentUserId: string) => `allify_recent_searches_${currentUserId}`;

export interface RecentSearchUser {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string | null;
}

/** Read all recent searches for the given user */
export function getRecentSearches(currentUserId: string): RecentSearchUser[] {
    try {
        const raw = localStorage.getItem(getKey(currentUserId));
        if (!raw) return [];
        return JSON.parse(raw) as RecentSearchUser[];
    } catch {
        return [];
    }
}

/** Add a user to the front of the recents list (dedupes, caps at MAX) */
export function addRecentSearch(currentUserId: string, user: RecentSearchUser): void {
    const current = getRecentSearches(currentUserId);
    const filtered = current.filter(u => u.id !== user.id);
    const next = [user, ...filtered].slice(0, MAX_RECENTS);
    localStorage.setItem(getKey(currentUserId), JSON.stringify(next));
}

/** Remove a single user from recents by ID */
export function removeRecentSearch(currentUserId: string, userId: string): void {
    const current = getRecentSearches(currentUserId);
    const next = current.filter(u => u.id !== userId);
    localStorage.setItem(getKey(currentUserId), JSON.stringify(next));
}

/** Clear all recent searches for the given user */
export function clearRecentSearches(currentUserId: string): void {
    localStorage.removeItem(getKey(currentUserId));
}
