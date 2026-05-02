import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
    isVisible: boolean;
}

export const SplashScreen = ({ isVisible }: SplashScreenProps) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
                >
                    <div className="flex flex-col items-center justify-center flex-1">
                        <motion.h1 
                            initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="text-white text-5xl md:text-6xl font-black tracking-tighter"
                        >
                            Allify
                        </motion.h1>
                    </div>
                    
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                        className="pb-10 md:pb-12"
                    >
                        <p className="text-zinc-500/80 text-[10px] font-bold tracking-[0.3em] uppercase">
                            A U.N.I Product
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
