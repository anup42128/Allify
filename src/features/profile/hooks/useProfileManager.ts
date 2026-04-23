import { useState, useEffect } from 'react';
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
    
    // UI states handled via manager to simplify props
    const [showImageViewer, setShowImageViewer] = useState(false);
    const [selectedPost, setSelectedPost] = useState<any | null>(null);

    // REAL-TIME CACHE SYNC
    useEffect(() => {
        const unsubscribe = subscribeToPostUpdates((payload) => {
            setPosts(prev => prev.map(p => {
                if (p.id !== payload.postId) return p;
                const newP = { ...p };
                if (payload.action === 'like') {
                    newP.is_liked_by_me = true;
                    if (payload.data?.likes_count !== undefined) newP.likes_count = payload.data.likes_count;
                } else if (payload.action === 'unlike') {
                    newP.is_liked_by_me = false;
                    if (payload.data?.likes_count !== undefined) newP.likes_count = payload.data.likes_count;
                } else if (payload.action === 'save') {
                    newP.is_saved_by_me = true;
                } else if (payload.action === 'unsave') {
                    newP.is_saved_by_me = false;
                }
                return newP;
            }));
            
            if (payload.action === 'delete') {
                setPosts(prev => prev.filter(p => p.id !== payload.postId));
                setSavedPosts(prev => prev.filter(p => p.post?.id !== payload.postId));
                setLikedPosts(prev => prev.filter(p => p.post?.id !== payload.postId));
            }
        });
        return () => { unsubscribe(); };
    }, []);

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

    const fetchLikedPosts = async (username: string, userId: string) => {
        try {
            const { data: userLikes, error: likesError } = await supabase
                .from('likes')
                .select('post_id, created_at')
                .eq('username', username)
                .order('created_at', { ascending: false });

            if (likesError) throw likesError;
            if (!userLikes || userLikes.length === 0) {
                setLikedPosts([]);
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

            setLikedPosts(fetchedPosts);
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
            const postToAdd = posts.find(p => p.id === postId) || savedPosts.find(p => p.id === postId) || selectedPost;
            if (postToAdd && !likedPosts.some(p => p.id === postId)) {
                setLikedPosts(prev => {
                    const next = [{ ...postToAdd, is_liked_by_me: true, likes_count: likeCount }, ...prev];
                    cachedLikedPosts = next;
                    return next;
                });
            }
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
