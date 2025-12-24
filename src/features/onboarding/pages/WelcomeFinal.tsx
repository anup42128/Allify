import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export const WelcomeFinal = () => {
    const navigate = useNavigate();

    return (
        <div className="text-center space-y-12">
            {/* Celebration Illustration/Icon */}
            <div className="relative">
                <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 12, delay: 0.2 }}
                    className="w-32 h-32 mx-auto bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-3xl rotate-12 flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(99,102,241,0.5)]"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-16 h-16 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
                    </svg>
                </motion.div>

                {/* Floating Particles/Shapes */}
                <motion.div
                    animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-indigo-500/20 blur-xl"
                />
                <motion.div
                    animate={{ y: [0, 10, 0], opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                    className="absolute -bottom-4 -left-4 w-12 h-12 rounded-full bg-purple-500/20 blur-xl"
                />
            </div>

            {/* Welcome Text */}
            <div className="space-y-4">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-5xl font-black tracking-tighter"
                >
                    You're all set!
                </motion.h1>
                <div className="flex justify-center gap-2">
                    {[1, 2, 3].map((step) => (
                        <div
                            key={step}
                            className={`h-1 w-12 rounded-full transition-all duration-500 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]`}
                        />
                    ))}
                </div>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-gray-400 text-lg max-w-sm mx-auto"
                >
                    Welcome to the Allify community. Your journey into the future of social networking starts here.
                </motion.p>
            </div>

            {/* CTA Button */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="pt-6"
            >
                <button
                    onClick={() => navigate('/sample')} // Later this goes to /feed
                    className="w-full py-5 rounded-2xl bg-white text-black font-black text-xl shadow-[0_20px_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_25px_50px_-10px_rgba(255,255,255,0.4)] transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                    Enter Allify
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                </button>
                <p className="mt-6 text-[11px] text-gray-600 font-bold uppercase tracking-widest">Experience the platform</p>
            </motion.div>
        </div>
    );
};
