import React, { useMemo, useRef, useState, useEffect } from 'react';

// ─── Pseudo Waveform Generator ─────────────────────────────────────────────────
const generatePseudoWaveform = (seedStr: string, count: number = 36) => {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
        seed = (seed << 5) - seed + seedStr.charCodeAt(i);
        seed |= 0;
    }
    const random = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };

    const rawBars = [];
    for (let i = 0; i < count; i++) {
        rawBars.push(0.15 + random() * 0.80);
    }

    const smoothed = [...rawBars];
    for (let i = 1; i < count - 1; i++) {
        smoothed[i] = (rawBars[i - 1] + rawBars[i] * 2 + rawBars[i + 1]) / 4;
    }

    return smoothed.map((val, i) => {
        const progress = i / (count - 1);
        const envelope = Math.sin(progress * Math.PI); 
        const finalVal = val * (0.35 + 0.65 * envelope);
        return Math.max(0.12, finalVal);
    });
};

// ─── Voice Message Component ───────────────────────────────────────────────────
export const VoiceMessageBubble = ({ audioUrl, duration, isMe }: { audioUrl: string; duration: number; isMe: boolean }) => {
    const barsCount = 38;
    const waveform = useMemo(() => generatePseudoWaveform(audioUrl, barsCount), [audioUrl]);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!audioRef.current) return;
        const audio = audioRef.current;
        let animationFrameId: number;
        let lastTime = performance.now();
        let interpolatedTime = audio.currentTime;

        const updateProgressFloat = () => {
            const effectiveDuration = (!audio.duration || audio.duration === Infinity || isNaN(audio.duration)) 
                ? Math.max(1, duration) 
                : audio.duration;

            const now = performance.now();
            const delta = (now - lastTime) / 1000;
            lastTime = now;

            interpolatedTime += delta;

            // Bound the synthetic clock! It is permitted to glide up to 0.08s ahead of the actual hardware clock 
            // (creating perfect 60fps smoothing across typical 50ms chunk reporting).
            // However, if the hardware stalls entirely while buffering, the limit prevents it from racing away and jumping backwards.
            if (interpolatedTime > audio.currentTime + 0.08) {
                interpolatedTime = audio.currentTime + 0.08;
            } else if (interpolatedTime < audio.currentTime) {
                interpolatedTime = audio.currentTime;
            }

            setProgress(Math.min(1, Math.max(0, interpolatedTime / effectiveDuration)));
            animationFrameId = requestAnimationFrame(updateProgressFloat);
        };

        const onPlay = () => {
            setIsPlaying(true);
            lastTime = performance.now();
            interpolatedTime = audio.currentTime;
            animationFrameId = requestAnimationFrame(updateProgressFloat);
        };

        const onPause = () => {
            setIsPlaying(false);
            cancelAnimationFrame(animationFrameId);
            if (audio.duration && audio.duration !== Infinity) {
                setProgress(audio.currentTime / audio.duration);
            }
        };

        const onEnded = () => { 
            setIsPlaying(false); 
            setProgress(0); 
            cancelAnimationFrame(animationFrameId);
        };

        audio.addEventListener('ended', onEnded);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('play', onPlay);

        return () => {
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('play', onPlay);
            cancelAnimationFrame(animationFrameId);
        };
    }, [audioUrl, duration]); // Adding duration as it is used inside updateProgressFloat

    useEffect(() => {
        if (audioRef.current && audioUrl && audioUrl !== 'pending') {
            audioRef.current.load(); // Explicitly force browser to buffer the dynamically attached Blob URL
        }
    }, [audioUrl]);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioRef.current || audioUrl === 'pending') return;
        
        // Critically rely on the exact native audio tag state instead of React state to ensure it can never freeze
        if (!audioRef.current.paused) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(err => {
                console.warn('Playback interrupted or media unloaded:', err);
                setIsPlaying(false);
            });
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (!audioRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, clickX / rect.width));
        audioRef.current.currentTime = percent * (audioRef.current.duration || duration || 1);
        setProgress(percent);
    };

    return (
        <div className="flex items-center gap-3 min-w-[200px] sm:w-[240px] w-full max-w-[240px]">
            <audio ref={audioRef} src={audioUrl === 'pending' ? undefined : audioUrl} preload="metadata" />
            
            <button 
                onClick={togglePlay}
                disabled={audioUrl === 'pending'}
                className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full transition-transform active:scale-95 ${
                    isMe ? 'bg-black/10 text-black hover:bg-black/20' : 'bg-white/10 text-white hover:bg-white/20'
                } ${audioUrl === 'pending' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {audioUrl === 'pending' ? (
                    <svg className={`w-5 h-5 animate-spin ${isMe ? 'text-black/50' : 'text-white/50'}`} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : isPlaying ? (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                    <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
            </button>

            <div className="flex-1 flex items-center justify-between gap-1 h-full cursor-pointer py-1 relative group/waveform" onClick={handleSeek}>
                {/* Waveform Scrubber Box */}
                <div className="flex-1 h-[28px] relative w-full px-0.5">
                    {/* INACTIVE BARS (Background Layer) */}
                    <div className="absolute inset-0 flex items-center justify-between gap-[1.5px] opacity-70 group-hover/waveform:opacity-100 transition-opacity">
                        {waveform.map((heightVal, idx) => (
                            <div 
                                key={idx}
                                className={`flex-1 rounded-full ${isMe ? 'bg-black/20' : 'bg-white/20'}`}
                                style={{ height: `${heightVal * 100}%`, minWidth: '2px' }}
                            />
                        ))}
                    </div>

                    {/* ACTIVE BARS (Foreground Layer - Clipped natively at 60fps) */}
                    <div 
                        className="absolute inset-0 flex items-center justify-between gap-[1.5px] opacity-90 group-hover/waveform:opacity-100 transition-opacity"
                        style={{ clipPath: `inset(0 ${100 - (progress * 100)}% 0 0)` }}
                    >
                        {waveform.map((heightVal, idx) => (
                            <div 
                                key={idx}
                                className={`flex-1 rounded-full ${isMe ? 'bg-black' : 'bg-white'}`}
                                style={{ height: `${heightVal * 100}%`, minWidth: '2px' }}
                            />
                        ))}
                    </div>
                </div>
                
                {/* Timer text strictly tabular so digits don't jitter */}
                <div className={`text-[11px] font-bold tracking-wider tabular-nums w-[34px] shrink-0 text-right ${isMe ? 'text-black/60' : 'text-white/60'}`}>
                    {isPlaying && audioRef.current 
                        ? `${Math.floor(audioRef.current.currentTime / 60)}:${Math.floor(audioRef.current.currentTime % 60).toString().padStart(2, '0')}`
                        : `${Math.floor((duration || 0) / 60)}:${((duration || 0) % 60).toString().padStart(2, '0')}`
                    }
                </div>
            </div>
        </div>
    );
};
