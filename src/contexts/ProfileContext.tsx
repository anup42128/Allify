import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ProfileContextType {
    profile: any | null;
    posts: any[];
    savedPosts: any[];
    likedPosts: any[];
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
    updatePostsLocally: (postId: string, updates: Partial<any>) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [profile, setProfile] = useState<any | null>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [savedPosts, setSavedPosts] = useState<any[]>([]);
    const [likedPosts, setLikedPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refreshProfile = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setIsLoading(false);
                return;
            }

            const userId = session.user.id;

            // Fetch profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileData) {
                // Fetch live counts
                const [{ count: alliesCount }, { count: allingCount }] = await Promise.all([
                    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
                    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
                ]);
                
                const { data: allingIds } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
                const { count: alliedCount } = await supabase
                    .from('follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('following_id', userId)
                    .in('follower_id', allingIds?.map((r: any) => r.following_id) ?? []);

                const enrichedProfile = {
                    ...profileData,
                    id: userId,
                    username: profileData.username || 'user',
                    full_name: profileData.full_name || profileData.fullname || profileData.username || 'Allify User',
                    bio: profileData.bio || null,
                    allies_count: alliesCount ?? 0,
                    alling_count: allingCount ?? 0,
                    allied_count: alliedCount ?? 0
                };
                setProfile(enrichedProfile);

                // Fetch posts
                const { data: postsData } = await supabase
                    .from('posts')
                    .select('*')
                    .eq('username', enrichedProfile.username)
                    .order('created_at', { ascending: false });

                let enrichedPosts = postsData || [];

                // Fetch likes/saves to hydrate posts
                if (enrichedPosts.length > 0) {
                    const { data: userLikes } = await supabase
                        .from('likes')
                        .select('post_id')
                        .eq('username', enrichedProfile.username)
                        .in('post_id', enrichedPosts.map(p => p.id));

                    const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);

                    const { data: userSaves } = await supabase
                        .from('saved_posts')
                        .select('post_id')
                        .eq('user_id', userId)
                        .in('post_id', enrichedPosts.map(p => p.id));

                    const savedPostIds = new Set(userSaves?.map(s => s.post_id) || []);

                    enrichedPosts = enrichedPosts.map(p => ({
                        ...p,
                        is_liked_by_me: likedPostIds.has(p.id),
                        is_saved_by_me: savedPostIds.has(p.id)
                    }));
                }

                setPosts(enrichedPosts);

                // Fetch raw saved/liked grids
                const { data: userSavesFull } = await supabase
                    .from('saved_posts')
                    .select(`*, post:post_id(*)`)
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });
                setSavedPosts(userSavesFull?.map(s => s.post).filter(Boolean) || []);

                const { data: userLikesFull } = await supabase
                    .from('likes')
                    .select(`*, post:post_id(*)`)
                    .eq('username', enrichedProfile.username)
                    .order('created_at', { ascending: false });
                setLikedPosts(userLikesFull?.map(l => l.post).filter(Boolean) || []);
            }
        } catch (err) {
            console.error("Error refreshing profile cache:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const updatePostsLocally = (postId: string, updates: Partial<any>) => {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));
        setSavedPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));
        setLikedPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));
    };

    useEffect(() => {
        refreshProfile();
    }, []);

    return (
        <ProfileContext.Provider value={{ profile, posts, savedPosts, likedPosts, isLoading, refreshProfile, updatePostsLocally }}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfileContext = () => {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        throw new Error('useProfileContext must be used within a ProfileProvider');
    }
    return context;
};
