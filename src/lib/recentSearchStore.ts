// ─────────────────────────────────────────────────────────────
// Recent Search Store — localStorage-backed, no Supabase needed
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'allify_recent_searches';
const MAX_RECENTS = 10;

export interface RecentSearchUser {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string | null;
}

/** Read all recent searches from localStorage */
export function getRecentSearches(): RecentSearchUser[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as RecentSearchUser[];
    } catch {
        return [];
    }
}

/** Add a user to the front of the recents list (dedupes, caps at MAX) */
export function addRecentSearch(user: RecentSearchUser): void {
    const current = getRecentSearches();
    // Remove duplicate if already present
    const filtered = current.filter(u => u.id !== user.id);
    // Prepend and cap
    const next = [user, ...filtered].slice(0, MAX_RECENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/** Remove a single user from recents by ID */
export function removeRecentSearch(userId: string): void {
    const current = getRecentSearches();
    const next = current.filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/** Clear all recent searches */
export function clearRecentSearches(): void {
    localStorage.removeItem(STORAGE_KEY);
}
