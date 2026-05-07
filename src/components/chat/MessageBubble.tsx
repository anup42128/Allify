import React, { Fragment, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import { VoiceMessageBubble } from './VoiceMessageBubble';
import type { Message, Participant } from '../../types/chat';

const TARGET_HEIGHT = 16;

const SyncScrollSpacer: React.FC = () => {
    const ref = useRef<HTMLDivElement>(null);
    const heightMotion = useMotionValue(0);

    useEffect(() => {
        const scrollContainer = document.getElementById('chat-scroll-container');
        let prevHeight = 0;

        const unsubscribe = heightMotion.on('change', (latest) => {
            const delta = latest - prevHeight;
            prevHeight = latest;
            
            // 1. Force the height update on the DOM element FIRST
            if (ref.current) {
                ref.current.style.height = `${latest}px`;
            }
            
            // 2. Force the browser to recalculate the layout immediately so scrollHeight updates!
            if (scrollContainer) {
                void scrollContainer.scrollHeight; 
                
                // 3. Now that scrollHeight is guaranteed to have grown, we can safely increment scrollTop!
                if (delta > 0) {
                    scrollContainer.scrollTop += delta;
                }
            }
        });

        const controls = animate(heightMotion, TARGET_HEIGHT, {
            duration: 0.25,
            ease: 'easeOut',
        });

        return () => {
            unsubscribe();
            controls.stop();
        };
    }, []);

    return <div ref={ref} className="w-full pointer-events-none shrink-0" style={{ height: 0 }} />;
};

const formatMessageTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

interface MessageBubbleProps {
    msg: Message;
    messages: Message[];
    currentUser: any;
    displayUser: Participant;
    isMe: boolean;
    isContinuation: boolean;
    isLastInGroup: boolean;
    isLastSeen: boolean;
    initialUnreadId: string | null;
    activeReactMsg: string | null;
    unsendMsgId: string | null;
    copiedMsgId: string | null;
    activeMobileHoverId: string | null;
    setActiveMobileHoverId: (id: string | null) => void;
    setActiveReactMsg: (id: string | null) => void;
    setUnsendMsgId: (id: string | null) => void;
    setConfirmDeleteId: (id: string | null) => void;
    setCopiedMsgId: (id: string | null) => void;
    setActiveReplyMsg: (msg: Message | null) => void;
    handleReaction: (messageId: string, emoji: string) => void;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    msg,
    messages,
    currentUser,
    displayUser,
    isMe,
    isContinuation,
    isLastInGroup,
    isLastSeen,
    initialUnreadId,
    activeReactMsg,
    unsendMsgId,
    copiedMsgId,
    activeMobileHoverId,
    setActiveMobileHoverId,
    setActiveReactMsg,
    setUnsendMsgId,
    setConfirmDeleteId,
    setCopiedMsgId,
    setActiveReplyMsg,
    handleReaction,
    inputRef
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const actionPopoverRef = useRef<HTMLDivElement>(null);
    const emojiPopoverRef = useRef<HTMLDivElement>(null);
    const [showReactDetails, setShowReactDetails] = React.useState(false);

    // Dynamic Edge Detection System
    useEffect(() => {
        const checkEdges = (ref: React.RefObject<HTMLDivElement | null>) => {
            if (!ref.current || !ref.current.parentElement) return;
            
            // Reset any previous shift
            ref.current.style.marginLeft = '0px';
            ref.current.style.marginRight = '0px';
            
            // Measure the static parent container (the button)
            const parentRect = ref.current.parentElement.getBoundingClientRect();
            // Get the unscaled physical width of the popover
            const popoverWidth = ref.current.offsetWidth;
            
            let finalLeftEdge, finalRightEdge;
            if (ref.current.classList.contains('left-0')) {
                finalLeftEdge = parentRect.left;
                finalRightEdge = finalLeftEdge + popoverWidth;
            } else {
                finalRightEdge = parentRect.right;
                finalLeftEdge = finalRightEdge - popoverWidth;
            }
            
            // 24px safety padding from screen edges
            if (finalLeftEdge < 24) {
                // Box will clip the left edge - move it right
                const moveRight = 24 - finalLeftEdge;
                ref.current.style.marginRight = `-${moveRight}px`;
                ref.current.style.marginLeft = `${moveRight}px`;
            } else if (finalRightEdge > window.innerWidth - 24) {
                // Box will clip the right edge - move it left
                const moveLeft = finalRightEdge - (window.innerWidth - 24);
                ref.current.style.marginRight = `${moveLeft}px`;
                ref.current.style.marginLeft = `-${moveLeft}px`;
            }
        };
        const runCheck = () => {
            if (unsendMsgId === msg.id) {
                checkEdges(actionPopoverRef);
            }
            if (activeReactMsg === msg.id) {
                checkEdges(emojiPopoverRef);
            }
        };

        // Run immediately, then again after a slight delay to ensure the animation hasn't messed with dimensions
        runCheck();
        const timeout = setTimeout(runCheck, 50);
        return () => clearTimeout(timeout);
    }, [unsendMsgId, activeReactMsg, msg.id]);


    return (
        <Fragment>
            {initialUnreadId === msg.id && (
                <div id={`unread-marker-${msg.id}`} className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-zinc-800/80"></div>
                    <span className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase bg-zinc-900 px-3 py-1 rounded-full text-center shadow-lg">
                        Unread Messages
                    </span>
                    <div className="flex-1 h-px bg-zinc-800/80"></div>
                </div>
            )}
            <div
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${!isContinuation ? (msg.reply_to_id ? 'mt-5' : 'mt-3') : (msg.reply_to_id ? 'mt-4' : 'mt-1')}`}
            >
                {/* Avatar for other user */}
                {!isMe && (
                    <div className="w-7 flex-shrink-0 mr-2 self-end">
                        {isLastInGroup && (
                            <div className="w-7 h-7 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
                                {displayUser.avatar_url ? (
                                    <img src={displayUser.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-zinc-500">
                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div
                    ref={containerRef}
                    className={`group/msg ${isMe ? 'max-w-[92%] md:max-w-[70%]' : 'max-w-[88%] md:max-w-[65%]'} min-w-0 flex flex-col relative ${isMe ? 'items-end' : 'items-start'}`}>

                    {/* ---- EMBEDDED QUOTE INJECTION ---- */}
                    {msg.reply_to_id && (() => {
                        const repliedMsg = messages.find(m => m.id === msg.reply_to_id);
                        if (!repliedMsg) return null;
                        const isReplyToMe = repliedMsg.sender_id === currentUser?.id;
                        const otherName = displayUser.username;
                        let replyUserString = "";
                        if (isMe) {
                            replyUserString = isReplyToMe ? 'You replied to yourself' : `You replied to ${otherName}`;
                        } else {
                            replyUserString = isReplyToMe ? `${otherName} replied to you` : `${otherName} replied to themselves`;
                        }

                        return (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                onClick={() => {
                                    const element = document.getElementById(`msg-${repliedMsg.id}`);
                                    if (element) {
                                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        setTimeout(() => {
                                            element.style.transition = 'box-shadow 0.25s ease';
                                            element.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.85), 0 0 22px rgba(139, 92, 246, 0.35)';
                                            setTimeout(() => {
                                                element.style.transition = 'box-shadow 1.2s ease';
                                                element.style.boxShadow = '0 0 0 0px rgba(139, 92, 246, 0)';
                                            }, 2000);
                                            setTimeout(() => {
                                                element.style.boxShadow = '';
                                                element.style.transition = '';
                                            }, 3300);
                                        }, 420);
                                    }
                                }}
                                className={`relative z-0 flex flex-col cursor-pointer mb-2 pb-3 pt-1.5 pl-3 pr-6 min-w-[120px] sm:min-w-[140px] max-w-[90%] rounded-2xl overflow-hidden transition-colors active:scale-[0.98] ${isMe ? 'bg-zinc-800/60 hover:bg-zinc-800/80 self-end mr-6' : 'bg-zinc-800/40 hover:bg-zinc-800/60 self-start ml-2'}`}
                                style={{ width: 'fit-content' }}
                            >
                                <div className={`absolute left-0 top-0 bottom-3 w-1 ${isReplyToMe ? 'bg-blue-500' : 'bg-purple-500'}`} />
                                <div className="flex items-center gap-1.5 mb-0.5 relative z-10 w-full pl-1">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={`w-3 h-3 flex-shrink-0 ${isReplyToMe ? 'text-blue-500' : 'text-purple-500'}`}><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>
                                    <span className={`text-[10px] font-bold tracking-wide whitespace-nowrap ${isReplyToMe ? 'text-blue-400' : 'text-purple-400'}`}>
                                        {replyUserString}
                                    </span>
                                </div>
                                <div className="relative max-h-[32px] overflow-hidden w-full pl-1">
                                    <p className="text-[11px] text-zinc-400 leading-[1.4] whitespace-pre-wrap break-words [word-break:break-word] line-clamp-2 pr-2">{repliedMsg.content}</p>
                                </div>
                            </motion.div>
                        );
                    })()}

                    <div className="flex items-center gap-2 relative z-10">
                        {/* Timestamp removed to prevent screen overflow on wide bubbles */}

                        {/* OUTGOING ACTION BUTTONS */}
                        {isMe && (
                            <div className="relative flex items-center self-center">
                                {/* Aesthetic Time Badge */}
                                <div className={`absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold tracking-widest text-zinc-300 uppercase bg-zinc-900 px-2 py-0.5 rounded-full shadow-md shadow-black/50 border border-zinc-700/50 z-50 transition-all duration-200 ease-out opacity-0 pointer-events-none md:group-hover/msg:opacity-100 md:group-hover/msg:-translate-y-0.5 ${(activeMobileHoverId === msg.id || unsendMsgId === msg.id) ? '!opacity-100 !-translate-y-0.5' : ''}`}>
                                    {formatMessageTime(msg.created_at)}
                                </div>
                                {/* Emoji Picker Popover */}
                                <AnimatePresence>
                                    {activeReactMsg === msg.id && (
                                        <motion.div
                                            ref={emojiPopoverRef}
                                            onClick={(e) => e.stopPropagation()}
                                            initial={{ opacity: 0, scale: 0.9, y: 6 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 6 }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            className="absolute bottom-full mb-3 right-0 z-[60] flex items-center gap-1.5 px-2 py-1.5 bg-zinc-900 border border-zinc-700/60 rounded-[24px] shadow-2xl shadow-black/50 backdrop-blur-md"
                                        >
                                            {['❤️', '👍', '😂', '😮', '😢', '🙏'].map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                                                    className={`text-[20px] md:text-[24px] leading-none w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-[1.2] focus:outline-none ${(msg.message_reactions || []).some(r => r.user_id === currentUser?.id && r.emoji === emoji)
                                                            ? 'bg-zinc-800 ring-2 ring-purple-500 scale-[1.10] shadow-lg shadow-purple-500/20'
                                                            : ''
                                                        }`}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                            <div className="w-px h-5 md:h-6 bg-zinc-700 mx-0.5"></div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setActiveReactMsg(null); }}
                                                className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800/80 transition-colors"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 md:w-4.5 md:h-4.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteId(msg.id);
                                        setUnsendMsgId(null);
                                    }}
                                    className={`p-1.5 rounded-full bg-red-500/10 text-red-500 hover:text-white hover:bg-red-600 transition-all duration-200 ease-out mr-1.5 opacity-0 scale-90 pointer-events-none md:group-hover/msg:opacity-100 md:group-hover/msg:scale-100 md:group-hover/msg:pointer-events-auto ${(activeMobileHoverId === msg.id || unsendMsgId === msg.id) ? '!opacity-100 !scale-100 !pointer-events-auto' : ''}`}
                                    title="Quick Delete"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setUnsendMsgId(unsendMsgId === msg.id ? null : msg.id); }}
                                    className={`p-1.5 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all duration-200 ease-out opacity-0 scale-90 pointer-events-none md:group-hover/msg:opacity-100 md:group-hover/msg:scale-100 md:group-hover/msg:pointer-events-auto ${(activeMobileHoverId === msg.id || unsendMsgId === msg.id) ? '!opacity-100 !scale-100 !pointer-events-auto' : ''}`}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                </button>

                                {/* Action Popover */}
                                <AnimatePresence>
                                    {unsendMsgId === msg.id && (
                                        <motion.div
                                            ref={actionPopoverRef}
                                            onClick={(e) => e.stopPropagation()}
                                            initial={{ opacity: 0, scale: 0.9, y: 10, originX: 1, originY: 1 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="absolute bottom-full mb-2 right-0 flex flex-col p-1.5 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl z-50 backdrop-blur-xl w-40"
                                        >
                                            <div className="flex items-center justify-center w-full px-3 pt-1 pb-2 text-[11px] font-bold tracking-widest text-zinc-500 uppercase">
                                                {formatMessageTime(msg.created_at)}
                                            </div>
                                            <div className="w-full h-px bg-zinc-800 mb-1" />
                                            <button onClick={(e) => { e.stopPropagation(); setActiveReactMsg(msg.id); setUnsendMsgId(null); }} className="flex items-center justify-between w-full px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium" title="React">
                                                <span>React</span>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); setActiveReplyMsg(msg); setUnsendMsgId(null); inputRef.current?.focus(); }} className="flex items-center justify-between w-full px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium" title="Reply">
                                                <span>Reply</span>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(msg.content || ''); setCopiedMsgId(msg.id); setTimeout(() => setCopiedMsgId(null), 1500); }} className="flex items-center justify-between w-full px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium" title="Copy">
                                                <span>Copy</span>
                                                {copiedMsgId === msg.id ? (
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-green-400"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                ) : (
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                                )}
                                            </button>
                                            <div className="w-full h-px bg-zinc-800 my-1" />
                                            <button onClick={() => { setConfirmDeleteId(msg.id); setUnsendMsgId(null); }} title="Delete" className="flex items-center justify-between w-full px-3 py-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium">
                                                <span>Delete</span>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* DEFAULT MESSAGE BUBBLE CONTENT */}
                        <div
                            id={`msg-${msg.id}`}
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                setActiveMobileHoverId(activeMobileHoverId === msg.id ? null : msg.id); 
                                if (unsendMsgId === msg.id) setUnsendMsgId(null);
                                if (activeReactMsg === msg.id) setActiveReactMsg(null);
                            }} // Mobile tap toggles action menu and closes any open popovers
                            className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap [word-break:break-word] max-w-full transition-opacity relative ${isMe
                                    ? 'bg-white text-black rounded-[20px] rounded-br-[6px]'
                                    : 'bg-zinc-800 text-white rounded-[20px] rounded-bl-[6px]'
                                } ${isContinuation && isMe ? '!rounded-br-[20px] !rounded-tr-[6px]' : ''}
                            ${isContinuation && !isMe ? '!rounded-bl-[20px] !rounded-tl-[6px]' : ''}`}
                        >
                            {msg.audio_url ? (
                                <VoiceMessageBubble audioUrl={msg.audio_url} duration={msg.audio_duration || 0} isMe={isMe} />
                            ) : (
                                msg.content
                            )}

                            {/* ── Reaction Badges Overlay ── */}
                            <AnimatePresence>
                                {msg.message_reactions && msg.message_reactions.length > 0 && (
                                    <motion.div 
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        className={`absolute -bottom-2.5 ${isMe ? '-left-1.5' : '-right-1.5'} flex items-center gap-1 z-20`}
                                    >
                                        {Object.entries(
                                            msg.message_reactions.reduce((acc, r) => {
                                                if (!acc[r.emoji]) acc[r.emoji] = { count: 0, hasMe: false };
                                                acc[r.emoji].count++;
                                                if (r.user_id === currentUser?.id) acc[r.emoji].hasMe = true;
                                                return acc;
                                            }, {} as Record<string, { count: number, hasMe: boolean }>)
                                        ).map(([emoji, data]) => (
                                            <div
                                                key={emoji}
                                                onClick={(e) => { e.stopPropagation(); setShowReactDetails(true); }}
                                                style={{ width: data.count > 1 ? 'auto' : 'clamp(20px, 5vw, 24px)', height: 'clamp(20px, 5vw, 24px)' }}
                                                className={`flex items-center justify-center ${data.count > 1 ? 'px-1.5' : ''} rounded-full cursor-pointer transition-transform hover:scale-110 active:scale-95 shadow-sm shadow-black/50 ${
                                                    isMe ? 'bg-zinc-900 border border-zinc-800' : 'bg-black border border-zinc-800'
                                                }`}
                                            >
                                                <span style={{ fontSize: 'clamp(11px, 3vw, 14px)' }} className="leading-none brightness-110 drop-shadow-sm">{emoji}</span>
                                                {data.count > 1 && (
                                                    <span style={{ fontSize: 'clamp(8px, 2vw, 10px)' }} className="font-bold tracking-wide ml-1 text-zinc-300">{data.count}</span>
                                                )}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            {/* ── Reaction Details Modal Overlay ── */}
                            <AnimatePresence>
                                {showReactDetails && msg.message_reactions && (
                                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setShowReactDetails(false); }}>
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-[min(320px,90vw)] bg-zinc-900 border border-zinc-800 rounded-[28px] shadow-2xl overflow-hidden flex flex-col"
                                        >
                                            <div className="px-5 py-4 border-b border-zinc-800/50 flex flex-col gap-1.5">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-bold text-white text-lg tracking-tight">Reactions</h3>
                                                    <button onClick={() => setShowReactDetails(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 transition-colors">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4.5 h-4.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                                <div className="text-zinc-400 text-[13px] leading-snug line-clamp-2 pr-4 italic">
                                                    "{msg.audio_url ? 'Voice Message' : msg.content}"
                                                </div>
                                            </div>
                                            <div className="p-2 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'min(350px, 65vh)' }}>
                                                {msg.message_reactions.map((r, i) => {
                                                    const isMeReact = r.user_id === currentUser?.id;
                                                    const user = isMeReact ? currentUser : displayUser;
                                                    return (
                                                        <div key={i} className="flex items-center justify-between p-3 rounded-[20px] hover:bg-zinc-800/40 transition-colors">
                                                            <div className="flex items-center gap-3.5">
                                                                <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700/50 shadow-sm">
                                                                    {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold text-sm">{user?.username?.[0]?.toUpperCase()}</div>}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-zinc-100 font-semibold text-[15px] leading-tight">{isMeReact ? 'You' : (user?.full_name || user?.username)}</span>
                                                                    <span className="text-zinc-500 text-[12px] mt-0.5">Reacted {r.emoji}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[26px] drop-shadow-sm">{r.emoji}</span>
                                                                {isMeReact && (
                                                                    <button 
                                                                        onClick={() => {
                                                                            handleReaction(msg.id, r.emoji);
                                                                            setShowReactDetails(false);
                                                                        }}
                                                                        className="px-3 py-1.5 rounded-xl bg-zinc-800/80 text-zinc-300 font-semibold text-[13px] hover:bg-red-500/10 hover:text-red-500 transition-colors ml-2"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </motion.div>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>



                        {/* INCOMING ACTION BUTTONS */}
                        {!isMe && (
                            <div className="relative flex items-center self-center">
                                {/* Aesthetic Time Badge */}
                                <div className={`absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold tracking-widest text-zinc-300 uppercase bg-zinc-900 px-2 py-0.5 rounded-full shadow-md shadow-black/50 border border-zinc-700/50 z-50 transition-all duration-200 ease-out opacity-0 pointer-events-none md:group-hover/msg:opacity-100 md:group-hover/msg:-translate-y-0.5 ${(activeMobileHoverId === msg.id || unsendMsgId === msg.id) ? '!opacity-100 !-translate-y-0.5' : ''}`}>
                                    {formatMessageTime(msg.created_at)}
                                </div>

                                <button
                                    onClick={(e) => { e.stopPropagation(); setUnsendMsgId(unsendMsgId === msg.id ? null : msg.id); }}
                                    className={`p-1.5 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all duration-200 ease-out ml-1 opacity-0 scale-90 pointer-events-none md:group-hover/msg:opacity-100 md:group-hover/msg:scale-100 md:group-hover/msg:pointer-events-auto ${(activeMobileHoverId === msg.id || unsendMsgId === msg.id) ? '!opacity-100 !scale-100 !pointer-events-auto' : ''}`}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                </button>

                                {/* Emoji Picker Popover for INCOMING */}
                                <AnimatePresence>
                                    {activeReactMsg === msg.id && (
                                        <motion.div
                                            ref={emojiPopoverRef}
                                            onClick={(e) => e.stopPropagation()}
                                            initial={{ opacity: 0, scale: 0.9, y: 6, originX: 0, originY: 1 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 6 }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            className="absolute bottom-full mb-3 left-0 z-[60] flex items-center gap-1.5 px-2 py-1.5 bg-zinc-900 border border-zinc-700/60 rounded-[24px] shadow-2xl shadow-black/50 backdrop-blur-md"
                                        >
                                            {['❤️', '👍', '😂', '😮', '😢', '🙏'].map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                                                    className={`text-[20px] md:text-[24px] leading-none w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-[1.2] focus:outline-none ${(msg.message_reactions || []).some(r => r.user_id === currentUser?.id && r.emoji === emoji)
                                                            ? 'bg-zinc-800 ring-2 ring-purple-500 scale-[1.10] shadow-lg shadow-purple-500/20'
                                                            : ''
                                                        }`}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                            <div className="w-px h-5 md:h-6 bg-zinc-700 mx-0.5"></div>
                                            <button onClick={(e) => { e.stopPropagation(); setActiveReactMsg(null); }} className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800/80 transition-colors">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 md:w-4.5 md:h-4.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Action Popover for INCOMING */}
                                <AnimatePresence>
                                    {unsendMsgId === msg.id && (
                                        <motion.div
                                            ref={actionPopoverRef}
                                            onClick={(e) => e.stopPropagation()}
                                            initial={{ opacity: 0, scale: 0.9, y: 10, originX: 0, originY: 1 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="absolute bottom-full mb-2 left-0 flex flex-col p-1.5 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl z-50 backdrop-blur-xl w-40"
                                        >
                                            <div className="flex items-center justify-center w-full px-3 pt-1 pb-2 text-[11px] font-bold tracking-widest text-zinc-500 uppercase">
                                                {formatMessageTime(msg.created_at)}
                                            </div>
                                            <div className="w-full h-px bg-zinc-800 mb-1" />
                                            <button onClick={(e) => { e.stopPropagation(); setActiveReactMsg(msg.id); setUnsendMsgId(null); }} className="flex items-center justify-between w-full px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium" title="React">
                                                <span>React</span>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); setActiveReplyMsg(msg); setUnsendMsgId(null); inputRef.current?.focus(); }} className="flex items-center justify-between w-full px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium" title="Reply">
                                                <span>Reply</span>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(msg.content || ''); setCopiedMsgId(msg.id); setTimeout(() => setCopiedMsgId(null), 1500); }} className="flex items-center justify-between w-full px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium" title="Copy">
                                                <span>Copy</span>
                                                {copiedMsgId === msg.id ? (
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-green-400"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                ) : (
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                                )}
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* SyncScrollSpacer: Flawlessly pushes the chat UPWARDS like Instagram.
                        It does this by expanding its height while simultaneously adjusting the scroll container
                        by the EXACT same pixel amount every frame, freezing messages below it in place! */}
                    <AnimatePresence>
                        {msg.message_reactions && msg.message_reactions.length > 0 && (
                            <SyncScrollSpacer />
                        )}
                    </AnimatePresence>
                </div>

                {/* Right spacer for incoming messages */}
                {!isMe && <div className="w-[14px] flex-shrink-0" />}

                {/* Read Receipt FOR ME MESSAGES - Pushed into flex flow to prevent absolute overflow! */}
                {isMe && (
                    <AnimatePresence>
                        {isLastSeen ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className="w-[14px] ml-[12px] flex-shrink-0 self-end flex flex-col justify-end pb-1 relative"
                                title="Read"
                            >
                                <div className="w-[14px] h-[14px] rounded-full overflow-hidden shrink-0 shadow-sm shadow-black/20">
                                    {displayUser.avatar_url ? (
                                        <img src={displayUser.avatar_url} className="w-[14px] h-[14px] object-cover" alt="Seen" />
                                    ) : (
                                        <div className="w-[14px] h-[14px] bg-zinc-700 flex items-center justify-center">
                                            <span className="text-[7px] text-white font-bold">{displayUser.full_name?.charAt(0).toUpperCase() || displayUser.username.charAt(0).toUpperCase()}</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                )}
            </div>
        </Fragment>
    );
};
