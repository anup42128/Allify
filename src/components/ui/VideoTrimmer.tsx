import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface VideoTrimmerProps {
    videoUrl: string;
    onTrimComplete: (startTime: number, endTime: number, thumbnail: Blob) => void;
    onCancel: () => void;
}

const VideoTrimmer = ({ videoUrl, onTrimComplete, onCancel }: VideoTrimmerProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scrubBarRef = useRef<HTMLDivElement>(null);

    const [duration, setDuration] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isDragging, setIsDragging] = useState<'start' | 'end' | 'current' | null>(null);
    const [frames, setFrames] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(true);

    // Load video and generate frame previews
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = async () => {
            const videoDuration = video.duration;
            setDuration(videoDuration);
            setEndTime(videoDuration);

            // Generate 10 frames for the timeline
            const frameCount = 10;
            const newFrames: string[] = [];
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            setIsProcessing(true);
            for (let i = 0; i < frameCount; i++) {
                const timestamp = (videoDuration / (frameCount - 1)) * i;
                video.currentTime = timestamp;
                await new Promise((resolve) => {
                    video.onseeked = resolve;
                });

                // Draw frame to canvas maintaining aspect ratio
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const videoRatio = video.videoWidth / video.videoHeight;
                let drawWidth = canvas.width;
                let drawHeight = canvas.height;
                let x = 0;
                let y = 0;

                if (videoRatio > 1) { // Landscape
                    drawHeight = canvas.width / videoRatio;
                    y = (canvas.height - drawHeight) / 2;
                } else { // Portrait
                    drawWidth = canvas.height * videoRatio;
                    x = (canvas.width - drawWidth) / 2;
                }

                ctx.drawImage(video, x, y, drawWidth, drawHeight);
                newFrames.push(canvas.toDataURL('image/jpeg', 0.5));
            }
            setFrames(newFrames);
            setIsProcessing(false);

            // Reset video to start
            video.currentTime = 0;
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }, [videoUrl]);

    const handleScrub = (clientX: number) => {
        if (!scrubBarRef.current || !duration) return;
        const rect = scrubBarRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        const newTime = percentage * duration;

        if (isDragging === 'start') {
            setStartTime(Math.min(newTime, endTime - 0.5));
            if (videoRef.current) videoRef.current.currentTime = newTime;
        } else if (isDragging === 'end') {
            setEndTime(Math.max(newTime, startTime + 0.5));
            if (videoRef.current) videoRef.current.currentTime = newTime;
        } else if (isDragging === 'current') {
            setCurrentTime(newTime);
            if (videoRef.current) videoRef.current.currentTime = newTime;
        }
    };

    const handleConfirm = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        // Capture current frame as thumbnail maintaining aspect ratio
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const videoRatio = video.videoWidth / video.videoHeight;
        let drawWidth = canvas.width;
        let drawHeight = canvas.height;
        let x = 0;
        let y = 0;

        if (videoRatio > 1) { // Landscape
            drawHeight = canvas.width / videoRatio;
            y = (canvas.height - drawHeight) / 2;
        } else { // Portrait
            drawWidth = canvas.height * videoRatio;
            x = (canvas.width - drawWidth) / 2;
        }

        ctx.drawImage(video, x, y, drawWidth, drawHeight);

        canvas.toBlob((blob) => {
            if (blob) onTrimComplete(startTime, endTime, blob);
        }, 'image/jpeg', 0.8);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
                <h2 className="text-xl font-bold">Trim Video</h2>
                <button
                    onClick={handleConfirm}
                    disabled={isProcessing}
                    className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold text-sm tracking-wide hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                    Next
                </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 max-w-6xl mx-auto w-full pb-10 px-4 overflow-hidden">
                {/* Video Preview Container */}
                <div className="w-full md:w-[65%] flex items-center justify-center p-2">
                    <div
                        className="w-full max-h-[60vh] md:max-h-[80vh] bg-zinc-900/40 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] relative flex items-center justify-center backdrop-blur-3xl group"
                    >
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            className="w-full h-full object-contain transition-transform duration-500"
                            onPlay={() => {
                                const updateTime = () => {
                                    if (videoRef.current && !isDragging) {
                                        if (videoRef.current.currentTime >= endTime) {
                                            videoRef.current.currentTime = startTime;
                                        }
                                        setCurrentTime(videoRef.current.currentTime);
                                        requestAnimationFrame(updateTime);
                                    }
                                };
                                updateTime();
                            }}
                        />
                        {isProcessing && (
                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-xl gap-4 z-40">
                                <div className="animate-spin w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full" />
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-black tracking-[0.2em] text-white/90 uppercase">Analyzing Frames</span>
                                    <div className="w-24 h-0.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="w-1/2 h-full bg-blue-500 animate-[shimmer_2s_infinite]" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls Container */}
                <div className="w-full md:w-[45%] flex flex-col gap-6 md:gap-8 justify-center">
                    <div className="space-y-6">
                        <div className="flex justify-between text-[10px] font-mono text-zinc-500 px-2 uppercase tracking-widest">
                            <span>{startTime.toFixed(2)}s</span>
                            <span className="text-white font-bold">{(endTime - startTime).toFixed(2)}s selected</span>
                            <span>{endTime.toFixed(2)}s</span>
                        </div>

                        <div
                            ref={scrubBarRef}
                            className="relative h-16 md:h-20 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex"
                            onMouseMove={(e) => isDragging && handleScrub(e.clientX)}
                            onMouseUp={() => setIsDragging(null)}
                            onMouseLeave={() => setIsDragging(null)}
                            onTouchMove={(e) => isDragging && handleScrub(e.touches[0].clientX)}
                            onTouchEnd={() => setIsDragging(null)}
                        >
                            {/* Frame Previews */}
                            {frames.map((frame, i) => (
                                <img key={i} src={frame} className="flex-1 h-full object-cover opacity-30 grayscale" alt="" />
                            ))}

                            {/* Trim Range Overlay */}
                            <div
                                className="absolute h-full border-y-2 border-white bg-white/5 pointer-events-none"
                                style={{
                                    left: `${(startTime / duration) * 100}%`,
                                    right: `${100 - (endTime / duration) * 100}%`
                                }}
                            />

                            {/* Start Handle */}
                            <div
                                onMouseDown={() => setIsDragging('start')}
                                onTouchStart={() => setIsDragging('start')}
                                className="absolute top-0 bottom-0 w-4 bg-white cursor-ew-resize flex items-center justify-center rounded-l-md active:scale-x-125 transition-transform z-30"
                                style={{ left: `${(startTime / duration) * 100}%`, marginLeft: '-8px' }}
                            >
                                <div className="w-0.5 h-6 bg-zinc-950/20" />
                            </div>

                            {/* End Handle */}
                            <div
                                onMouseDown={() => setIsDragging('end')}
                                onTouchStart={() => setIsDragging('end')}
                                className="absolute top-0 bottom-0 w-4 bg-white cursor-ew-resize flex items-center justify-center rounded-r-md active:scale-x-125 transition-transform z-30"
                                style={{ left: `${(endTime / duration) * 100}%`, marginLeft: '-8px' }}
                            >
                                <div className="w-0.5 h-6 bg-zinc-950/20" />
                            </div>

                            {/* Playhead */}
                            <div
                                onMouseDown={() => setIsDragging('current')}
                                onTouchStart={() => setIsDragging('current')}
                                className="absolute top-0 bottom-0 w-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] z-20 cursor-ew-resize active:scale-x-150 transition-transform"
                                style={{ left: `${(currentTime / duration) * 100}%` }}
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    if (videoRef.current) {
                                        if (videoRef.current.paused) videoRef.current.play();
                                        else videoRef.current.pause();
                                    }
                                }}
                                className="w-full py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-sm font-bold flex items-center justify-center gap-3 hover:bg-zinc-800 transition-colors"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                                PREVIEW CLIP
                            </button>

                            <p className="text-[10px] text-zinc-500 text-center uppercase tracking-tighter opacity-50 px-4">
                                Drag the video to reposition. Use white handles to trim.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden canvas for frame extraction */}
            <canvas ref={canvasRef} width={640} height={640} className="hidden" />
        </motion.div>
    );
};

export default VideoTrimmer;
