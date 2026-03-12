import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { PostDetailModal } from './PostDetailModal';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchProfileViewProps {
    username: string;
}

export const SearchProfileView = ({ username }: SearchProfileViewProps) => {
    const [profile, setProfile] = useState<any | null>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<any | null>(null);
    const [currentUser, setCurrentUser] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'All' | 'Photos' | 'Videos'>('All');

    useEffect(() => {
        const fetchUserAndProfile = async () => {
            setIsLoading(true);
            try {
                // Get current user for the PostDetailModal
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const { data: currentUserProfile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();
                    if (currentUserProfile) setCurrentUser(currentUserProfile);
                }

                // Fetch target profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('username', username)
                    .single();

                if (profileError) throw profileError;

                if (profileData) {
                    setProfile({
                        id: profileData.id,
                        username: profileData.username || 'user',
                        full_name: profileData.full_name || profileData.username || 'Allify User',
                        bio: profileData.bio || "Hi! I'm using Allify to expand my horizons, share my journey, and connect with a community that inspires... 🌌✨",
                        avatar_url: profileData.avatar_url || null,
                        location: profileData.location || null,
                        website: profileData.website || null,
                        badges: profileData.badges || [],
                        allies_count: profileData.allies_count || 0,
                        alling_count: profileData.alling_count || 0,
                        allied_count: profileData.allied_count || 0
                    });

                    // Fetch target posts
                    const { data: postsData, error: postsError } = await supabase
                        .from('posts')
                        .select('*')
                        .eq('username', username)
                        .order('created_at', { ascending: false });

                    if (postsError) throw postsError;

                    let enrichedPosts = postsData || [];

                    // Fetch likes for these posts if logged in
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

                            // Fetch saves
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
                    
                    setPosts(enrichedPosts);
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserAndProfile();
    }, [username]);

    const handleLikeUpdate = (postId: string, isLiked: boolean, likeCount: number) => {
        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, is_liked_by_me: isLiked, likes_count: likeCount } : p
        ));
        setSelectedPost((prev: any) => prev?.id === postId ? { ...prev, is_liked_by_me: isLiked, likes_count: likeCount } : prev);
    };

    const handleSaveToggle = (post: any, isSaved: boolean) => {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_saved_by_me: isSaved } : p));
        setSelectedPost((prev: any) => prev?.id === post.id ? { ...prev, is_saved_by_me: isSaved } : prev);
    };

    if (isLoading) {
        return (
            <div className="flex-1 h-full flex items-center justify-center bg-black">
                <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex-1 h-full flex flex-col items-center justify-center bg-black text-center px-6">
                <p className="text-zinc-500 mb-4 text-lg">User not found.</p>
            </div>
        );
    }

    const stats = {
        posts: posts.length,
        allies: profile.allies_count ?? 0,
        alling: profile.alling_count ?? 0,
        allied: profile.allied_count ?? 0
    };

    return (
        <div className="flex-1 h-full overflow-y-auto bg-black relative">
            <div className="min-h-full flex flex-col pt-16 px-10 max-w-5xl mx-auto pb-20">
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center mb-16">
                    <div className="relative mb-6">
                        <div className="w-40 h-40 rounded-full bg-zinc-900 flex items-center justify-center border-[1px] border-zinc-700 relative z-10 overflow-hidden">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                            ) : (
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-24 h-24 text-zinc-600">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                            )}
                        </div>
                    </div>

                    <div className="mb-8">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <h2 className="text-white text-3xl font-bold tracking-tight">{profile.full_name}</h2>
                        </div>
                        <p className="text-zinc-500 font-medium mb-4 text-sm">@{profile.username}</p>
                        <p className="text-zinc-300 max-w-sm leading-relaxed text-sm mx-auto mb-6">
                            {profile.bio}
                        </p>

                        <div className="flex flex-wrap justify-center items-center gap-6 text-zinc-500 font-medium text-[11px] tracking-wider uppercase">
                            {profile.location && (
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                    </div>
                                    <span className="font-black">{profile.location}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex justify-center gap-4 w-full max-w-2xl px-4">
                        {[
                            { label: 'POSTS', value: stats.posts },
                            { label: 'ALLIES', value: stats.allies },
                            { label: 'ALLING', value: stats.alling },
                            { label: 'ALLIED', value: stats.allied }
                        ].map((stat, i) => (
                            <div key={i} className="flex-1 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl py-5 px-4">
                                <p className="text-white text-xl font-bold mb-1 tracking-tight">{stat.value}</p>
                                <p className="text-zinc-600 text-[10px] font-black tracking-[0.2em]">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-10">
                        <button className="px-8 py-2.5 bg-white text-black rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors">
                            Follow
                        </button>
                        <button className="px-8 py-2.5 bg-zinc-800 text-white border border-zinc-700 rounded-full text-sm font-bold hover:bg-zinc-700 transition-colors">
                            Message
                        </button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center justify-center gap-40 border-t border-zinc-800/50 mb-8 pt-6">
                    {(['All', 'Photos', 'Videos'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 px-2 text-sm font-bold tracking-wider uppercase transition-all relative ${activeTab === tab ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="searchTabIndicator"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* Posts Grid Layout */}
                <div className="w-full">
                    {posts.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 rounded-full border border-zinc-800 flex items-center justify-center mx-auto mb-4 bg-zinc-900/50">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 text-zinc-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                </svg>
                            </div>
                            <h3 className="text-white text-xl font-bold mb-2">No Posts Yet</h3>
                            <p className="text-zinc-500 max-w-md mx-auto leading-relaxed">
                                {profile.username} hasn't posted anything yet.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 auto-rows-[1fr]">
                            {posts
                                .filter(post => {
                                    if (activeTab === 'All') return true;
                                    if (activeTab === 'Photos') return post.type === 'photo' || !post.type;
                                    if (activeTab === 'Videos') return post.type === 'video';
                                    return false;
                                })
                                .map((post) => (
                                <motion.div
                                    key={post.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="relative aspect-square group cursor-pointer w-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 transition-colors"
                                    onClick={() => setSelectedPost(post)}
                                >
                                    {post.type === 'video' ? (
                                        <video
                                            src={post.media_url}
                                            className="w-full h-full object-cover"
                                            muted
                                            loop
                                            playsInline
                                            onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                                            onMouseOut={(e) => {
                                                const video = e.target as HTMLVideoElement;
                                                video.pause();
                                                video.currentTime = 0;
                                            }}
                                        />
                                    ) : (
                                        <img src={post.media_url} alt="Post" className="w-full h-full object-cover" />
                                    )}

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-6 backdrop-blur-[2px]">
                                        <div className="flex items-center gap-2 text-white font-bold transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                            <svg viewBox="0 0 24 24" fill={post.is_liked_by_me ? "#ef4444" : "currentColor"} className="w-6 h-6">
                                                <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
                                            </svg>
                                            <span className="text-lg">{post.likes_count || 0}</span>
                                        </div>
                                    </div>

                                    {post.type === 'video' && (
                                        <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 group-hover:opacity-0 transition-opacity">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                                                <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06Z" />
                                            </svg>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Post Modal Component */}
            <AnimatePresence>
                {selectedPost && currentUser && (
                    <PostDetailModal
                        post={selectedPost}
                        currentUser={currentUser}
                        onClose={() => setSelectedPost(null)}
                        onDelete={() => {}} // User shouldn't be able to delete other's posts
                        onLikeUpdate={handleLikeUpdate}
                        onSaveToggle={handleSaveToggle}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
