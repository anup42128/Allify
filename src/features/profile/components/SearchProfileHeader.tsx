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

    return (
        <div className="flex flex-col items-center text-center mb-16 relative">
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
                {[
                    { label: 'POSTS', value: posts.length },
                    { label: 'ALLIES', value: localAllies },
                    { label: 'ALLING', value: localAlling },
                    { label: 'ALLIED', value: localAllied },
                ].map((stat, i) => (
                    <div key={i} className="flex-1 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl py-5 px-4">
                        <p className="text-white text-xl font-bold mb-1 tracking-tight">{stat.value}</p>
                        <p className="text-zinc-600 text-[10px] font-black tracking-[0.2em]">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Ally + Message Buttons (only for other users' profiles) */}
            {!isOwnProfile && (
                <div className="flex gap-3 mt-10">
                    <AnimatePresence mode="wait">
                        <motion.button
                            key={isAllied ? 'allied' : isFollowing ? 'following' : 'follow'}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            onClick={onFollowToggle}
                            disabled={followLoading}
                            className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 group w-32 ${
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
                        className="px-6 py-2.5 rounded-full text-sm font-bold bg-zinc-900 border border-zinc-700 text-white hover:bg-zinc-800 transition-all flex items-center gap-2"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                        </svg>
                        Message
                    </button>
                </div>
            )}
        </div>
    );
};
