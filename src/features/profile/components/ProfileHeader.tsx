import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import ImageCropper from '../../../components/ui/ImageCropper';
import { ConnectionNoteModal } from './ConnectionNoteModal';

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
    const [isMessageOpen, setIsMessageOpen] = useState(false);

    const handleAddAvatarClick = () => {
        fileInputRef.current?.click();
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

    const statItems = [
        { label: 'Posts', value: stats.posts },
        { label: 'Allies', value: stats.allies > 999 ? (stats.allies / 1000).toFixed(1) + 'k' : stats.allies },
        { label: 'Alling', value: stats.alling },
        { label: 'Allied', value: stats.allied },
    ];

    return (
        <>
            <div className="flex flex-col mb-4 md:mb-16 md:items-center md:text-center">

            {/* ─── MOBILE-ONLY: Premium Identity Layout ─── */}
            <div className="md:hidden relative overflow-hidden">
                {/* Top section: avatar + name + mini stats */}
                <div className="flex items-start gap-4 px-4 pt-5 pb-4 relative z-10">
                    {/* Avatar with glow ring */}
                    <div className="relative flex-shrink-0">
                        <div className="absolute -inset-[3px] rounded-full bg-gradient-to-br from-indigo-500/50 via-purple-500/20 to-transparent blur-[6px]" />
                        <div
                            onClick={profile?.avatar_url ? onAvatarClick : handleAddAvatarClick}
                            className={`w-[78px] h-[78px] rounded-full bg-zinc-900 border border-zinc-700/60 relative z-10 overflow-hidden cursor-pointer ${isUploading ? 'opacity-50' : ''}`}
                        >
                            {profile?.avatar_url ? (
                                <>
                                    <div id="avatar-loader-m" className="absolute inset-0 animate-pulse bg-zinc-800 z-20" />
                                    <img
                                        src={profile.avatar_url}
                                        alt={profile.username}
                                        className="w-full h-full object-cover opacity-0 transition-opacity duration-500 relative z-10"
                                        onLoad={(e) => {
                                            (e.target as HTMLImageElement).classList.remove('opacity-0');
                                            document.getElementById('avatar-loader-m')?.classList.add('hidden');
                                        }}
                                    />
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-zinc-600">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="text-[9px] text-zinc-600 font-bold tracking-wider">ADD</span>
                                </div>
                            )}
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40">
                                    <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
                                </div>
                            )}
                        </div>
                        {/* Edit pencil for existing avatar */}
                        {profile?.avatar_url && (
                            <div
                                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                className="absolute -bottom-0.5 -right-0.5 w-[22px] h-[22px] bg-indigo-600 rounded-full border-2 border-black flex items-center justify-center z-20 cursor-pointer shadow-lg"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5 text-white">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Name + Username + Badge icons + Bio */}
                    <div className="flex-1 min-w-0 pt-1 flex flex-col min-h-[78px]">
                        <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                    <h1 className="text-white text-[17px] font-black tracking-tight leading-tight">
                                        {profile?.full_name || 'Allify User'}
                                    </h1>
                                    {profile?.badges?.includes('verified') && (
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[15px] h-[15px] text-blue-500 flex-shrink-0">
                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                        </svg>
                                    )}
                                    {profile?.badges?.includes('premium') && (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-[15px] h-[15px] text-amber-400 flex-shrink-0">
                                            <path d="M2 20h20M5 16l-2-6 5 2 4-8 4 8 5-2-2 6H5z" />
                                        </svg>
                                    )}
                                    {profile?.badges?.includes('developer') && (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-[15px] h-[15px] text-emerald-400 flex-shrink-0">
                                            <path d="m18 16 4-4-4-4M6 8l-4 4 4 4m8.5-12-5 16" />
                                        </svg>
                                    )}
                                </div>
                                <p className="text-zinc-500 text-[12px] font-medium mb-1">@{profile?.username}</p>
                            </div>

                            {/* Aesthetic Connection Dot */}
                            <button
                                onClick={() => setIsMessageOpen(true)}
                                className="flex-shrink-0 mt-1 relative w-3.5 h-3.5 group"
                            >
                                <span className="absolute inset-0 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] group-hover:shadow-[0_0_12px_rgba(99,102,241,0.9)] transition-shadow" />
                            </button>
                        </div>

                        {/* Bio, Location, Website */}
                        <div className="flex flex-col gap-1.5 mt-1">
                            {profile?.bio && (
                                <p className="text-zinc-300 text-[13px] leading-[1.4] break-words whitespace-pre-wrap">
                                    {profile.bio}
                                </p>
                            )}
                            {(profile?.location || profile?.website) && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 font-medium">
                                    {profile?.location && (
                                        <div className="flex items-center gap-1">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                            <span className="truncate max-w-[120px]">{profile.location}</span>
                                        </div>
                                    )}
                                    {profile?.website && (
                                        <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                            <span className="truncate max-w-[120px]">{profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                                        </a>
                                    )}
                                </div>
                            )}
                            {!profile?.bio && !profile?.location && !profile?.website && (
                                <button onClick={() => navigate('/profile/edit')} className="text-[11px] text-zinc-600 text-left hover:text-zinc-400 transition-colors">
                                    + Add bio or location
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                {/* Full-width Stats Strip */}
                <div className="flex items-stretch mx-4 mt-4 rounded-2xl overflow-hidden border border-zinc-800/50 bg-gradient-to-b from-zinc-900/80 to-zinc-900/40">
                    {statItems.map((stat, i) => (
                        <div
                            key={stat.label}
                            className={`flex-1 flex flex-col items-center justify-center py-3.5 gap-0.5 ${i < statItems.length - 1 ? 'border-r border-zinc-800/50' : ''}`}
                        >
                            <span className="text-white text-[19px] font-black leading-none tracking-tight">{stat.value}</span>
                            <span className="text-zinc-600 text-[9px] font-bold tracking-[0.14em] uppercase">{stat.label}</span>
                        </div>
                    ))}
                </div>


                {/* Action Buttons */}
                <div className="flex justify-center gap-3 px-4 mt-4">
                    <button
                        onClick={() => navigate('/profile/edit')}
                        className="flex-1 max-w-[160px] group focus:outline-none"
                    >
                        <div className="w-full py-2 rounded-full bg-white text-black text-[13px] font-extrabold tracking-wider group-hover:bg-zinc-200 transition-all duration-200 group-active:scale-[0.97]">
                            EDIT PROFILE
                        </div>
                    </button>
                    <button className="flex-1 max-w-[160px] group focus:outline-none">
                        <div className="w-full py-2 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center gap-1.5 text-white group-hover:bg-zinc-700 transition-all duration-200 group-active:scale-[0.97] text-[13px] font-extrabold tracking-wider">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                <polyline points="16 6 12 2 8 6" />
                                <line x1="12" y1="2" x2="12" y2="15" />
                            </svg>
                            SHARE
                        </div>
                    </button>
                </div>



                {/* Other badges (not verified/premium/developer — already inline above) */}
                {profile?.badges && profile.badges.filter((b: string) => !['verified', 'premium', 'developer'].includes(b)).length > 0 && (
                    <div className="flex flex-wrap gap-2 px-4 pb-3">
                        {profile.badges.filter((b: string) => !['verified', 'premium', 'developer'].includes(b)).map((badgeId: string) => {
                            const config = BADGE_CONFIG[badgeId];
                            if (!config) return null;
                            return (
                                <div key={badgeId} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black tracking-wider uppercase ${config.bg} ${config.border} ${config.color}`}>
                                    {config.icon}{config.label}
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>

            {/* ─── DESKTOP: Original Centered Layout (Unchanged) ─── */}
            <div className="hidden md:flex flex-col items-center text-center">
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
                                <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full" />
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
                </div>

                <div className="mb-8">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <h2 className="text-white text-3xl font-bold tracking-tight">{profile?.full_name || 'Allify User'}</h2>
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-blue-500">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                    </div>
                    <p className="text-zinc-500 font-medium mb-4 text-sm">@{profile?.username}</p>
                    {profile?.bio && (
                        <p className="text-zinc-300 max-w-sm leading-relaxed text-sm mx-auto mb-6 break-words whitespace-pre-wrap overflow-hidden">{profile.bio}</p>
                    )}
                    <div className="flex flex-wrap justify-center items-center gap-6 text-zinc-500 font-medium text-[11px] tracking-wider uppercase">
                        {profile?.location && (
                            <div className="flex items-center gap-2 group/info cursor-default hover:text-zinc-300 transition-colors">
                                <div className="p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                </div>
                                <span className="font-black">{profile.location}</span>
                            </div>
                        )}
                        {profile?.website && (
                            <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group/info hover:text-white transition-colors">
                                <div className="p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                </div>
                                <span className="font-black underline underline-offset-4">{profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
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
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bg} ${config.border}`}
                                        >
                                            <span className={config.color}>{config.icon}</span>
                                            <span className={`text-[9px] font-black tracking-[0.15em] uppercase ${config.color}`}>{config.label}</span>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 md:flex justify-center gap-3 md:gap-4 w-full max-w-4xl px-4 md:px-0">
                    {[
                        { label: 'POSTS', value: stats.posts },
                        { label: 'ALLIES', value: stats.allies > 999 ? (stats.allies / 1000).toFixed(1) + 'k' : stats.allies },
                        { label: 'ALLING', value: stats.alling },
                        { label: 'ALLIED', value: stats.allied }
                    ].map((stat, i) => (
                        <div key={i} className="flex-1 bg-zinc-800/25 border border-zinc-800/40 rounded-2xl py-6 px-4 md:min-w-[180px] md:px-10 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-800/40 transition-colors">
                            <p className="text-white text-xl font-bold mb-1 tracking-tight">{stat.value}</p>
                            <p className="text-zinc-500 text-[10px] font-bold tracking-[0.2em] uppercase">{stat.label}</p>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row gap-3 mt-8 md:mt-10 w-full px-6 md:w-auto md:px-0">
                    <button
                        onClick={() => navigate('/profile/edit')}
                        className="w-full md:w-auto px-8 py-2.5 bg-white text-black rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors"
                    >
                        Edit Profile
                    </button>
                    <button className="w-full md:w-auto px-8 py-2.5 bg-zinc-900 border border-zinc-700 text-white rounded-full text-sm font-bold hover:bg-zinc-800 transition-colors">
                        Shared Allies
                    </button>
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />

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

            <ConnectionNoteModal 
                isOpen={isMessageOpen} 
                onClose={() => setIsMessageOpen(false)} 
                fullName={profile?.full_name} 
            />
        </>
    );
};
