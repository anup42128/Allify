import { motion } from 'framer-motion';
import { SocialGraph } from '../ui/SocialGraph';
import { BackgroundGradient } from '../ui/BackgroundGradient';

export const SamplePage = () => {
    return (
        <div className="h-screen w-screen overflow-hidden bg-black text-white flex flex-col items-center justify-center relative selection:bg-indigo-500/30">

            {/* Background Elements */}
            <BackgroundGradient />
            <SocialGraph />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 z-0 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="z-10 text-center space-y-6 px-6"
            >
                {/* Success Animation */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
                    className="w-24 h-24 mx-auto rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mb-8"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-12 h-12 text-green-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                </motion.div>

                {/* Welcome Message */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-6xl md:text-7xl font-black tracking-tight pb-4 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40"
                >
                    Welcome to Allify!
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="text-xl text-gray-400 max-w-2xl"
                >
                    Your account has been successfully verified. Get ready to connect, share, and experience the future of social networking.
                </motion.p>

                {/* Feature Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.7 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-12"
                >
                    {[
                        { icon: '🌐', title: 'Connect', desc: 'Build your network' },
                        { icon: '✨', title: 'Share', desc: 'Express yourself' },
                        { icon: '🚀', title: 'Grow', desc: 'Reach new heights' }
                    ].map((feature, index) => (
                        <div
                            key={index}
                            className="bg-white/5 border border-white/10 rounded-lg p-6 backdrop-blur-sm hover:bg-white/10 transition-all"
                        >
                            <div className="text-4xl mb-3">{feature.icon}</div>
                            <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                            <p className="text-sm text-gray-400">{feature.desc}</p>
                        </div>
                    ))}
                </motion.div>

                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.9 }}
                    className="mt-8 px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-gray-100 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.5)]"
                >
                    Get Started
                </motion.button>
            </motion.div>
        </div>
    );
};
