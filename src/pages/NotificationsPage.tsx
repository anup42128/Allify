import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
    cachedNotifications, 
    unreadNotificationCount,
    subscribeToNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    broadcastNotificationPing,
    refreshNotifications
} from '../lib/notificationStore';
import type { AppNotification } from '../lib/notificationStore';
import { fetchPostWithContext } from '../lib/postSyncStore';
import { PostDetailModal } from '../features/profile/components/PostDetailModal';
import { AnimatePresence } from 'framer-motion';

const formatTimeAgo = (iso: string) => {
    const diff = new Date().getTime() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Global cache to prevent avatar flashing on page navigation
const profileCache: Record<string, any> = {};
// Global cache so Ally Back button appears instantly on revisit
const followStatusCache: Record<string, boolean> = {};
// Global cache so Thanks button appears instantly on revisit
const thanksStatusCache: Record<string, boolean> = {};
// Global cache so Post thumbnails appear instantly on revisit
const postImageCache: Record<string, string> = {};

const NotificationItem = ({ notif, currentUser, onSelectPost }: { notif: AppNotification; currentUser: any; onSelectPost: (postId: string, openComments?: boolean) => void }) => {
    const followCacheKey = currentUser?.id && notif.actor_username ? `${currentUser.id}:${notif.actor_username}` : null;
    // thanksCacheKey is stable — does NOT depend on currentUser to avoid flash
    const thanksCacheKey = notif.type === 'like' ? `thanks:${notif.id}` : null;
    const [actor, setActor] = useState<any>(profileCache[notif.actor_username] || null);
    const [isFollowingBack, setIsFollowingBack] = useState<boolean | null>(
        followCacheKey !== null && followCacheKey in followStatusCache ? followStatusCache[followCacheKey] : null
    );
    const [followLoading, setFollowLoading] = useState(false);
    // Always start loading for like notifications — we MUST verify from DB to avoid showing wrong button
    const [thanksLoading, setThanksLoading] = useState<boolean>(
        notif.type === 'like' && !(thanksCacheKey !== null && thanksCacheKey in thanksStatusCache)
    );
    const [thanked, setThanked] = useState<boolean>(
        thanksCacheKey !== null && thanksCacheKey in thanksStatusCache ? thanksStatusCache[thanksCacheKey] : false
    );
    const [btnHovered, setBtnHovered] = useState(false);
    const [thanksHovered, setThanksHovered] = useState(false);
    const [postImageUrl, setPostImageUrl] = useState<string | null>(postImageCache[notif.entity_id] || null);

    useEffect(() => {
        if (profileCache[notif.actor_username]) return;
        supabase.from('profiles').select('avatar_url, full_name, id').eq('username', notif.actor_username).single()
            .then(({ data }) => { 
                if (data) {
                    profileCache[notif.actor_username] = data;
                    setActor(data); 
                }
            });
    }, [notif.actor_username]);

    // Check if we are already following this person back (for ally_follow cards)
    useEffect(() => {
        if ((notif.type !== 'ally_follow') || !currentUser?.id || !actor?.id) return;
        const key = `${currentUser.id}:${notif.actor_username}`;
        // Already have a cached result — skip fetch
        if (key in followStatusCache) {
            setIsFollowingBack(followStatusCache[key]);
            return;
        }
        supabase.from('follows')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', actor.id)
            .maybeSingle()
            .then(({ data }) => {
                const result = !!data;
                followStatusCache[key] = result;
                setIsFollowingBack(result);
            });
    }, [notif.type, currentUser?.id, actor?.id, notif.actor_username]);

    // Check if we have already thanked this person for this post (for like cards)
    // Runs when currentUser becomes available (it's null at first render)
    useEffect(() => {
        if (notif.type !== 'like' || !currentUser?.username) return;
        const key = `thanks:${notif.id}`;
        if (key in thanksStatusCache) {
            // Already cached — apply instantly
            setThanked(thanksStatusCache[key]);
            setThanksLoading(false);
            return;
        }

        setThanksLoading(true);
        supabase.from('notifications')
            .select('id')
            .eq('recipient_username', notif.actor_username)
            .eq('actor_username', currentUser.username)
            .eq('type', 'thanks')
            .eq('entity_id', notif.entity_id)
            .maybeSingle()
            .then(({ data }) => {
                const result = !!data;
                thanksStatusCache[key] = result;
                setThanked(result);
                setThanksLoading(false);
            });
    }, [notif.type, currentUser?.username, notif.actor_username, notif.entity_id, thanksCacheKey]);

    // Fetch post image for post-related notifications
    useEffect(() => {
        if (!['like', 'comment', 'reply', 'thanks'].includes(notif.type) || !notif.entity_id) return;
        if (postImageCache[notif.entity_id]) return;

        supabase.from('posts').select('image_url').eq('id', notif.entity_id).single()
            .then(
                ({ data }) => {
                    if (data?.image_url) {
                        postImageCache[notif.entity_id] = data.image_url;
                        setPostImageUrl(data.image_url);
                    }
                },
                () => { /* Ignore errors */ }
            );
    }, [notif.type, notif.entity_id]);

    const handleClick = () => {
        if (!notif.is_read) markNotificationAsRead(notif.id);
        
        if (['like', 'comment', 'reply', 'thanks'].includes(notif.type) && notif.entity_id) {
            const openComments = notif.type === 'comment' || notif.type === 'reply';
            onSelectPost(notif.entity_id, openComments);
        }
    };

    const handleAllyBack = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUser || !actor || followLoading) return;
        setFollowLoading(true);
        const key = `${currentUser.id}:${notif.actor_username}`;
        try {
            if (isFollowingBack) {
                await supabase.from('follows').delete()
                    .eq('follower_id', currentUser.id)
                    .eq('following_id', actor.id);
                followStatusCache[key] = false;
                setIsFollowingBack(false);
            } else {
                await supabase.from('follows').insert({
                    follower_id: currentUser.id,
                    follower_username: currentUser.username,
                    following_id: actor.id,
                    following_username: notif.actor_username,
                });
                followStatusCache[key] = true;
                setIsFollowingBack(true);
            }
        } catch (err) {
            console.error('Ally back error:', err);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleThanks = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (thanksLoading || !currentUser?.username) return;
        setThanksLoading(true);
        // Simulate a slight delay for better UX feel during toggling
        await new Promise(res => setTimeout(res, 500));
        try {
            if (thanked) {
                await supabase.from('notifications').delete()
                    .eq('recipient_username', notif.actor_username)
                    .eq('actor_username', currentUser.username)
                    .eq('type', 'thanks')
                    .eq('entity_id', notif.entity_id);
                if (thanksCacheKey) thanksStatusCache[thanksCacheKey] = false;
                setThanked(false);
                setThanksHovered(false);
            } else {
                // Fetch recipient ID given username
                const { data: profile } = await supabase.from('profiles').select('id').eq('username', notif.actor_username).single();
                if (profile) {
                    await supabase.from('notifications').insert({
                        recipient_id: profile.id,
                        recipient_username: notif.actor_username,
                        actor_username: currentUser.username,
                        type: 'thanks',
                        entity_id: notif.entity_id,
                    });
                    if (thanksCacheKey) thanksStatusCache[thanksCacheKey] = true;
                    setThanked(true);
                }
            }

            // Immediately ping the other user to update their UI
            broadcastNotificationPing(notif.actor_username);
            
        } catch (err) {
            console.error('Thanks notification error:', err);
        }
        setThanksLoading(false);
        markNotificationAsRead(notif.id);
    };

    const getMessage = () => {
        const name = notif.actor_username;
        switch (notif.type) {
            case 'like': return <><span className="font-bold text-white">{name}</span> liked your post.</>;
            case 'comment': return <><span className="font-bold text-white">{name}</span> commented on your post.</>;
            case 'reply': return <><span className="font-bold text-white">{name}</span> replied to your comment.</>;
            case 'ally_follow': return <><span className="font-bold text-white">{name}</span> started alling you.</>;
            case 'allied': return <>You and <span className="font-bold text-white">{name}</span> are now Allied! 🎉</>;
            case 'thanks': return <><span className="font-bold text-white">{name}</span> thanked you for the like.</>;
            default: return <><span className="font-bold text-white">{name}</span> interacted with you.</>;
        }
    };

    const getSubtitle = () => {
        switch (notif.type) {
            case 'like': return 'Tap to see the post';
            case 'comment': return 'Tap to see what they said';
            case 'reply': return 'Tap to see the reply';
            case 'ally_follow': return 'They want to connect with you';
            case 'allied': return 'You can now message each other';
            case 'thanks': return 'They appreciated your support ✨';
            default: return '';
        }
    };

    const isAllyCard = notif.type === 'ally_follow';

    return (
        <div 
            onClick={handleClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all border ${
                notif.is_read ? 'bg-black border-zinc-800/50 hover:bg-zinc-900/30' : 'bg-black border-zinc-700/60 hover:bg-zinc-900/30'
            }`}
        >
            {/* Avatar */}
            <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 flex-shrink-0">
                {actor?.avatar_url ? (
                    <img src={actor.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                    <svg className="w-full h-full text-zinc-600 p-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300 leading-snug">{getMessage()}</p>
                <p className="text-xs text-zinc-400 mt-0.5 truncate">{getSubtitle()}</p>
                <span className={`text-[10px] mt-0.5 font-bold block ${notif.is_read ? 'text-zinc-700' : 'text-blue-500'}`}>
                    {formatTimeAgo(notif.created_at)}
                </span>
            </div>

            {/* Right side: action button OR unread dot */}
            <div className="flex-shrink-0 flex items-center gap-2.5">
                {postImageUrl && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-800/50 bg-zinc-900 flex-shrink-0">
                        <img 
                            src={postImageUrl} 
                            alt="Post" 
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    </div>
                )}
                
                {isAllyCard ? (
                    isFollowingBack === null ? (
                        // Skeleton while follow-status is loading from DB
                        <div className="w-24 h-8 rounded-full bg-zinc-800 animate-pulse" />
                    ) : (
                        <button
                            onClick={handleAllyBack}
                            onMouseEnter={() => setBtnHovered(true)}
                            onMouseLeave={() => setBtnHovered(false)}
                            disabled={followLoading}
                            className={`px-5 py-2 rounded-full text-sm font-bold transition-all border ${
                                isFollowingBack
                                    ? btnHovered 
                                        ? 'bg-red-500/15 border-red-500/30 text-red-500' // Hover: Unally (Red)
                                        : 'bg-blue-500/15 border-blue-500/30 text-blue-400' // Default: Alling (Blue)
                                    : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 hover:border-indigo-400/50 hover:text-indigo-200' // Ally Back (Indigo)
                            } disabled:opacity-50`}
                        >
                            {followLoading ? (
                                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                            ) : isFollowingBack ? (btnHovered ? 'Unally' : 'Alling') : 'Ally Back'}
                        </button>
                    )
                ) : notif.type === 'like' && actor ? (
                    <button
                        onClick={handleThanks}
                        onMouseEnter={() => setThanksHovered(true)}
                        onMouseLeave={() => setThanksHovered(false)}
                        disabled={thanksLoading}
                        className={`px-5 py-2 rounded-full text-sm font-bold transition-all border flex items-center justify-center gap-2 min-w-[110px] ${
                            thanked
                                ? thanksHovered
                                    ? 'bg-red-500/15 border-red-500/30 text-red-500 hover:bg-red-500/25'
                                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 hover:border-indigo-400/50 hover:text-indigo-200'
                        } disabled:opacity-80`}
                    >
                        {thanksLoading ? (
                            <div className="animate-spin h-4 w-4 border-2 border-indigo-400 border-t-transparent rounded-full" />
                        ) : thanked ? (
                            thanksHovered ? (
                                'Un-Thank'
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                                    </svg>
                                    Thanked
                                </>
                            )
                        ) : 'Thanks 🙌'}
                    </button>
                ) : !notif.is_read ? (
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                ) : null}
            </div>
        </div>
    );
};

export const NotificationsPage = () => {
    const [notifs, setNotifs] = useState<AppNotification[]>(cachedNotifications);
    const [unread, setUnread] = useState(unreadNotificationCount);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isRefreshing, setIsRefreshing] = useState(true);
    const [serverConfirmed, setServerConfirmed] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [isFetchingPost, setIsFetchingPost] = useState(false);
    const modalInitialTabRef = useRef<'details' | 'comments'>('details');

    const handleSelectPost = async (postId: string, openComments?: boolean) => {
        if (!currentUser || isFetchingPost) return;
        setIsFetchingPost(true);
        modalInitialTabRef.current = openComments ? 'comments' : 'details';
        const post = await fetchPostWithContext(postId, currentUser.username, currentUser.id);
        if (post) setSelectedPost(post);
        setIsFetchingPost(false);
    };

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data }) => {
            if (data?.user) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
                setCurrentUser(profile);
            }
        });

        // Initialize display from cache immediately
        setNotifs([...cachedNotifications]);
        setUnread(unreadNotificationCount);

        // Poll until activeSyncUsername is ready, then refresh from DB
        let attempts = 0;
        let cancelled = false;
        const tryRefresh = () => {
            refreshNotifications()
                .then(() => {
                    if (cancelled) return;
                    // Only mark confirmed AFTER successful DB fetch
                    setIsRefreshing(false);
                    setServerConfirmed(true);
                    setNotifs([...cachedNotifications]);
                    setUnread(unreadNotificationCount);
                })
                .catch((err) => {
                    if (cancelled) return;
                    if (err?.message === 'not_ready' && attempts < 15) {
                        attempts++;
                        setTimeout(tryRefresh, 300);
                    } else {
                        // Give up after retries - mark as confirmed to prevent infinite spinner
                        setIsRefreshing(false);
                        setServerConfirmed(true);
                    }
                });
        };
        const timer = setTimeout(tryRefresh, 150);

        // Listener ONLY updates the display list — does NOT touch isRefreshing/serverConfirmed
        // to prevent pre-seed notifyUpdates() from prematurely confirming empty state
        const unsubscribe = subscribeToNotifications(() => {
            if (cachedNotifications.length > 0) {
                setNotifs([...cachedNotifications]);
            }
            setUnread(unreadNotificationCount);
        });
        return () => { cancelled = true; unsubscribe(); clearTimeout(timer); };
    }, []);

    const handleMarkAllRead = () => {
        if (currentUser?.username) {
            markAllNotificationsAsRead(currentUser.username);
        }
    };

    return (
        <div className="flex h-screen bg-black overflow-hidden relative">
            
            {/* Left Sidebar - Notifications List */}
            <div className="w-full md:w-[400px] xl:w-[450px] border-r border-zinc-900/50 flex flex-col bg-black flex-shrink-0 z-10 transition-all">
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-zinc-900/50 px-6 py-5 flex items-center justify-between">
                    <h1 className="text-2xl font-black text-white tracking-tight">Notifications</h1>
                    {unread > 0 && (
                        <button 
                            onClick={handleMarkAllRead}
                            className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2 flex items-center justify-center rounded-full tracking-wide"
                        >
                            Mark all as read
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto pb-24 md:pb-4 relative">
                    {/* Subtle indigo shimmer bar at top — never hides the list */}
                    {isRefreshing && (
                        <div className="sticky top-0 z-10 h-0.5 w-full overflow-hidden bg-transparent">
                            <div className="h-full bg-indigo-500 rounded-full w-1/3"
                                style={{ animation: 'slideRight 1.2s ease-in-out infinite' }}
                            />
                        </div>
                    )}
                    <div className="p-4 space-y-1.5">
                    {notifs.length > 0 ? (
                        // Has data — always show it, whether refreshing or not
                        notifs.map(n => <NotificationItem key={n.id} notif={n} currentUser={currentUser} onSelectPost={handleSelectPost} />)
                    ) : serverConfirmed && !isRefreshing ? (
                        // Server confirmed AND refresh complete: genuinely no notifications
                        <div className="flex flex-col items-center justify-center h-[60vh] text-center opacity-70">
                            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border-4 border-zinc-800">
                                <span className="text-5xl opacity-50">🔔</span>
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Caught up!</h3>
                            <p className="text-zinc-500 text-sm max-w-[200px] leading-relaxed font-medium">You have no new notifications right now. Go make some noise!</p>
                        </div>
                    ) : (
                        // Still loading / refreshing — show spinner, NEVER the empty bell
                        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                            <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                            <p className="text-zinc-500 text-sm font-medium">Loading notifications...</p>
                        </div>
                    )}
                    </div>

                </div>
            </div>

            {/* Right Content Area - Minimalist Empty State */}
            <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-black relative overflow-hidden group">
                
                {/* Foreground Content */}
                <div className="relative flex flex-col items-center text-center max-w-xl px-12 opacity-80 transition-opacity duration-1000 group-hover:opacity-100">
                    
                    {/* Unique Abstract Minimal Icon (Thin Bell) */}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="w-40 h-40 text-zinc-700 mb-12">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.31 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>

                    {/* Brutalist / Minimal Typography */}
                    <h2 className="text-xl font-light text-zinc-300 mb-6 tracking-[0.4em] uppercase">
                        Activity Stream
                    </h2>
                    
                    <p className="text-sm md:text-base text-zinc-500 font-medium leading-relaxed max-w-sm mx-auto">
                        See what’s happening in your network.<br/>Likes, comments, new allies, and more — all in one spot.
                    </p>
                    
                    {/* Decorative minimalist line */}
                    <div className="w-[1px] h-20 bg-gradient-to-b from-zinc-800 to-transparent mt-16" />
                </div>
            </div>

            {/* Post Viewer Modal */}
            <AnimatePresence>
                {selectedPost && currentUser && (
                    <PostDetailModal
                        key={selectedPost.id} post={selectedPost}
                        currentUser={currentUser}
                        postAuthor={
                            selectedPost?.username === currentUser?.username
                                ? currentUser
                                : selectedPost?.author_profile
                        }
                        initialTab={modalInitialTabRef.current}
                        onClose={() => setSelectedPost(null)}
                        onDelete={() => setSelectedPost(null)}
                    />
                )}
            </AnimatePresence>

            {/* Loading Overlay when fetching the post */}
            {isFetchingPost && (
                <div className="fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin mb-4" />
                    <p className="text-white font-bold">Loading post...</p>
                </div>
            )}
        </div>
    );
};
