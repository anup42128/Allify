import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../../features/auth/contexts/SignupContext';
import { SocialGraph } from '../ui/SocialGraph';
import { BackgroundGradient } from '../ui/BackgroundGradient';
import { api } from '../../lib/api';
import { useState, useEffect } from 'react';

export const LandingPage = () => {
    const navigate = useNavigate();
    const { allowRoute } = useNavigation();
    
    // PWA State
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showInstallBanner, setShowInstallBanner] = useState(true);

    useEffect(() => {
        // Check if already installed
        const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsStandalone(isStandaloneMatch);

        if (isStandaloneMatch) return; // Don't show if already installed

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        setIsIOS(/iphone|ipad|ipod/.test(userAgent));

        // Listen for the standard install prompt
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowInstallBanner(false);
        }
    };

    const handleCreateAccount = () => {
        // Invisible Security Check triggered in background (don't await)
        api.secureAction().catch(err => console.error("Background pre-check failed:", err));

        allowRoute('/auth/signup');
        navigate('/auth/signup');
    };

    const handlePrecheck = () => {
        // Predictive check on hover to warm up backend
        api.secureAction().catch(err => console.error("Hover pre-check failed:", err));
    };

    return (
        <div className="min-h-[100svh] md:h-screen w-full md:overflow-hidden overflow-x-hidden bg-black text-white flex flex-col items-center justify-center relative selection:bg-indigo-500/30">

            {/* Background Elements */}
            <div className="fixed md:absolute top-0 left-0 w-full h-[100vh] md:h-full z-0 pointer-events-none">
                <BackgroundGradient />
                <SocialGraph />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
            </div>

            {/* Scrollable Overlay */}
            <div className="relative md:absolute inset-0 md:overflow-y-auto overflow-x-hidden custom-scrollbar transform-gpu z-10 w-full min-h-[100svh]">
                <div className="min-h-[100svh] md:min-h-full w-full flex flex-col items-center relative py-12">
                    {/* Header Section */}
                    <header className="w-full p-6 md:p-8 flex justify-center items-center z-20 mb-auto">
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-xl md:text-2xl font-bold tracking-[0.1em] text-white/50 hover:text-white transition-colors cursor-default"
                        >
                            U.N.I
                        </motion.h1>
                    </header>

                    {/* Main Content */}
                    <main className="flex flex-col items-center z-10 relative px-4 text-center my-12">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="mb-6 relative group inline-block"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-[0.05] transition-opacity duration-500 group-hover:opacity-[0.10]"></div>
                            <span className="relative block px-5 py-2 rounded-full border border-white/5 bg-white/[0.02] text-[10px] font-bold tracking-widest uppercase text-indigo-400 backdrop-blur-md">
                                The Future of Social
                            </span>
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-6xl sm:text-7xl md:text-9xl font-black tracking-tighter md:tracking-tight mb-2 md:mb-4 py-4 md:py-8 px-4 leading-none bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40"
                        >
                            Allify
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.4 }}
                            className="text-base sm:text-lg md:text-xl text-gray-400 max-w-[280px] sm:max-w-sm md:max-w-lg mb-10 font-normal md:font-light leading-relaxed"
                        >
                            Connect without limits. Share without boundaries. <br className="hidden md:block" /> Experience the new vibe of social networking.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                            className="flex flex-col sm:flex-row gap-4 w-[280px] sm:w-auto mt-2 md:mt-0"
                        >
                            <button
                                onClick={handleCreateAccount}
                                onMouseEnter={handlePrecheck}
                                className="group relative px-6 md:px-8 py-3.5 md:py-4 rounded-full bg-white text-black font-bold text-base md:text-lg hover:pr-10 transition-all duration-300 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.5)] overflow-hidden cursor-pointer w-full sm:w-auto flex items-center justify-center"
                            >
                                <span className="relative z-10 w-full text-center transition-transform duration-300 group-hover:-translate-x-2">Create Account</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-white z-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="absolute right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">→</span>
                            </button>

                            <button
                                onClick={() => navigate('/auth/login')}
                                className="px-6 md:px-8 py-3.5 md:py-4 rounded-full border border-white/20 text-white font-semibold text-base md:text-lg hover:bg-white/5 hover:border-white/40 transition-all duration-300 backdrop-blur-sm cursor-pointer w-full sm:w-auto"
                            >
                                Open Account
                            </button>
                        </motion.div>
                    </main>

                    {/* Footer Section */}
                    <footer className="w-full text-center text-white/30 text-sm z-10 p-8 mt-auto pb-32 md:pb-8">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.5, duration: 1 }}
                        >
                            © {new Date().getFullYear()} Allify by UNI. All rights reserved.
                        </motion.div>
                    </footer>
                </div>
            </div>

            {/* PWA Install Banner */}
            <AnimatePresence>
                {(!isStandalone && showInstallBanner && (deferredPrompt || isIOS)) && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        transition={{ delay: 1.5, type: 'spring', damping: 20 }}
                        className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-80 bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-3xl p-4 shadow-2xl z-50 flex flex-col gap-3"
                    >
                        <button 
                            onClick={() => setShowInstallBanner(false)}
                            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-white bg-zinc-800 rounded-full transition-colors"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        
                        <div className="flex items-center gap-4">
                            <img src="/pwa-192x192.png" alt="Allify App" className="w-12 h-12 rounded-xl shadow-lg border border-zinc-700/50" />
                            <div>
                                <h4 className="text-white font-bold text-sm">Install Allify</h4>
                                <p className="text-zinc-400 text-xs mt-0.5">For the best native experience</p>
                            </div>
                        </div>
                        
                        {deferredPrompt ? (
                            <button
                                onClick={handleInstallClick}
                                className="w-full py-2.5 mt-1 bg-white text-black rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all shadow-[0_0_15px_-3px_rgba(255,255,255,0.4)]"
                            >
                                Install App
                            </button>
                        ) : isIOS ? (
                            <div className="text-zinc-300 text-xs bg-black/40 p-3 rounded-xl text-center border border-zinc-800 mt-1">
                                Tap <span className="inline-block mx-1 font-bold text-blue-400">Share</span> below, then<br/><span className="font-bold text-white mt-1 block">Add to Home Screen</span>
                            </div>
                        ) : null}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
