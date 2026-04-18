import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
    cachedNotifications, 
    unreadNotificationCount,
    subscribeToNotifications,
    markAllNotificationsAsRead,
    refreshNotifications
} from '../lib/notificationStore';
import type { AppNotification } from '../lib/notificationStore';
import { fetchPostWithContext } from '../lib/postSyncStore';

export function useNotificationsManager() {
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
                        setIsRefreshing(false);
                        setServerConfirmed(true);
                    }
                });
        };
        const timer = setTimeout(tryRefresh, 150);

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

    return {
        notifs,
        unread,
        currentUser,
        isRefreshing,
        serverConfirmed,
        selectedPost,
        isFetchingPost,
        modalInitialTabRef,
        setSelectedPost,
        handleSelectPost,
        handleMarkAllRead
    };
}
