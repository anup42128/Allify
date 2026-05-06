import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CancelConfirmationModal } from './CancelConfirmationModal';

interface PhotoFilterProps {
    imageBlob: Blob;
    onComplete: (filteredBlob: Blob) => void;
    onBack: () => void;
    onCancel: () => void;
    selectedFilterId: string;
    onFilterChange: (id: string) => void;
}

export const FILTERS = [
    { id: 'normal',    name: 'Original',  css: 'none' },
    { id: 'vintage',   name: 'Vintage',   css: 'sepia(0.4) contrast(1.1) brightness(0.9) saturate(1.1)' },
    { id: 'cinematic', name: 'Cinematic', css: 'contrast(1.2) saturate(1.1) brightness(0.9) hue-rotate(-10deg)' },
    { id: 'noir',      name: 'Noir',      css: 'grayscale(1) contrast(1.3) brightness(0.9)' },
    { id: 'film',      name: 'Film',      css: 'grayscale(0.2) contrast(1.1) sepia(0.2) brightness(1.1)' },
    { id: 'warm',      name: 'Warm',      css: 'sepia(0.3) saturate(1.4) hue-rotate(-5deg) contrast(1.05)' },
    { id: 'cool',      name: 'Cool',      css: 'saturate(1.2) hue-rotate(15deg) contrast(1.1) brightness(0.95)' },
    { id: 'vibrant',   name: 'Vibrant',   css: 'saturate(1.5) contrast(1.1)' },
    { id: 'promist',   name: 'Pro-Mist',  css: 'contrast(0.85) brightness(1.12) saturate(0.88) sepia(0.04)' },
    { id: 'cinebloom', name: 'CineBloom', css: 'contrast(0.75) brightness(1.14) saturate(0.75) sepia(0.28) hue-rotate(-12deg)' },
    { id: 'kodak',     name: 'Kodak',     css: 'sepia(0.55) contrast(0.82) brightness(1.08) saturate(1.15) hue-rotate(-15deg)' },
    { id: 'aura',      name: 'Aura',      css: 'saturate(1.15) brightness(1.06) contrast(0.92) hue-rotate(340deg) sepia(0.12)' },
];

const PhotoFilter: React.FC<PhotoFilterProps> = ({ imageBlob, onComplete, onBack, onCancel, selectedFilterId, onFilterChange }) => {
    const selectedFilter = FILTERS.find(f => f.id === selectedFilterId) ?? FILTERS[0];
    const [imageUrl, setImageUrl] = useState<string>('');
    const [isApplying, setIsApplying] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const url = URL.createObjectURL(imageBlob);
        setImageUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [imageBlob]);

    const handleApplyFilter = async () => {
        setIsApplying(true);

        if (selectedFilter.id === 'normal') {
            onComplete(imageBlob); // Pass through unmodified
            return;
        }

        // Bake filter into canvas
        const img = new Image();
        img.src = imageUrl;
        await new Promise((resolve) => { img.onload = resolve; });

        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Apply chosen CSS filter to the rendering context
        ctx.filter = selectedFilter.css;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        canvas.toBlob((blob) => {
            if (blob) onComplete(blob);
            setIsApplying(false);
        }, 'image/jpeg', 0.9);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col h-full max-w-4xl mx-auto w-full pb-4 md:pb-8 pt-4 md:pt-6 px-2 md:px-4"
        >
            {/* Header */}
            <div className="flex justify-between items-center mb-4 md:mb-6 relative">
                {/* Left side: Back Button & Cancel Button */}
                <div className="flex-1 flex justify-start items-center gap-1 md:gap-3">
                    <button
                        onClick={onBack}
                        className="flex justify-center items-center w-10 h-10 md:w-12 md:h-12 bg-zinc-900 rounded-full hover:bg-zinc-800 transition text-white"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 md:w-6 md:h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setShowCancelModal(true)}
                        className="p-2 md:p-3 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                        title="Discard Post"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 md:w-6 md:h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Center: Title */}
                <h2 className="text-base sm:text-lg md:text-xl font-bold absolute left-1/2 -translate-x-1/2 whitespace-nowrap">Apply Filter</h2>

                {/* Right side: Next Button */}
                <div className="flex-1 flex justify-end items-center">
                    <button
                        onClick={handleApplyFilter}
                        disabled={isApplying}
                        className="px-4 md:px-6 py-1.5 md:py-2 text-sm md:text-base bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition disabled:opacity-50"
                    >
                        {isApplying ? 'Process...' : 'Next'}
                    </button>
                </div>
            </div>

            {/* Main body — preview + filter grid side by side from top */}
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 flex-1 min-h-0 items-start">

                {/* Preview */}
                <div className="flex-1 w-full bg-zinc-900/50 rounded-3xl md:rounded-[2rem] border border-zinc-800 shadow-2xl overflow-hidden flex items-center justify-center min-h-[220px] md:min-h-[260px]">
                    {imageUrl && (
                        <img
                            src={imageUrl}
                            alt="Filter Preview"
                            className="w-full h-full object-contain transition-all duration-300"
                            style={{ filter: selectedFilter.css }}
                        />
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Filter Grid — 4 columns, 2 rows, no scroll */}
                <div className="w-full md:w-[380px] flex items-start justify-center pt-2">
                    <div className="grid grid-cols-4 gap-3 sm:gap-4 md:gap-8">
                        {FILTERS.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => onFilterChange(f.id)}
                                className="flex flex-col items-center gap-2 group outline-none"
                            >
                                <div
                                    className={`relative w-[15vw] max-w-[64px] h-[15vw] max-h-[64px] md:w-20 md:h-20 rounded-full overflow-hidden transition-all duration-300
                                        ${selectedFilter.id === f.id
                                            ? 'ring-2 ring-white ring-offset-3 ring-offset-black scale-110 shadow-[0_0_18px_rgba(255,255,255,0.15)]'
                                            : 'opacity-55 group-hover:opacity-100 group-hover:scale-105 border border-zinc-700/60'
                                        }`}
                                >
                                    {imageUrl && (
                                        <img
                                            src={imageUrl}
                                            className="w-full h-full object-cover"
                                            style={{ filter: f.css }}
                                            alt={f.name}
                                        />
                                    )}
                                    <div className="absolute inset-0 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] pointer-events-none rounded-full" />
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-200
                                    ${selectedFilter.id === f.id ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                                    {f.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <CancelConfirmationModal
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={() => {
                    setShowCancelModal(false);
                    onCancel();
                }}
            />
        </motion.div>
    );
};

export default PhotoFilter;
