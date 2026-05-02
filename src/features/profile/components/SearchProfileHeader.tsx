import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface SearchProfileHeaderProps {
    profile: any;
    posts: any[];
    isOwnProfile: boolean;
    isFollowing: boolean;
    isAllied: boolean;
    followLoading: boolean;
    localAllies: number;
    localAlling: number;
    localAllied: number;
    onFollowToggle: () => void;
    onAvatarClick: () => void;
}

export const SearchProfileHeader = ({
    profile,
    posts,
    isOwnProfile,
    isFollowing,
    isAllied,
    followLoading,
    localAllies,
    localAlling,
    localAllied,
    onFollowToggle,
    onAvatarClick,
}: SearchProfileHeaderProps) => {
    const navigate = useNavigate();

    const statItems = [
        { label: 'POSTS', value: posts.length },
        { label: 'ALLIES', value: localAllies > 999 ? (localAllies / 1000).toFixed(1) + 'k' : localAllies },
        { label: 'ALLING', value: localAlling },
        { label: 'ALLIED', value: localAllied },
    ];

    return (
        <>
            {/* ─── MOBILE-ONLY: Premium Identity Layout ─── */}
            <div className="md:hidden flex flex-col w-full pb-4">
                {/* Premium Identity Layout (Side-by-side Avatar and Info) */}
                <div className="flex gap-4 px-4 py-2 items-start relative mt-2">
                    {/* Avatar with glow ring */}
                    <div className="relative flex-shrink-0">
                        <div className="absolute -inset-[3px] rounded-full bg-gradient-to-br from-indigo-500/50 via-purple-500/20 to-transparent blur-[6px]" />
                        <div
                            onClick={() => profile.avatar_url && onAvatarClick()}
                            className={`w-[78px] h-[78px] rounded-full bg-zinc-900 border border-zinc-700/60 relative z-10 overflow-hidden ${profile.avatar_url ? 'cursor-pointer' : ''}`}
                        >
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                            ) : (
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-zinc-600 m-auto mt-3">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                            )}
                        </div>
                    </div>

                    {/* Name + Username + Badges + Bio */}
                    <div className="flex-1 min-w-0 pt-1 flex flex-col min-h-[78px]">
                        <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                    <h1 className="text-white text-[17px] font-black tracking-tight leading-tight truncate">
                                        {profile.full_name}
                                    </h1>
                                    {profile.badges?.includes('verified') && (
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[15px] h-[15px] text-blue-500 flex-shrink-0"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                                    )}
                                </div>
                                <p className="text-zinc-500 text-[12px] font-medium mb-1 truncate">@{profile.username}</p>
                            </div>
                        </div>

                        {/* Bio, Location, Website */}
                        <div className="flex flex-col gap-1.5 mt-1">
                            {profile.bio && (
                                <p className="text-zinc-300 text-[13px] leading-[1.4] break-words whitespace-pre-wrap">
                                    {profile.bio}
                                </p>
                            )}
                            {(profile.location || profile.website) && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 font-medium">
                                    {profile.location && (
                                        <div className="flex items-center gap-1">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                            <span className="truncate max-w-[120px]">{profile.location}</span>
                                        </div>
                                    )}
                                    {profile.website && (
                                        <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                            <span className="truncate max-w-[120px]">{profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Full-width Stats Strip */}
                <div className="flex items-stretch mx-4 mt-1 rounded-2xl overflow-hidden border border-zinc-800/50 bg-gradient-to-b from-zinc-900/80 to-zinc-900/40">
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
                {!isOwnProfile && (
                    <div className="flex gap-3 px-4 mt-4">
                        <AnimatePresence mode="wait">
                            <motion.button
                                key={isAllied ? 'allied' : isFollowing ? 'following' : 'follow'}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                onClick={onFollowToggle}
                                disabled={followLoading}
                                className={`flex-1 py-2 rounded-full text-[13px] font-extrabold tracking-wider transition-all flex items-center justify-center gap-2 group ${
                                    isAllied
                                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                                        : isFollowing
                                            ? 'bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                                            : 'bg-white text-black hover:bg-zinc-200 shadow-sm'
                                } disabled:opacity-50`}
                            >
                                {followLoading ? (
                                    <div className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                                ) : isAllied ? (
                                    <>
                                        <span className="group-hover:hidden">ALLIED</span>
                                        <span className="hidden group-hover:block">UNALLY</span>
                                    </>
                                ) : isFollowing ? (
                                    <>
                                        <span className="group-hover:hidden">ALLING</span>
                                        <span className="hidden group-hover:block">UNALLY</span>
                                    </>
                                ) : (
                                    'ALLY'
                                )}
                            </motion.button>
                        </AnimatePresence>

                        <button
                            onClick={() => navigate('/messages', {
                                state: {
                                    startChatWith: {
                                        id: profile.id,
                                        username: profile.username,
                                        full_name: profile.full_name,
                                        avatar_url: profile.avatar_url,
                                    }
                                }
                            })}
                            className="flex-1 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 transition-all flex justify-center items-center gap-1.5 text-[13px] font-extrabold tracking-wider"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                            </svg>
                            MESSAGE
                        </button>
                    </div>
                )}
            </div>


            {/* ─── DESKTOP-ONLY: Centered Hero Layout ─── */}
            <div className="hidden md:flex flex-col items-center text-center mb-16 relative">
                {/* Avatar */}
                <div className="relative mb-6">
                    <div
                        onClick={() => profile.avatar_url && onAvatarClick()}
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

                {/* Name + Bio + Meta */}
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
                                onClick={(e) => e.stopPropagation()}
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
                    {statItems.map((stat, i) => (
                        <div key={i} className="flex-1 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl py-5 px-4">
                            <p className="text-white text-xl font-bold mb-1 tracking-tight">{stat.value}</p>
                            <p className="text-zinc-600 text-[10px] font-black tracking-[0.2em]">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Ally + Message Buttons */}
                {!isOwnProfile && (
                    <div className="flex gap-3 mt-10 w-auto">
                        <AnimatePresence mode="wait">
                            <motion.button
                                key={isAllied ? 'allied' : isFollowing ? 'following' : 'follow'}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                onClick={onFollowToggle}
                                disabled={followLoading}
                                className={`w-32 px-8 py-2.5 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 group ${
                                    isAllied
                                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 shadow-[inset_0_0_12px_rgba(99,102,241,0.2)]'
                                        : isFollowing
                                            ? 'bg-gradient-to-b from-zinc-800 to-zinc-900 text-zinc-200 border border-zinc-700/80 shadow-[inset_0_1px_rgba(255,255,255,0.1)] hover:bg-none hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                                            : 'bg-white text-black hover:bg-zinc-200 shadow-sm'
                                } disabled:opacity-50`}
                            >
                                {followLoading ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                ) : isAllied ? (
                                    <>
                                        <div className="flex items-center gap-2 group-hover:hidden">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinejoin="round"/></svg>
                                            Allied
                                        </div>
                                        <div className="hidden group-hover:flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                            Unally
                                        </div>
                                    </>
                                ) : isFollowing ? (
                                    <>
                                        <div className="flex items-center gap-2 group-hover:hidden">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="M20 6 9 17l-5-5"/></svg>
                                            Alling
                                        </div>
                                        <div className="hidden group-hover:flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                            Unally
                                        </div>
                                    </>
                                ) : (
                                    'Ally'
                                )}
                            </motion.button>
                        </AnimatePresence>

                        <button
                            onClick={() => navigate('/messages', {
                                state: {
                                    startChatWith: {
                                        id: profile.id,
                                        username: profile.username,
                                        full_name: profile.full_name,
                                        avatar_url: profile.avatar_url,
                                    }
                                }
                            })}
                            className="w-auto px-6 py-2.5 rounded-full text-sm font-bold bg-zinc-900 border border-zinc-700 text-white hover:bg-zinc-800 transition-all flex justify-center items-center gap-2"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                            </svg>
                            Message
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};
