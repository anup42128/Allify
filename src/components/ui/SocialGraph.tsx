
export const SocialGraph = () => {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-60 md:opacity-80 transform-gpu will-change-transform">
            <svg
                viewBox="0 0 800 600"
                className="w-full h-full max-w-4xl max-h-screen text-indigo-500/20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Defining Glow Gradients for nodes */}
                <defs>
                    <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(99, 102, 241, 0)" />
                        <stop offset="50%" stopColor="rgba(99, 102, 241, 0.5)" />
                        <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
                    </linearGradient>
                </defs>

                {/* Central Node Connection Lines */}
                <path
                    d="M400 300 L200 150 M400 300 L600 150 M400 300 L200 450 M400 300 L600 450"
                    stroke="url(#line-gradient)"
                    strokeWidth="2"
                    style={{ opacity: 1 }}
                />

                {/* Floating Nodes with Glow */}
                {[
                    { cx: 400, cy: 300, r: 20, glow: 50 }, // Center
                    { cx: 200, cy: 150, r: 12, glow: 35 },
                    { cx: 600, cy: 150, r: 15, glow: 40 },
                    { cx: 200, cy: 450, r: 10, glow: 30 },
                    { cx: 600, cy: 450, r: 14, glow: 38 },
                    { cx: 100, cy: 300, r: 8, glow: 25 },
                    { cx: 700, cy: 300, r: 8, glow: 25 },
                    { cx: 400, cy: 100, r: 6, glow: 20 },
                    { cx: 400, cy: 500, r: 8, glow: 25 },
                ].map((node, i) => (
                    <g key={i}>
                        <circle
                            cx={node.cx}
                            cy={node.cy}
                            r={node.glow}
                            fill="url(#node-glow)"
                        />
                        <circle
                            cx={node.cx}
                            cy={node.cy}
                            r={node.r}
                            fill="currentColor"
                        />
                    </g>
                ))}

                {/* Connecting faint lines forming a mesh */}
                <path
                    d="M200 150 L600 150 L600 450 L200 450 Z"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    strokeDasharray="4 4"
                    style={{ opacity: 0.2 }}
                />
            </svg>
        </div>
    );
};
