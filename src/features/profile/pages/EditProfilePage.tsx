import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import ImageCropper from '../../../components/ui/ImageCropper';
import { motion, AnimatePresence } from 'framer-motion';

const BADGE_CONFIG: Record<string, { icon: React.ReactNode, label: string, color: string, bg: string, border: string }> = {
    verified: {
        icon: <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>,
        label: 'Verified',
        color: 'text-blue-400',
        bg: 'bg-blue-400/10',
        border: 'border-blue-500/20'
    },
    early_adopter: {
        icon: <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
        label: 'Early Member',
        color: 'text-purple-400',
        bg: 'bg-purple-400/10',
        border: 'border-purple-500/20'
    },
    contributor: {
        icon: <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6m12 5h1.5a2.5 2.5 0 0 0 0-5H18M6 4h12M6 4v10a6 6 0 0 0 12 0V4m-6 14v4m-4 0h8" /></svg>,
        label: 'Top Contributor',
        color: 'text-orange-400',
        bg: 'bg-orange-400/10',
        border: 'border-orange-500/20'
    },
    premium: {
        icon: <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 20h20M5 16l-2-6 5 2 4-8 4 8 5-2-2 6H5z" /></svg>,
        label: 'Pro Member',
        color: 'text-amber-400',
        bg: 'bg-amber-400/10',
        border: 'border-amber-500/20'
    },
    developer: {
        icon: <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 16 4-4-4-4M6 8l-4 4 4 4m8.5-12-5 16" /></svg>,
        label: 'Developer',
        color: 'text-emerald-400',
        bg: 'bg-emerald-400/10',
        border: 'border-emerald-500/20'
    }
};

export const EditProfilePage = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<{
        username: string;
        full_name: string;
        bio: string;
        avatar_url: string | null;
        location: string | null;
        website: string | null;
        badges: string[];
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [tempImage, setTempImage] = useState<string | null>(null);
    const [showAvatarMenu, setShowAvatarMenu] = useState(false);
    const [editFormData, setEditFormData] = useState({
        username: '',
        full_name: '',
        bio: '',
        location: '',
        website: '',
        badges: [] as string[]
    });
    const [editErrors, setEditErrors] = useState<{ username?: string }>({});
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (data) {
                    const profileData = {
                        username: data.username || 'user',
                        full_name: data.full_name || data.fullname || data.username || 'Allify User',
                        bio: data.bio || "Hi! I'm using Allify to expand my horizons, share my journey, and connect with a community that inspires... 🌌✨",
                        avatar_url: data.avatar_url || null,
                        location: data.location || null,
                        website: data.website || null,
                        badges: data.badges || []
                    };
                    setProfile(profileData);
                    setEditFormData({
                        username: profileData.username,
                        full_name: profileData.full_name,
                        bio: profileData.bio,
                        location: profileData.location || '',
                        website: profileData.website || '',
                        badges: profileData.badges
                    });
                }
            }
            setIsLoading(false);
        };
        fetchProfile();
    }, []);

    const getStoragePath = (url: string) => {
        try {
            const parts = url.split('/storage/v1/object/public/avatars/');
            return parts.length > 1 ? parts[1] : null;
        } catch { return null; }
    };

    const handleAvatarClick = () => {
        if (profile?.avatar_url) setShowAvatarMenu(true);
        else fileInputRef.current?.click();
    };

    const handleRemoveAvatar = async () => {
        const previousAvatarUrl = profile?.avatar_url;
        setShowAvatarMenu(false);
        setIsUploading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error("No session found");

            if (previousAvatarUrl) {
                const path = getStoragePath(previousAvatarUrl);
                if (path) await supabase.storage.from('avatars').remove([path]);
            }

            await supabase.from('profiles').update({ avatar_url: null }).eq('id', session.user.id);
            setProfile(prev => prev ? { ...prev, avatar_url: null } : null);
        } catch (err: any) {
            console.error("Error removing avatar:", err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setTempImage(reader.result as string);
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toLowerCase().replace(/\s/g, '');
        setEditFormData(prev => ({ ...prev, username: value }));

        if (value.length < 3) {
            setEditErrors(prev => ({ ...prev, username: 'Username must be at least 3 characters' }));
            return;
        }

        const usernameRegex = /^[a-zA-Z0-9._]+$/;
        if (!usernameRegex.test(value)) {
            setEditErrors(prev => ({ ...prev, username: 'Only letters, numbers, underscores, and dots allowed' }));
            return;
        }

        if (value === profile?.username) {
            setEditErrors(prev => ({ ...prev, username: undefined }));
            return;
        }

        setIsCheckingUsername(true);
        try {
            const { data } = await supabase.from('profiles').select('username').eq('username', value).maybeSingle();
            if (data) setEditErrors(prev => ({ ...prev, username: 'Username is already taken' }));
            else setEditErrors(prev => ({ ...prev, username: undefined }));
        } catch (err) {
            console.error("Error checking username availability:", err);
        } finally {
            setIsCheckingUsername(false);
        }
    };

    const handleSaveChanges = async () => {
        if (editErrors.username || !editFormData.username) return;
        setIsUploading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error("No session found");

            const { error } = await supabase.from('profiles').update({
                username: editFormData.username,
                bio: editFormData.bio,
                location: editFormData.location,
                website: editFormData.website
            }).eq('id', session.user.id);

            if (error) throw error;
            navigate('/profile');
        } catch (err: any) {
            console.error("Error saving profile:", err.message);
            alert("Failed to save changes: " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleCropComplete = async (croppedImage: Blob) => {
        const previousAvatarUrl = profile?.avatar_url;
        setTempImage(null);
        setIsUploading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error("No session found");

            const fileName = `${session.user.id}/${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, croppedImage, { contentType: 'image/jpeg', upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);

            if (previousAvatarUrl) {
                const path = getStoragePath(previousAvatarUrl);
                if (path) supabase.storage.from('avatars').remove([path]).catch(console.error);
            }

            setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
        } catch (err: any) {
            console.error("Error uploading avatar:", err.message);
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans p-4 md:p-12 overflow-y-auto">
            <div className="max-w-3xl mx-auto">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                        <div>
                            <h2 className="text-white text-3xl font-bold tracking-tight">Edit Profile</h2>
                            <p className="text-zinc-500 text-sm mt-1 font-medium">Customize your Allify presence</p>
                        </div>
                        <button
                            onClick={() => navigate('/profile')}
                            className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-8 space-y-12">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center">
                            <div onClick={handleAvatarClick} className="relative group cursor-pointer">
                                <div className="w-32 h-32 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden relative">
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                        </div>
                                    )}
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
                                        </div>
                                    )}
                                </div>
                                <div className="absolute bottom-1 right-1 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center shadow-lg">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4"><path d="M12 4v16m8-8H4" /></svg>
                                </div>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

                            <AnimatePresence>
                                {showAvatarMenu && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mt-4 flex gap-4">
                                        <button onClick={() => { setShowAvatarMenu(false); fileInputRef.current?.click(); }} className="px-4 py-2 bg-zinc-800 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-700">Change</button>
                                        <button onClick={handleRemoveAvatar} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-500/20">Remove</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest ml-1">Username</label>
                                    <div className="relative">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 font-bold">@</span>
                                        <input
                                            type="text"
                                            value={editFormData.username}
                                            onChange={handleUsernameChange}
                                            className={`w-full bg-zinc-950 border ${editErrors.username ? 'border-red-500' : 'border-zinc-800 focus:border-white'} rounded-2xl pl-10 pr-12 py-4 text-white outline-none transition-all`}
                                        />
                                        {isCheckingUsername && <div className="absolute right-5 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" />}
                                    </div>
                                    {editErrors.username && <p className="text-red-500 text-[10px] font-bold ml-1">{editErrors.username}</p>}
                                </div>
                                <div className="space-y-3">
                                    <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest ml-1">Full Name</label>
                                    <input type="text" value={editFormData.full_name} disabled className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-600 opacity-50 cursor-not-allowed" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">My Vibe</label>
                                    <span className="text-zinc-600 text-[10px] font-bold">{editFormData.bio.length}/150</span>
                                </div>
                                <textarea
                                    value={editFormData.bio}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, bio: e.target.value }))}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-white h-32 resize-none focus:border-white transition-all outline-none"
                                    maxLength={150}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Location</label>
                                        <span className="text-zinc-600 text-[10px] font-bold">{editFormData.location.length}/30</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={editFormData.location}
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-white transition-all outline-none"
                                        maxLength={30}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Website</label>
                                        <span className="text-zinc-600 text-[10px] font-bold">{editFormData.website.length}/50</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={editFormData.website}
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, website: e.target.value }))}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:border-white transition-all outline-none"
                                        maxLength={50}
                                    />
                                </div>
                            </div>

                            {/* Achievements Section */}
                            <div className="space-y-6 pt-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-6 bg-zinc-600 rounded-full"></div>
                                    <h3 className="text-zinc-500 font-black tracking-[0.2em] text-[10px] uppercase">Earned Achievements</h3>
                                </div>
                                <div className="bg-zinc-950/50 border border-zinc-800 rounded-3xl p-6">
                                    {profile?.badges && profile.badges.length > 0 ? (
                                        <div className="flex flex-wrap gap-4">
                                            {profile.badges.map(id => {
                                                const config = BADGE_CONFIG[id];
                                                if (!config) return null;
                                                return (
                                                    <div key={id} className={`flex items-center gap-3 px-4 py-2 rounded-2xl border ${config.bg} ${config.border}`}>
                                                        <span className={config.color}>{config.icon}</span>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>{config.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-zinc-600 text-xs font-medium text-center py-4 italic">No achievements unlocked yet. Keep exploring Allify!</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-zinc-800 bg-zinc-900/50 flex gap-4">
                        <button onClick={() => navigate('/profile')} className="flex-1 py-4 bg-zinc-800 rounded-2xl font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-all">Discard</button>
                        <button
                            onClick={handleSaveChanges}
                            disabled={!!editErrors.username || isCheckingUsername || isUploading}
                            className="flex-1 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 disabled:opacity-50 transition-all shadow-xl"
                        >
                            {isUploading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </motion.div>
            </div>

            <AnimatePresence>
                {tempImage && (
                    <ImageCropper
                        image={tempImage}
                        onCropComplete={handleCropComplete}
                        onCancel={() => setTempImage(null)}
                        maxDimension={1080}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
