import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../../features/auth/contexts/SignupContext';
import { SocialGraph } from '../ui/SocialGraph';
import { BackgroundGradient } from '../ui/BackgroundGradient';
import { api } from '../../lib/api';


export const LandingPage = () => {
    const navigate = useNavigate();
    const { allowRoute } = useNavigation();


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
        <div className="h-screen w-screen overflow-hidden bg-black text-white flex flex-col items-center justify-center relative selection:bg-indigo-500/30">

            {/* Background Elements */}
            <BackgroundGradient />
            <SocialGraph />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 z-0 pointer-events-none" />

            {/* Scrollable Overlay */}
            <div className="absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar transform-gpu">
                <div className="min-h-full w-full flex flex-col items-center relative py-12">
                    {/* Header Section */}
                    <header className="w-full p-8 flex justify-center items-center z-20 mb-auto">
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-2xl font-bold tracking-[0.2em] text-white/50 hover:text-white transition-colors cursor-default"
                        >
                            UNI
                        </motion.h1>
                    </header>

                    {/* Main Content */}
                    <main className="flex flex-col items-center z-10 relative px-4 text-center my-12">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="mb-6 relative"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-25"></div>
                            <span className="relative px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-indigo-300 backdrop-blur-sm">
                                The Future of Social
                            </span>
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-7xl md:text-9xl font-black tracking-tight mb-4 py-8 px-4 leading-relaxed bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40"
                        >
                            Allify
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.4 }}
                            className="text-lg md:text-xl text-gray-400 max-w-lg mb-10 font-light"
                        >
                            Connect without limits. Share without boundaries. <br className="hidden md:block" /> Experience the new vibe of social networking.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
                        >
                            <button
                                onClick={handleCreateAccount}
                                onMouseEnter={handlePrecheck}
                                className="group relative px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:pr-10 transition-all duration-300 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.5)] overflow-hidden cursor-pointer"
                            >
                                <span className="relative z-10">Create Account</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-white z-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="absolute right-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-[-4px] transition-all duration-300 z-10">→</span>
                            </button>

                            <button
                                onClick={() => navigate('/auth/login')}
                                className="px-8 py-4 rounded-full border border-white/20 text-white font-semibold text-lg hover:bg-white/5 hover:border-white/40 transition-all duration-300 backdrop-blur-sm cursor-pointer"
                            >
                                Log in
                            </button>
                        </motion.div>
                    </main>

                    {/* Footer Section */}
                    <footer className="w-full text-center text-white/30 text-sm z-10 p-8 mt-auto">
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



        </div >
    );
};
