import React, { Fragment, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceMessageBubble } from './VoiceMessageBubble';
import type { Message, Participant } from '../../types/chat';



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
            
            // Since all popovers are anchored `right-0`, their final right edge is the parent's right edge
            const finalRightEdge = parentRect.right;
            const finalLeftEdge = finalRightEdge - popoverWidth;
            
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

        if (unsendMsgId === msg.id) {
            checkEdges(actionPopoverRef);
        }
        if (activeReactMsg === msg.id) {
            checkEdges(emojiPopoverRef);
        }
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

                    <div className={`flex items-center gap-2 relative z-10 ${msg.message_reactions && msg.message_reactions.length > 0 ? 'mb-4' : ''}`}>
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
                                            className="absolute bottom-full mb-3 right-0 z-[60] flex items-center gap-2 px-2.5 py-2 bg-zinc-900 border border-zinc-700/60 rounded-[28px] shadow-2xl shadow-black/50 backdrop-blur-md"
                                        >
                                            {['❤️', '👍', '😂', '😮', '😢', '🙏'].map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                                                    className={`text-[26px] leading-none w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-[1.2] focus:outline-none ${(msg.message_reactions || []).some(r => r.user_id === currentUser?.id && r.emoji === emoji)
                                                            ? 'bg-zinc-800 ring-2 ring-purple-500 scale-[1.10] shadow-lg shadow-purple-500/20'
                                                            : ''
                                                        }`}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                            <div className="w-px h-7 bg-zinc-700 mx-1"></div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setActiveReactMsg(null); }}
                                                className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800/80 transition-colors"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
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
                            {msg.message_reactions && msg.message_reactions.length > 0 && (
                                <div className={`absolute -bottom-4 ${isMe ? 'right-2 flex-row-reverse' : 'left-2 flex-row'} flex items-center gap-1 z-20`}>
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
                                            onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                                            className={`flex items-center gap-1.5 px-2 py-[3px] rounded-full border border-zinc-700/60 cursor-pointer transition-all hover:scale-110 active:scale-95 shadow-sm ${data.hasMe
                                                    ? 'bg-purple-600 shadow-purple-500/20'
                                                    : 'bg-zinc-800 hover:bg-zinc-700'
                                                }`}
                                        >
                                            <span className="text-[14px] leading-none brightness-110 drop-shadow-sm">{emoji}</span>
                                            {data.count > 1 && (
                                                <span className={`text-[10px] font-bold tracking-wide mr-0.5 ${data.hasMe ? 'text-white' : 'text-zinc-300'}`}>{data.count}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
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
                                            onClick={(e) => e.stopPropagation()}
                                            initial={{ opacity: 0, scale: 0.9, y: 6 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 6 }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
                                            className="absolute bottom-full mb-3 right-0 z-[60] flex items-center gap-2 px-2.5 py-2 bg-zinc-900 border border-zinc-700/60 rounded-[28px] shadow-2xl shadow-black/50 backdrop-blur-md"
                                        >
                                            {['❤️', '👍', '😂', '😮', '😢', '🙏'].map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                                                    className={`text-[26px] leading-none w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-[1.2] focus:outline-none ${(msg.message_reactions || []).some(r => r.user_id === currentUser?.id && r.emoji === emoji)
                                                            ? 'bg-zinc-800 ring-2 ring-purple-500 scale-[1.10] shadow-lg shadow-purple-500/20'
                                                            : ''
                                                        }`}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                            <div className="w-px h-7 bg-zinc-700 mx-1"></div>
                                            <button onClick={(e) => { e.stopPropagation(); setActiveReactMsg(null); }} className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800/80 transition-colors">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Action Popover for INCOMING */}
                                <AnimatePresence>
                                    {unsendMsgId === msg.id && (
                                        <motion.div
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
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
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
