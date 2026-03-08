import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface VideoPositionerProps {
    videoUrl: string;
    onPositionComplete: (pan: { x: number, y: number }) => void;
    onCancel: () => void;
}

const VideoPositioner: React.FC<VideoPositionerProps> = ({
    videoUrl,
    onPositionComplete,
    onCancel
}) => {
    const [panOffset, setPanOffset] = useState({ x: 50, y: 50 });
    const [isDragging, setIsDragging] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handlePan = (clientX: number, clientY: number) => {
        if (!isDragging || !videoRef.current) return;
        const container = videoRef.current.parentElement;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        setPanOffset({
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y))
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col pt-10 px-4 md:px-0"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-8 max-w-4xl mx-auto w-full px-4">
                <button
                    onClick={onCancel}
                    className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                </button>
                <h2 className="text-xl font-bold">Position Video</h2>
                <button
                    onClick={() => onPositionComplete(panOffset)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold text-sm tracking-wide hover:bg-blue-500 transition-colors"
                >
                    Next
                </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-4">
                <div
                    onMouseDown={() => setIsDragging(true)}
                    onMouseMove={(e) => handlePan(e.clientX, e.clientY)}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                    onTouchStart={() => setIsDragging(true)}
                    onTouchMove={(e) => handlePan(e.touches[0].clientX, e.touches[0].clientY)}
                    onTouchEnd={() => setIsDragging(false)}
                    className={`w-full max-w-5xl aspect-square md:aspect-video bg-zinc-950 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl relative flex items-center justify-center cursor-move ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        style={{ objectPosition: `${panOffset.x}% ${panOffset.y}%` }}
                        className="w-full h-full object-cover pointer-events-none"
                        autoPlay
                        loop
                        muted
                        playsInline
                    />

                    {/* Visual Guideline */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
                        <div className="w-px h-full bg-white absolute left-1/2" />
                        <div className="h-px w-full bg-white absolute top-1/2" />
                    </div>
                </div>
            </div>

            <div className="p-10 text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-widest opacity-50">
                    Click and hold to reposition the video frame
                </p>
            </div>
        </motion.div>
    );
};

export default VideoPositioner;
