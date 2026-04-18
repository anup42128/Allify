import { motion, AnimatePresence } from 'framer-motion';
import { useOnlineStatus } from '../../lib/presenceStore';

export interface Participant {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    last_seen?: string | null;
}

export const Avatar = ({ user, size = 'md' }: { user: Partial<Participant>; size?: 'sm' | 'md' | 'lg' }) => {
    const isOnline = useOnlineStatus(user?.id);
    const sizes = { sm: 'w-8 h-8', md: 'w-11 h-11', lg: 'w-14 h-14' };
    const dotClasses = { 
        sm: 'w-2.5 h-2.5 border-[2px] right-0 bottom-0', 
        md: 'w-3.5 h-3.5 border-[2.5px] -right-0.5 -bottom-0.5', 
        lg: 'w-4 h-4 border-[3px] right-0 bottom-0' 
    };

    return (
        <div className="relative inline-block flex-shrink-0">
            <div className={`${sizes[size]} rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center border-[1px] border-zinc-700`}>
                {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-1/2 h-1/2 text-zinc-500">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                )}
            </div>
            
            {/* Presence Indicator */}
            <AnimatePresence>
                <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`absolute rounded-full border-black z-10 transition-colors duration-300 ${dotClasses[size]} ${
                        isOnline 
                            ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' 
                            : 'bg-zinc-800 border-zinc-900 shadow-inner'
                    }`}
                />
            </AnimatePresence>
        </div>
    );
};
