import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../../features/auth/contexts/SignupContext';


import { api } from '../../lib/api';
import { PageTransitionWrapper } from '../ui/PageTransitionWrapper';
import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

export const LandingPage = () => {
    const navigate = useNavigate();
    const { allowRoute } = useNavigation();
    const scrollRef = useRef<HTMLDivElement>(null);

    // ── Lenis Smooth Scroll (landing page only) ──
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        const lenis = new Lenis({
            wrapper: container,
            content: container.firstElementChild as HTMLElement,
            lerp: 0.1,           // smoothness — 0.05 (very smooth) to 0.2 (snappy)
            smoothWheel: true,
        });

        let rafId: number;
        const raf = (time: number) => {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        };
        rafId = requestAnimationFrame(raf);

        return () => {
            cancelAnimationFrame(rafId);
            lenis.destroy();
        };
    }, []);



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
        <PageTransitionWrapper>

            {/* Scrollable Overlay */}
            <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar transform-gpu z-10 isolate w-full">
                <div className="min-h-full w-full flex flex-col items-center relative py-12">
                    {/* Header Section */}
                    <header className="w-full p-6 md:p-8 flex justify-center items-center z-20 mb-auto">
                        <motion.h1
                            aria-label="U.N.I"
                            className="text-xl md:text-2xl font-bold tracking-[0.1em] text-white/50 hover:text-white transition-colors cursor-default"
                        >
                            {'U.N.I'.split('').map((char, i) => (
                                <motion.span
                                    key={i}
                                    className="inline-block"
                                >
                                    {char}
                                </motion.span>
                            ))}
                        </motion.h1>
                    </header>

                    {/* Main Content */}
                    <main className="flex flex-col items-center z-10 relative px-4 text-center my-12">
                        <motion.div
                            className="mb-6 relative group inline-block"
                        >
                            <span className="relative block px-5 py-2 rounded-full border border-white/5 bg-white/[0.02] text-[10px] font-bold tracking-widest uppercase text-indigo-400 backdrop-blur-md">
                                The Future of Social
                            </span>
                        </motion.div>

                        <motion.h2
                            aria-label="Allify"
                            className="text-6xl sm:text-7xl md:text-9xl font-black tracking-wide mb-2 md:mb-4 py-4 md:py-8 px-4 leading-none text-white overflow-visible"
                        >
                            {'Allify'.split('').map((letter, i) => (
                                <motion.span
                                    key={i}
                                    className="inline-block"
                                >
                                    {letter}
                                </motion.span>
                            ))}
                        </motion.h2>

                        <motion.p
                            className="text-base sm:text-lg md:text-xl text-gray-400 max-w-[280px] sm:max-w-sm md:max-w-lg mb-10 font-normal md:font-light leading-relaxed"
                        >
                            Connect without limits. Share without boundaries. <br className="hidden md:block" /> Experience the new vibe of social networking.
                        </motion.p>

                        <motion.div
                            className="flex flex-col sm:flex-row gap-4 w-[280px] sm:w-auto mt-2 md:mt-0"
                        >
                            <button
                                onClick={handleCreateAccount}
                                onMouseEnter={handlePrecheck}
                                className="group relative px-6 md:px-8 py-3.5 md:py-4 rounded-full bg-white text-black font-bold text-base md:text-lg hover:pr-10 transition duration-300 overflow-hidden cursor-pointer w-full sm:w-auto flex items-center justify-center"
                            >
                                <span className="relative z-10 w-full text-center transition-transform duration-300 group-hover:-translate-x-2">Create Account</span>
                                <span className="absolute right-6 opacity-0 group-hover:opacity-100 transition duration-300 z-10">→</span>
                            </button>

                            <button
                                onClick={() => navigate('/auth/login')}
                                className="px-6 md:px-8 py-3.5 md:py-4 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-bold text-base md:text-lg hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-white transition duration-300 backdrop-blur-sm cursor-pointer w-full sm:w-auto"
                            >
                                Sign In
                            </button>
                        </motion.div>
                    </main>

                    {/* Footer Section */}
                    <footer className="w-full text-center text-white/30 text-sm z-10 pt-8 pb-16 mt-auto">
                        <motion.div
                        >
                            © {new Date().getFullYear()} Allify by UNI. All rights reserved.
                        </motion.div>
                    </footer>
                </div>
            </div>


        </PageTransitionWrapper>
    );
};
