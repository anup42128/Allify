import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { PostDetailModal } from './PostDetailModal';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchProfileViewProps {
    username: string;
    onBack?: () => void;
}

export const SearchProfileView = ({ username, onBack }: SearchProfileViewProps) => {
    const [profile, setProfile] = useState<any | null>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<any | null>(null);
    const [currentUser, setCurrentUser] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'All' | 'Photos' | 'Videos'>('All');
    const [scrollY, setScrollY] = useState(0);
    const [showAvatarViewer, setShowAvatarViewer] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

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
                        bio: profileData.bio || null,
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

    // Track scroll position to gradually shrink close button
    useEffect(() => {
        if (isLoading) return;
        const el = scrollRef.current;
        if (!el) return;
        const onScroll = () => setScrollY(el.scrollTop);
        el.addEventListener('scroll', onScroll);
        return () => el.removeEventListener('scroll', onScroll);
    }, [isLoading]);

    // Compute button scale & opacity based on scroll (shrinks over first 200px of scroll)
    const scrollProgress = Math.min(scrollY / 200, 1);
    const buttonScale = 1 - scrollProgress * 0.45;
    const buttonOpacity = 1 - scrollProgress * 0.25;

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
        <div ref={scrollRef} className="flex-1 h-full overflow-y-auto bg-black relative">
            <div className="min-h-full flex flex-col pt-16 px-10 max-w-5xl mx-auto pb-20">
                {/* Close Button - smoothly shrinks as user scrolls */}
                {onBack && (
                    <motion.button
                        onClick={onBack}
                        title="Close profile"
                        animate={{
                            scale: buttonScale,
                            opacity: buttonOpacity,
                        }}
                        whileHover={{ scale: Math.max(buttonScale, 0.75), opacity: 1 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="fixed top-5 right-8 p-3 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full border border-zinc-800/50 z-50 backdrop-blur-md shadow-xl"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </motion.button>
                )}

                {/* Profile Header */}
                <div className="flex flex-col items-center text-center mb-16 relative">
                    <div className="relative mb-6">
                        <div
                            onClick={() => profile.avatar_url && setShowAvatarViewer(true)}
                            className={`w-40 h-40 rounded-full bg-zinc-900 flex items-center justify-center border-[1px] border-zinc-700 relative z-10 overflow-hidden ${profile.avatar_url ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
                        >
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
                        {profile.bio && (
                            <p className="text-zinc-300 max-w-sm leading-relaxed text-sm mx-auto mb-6 break-words whitespace-pre-wrap overflow-hidden">
                                {profile.bio}
                            </p>
                        )}

                        {/* Location and Connections Display */}
                        <div className="flex flex-wrap justify-center items-center gap-6 text-zinc-500 font-medium text-[11px] tracking-wider uppercase">
                            {profile.location && (
                                <div className="flex items-center gap-2 group/info cursor-default hover:text-zinc-300 transition-colors">
                                    <div className="p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50 group-hover/info:border-zinc-700/50 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 group-hover/info:text-zinc-400"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                    </div>
                                    <span className="font-black">{profile.location}</span>
                                </div>
                            )}
                            {profile.website && (
                                <a
                                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 group/info hover:text-white transition-colors"
                                    onClick={(e) => e.stopPropagation()} // Prevent modal close if clicking inside
                                >
                                    <div className="p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50 group-hover/info:border-indigo-500/30 group-hover/info:bg-indigo-500/5 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 group-hover/info:text-indigo-400"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                    </div>
                                    <span className="font-black underline underline-offset-4 decoration-zinc-800 group-hover/info:decoration-indigo-500/50 decoration-2 transition-all">{profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                                </a>
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
                    {posts.filter(post => {
                        if (activeTab === 'All') return true;
                        if (activeTab === 'Photos') return post.type === 'photo' || !post.type;
                        if (activeTab === 'Videos') return post.type === 'video';
                        return false;
                    }).length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center justify-center">
                            {activeTab === 'Videos' ? (
                                <div className="flex flex-col items-center justify-center gap-4 text-center px-4 mb-4">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-500/10 to-orange-500/10 flex items-center justify-center border border-red-500/20 mb-2">
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-red-500/80">
                                            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-white tracking-tight">Videos Coming Soon</h3>
                                    <p className="text-zinc-500 font-medium text-sm max-w-[250px] leading-relaxed">
                                        There are no videos here yet.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full border border-zinc-800 flex items-center justify-center mx-auto mb-4 bg-zinc-900/50">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 text-zinc-500">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-white text-xl font-bold mb-2">No {activeTab === 'Photos' ? 'Photos' : 'Posts'} Yet</h3>
                                    <p className="text-zinc-500 max-w-md mx-auto leading-relaxed">
                                        {profile.username} hasn't posted any {activeTab === 'Photos' ? 'photos' : 'posts'} yet.
                                    </p>
                                </>
                            )}
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
                                            src={post.video_url}
                                            className="w-full h-full object-cover relative z-10"
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
                                        <>
                                            {/* Loading State (Spinner + Pulse) */}
                                            <div id={`search-loader-${post.id}`} className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-20">
                                                <div className="absolute inset-0 animate-pulse bg-zinc-800/50" />
                                                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin relative z-30" />
                                            </div>
                                            <img 
                                                src={post.image_url} 
                                                alt="Post" 
                                                className="w-full h-full object-cover relative z-10 opacity-0 transition-opacity duration-700"
                                                onLoad={(e) => {
                                                    const img = e.target as HTMLImageElement;
                                                    img.classList.remove('opacity-0');
                                                    img.classList.add('opacity-100');
                                                    document.getElementById(`search-loader-${post.id}`)?.classList.add('hidden');
                                                }}
                                            />
                                        </>
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
                        postAuthor={profile} // Send the profile owner's details here
                        onClose={() => setSelectedPost(null)}
                        onDelete={() => {}} // User shouldn't be able to delete other's posts
                        onLikeUpdate={handleLikeUpdate}
                        onSaveToggle={handleSaveToggle}
                        hideDeleteButton={true}
                    />
                )}
            </AnimatePresence>

            {/* Avatar Viewer Modal */}
            <AnimatePresence>
                {showAvatarViewer && profile?.avatar_url && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAvatarViewer(false)}
                            className="absolute inset-0 bg-black backdrop-blur-md"
                        />
                        
                        {/* Animated Close Hint - Right Side */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: [0, 1, 1, 0], x: [20, 0, 0, 0] }}
                            transition={{ duration: 4.5, times: [0, 0.1, 0.8, 1], ease: "easeInOut" }}
                            className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-3 text-zinc-400 pointer-events-none z-50 mix-blend-difference"
                        >
                            <span className="text-sm font-medium tracking-widest uppercase">Click outside to close</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 animate-pulse"><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" /></svg>
                        </motion.div>

                        {/* Animated Close Hint - Left Side */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: [0, 1, 1, 0], x: [-20, 0, 0, 0] }}
                            transition={{ duration: 4.5, times: [0, 0.1, 0.8, 1], ease: "easeInOut" }}
                            className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-row-reverse items-center gap-3 text-zinc-400 pointer-events-none z-50 mix-blend-difference"
                        >
                            <span className="text-sm font-medium tracking-widest uppercase">Click outside to close</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 animate-pulse"><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" /></svg>
                        </motion.div>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative aspect-square w-full max-w-[500px] overflow-hidden rounded-full border border-zinc-800 shadow-2xl bg-zinc-950"
                        >
                            {/* Loading state */}
                            <div id="search-avatar-viewer-loader" className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-20">
                                <div className="absolute inset-0 animate-pulse bg-zinc-800/50" />
                                <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin relative z-30" />
                            </div>
                            <img
                                src={profile.avatar_url}
                                alt={profile.username}
                                className="w-full h-full object-cover relative z-10 opacity-0 transition-opacity duration-700"
                                onLoad={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    img.classList.remove('opacity-0');
                                    img.classList.add('opacity-100');
                                    document.getElementById('search-avatar-viewer-loader')?.classList.add('hidden');
                                }}
                            />
                            <button
                                onClick={() => setShowAvatarViewer(false)}
                                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/10 flex items-center justify-center hover:bg-black/70 transition-colors z-30"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
