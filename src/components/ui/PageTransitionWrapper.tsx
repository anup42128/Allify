import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const PageTransitionWrapper = ({ children, onClick }: Props) => {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        let isMounted = true;
        
        const preloadAssets = async () => {
            try {
                if (document.fonts) {
                    await document.fonts.ready;
                }
                
                // Artifical delay to ensure spinner is visible and smooth,
                // and to let React paint the off-screen DOM before transitioning in.
                await new Promise(resolve => setTimeout(resolve, 600));
            } catch (err) {
                console.error("Preload error:", err);
            } finally {
                if (isMounted) setIsReady(true);
            }
        };

        preloadAssets();

        // Maximum timeout fallback (5 seconds) to prevent infinite loading screens
        const timeout = setTimeout(() => {
            if (isMounted) setIsReady(true);
        }, 5000);

        return () => {
            isMounted = false;
            clearTimeout(timeout);
        };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-[100svh] w-full bg-[#0F1115] text-white relative selection:bg-indigo-500/30 overflow-hidden will-change-transform"
            onClick={onClick}
        >
            <AnimatePresence mode="wait">
                {!isReady ? (
                    <motion.div
                        key="global-loader"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="absolute inset-0 z-[100] bg-[#0F1115] flex items-center justify-center isolate"
                    >
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="w-10 h-10 border-4 border-white/10 border-t-indigo-500 rounded-full" 
                        />
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0.01 }}
                animate={isReady ? { opacity: 1 } : { opacity: 0.01 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute inset-0 w-full h-full"
            >
                {children}
            </motion.div>
        </motion.div>
    );
};
