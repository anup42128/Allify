import { motion, AnimatePresence } from 'framer-motion';

interface AvatarViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: any;
}

export const AvatarViewerModal = ({ isOpen, onClose, profile }: AvatarViewerModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && profile?.avatar_url && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
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
                        className="relative aspect-square w-full max-w-[600px] overflow-hidden rounded-full border border-zinc-800 shadow-2xl bg-zinc-950"
                    >
                        {/* Loading State for Avatar Viewer */}
                        <div id="avatar-viewer-loader" className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-20">
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
                                document.getElementById('avatar-viewer-loader')?.classList.add('hidden');
                            }}
                        />
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/10 flex items-center justify-center hover:bg-black/70 transition-colors z-30"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
