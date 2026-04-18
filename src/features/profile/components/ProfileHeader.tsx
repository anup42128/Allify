import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import ImageCropper from '../../../components/ui/ImageCropper';

export const BADGE_CONFIG: Record<string, { icon: React.ReactNode, label: string, color: string, bg: string, border: string }> = {
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

interface ProfileHeaderProps {
    profile: any;
    stats: {
        posts: number;
        allies: number;
        alling: number;
        allied: number;
    };
    onAvatarClick: () => void;
    setProfile: React.Dispatch<React.SetStateAction<any>>;
}

export const ProfileHeader = ({ profile, stats, onAvatarClick, setProfile }: ProfileHeaderProps) => {
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [tempImage, setTempImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleAddAvatarClick = () => {
        if (!profile?.avatar_url) fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file for your avatar.');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => setTempImage(reader.result as string);
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const handleCropComplete = async (croppedImage: Blob) => {
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

            setProfile((prev: any) => prev ? { ...prev, avatar_url: publicUrl } : null);
        } catch (err: any) {
            console.error("Error uploading avatar:", err.message);
            alert("Failed to upload avatar: " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center text-center mb-16">
            {/* Avatar block */}
            <div className="relative mb-6 group/avatar">
                <div
                    onClick={profile?.avatar_url ? onAvatarClick : undefined}
                    className={`w-40 h-40 rounded-full bg-zinc-900 flex items-center justify-center border-[1px] border-zinc-700 relative z-10 overflow-hidden transition-all ${profile?.avatar_url ? 'cursor-pointer hover:opacity-90' : ''} ${isUploading ? 'opacity-50' : ''}`}
                >
                    {profile?.avatar_url ? (
                        <>
                            <div id="avatar-loader" className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-20">
                                <div className="absolute inset-0 animate-pulse bg-zinc-800/50" />
                                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin relative z-30" />
                            </div>
                            <img
                                src={profile.avatar_url}
                                alt={profile.username}
                                className="w-full h-full object-cover relative z-10 opacity-0 transition-opacity duration-700"
                                onLoad={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    img.classList.remove('opacity-0');
                                    img.classList.add('opacity-100');
                                    document.getElementById('avatar-loader')?.classList.add('hidden');
                                }}
                            />
                        </>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-24 h-24 text-zinc-600">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                    )}
                    {isUploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40">
                            <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full"></div>
                        </div>
                    )}
                </div>

                {!profile?.avatar_url && (
                    <div
                        onClick={handleAddAvatarClick}
                        className="absolute bottom-2 right-2 w-10 h-10 bg-zinc-800 rounded-full border-4 border-black flex items-center justify-center z-20 hover:scale-110 hover:bg-zinc-700 transition-all cursor-pointer"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-white">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                />
            </div>

            {/* Profile Info block */}
            <div className="mb-8">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <h2 className="text-white text-3xl font-bold tracking-tight">{profile?.full_name || 'Allify User'}</h2>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-blue-500">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                </div>
                <p className="text-zinc-500 font-medium mb-4 text-sm">@{profile?.username}</p>
                {profile?.bio && (
                    <p className="text-zinc-300 max-w-sm leading-relaxed text-sm mx-auto mb-6 break-words whitespace-pre-wrap overflow-hidden">
                        {profile.bio}
                    </p>
                )}

                <div className="flex flex-wrap justify-center items-center gap-6 text-zinc-500 font-medium text-[11px] tracking-wider uppercase">
                    {profile?.location && (
                        <div className="flex items-center gap-2 group/info cursor-default hover:text-zinc-300 transition-colors">
                            <div className="p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50 group-hover/info:border-zinc-700/50 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 group-hover/info:text-zinc-400"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                            </div>
                            <span className="font-black">{profile.location}</span>
                        </div>
                    )}
                    {profile?.website && (
                        <a
                            href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 group/info hover:text-white transition-colors"
                        >
                            <div className="p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50 group-hover/info:border-indigo-500/30 group-hover/info:bg-indigo-500/5 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 group-hover/info:text-indigo-400"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                            </div>
                            <span className="font-black underline underline-offset-4 decoration-zinc-800 group-hover/info:decoration-indigo-500/50 decoration-2 transition-all">{profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                        </a>
                    )}
                </div>

                {profile?.badges && profile.badges.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2.5 mt-6">
                        <AnimatePresence mode="popLayout">
                            {profile.badges.map((badgeId: string) => {
                                const config = BADGE_CONFIG[badgeId];
                                if (!config) return null;
                                return (
                                    <motion.div
                                        key={badgeId}
                                        layout
                                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bg} ${config.border} backdrop-blur-md group/badge cursor-default hover:bg-white/5 transition-all outline-none`}
                                    >
                                        <span className={`${config.color}`}>{config.icon}</span>
                                        <span className={`text-[9px] font-black tracking-[0.15em] uppercase ${config.color} opacity-90 group-hover/badge:opacity-100 transition-opacity`}>
                                            {config.label}
                                        </span>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Stat Blocks */}
            <div className="flex justify-center gap-4 w-full max-w-2xl px-4">
                {[
                    { label: 'POSTS', value: stats.posts },
                    { label: 'ALLIES', value: stats.allies > 999 ? (stats.allies / 1000).toFixed(1) + 'k' : stats.allies },
                    { label: 'ALLING', value: stats.alling },
                    { label: 'ALLIED', value: stats.allied }
                ].map((stat, i) => (
                    <div key={i} className="flex-1 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl py-5 px-4 cursor-pointer">
                        <p className="text-white text-xl font-bold mb-1 tracking-tight">{stat.value}</p>
                        <p className="text-zinc-600 text-[10px] font-black tracking-[0.2em]">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="flex gap-3 mt-10">
                <button
                    onClick={() => navigate('/profile/edit')}
                    className="px-8 py-2.5 bg-white text-black rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors"
                >
                    Edit Profile
                </button>
                <button className="px-8 py-2.5 bg-zinc-900 border border-zinc-700 text-white rounded-full text-sm font-bold hover:bg-zinc-800 transition-colors">
                    Shared Allies
                </button>
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
