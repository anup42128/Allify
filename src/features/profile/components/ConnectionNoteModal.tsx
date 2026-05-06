

interface ConnectionNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    fullName: string | undefined;
}

export const ConnectionNoteModal = ({ isOpen, onClose, fullName }: ConnectionNoteModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            {/* The "Real Paper" Note */}
            <div className="relative w-full max-w-[320px] max-h-[min(60vh,480px)] bg-[#F9F6EE] shadow-[0_20px_60px_rgba(0,0,0,0.6),inset_0_0_60px_rgba(0,0,0,0.05)] transform -rotate-2 text-left flex flex-col"
                 style={{ 
                     clipPath: 'polygon(32px 0, calc(100% - 32px) 0, 100% 32px, 100% calc(100% - 32px), calc(100% - 32px) 100%, 32px 100%, 0 calc(100% - 32px), 0 32px)',
                     borderRadius: '3px 12px 5px 14px'
                 }}>
                 
                {/* Folded Dog-Ear Corner (Top Left) */}
                <div className="absolute top-0 left-0 w-[32px] h-[32px] bg-[#EBE5D9] shadow-[4px_4px_10px_rgba(0,0,0,0.15)] z-20" 
                     style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', borderBottomRightRadius: '6px' }} />

                {/* Folded Dog-Ear Corner (Top Right) */}
                <div className="absolute top-0 right-0 w-[32px] h-[32px] bg-[#EBE5D9] shadow-[-4px_4px_10px_rgba(0,0,0,0.15)] z-20" 
                     style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%)', borderBottomLeftRadius: '6px' }} />

                {/* Folded Dog-Ear Corner (Bottom Left) */}
                <div className="absolute bottom-0 left-0 w-[32px] h-[32px] bg-[#EBE5D9] shadow-[4px_-4px_10px_rgba(0,0,0,0.15)] z-20" 
                     style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)', borderTopRightRadius: '6px' }} />

                {/* Folded Dog-Ear Corner (Bottom Right) */}
                <div className="absolute bottom-0 right-0 w-[32px] h-[32px] bg-[#EBE5D9] shadow-[-4px_-4px_10px_rgba(0,0,0,0.15)] z-20" 
                     style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)', borderTopLeftRadius: '6px' }} />
                
                {/* Ultra-realistic Paper Texture Overlay */}
                <div className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.5] mix-blend-multiply z-0 transform-gpu" style={{ contain: 'strict' }}>
                    <svg className="w-full h-full">
                        <filter id="paper-noise">
                            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
                            <feColorMatrix type="matrix" values="1 0 0 0 0  0 0.98 0 0 0  0 0.96 0 0 0  0 0 0 0.2 0" />
                        </filter>
                        <rect width="100%" height="100%" filter="url(#paper-noise)" />
                    </svg>
                </div>



                {/* Scrollable Content Container (Hardware Accelerated) */}
                <div 
                    className="relative z-10 font-serif text-slate-800 pt-10 px-5 pb-5 pr-3 sm:px-8 sm:pb-8 sm:pr-4 overflow-y-auto transform-gpu will-change-scroll overscroll-contain [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-400/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/70"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                    <h2 className="text-[17px] sm:text-[20px] italic mb-4 sm:mb-6 font-medium tracking-tight text-slate-900">
                        Dear {fullName || 'friend'},
                    </h2>
                    
                    <div className="flex flex-col gap-4 sm:gap-6">
                        {[
                            "I know it’s not all okay right now.",
                            "You think too much, stress over small things, and still act like it’s nothing. Like you’ve got everything under control… even when you don’t.",
                            "And your “I’m fine”? yeah… Oscar-level acting at this point 😂",
                            "But listen—just because things feel messy doesn’t mean you’re failing. You’re not behind, you’re just figuring things out step by step.",
                            "You’ve already handled so many things you once thought you couldn’t. Don’t forget that.",
                            "Take it a little easy on yourself, okay? You don’t have to fix everything in one day.",
                            "Keep going. You’re gonna make it, no doubt."
                        ].map((text, i) => (
                            <p key={i} className="text-[13.5px] sm:text-[15.5px] leading-[2] sm:leading-[2.2] italic font-medium">
                                <span 
                                    className="text-slate-800/95"
                                    style={{
                                        backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMjAiIHByZXNlcnZlQXNwZWN0UmF0aW89Im5vbmUiPjxwYXRoIGQ9Ik0wLDEwIFEyNSwwIDUwLDEwIFQxMDAsMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L3N2Zz4=')",
                                        backgroundSize: "60px 8px",
                                        backgroundRepeat: "repeat-x",
                                        backgroundPosition: "bottom",
                                        paddingBottom: "8px"
                                    }}
                                >
                                    {text}
                                </span>
                            </p>
                        ))}
                    </div>
                    
                    <div className="flex flex-col items-end mt-5 sm:mt-8 pt-4 sm:pt-5 border-t border-slate-300/40">
                        <span className="text-[15px] italic font-medium text-slate-800 mb-1 flex items-center gap-1.5">
                            — with love 
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-rose-500">
                                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                            </svg>
                        </span>
                        <span className="text-[18px] italic font-bold text-slate-900">Team Allify</span>
                    </div>
                </div>
            </div>
            
            {/* Helper text outside the note */}
            <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
                <span className="text-white/50 text-[11px] font-semibold tracking-wider uppercase">Tap anywhere to close</span>
            </div>
        </div>
    );
};
