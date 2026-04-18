import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { broadcastNotificationPing } from '../../../lib/notificationStore';
import { subscribeToPostUpdates } from '../../../lib/postSyncStore';

export const useSearchProfile = (username: string) => {
    const [profile, setProfile] = useState<any | null>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<any | null>(null);
    const [currentUser, setCurrentUser] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'All' | 'Photos' | 'Videos'>('All');
    const [scrollY, setScrollY] = useState(0);
    const [showAvatarViewer, setShowAvatarViewer] = useState(false);
    // Ally (follow) state
    const [isFollowing, setIsFollowing] = useState(false);
    const [isAllied, setIsAllied] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    // Local optimistic counters
    const [localAllies, setLocalAllies] = useState(0);
    const [localAlling, setLocalAlling] = useState(0);
    const [localAllied, setLocalAllied] = useState(0);

    const scrollRef = useRef<HTMLDivElement>(null);
    const isOwnProfile = currentUser && profile && currentUser.id === profile.id;

    // Real-time post sync
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
            }
        });
        return () => { unsubscribe(); };
    }, []);

    // Primary data fetch
    useEffect(() => {
        const fetchUserAndProfile = async () => {
            setIsLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const { data: currentUserProfile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();
                    if (currentUserProfile) setCurrentUser(currentUserProfile);
                }

                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('username', username)
                    .single();

                if (profileError) throw profileError;

                if (profileData) {
                    const profileObj = {
                        id: profileData.id,
                        username: profileData.username || 'user',
                        full_name: profileData.full_name || profileData.username || 'Allify User',
                        bio: profileData.bio || null,
                        avatar_url: profileData.avatar_url || null,
                        location: profileData.location || null,
                        website: profileData.website || null,
                        badges: profileData.badges || [],
                    };
                    setProfile(profileObj);

                    // Live follow counts
                    const [{ count: alliesCount }, { count: allingCount }] = await Promise.all([
                        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileData.id),
                        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id),
                    ]);
                    const { count: alliedCount } = await supabase
                        .from('follows')
                        .select('*', { count: 'exact', head: true })
                        .eq('follower_id', profileData.id)
                        .in('following_id',
                            (await supabase.from('follows').select('follower_id').eq('following_id', profileData.id))
                                .data?.map((r: any) => r.follower_id) ?? []
                        );

                    setLocalAllies(alliesCount ?? 0);
                    setLocalAlling(allingCount ?? 0);
                    setLocalAllied(alliedCount ?? 0);

                    // Fetch posts
                    const { data: postsData, error: postsError } = await supabase
                        .from('posts')
                        .select('*')
                        .eq('username', username)
                        .order('created_at', { ascending: false });

                    if (postsError) throw postsError;

                    let enrichedPosts = postsData || [];

                    if (session?.user && enrichedPosts.length > 0) {
                        const { data: currentUserProfile } = await supabase
                            .from('profiles')
                            .select('username')
                            .eq('id', session.user.id)
                            .single();

                        if (currentUserProfile) {
                            const { data: userLikes } = await supabase.from('likes').select('post_id')
                                .eq('username', currentUserProfile.username)
                                .in('post_id', enrichedPosts.map(p => p.id));
                            const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);

                            const { data: userSaves } = await supabase.from('saved_posts').select('post_id')
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
                    setPosts(enrichedPosts);

                    // Check follow status
                    if (session?.user && profileData.id !== session.user.id) {
                        const { data: followRow } = await supabase.from('follows').select('id')
                            .eq('follower_id', session.user.id)
                            .eq('following_id', profileData.id)
                            .maybeSingle();
                        const following = !!followRow;
                        setIsFollowing(following);
                        if (following) {
                            const { data: reverseRow } = await supabase.from('follows').select('id')
                                .eq('follower_id', profileData.id)
                                .eq('following_id', session.user.id)
                                .maybeSingle();
                            setIsAllied(!!reverseRow);
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUserAndProfile();
    }, [username]);

    // Scroll tracking
    useEffect(() => {
        if (isLoading) return;
        const el = scrollRef.current;
        if (!el) return;
        const onScroll = () => setScrollY(el.scrollTop);
        el.addEventListener('scroll', onScroll);
        return () => el.removeEventListener('scroll', onScroll);
    }, [isLoading]);

    const handleFollowToggle = async () => {
        if (!currentUser || !profile || followLoading) return;
        setFollowLoading(true);
        try {
            if (isFollowing) {
                await supabase.from('follows').delete()
                    .eq('follower_id', currentUser.id)
                    .eq('following_id', profile.id);
                const wasAllied = isAllied;
                setIsFollowing(false);
                setIsAllied(false);
                setLocalAllies(prev => Math.max(prev - 1, 0));
                if (wasAllied) setLocalAllied(prev => Math.max(prev - 1, 0));
            } else {
                const { data: currentProfile } = await supabase.from('profiles').select('username')
                    .eq('id', currentUser.id).single();
                await supabase.from('follows').insert({
                    follower_id: currentUser.id,
                    follower_username: currentProfile?.username || '',
                    following_id: profile.id,
                    following_username: profile.username,
                });
                const { data: reverseFollow } = await supabase.from('follows').select('id')
                    .eq('follower_id', profile.id)
                    .eq('following_id', currentUser.id)
                    .maybeSingle();
                const nowMutual = !!reverseFollow;
                setIsFollowing(true);
                setIsAllied(nowMutual);
                setLocalAllies(prev => prev + 1);
                if (nowMutual) setLocalAllied(prev => prev + 1);
            }
            broadcastNotificationPing(profile.username);
        } catch (err) {
            console.error('Follow toggle error:', err);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleLikeUpdate = (postId: string, isLiked: boolean, likeCount: number) => {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_liked_by_me: isLiked, likes_count: likeCount } : p));
        setSelectedPost((prev: any) => prev?.id === postId ? { ...prev, is_liked_by_me: isLiked, likes_count: likeCount } : prev);
    };

    const handleSaveToggle = (post: any, isSaved: boolean) => {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_saved_by_me: isSaved } : p));
        setSelectedPost((prev: any) => prev?.id === post.id ? { ...prev, is_saved_by_me: isSaved } : prev);
    };

    // Scroll-driven close button animation
    const scrollProgress = Math.min(scrollY / 200, 1);
    const buttonScale = 1 - scrollProgress * 0.45;
    const buttonOpacity = 1 - scrollProgress * 0.25;

    return {
        profile,
        posts,
        isLoading,
        selectedPost, setSelectedPost,
        currentUser,
        activeTab, setActiveTab,
        showAvatarViewer, setShowAvatarViewer,
        isFollowing,
        isAllied,
        followLoading,
        localAllies,
        localAlling,
        localAllied,
        isOwnProfile,
        scrollRef,
        buttonScale,
        buttonOpacity,
        handleFollowToggle,
        handleLikeUpdate,
        handleSaveToggle,
    };
};
