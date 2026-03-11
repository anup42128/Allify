import { motion, AnimatePresence } from 'framer-motion';

interface CancelConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const CancelConfirmationModal: React.FC<CancelConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center gap-4"
                    >
                        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-2">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        
                        <h3 className="text-xl font-bold text-white tracking-tight">Discard Post?</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                            If you go back now, you will lose any edits or captions you've made to this photo.
                        </p>
                        
                        <div className="flex w-full gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-zinc-800 text-white font-bold rounded-full hover:bg-zinc-700 transition-colors"
                            >
                                No, keep writing
                            </button>
                            <button
                                onClick={onConfirm}
                                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-full hover:bg-red-600 transition-colors shadow-[0_4px_14px_rgba(239,68,68,0.4)]"
                            >
                                Yes, discard
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
