import { motion } from "framer-motion";

export const SocialGraph = () => {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-30 md:opacity-50">
            <svg
                viewBox="0 0 800 600"
                className="w-full h-full max-w-4xl max-h-screen text-indigo-500/20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Defining gradients */}
                <defs>
                    <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(99, 102, 241, 0)" />
                        <stop offset="50%" stopColor="rgba(99, 102, 241, 0.5)" />
                        <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
                    </linearGradient>
                </defs>

                {/* Central Node Connection Lines */}
                <motion.path
                    d="M400 300 L200 150 M400 300 L600 150 M400 300 L200 450 M400 300 L600 450"
                    stroke="url(#line-gradient)"
                    strokeWidth="2"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                />

                {/* Floating Nodes */}
                {[
                    { cx: 400, cy: 300, r: 20, delay: 0 }, // Center
                    { cx: 200, cy: 150, r: 12, delay: 0.5 },
                    { cx: 600, cy: 150, r: 15, delay: 0.7 },
                    { cx: 200, cy: 450, r: 10, delay: 1.1 },
                    { cx: 600, cy: 450, r: 14, delay: 0.9 },
                    { cx: 100, cy: 300, r: 8, delay: 1.5 },
                    { cx: 700, cy: 300, r: 8, delay: 1.3 },
                    { cx: 400, cy: 100, r: 6, delay: 1.8 },
                    { cx: 400, cy: 500, r: 8, delay: 1.6 },
                ].map((node, i) => (
                    <motion.circle
                        key={i}
                        cx={node.cx}
                        cy={node.cy}
                        r={node.r}
                        fill="currentColor"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: node.delay, type: "spring" }}
                        whileHover={{ scale: 1.5, filter: "brightness(1.5)" }}
                    >
                        <animate
                            attributeName="opacity"
                            values="0.3;1;0.3"
                            dur={`${3 + i}s`}
                            repeatCount="indefinite"
                            begin={`${i * 0.5}s`}
                        />
                    </motion.circle>
                ))}

                {/* Connecting faint lines forming a mesh */}
                <motion.path
                    d="M200 150 L600 150 L600 450 L200 450 Z"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    strokeDasharray="4 4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    transition={{ duration: 3, delay: 1 }}
                />
            </svg>
        </div>
    );
};
