import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { subscribeToPostUpdates } from '../../../lib/postSyncStore';

// Simple module-level cache to prevent reloading when navigating
let cachedUserId: string | null = null;  // tracks which user owns the cache
let cachedProfile: any = null;
let cachedPosts: any[] | null = null;
let cachedSavedPosts: any[] | null = null;
let cachedLikedPosts: any[] | null = null;

/** Call this immediately on sign-out so no stale data leaks to the next user */
export const clearProfileCache = () => {
    cachedUserId = null;
    cachedProfile = null;
    cachedPosts = null;
    cachedSavedPosts = null;
    cachedLikedPosts = null;
};

export const useProfileManager = () => {
    const location = useLocation();

    // Never pre-fill state from cache on first render — we don't yet know
    // if the cached data belongs to the currently signed-in user.
    // We validate the cache owner inside fetchProfile() before using it.
    const [profile, setProfile] = useState<{
        id: string;
        username: string;
        full_name: string;
        bio: string | null;
        avatar_url: string | null;
        location: string | null;
        website: string | null;
        badges: string[];
        allies_count: number;
        alling_count: number;
        allied_count: number;
    } | null>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    const [activeTab, setActiveTab] = useState<'Photos' | 'Videos' | 'Favourites' | 'Likes'>('Photos');
    const [savedPosts, setSavedPosts] = useState<any[]>(cachedSavedPosts || []);
    const [likedPosts, setLikedPosts] = useState<any[]>(cachedLikedPosts || []);
    const [currentUserId, setCurrentUserId] = useState<string | null>(cachedUserId);
    
    // UI states handled via manager to simplify props
    const [showImageViewer, setShowImageViewer] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any | null>(null);

    // Refs to always have latest state inside broadcast listener (avoids stale closure)
    const postsRef = useRef<any[]>([]);
    useEffect(() => { postsRef.current = posts; }, [posts]);
    const savedPostsRef = useRef<any[]>([]);
    useEffect(() => { savedPostsRef.current = savedPosts; }, [savedPosts]);
    const selectedPostRef = useRef<any>(null);
    useEffect(() => { selectedPostRef.current = selectedPost; }, [selectedPost]);

    // REAL-TIME CACHE SYNC
    useEffect(() => {
        const unsubscribe = subscribeToPostUpdates((payload) => {
            // Always update posts list counts/flags
            setPosts(prev => {
                const next = prev.map(p => {
                    if (p.id !== payload.postId) return p;
                    const newP = { ...p };
                    if (payload.action === 'like') {
                        if (payload.userId && payload.userId === cachedUserId) newP.is_liked_by_me = true;
                        if (payload.data?.likes_count !== undefined) newP.likes_count = payload.data.likes_count;
                    } else if (payload.action === 'unlike') {
                        if (payload.userId && payload.userId === cachedUserId) newP.is_liked_by_me = false;
                        if (payload.data?.likes_count !== undefined) newP.likes_count = payload.data.likes_count;
                    } else if (payload.action === 'save') {
                        if (payload.userId && payload.userId === cachedUserId) newP.is_saved_by_me = true;
                    } else if (payload.action === 'unsave') {
                        if (payload.userId && payload.userId === cachedUserId) newP.is_saved_by_me = false;
                    }
                    return newP;
                });
                cachedPosts = next;
                return next;
            });

            // Update likedPosts for current user's like/unlike
            if (payload.userId && payload.userId === cachedUserId) {
                if (payload.action === 'like') {
                    const postToAdd =
                        postsRef.current.find(p => p.id === payload.postId) ||
                        savedPostsRef.current.find(p => p.id === payload.postId) ||
                        (selectedPostRef.current?.id === payload.postId ? selectedPostRef.current : null);
                    if (postToAdd) {
                        setLikedPosts(prev => {
                            if (prev.some(p => p.id === payload.postId)) {
                                const next = prev.map(p => p.id === payload.postId
                                    ? { ...p, is_liked_by_me: true, likes_count: payload.data?.likes_count ?? p.likes_count }
                                    : p);
                                cachedLikedPosts = next;
                                return next;
                            }
                            const next = [{ ...postToAdd, is_liked_by_me: true, likes_count: payload.data?.likes_count ?? postToAdd.likes_count }, ...prev];
                            cachedLikedPosts = next;
                            return next;
                        });
                    } else {
                        // Post is not in local state (it belongs to another user) — fetch from DB
                        supabase.from('posts').select('*').eq('id', payload.postId).single().then(({ data: fetchedPost }) => {
                            if (!fetchedPost) return;
                            const enriched = { ...fetchedPost, is_liked_by_me: true, likes_count: payload.data?.likes_count ?? fetchedPost.likes_count };
                            setLikedPosts(prev => {
                                if (prev.some(p => p.id === payload.postId)) return prev;
                                const next = [enriched, ...prev];
                                cachedLikedPosts = next;
                                return next;
                            });
                        });
                    }
                } else if (payload.action === 'unlike') {
                    setLikedPosts(prev => {
                        const next = prev.filter(p => p.id !== payload.postId);
                        cachedLikedPosts = next;
                        return next;
                    });
                }
            }

            // Also sync likes_count inside likedPosts for anyone's like
            if ((payload.action === 'like' || payload.action === 'unlike') && payload.data?.likes_count !== undefined) {
                setLikedPosts(prev => {
                    const next = prev.map(p => p.id === payload.postId
                        ? { ...p, likes_count: payload.data.likes_count }
                        : p);
                    cachedLikedPosts = next;
                    return next;
                });
            }

            if (payload.action === 'delete') {
                setPosts(prev => prev.filter(p => p.id !== payload.postId));
                setSavedPosts(prev => prev.filter(p => p.id !== payload.postId));
                setLikedPosts(prev => { 
                    const next = prev.filter(p => p.id !== payload.postId);
                    cachedLikedPosts = next;
                    return next;
                });
            }
        });
        return () => { unsubscribe(); };
    }, []);

    // Real-time allies count sync — re-fetches actual counts to handle concurrent follows
    useEffect(() => {
        if (!currentUserId) return;
        const channel = supabase
            .channel(`follow-updates-${currentUserId}`)
            .on('broadcast', { event: 'follow_update' }, async (msg) => {
                const p = msg.payload;
                if (p?.target_user_id !== currentUserId) return;
                // Re-fetch real counts from DB to handle concurrent follows correctly
                const [{ count: alliesCount }, { count: allingCount }] = await Promise.all([
                    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', currentUserId),
                    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', currentUserId),
                ]);
                const { data: allingIds } = await supabase.from('follows').select('following_id').eq('follower_id', currentUserId);
                const { count: alliedCount } = await supabase
                    .from('follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('following_id', currentUserId)
                    .in('follower_id', allingIds?.map((r: any) => r.following_id) ?? []);
                setProfile(prev => {
                    if (!prev) return prev;
                    const updated = {
                        ...prev,
                        allies_count: alliesCount ?? prev.allies_count,
                        alling_count: allingCount ?? prev.alling_count,
                        allied_count: alliedCount ?? prev.allied_count,
                    };
                    cachedProfile = updated;
                    return updated;
                });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [currentUserId]);


    const fetchPosts = async (username?: string) => {
        const targetUsername = username || profile?.username || cachedProfile?.username;
        if (!targetUsername) return;

        // Only use post cache if it belongs to the current user
        if (cachedPosts && cachedUserId === cachedProfile?.id) {
            setPosts(cachedPosts);
            setIsLoadingPosts(false);
            return;
        }

        setIsLoadingPosts(true);
        try {
            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select('*')
                .eq('username', targetUsername)
                .order('created_at', { ascending: false });

            if (postsError) throw postsError;

            let enrichedPosts = postsData || [];

            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user && enrichedPosts.length > 0) {
                const { data: currentUserProfile } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', session.user.id)
                    .single();

                if (currentUserProfile) {
                    const { data: userLikes } = await supabase
                        .from('likes')
                        .select('post_id')
                        .eq('username', currentUserProfile.username)
                        .in('post_id', enrichedPosts.map(p => p.id));

                    const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);

                    const { data: userSaves } = await supabase
                        .from('saved_posts')
                        .select('post_id')
                        .eq('user_id', session.user.id)
                        .in('post_id', enrichedPosts.map(p => p.id));

                    const savedPostIds = new Set(userSaves?.map(s => s.post_id) || []);

                    enrichedPosts = enrichedPosts.map(p => ({
                        ...p,
                        is_liked_by_me: likedPostIds.has(p.id),
                        is_saved_by_me: savedPostIds.has(p.id)
                    }));
                }
            }

            cachedPosts = enrichedPosts;
            setPosts(enrichedPosts);
        } catch (err) {
            console.error("Error fetching posts:", err);
        } finally {
            setIsLoadingPosts(false);
        }
    };

    const fetchSavedPosts = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('saved_posts')
                .select(`post_id, posts (*)`)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            let fetchedPosts = data?.map((item: any) => ({ ...item.posts, is_saved_by_me: true })).filter(Boolean) || [];

            if (fetchedPosts.length > 0) {
                const { data: currentUserProfile } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', userId)
                    .single();

                if (currentUserProfile) {
                    const { data: userLikes } = await supabase
                        .from('likes')
                        .select('post_id')
                        .eq('username', currentUserProfile.username)
                        .in('post_id', fetchedPosts.map((p: any) => p.id));

                    const likedPostIds = new Set(userLikes?.map((l: any) => l.post_id) || []);
                    fetchedPosts = fetchedPosts.map((p: any) => ({
                        ...p,
                        is_liked_by_me: likedPostIds.has(p.id)
                    }));
                }

                const uniqueUsernames = [...new Set(fetchedPosts.map((p: any) => p.username))];
                if (uniqueUsernames.length > 0) {
                    const { data: authorProfiles } = await supabase
                        .from('profiles')
                        .select('username, avatar_url, full_name')
                        .in('username', uniqueUsernames);

                    const profileMap: Record<string, any> = Object.fromEntries(
                        (authorProfiles || []).map(p => [p.username, p])
                    );
                    fetchedPosts = fetchedPosts.map((p: any) => ({
                        ...p,
                        author_profile: profileMap[p.username] || null
                    }));
                }
            }

            cachedSavedPosts = fetchedPosts;
            setSavedPosts(fetchedPosts);
        } catch (err) {
            console.error('Error fetching saved posts:', err);
        }
    };

    const fetchLikedPosts = async (username: string, userId: string, backgroundRefresh = false) => {
        try {
            const { data: userLikes, error: likesError } = await supabase
                .from('likes')
                .select('post_id, created_at')
                .eq('username', username)
                .order('created_at', { ascending: false });

            if (likesError) throw likesError;
            if (!userLikes || userLikes.length === 0) {
                // In background mode, never wipe the current list
                if (!backgroundRefresh) {
                    cachedLikedPosts = [];
                    setLikedPosts([]);
                }
                return;
            }

            const likedPostIds = userLikes.map(l => l.post_id);

            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select('*')
                .in('id', likedPostIds);

            if (postsError) throw postsError;

            let fetchedPosts = postsData || [];

            fetchedPosts.sort((a, b) => {
                const indexA = likedPostIds.indexOf(a.id);
                const indexB = likedPostIds.indexOf(b.id);
                return indexA - indexB;
            });

            fetchedPosts = fetchedPosts.map(p => ({ ...p, is_liked_by_me: true }));

            const { data: userSaves } = await supabase
                .from('saved_posts')
                .select('post_id')
                .eq('user_id', userId)
                .in('post_id', fetchedPosts.map(p => p.id));

            const savedPostIds = new Set(userSaves?.map(s => s.post_id) || []);
            fetchedPosts = fetchedPosts.map(p => ({
                ...p,
                is_saved_by_me: savedPostIds.has(p.id)
            }));

            const uniqueUsernames = [...new Set(fetchedPosts.map(p => p.username))];
            if (uniqueUsernames.length > 0) {
                const { data: authorProfiles } = await supabase
                    .from('profiles')
                    .select('username, avatar_url, full_name')
                    .in('username', uniqueUsernames);

                const profileMap: Record<string, any> = Object.fromEntries(
                    (authorProfiles || []).map(p => [p.username, p])
                );
                fetchedPosts = fetchedPosts.map(p => ({
                    ...p,
                    author_profile: profileMap[p.username] || null
                }));
            }

            if (backgroundRefresh) {
                // Merge: add any newly liked posts that aren't already showing
                setLikedPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newPosts = fetchedPosts.filter(p => !existingIds.has(p.id));
                    if (newPosts.length === 0) return prev; // nothing to add, no re-render
                    const next = [...newPosts, ...prev];
                    cachedLikedPosts = next;
                    return next;
                });
            } else {
                cachedLikedPosts = fetchedPosts;
                setLikedPosts(fetchedPosts);
            }
        } catch (err) {
            console.error('Error fetching liked posts:', err);
        }
    };

    const fetchProfile = async () => {
        try {
            const { data } = await supabase.auth.getSession();
            const session = data.session;

            if (session?.user) {
                const activeUserId = session.user.id;

                // If the cache is valid for THIS user, hydrate immediately
                if (cachedProfile && cachedUserId === activeUserId) {
                    setProfile(cachedProfile);
                    if (cachedPosts) { setPosts(cachedPosts); setIsLoadingPosts(false); }
                    if (cachedSavedPosts) setSavedPosts(cachedSavedPosts);
                    if (cachedLikedPosts) setLikedPosts(cachedLikedPosts);
                    setIsLoading(false);
                    // Always silently re-fetch liked & saved posts to catch
                    // any likes/saves done from other pages or devices
                    fetchLikedPosts(cachedProfile.username, activeUserId, true);
                    fetchSavedPosts(activeUserId);
                    return;
                }

                // Cache miss or belongs to a different user — clear and refetch
                clearProfileCache();
                setProfile(null);
                setPosts([]);
                setSavedPosts([]);
                setLikedPosts([]);

                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', activeUserId)
                    .single();

                if (profileData) {
                    const [{ count: alliesCount }, { count: allingCount }] = await Promise.all([
                        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', activeUserId),
                        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', activeUserId),
                    ]);
                    const { data: allingIds } = await supabase.from('follows').select('following_id').eq('follower_id', activeUserId);
                    const { count: alliedCount } = await supabase
                        .from('follows')
                        .select('*', { count: 'exact', head: true })
                        .eq('following_id', activeUserId)
                        .in('follower_id', allingIds?.map((r: any) => r.following_id) ?? []);

                    const builtProfile = {
                        id: activeUserId,
                        username: profileData.username || 'user',
                        full_name: profileData.full_name || profileData.fullname || profileData.username || 'Allify User',
                        bio: profileData.bio || null,
                        avatar_url: profileData.avatar_url || null,
                        location: profileData.location || null,
                        website: profileData.website || null,
                        badges: profileData.badges || [],
                        allies_count: alliesCount ?? 0,
                        alling_count: allingCount ?? 0,
                        allied_count: alliedCount ?? 0
                    };
                    cachedUserId = activeUserId;
                    cachedProfile = builtProfile;
                    setCurrentUserId(activeUserId);
                    setProfile(builtProfile);
                    fetchPosts(builtProfile.username);
                    fetchSavedPosts(activeUserId);
                    fetchLikedPosts(builtProfile.username, activeUserId);
                }
            }
        } catch (err) {
            console.error("Unexpected error in fetchProfile:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
        fetchPosts();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event) => {
            if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') {
                fetchProfile();
            } else if (_event === 'SIGNED_OUT') {
                // Clear cache IMMEDIATELY so no stale data leaks to the next account
                clearProfileCache();
                setProfile(null);
                setPosts([]);
                setSavedPosts([]);
                setLikedPosts([]);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (location.state?.refresh) {
            clearProfileCache();
            setIsLoading(true);
            setIsLoadingPosts(true);
            fetchProfile();
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const handleLikeUpdate = (postId: string, isLiked: boolean, likeCount: number) => {
        setPosts(prev => {
            const next = prev.map(p => p.id === postId ? { ...p, is_liked_by_me: isLiked, likes_count: likeCount } : p);
            cachedPosts = next;
            return next;
        });
        setSavedPosts(prev => {
            const next = prev.map(p => p.id === postId ? { ...p, is_liked_by_me: isLiked, likes_count: likeCount } : p);
            cachedSavedPosts = next;
            return next;
        });
        if (isLiked) {
            const postToAdd =
                postsRef.current.find(p => p.id === postId) ||
                savedPostsRef.current.find(p => p.id === postId) ||
                (selectedPostRef.current?.id === postId ? selectedPostRef.current : null);
            setLikedPosts(prev => {
                const exists = prev.some(p => p.id === postId);
                if (exists) {
                    // Already there, just update the count
                    const next = prev.map(p => p.id === postId ? { ...p, is_liked_by_me: true, likes_count: likeCount } : p);
                    cachedLikedPosts = next;
                    return next;
                }
                if (!postToAdd) return prev;
                const next = [{ ...postToAdd, is_liked_by_me: true, likes_count: likeCount }, ...prev];
                cachedLikedPosts = next;
                return next;
            });
        } else {
            setLikedPosts(prev => {
                const next = prev.filter(p => p.id !== postId);
                cachedLikedPosts = next;
                return next;
            });
        }
        setSelectedPost((prev: any) => prev?.id === postId ? { ...prev, is_liked_by_me: isLiked, likes_count: likeCount } : prev);
    };

    const handlePostDelete = (deletedPostId: string) => {
        setPosts(prev => {
            const next = prev.filter(p => p.id !== deletedPostId);
            cachedPosts = next;
            return next;
        });
        setSavedPosts(prev => {
            const next = prev.filter(p => p.id !== deletedPostId);
            cachedSavedPosts = next;
            return next;
        });
        setLikedPosts(prev => {
            const next = prev.filter(p => p.id !== deletedPostId);
            cachedLikedPosts = next;
            return next;
        });
    };

    const handleSaveToggle = (post: any, isSaved: boolean) => {
        if (isSaved) {
            setSavedPosts(prev => {
                const next = [{ ...post, is_saved_by_me: true }, ...prev.filter(p => p.id !== post.id)];
                cachedSavedPosts = next;
                return next;
            });
        } else {
            setSavedPosts(prev => {
                const next = prev.filter(p => p.id !== post.id);
                cachedSavedPosts = next;
                return next;
            });
        }
        setPosts(prev => {
            const next = prev.map(p => p.id === post.id ? { ...p, is_saved_by_me: isSaved } : p);
            cachedPosts = next;
            return next;
        });
        setLikedPosts(prev => {
            const next = prev.map(p => p.id === post.id ? { ...p, is_saved_by_me: isSaved } : p);
            cachedLikedPosts = next;
            return next;
        });
        setSelectedPost((prev: any) => prev?.id === post.id ? { ...prev, is_saved_by_me: isSaved } : prev);
    };

    const filteredPosts = activeTab === 'Favourites'
        ? savedPosts
        : activeTab === 'Likes'
            ? likedPosts
            : posts.filter(post => {
                if (activeTab === 'Photos') return post.type === 'photo' || !post.type;
                if (activeTab === 'Videos') return post.type === 'video';
                return false;
            });

    const stats = {
        posts: posts.length,
        allies: profile?.allies_count ?? 0,
        alling: profile?.alling_count ?? 0,
        allied: profile?.allied_count ?? 0
    };

    return {
        profile, setProfile,
        posts,
        isLoading,
        isLoadingPosts,
        activeTab, setActiveTab,
        showImageViewer, setShowImageViewer,
        selectedPost, setSelectedPost,
        filteredPosts,
        stats,
        handleLikeUpdate,
        handlePostDelete,
        handleSaveToggle
    };
};
