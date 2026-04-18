import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceRecorder } from '../../lib/useVoiceRecorder';
import type { Message } from '../../types/chat';
import type { Participant } from './Avatar';

interface MessageInputAreaProps {
    currentUser: any;
    displayUser: Participant;
    activeConvId: string | null;
    activeReplyMsg: Message | null;
    isSending: boolean;
    onSendMessage: (text: string) => Promise<void>;
    onSendVoiceMessage: (blob: Blob, duration: number) => Promise<void>;
    onClearReply: () => void;
    onTypingStatusChange: (isTyping: boolean) => void;
    ref?: React.Ref<HTMLTextAreaElement>;
}

export const MessageInputArea = ({
    currentUser,
    displayUser,
    activeConvId,
    activeReplyMsg,
    isSending,
    onSendMessage,
    onSendVoiceMessage,
    onClearReply,
    onTypingStatusChange,
    ref: externalRef
}: MessageInputAreaProps) => {
    const { isRecording, duration, isPaused, pauseRecording, resumeRecording, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();

    const [inputText, setInputText] = useState('');
    const [inputHeight, setInputHeight] = useState('auto');
    const draftsRef = useRef<Record<string, { text: string; height: string }>>({});
    const internalRef = useRef<HTMLTextAreaElement>(null);
    // Support both forwarded and internal ref
    const inputRef = (externalRef as React.RefObject<HTMLTextAreaElement>) || internalRef;

    // Typing debounce
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSendingTypingRef = useRef(false);

    // Restore the saved draft text + box height when switching conversations
    useEffect(() => {
        if (activeConvId) {
            const draft = draftsRef.current[activeConvId];
            const text = draft?.text || '';
            const height = draft?.height || 'auto';
            setInputText(text);
            setInputHeight(height);
            // Move cursor to end after React renders the restored value
            setTimeout(() => {
                const el = inputRef.current;
                if (el) el.setSelectionRange(text.length, text.length);
            }, 0);
        } else {
            setInputText('');
            setInputHeight('auto');
        }
    }, [activeConvId]);

    const handleTyping = (text: string) => {
        if (text.length === 0) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            isSendingTypingRef.current = false;
            onTypingStatusChange(false);
            return;
        }

        if (!isSendingTypingRef.current) {
            isSendingTypingRef.current = true;
            onTypingStatusChange(true);
        }
        
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
            isSendingTypingRef.current = false;
            onTypingStatusChange(false);
        }, 500);
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        if (text.length > 1111) return;
        
        setInputText(text);
        if (activeConvId) {
            draftsRef.current[activeConvId] = { text, height: inputRef.current?.style.height || 'auto' };
        }
        
        handleTyping(text);

        const el = e.target;
        el.style.height = 'auto';
        const newHeight = `${Math.min(el.scrollHeight, 120)}px`;
        el.style.height = newHeight;
        setInputHeight(newHeight);
        
        if (activeConvId) {
            draftsRef.current[activeConvId].height = newHeight;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || !activeConvId || isSending) return;

        // Wipe from drafts securely so it doesn't resurrect later
        delete draftsRef.current[activeConvId];
        setInputText('');
        setInputHeight('auto');
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        isSendingTypingRef.current = false;
        onTypingStatusChange(false);

        await onSendMessage(text);
    };

    const handleVoiceRecordStop = async () => {
        const recording = await stopRecording();
        if (recording && recording.blob.size > 0) {
            await onSendVoiceMessage(recording.blob, recording.duration);
        }
    };

    return (
        <div className="px-4 pb-3 pt-2 flex-shrink-0 bg-black flex flex-col relative w-full">
            {/* -- UNIFIED INPUT & REPLY CONTAINER -- */}
            <div className="flex flex-col bg-zinc-900 rounded-[24px] border border-zinc-800/60 focus-within:border-zinc-500 transition-colors shadow-inner relative z-20 overflow-hidden">
                <AnimatePresence>
                    {activeReplyMsg && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                            className="w-full flex items-center bg-zinc-800/30 border-b border-zinc-800/60 relative overflow-hidden"
                        >
                            {/* Accent Left Bar */}
                            <div className="w-1 h-full bg-blue-500 absolute left-0 top-0 bottom-0" />
                            
                            {/* Content Block */}
                            <div className="flex-1 py-2.5 px-4 pl-4 overflow-hidden relative">
                                <div className="flex items-center justify-between mb-0.5 relative z-10 pr-8">
                                    <span className="text-[11px] font-bold text-blue-400 tracking-wide">
                                        {activeReplyMsg.sender_id === currentUser?.id ? 'Replying to yourself' : `Replying to ${displayUser.username}`}
                                    </span>
                                </div>
                                <div className="relative max-h-[38px] overflow-hidden">
                                    <p className="text-xs text-zinc-400 leading-[1.3] whitespace-pre-wrap break-words pr-8 line-clamp-2">{activeReplyMsg.content}</p>
                                </div>
                            </div>

                            <button 
                                onClick={onClearReply}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-zinc-700/60 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex items-end gap-2 p-1.5 pl-4 bg-transparent w-full relative">
                    <AnimatePresence mode="wait">
                        {isRecording ? (
                            <motion.div 
                                key="recording-ui"
                                initial={{ opacity: 0, scale: 0.95, x: 20 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95, x: -20 }}
                                className="flex-1 flex items-center justify-between h-10"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-red-500">
                                        <span className={`w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] ${!isPaused ? 'animate-pulse' : 'opacity-50'}`} />
                                        <span className={`text-sm font-bold tracking-widest tabular-nums font-mono ${isPaused ? 'opacity-70' : ''}`}>
                                            {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                    <div className={`flex items-center gap-[3px] h-4 ml-1 ${isPaused ? 'opacity-30' : ''}`}>
                                        {[1,2,3,4,5,6,7,8].map((i) => (
                                            <motion.div 
                                                key={i}
                                                animate={{ height: isPaused ? '30%' : ['40%', '100%', '30%'] }}
                                                transition={{ duration: 0.4 + (i * 0.1), repeat: Infinity, ease: 'linear' }}
                                                className="w-[2px] bg-red-400/80 rounded-full"
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pr-2">
                                    <button 
                                        onClick={isPaused ? resumeRecording : pauseRecording}
                                        className="w-10 h-10 flex items-center justify-center rounded-full bg-transparent text-blue-400 hover:bg-zinc-800 transition-colors"
                                        title={isPaused ? "Resume" : "Pause"}
                                    >
                                        {isPaused ? (
                                            <svg className="w-[22px] h-[22px] fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                        ) : (
                                            <svg className="w-[22px] h-[22px] fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                        )}
                                    </button>
                                    <button 
                                        onClick={cancelRecording}
                                        className="w-10 h-10 flex items-center justify-center rounded-full bg-transparent text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                                        title="Cancel & Delete"
                                    >
                                        <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                    <motion.button
                                        key="send-audio-btn-inline"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        onClick={handleVoiceRecordStop}
                                        className="w-10 h-10 flex items-center justify-center text-white hover:text-blue-400 hover:bg-zinc-800 rounded-full active:scale-95 cursor-pointer transition-colors"
                                        title="Send Voice Message"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[21px] h-[21px] ml-[-1px] mt-[1px]">
                                            <polygon points="12 3 4 21 12 17 20 21"></polygon>
                                            <line x1="12" y1="3" x2="12" y2="17"></line>
                                        </svg>
                                    </motion.button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.textarea
                                key="text-input"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                ref={inputRef}
                                rows={1}
                                maxLength={1111}
                                value={inputText}
                                onChange={handleTextareaChange}
                                onKeyDown={handleKeyDown}
                                placeholder={`Message ${displayUser.username}...`}
                                className="flex-1 min-w-0 break-words bg-transparent text-white text-base placeholder-zinc-500 resize-none focus:outline-none py-1.5 max-h-[120px]"
                                style={{ height: inputHeight, minHeight: '24px' }}
                                autoFocus
                            />
                        )}
                    </AnimatePresence>

                    <div className={`flex flex-shrink-0 items-center justify-center ${isRecording ? 'hidden' : 'h-9 w-9'}`}>
                        <AnimatePresence mode="wait" initial={false}>
                        {inputText.trim() ? (
                            <motion.button
                                key="send-btn"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                onClick={handleSend}
                                disabled={isSending}
                                className="w-9 h-9 flex items-center justify-center text-white active:scale-95 cursor-pointer"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
                                    <polygon points="12 3 4 21 12 17 20 21"></polygon>
                                    <line x1="12" y1="3" x2="12" y2="17"></line>
                                </svg>
                            </motion.button>
                        ) : (
                            <motion.button
                                key="mic-btn"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                onClick={startRecording}
                                className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white transition-colors active:scale-95"
                            >
                                <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                            </motion.button>
                        )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
            {inputText.length >= 1000 && (
                <div className="h-6 mt-1 flex items-center justify-end relative overflow-hidden pr-2">
                    <AnimatePresence mode="wait">
                        {inputText.length >= 1111 ? (
                            <motion.p
                                key="limit"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="text-red-400 text-[11px] font-medium absolute"
                            >
                                You've reached the 1,111 character limit.
                            </motion.p>
                        ) : (
                            <motion.p
                                key="hint"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.2 }}
                                className="text-zinc-500 font-medium text-[10px] absolute flex items-center gap-1"
                            >
                                <span className={inputText.length > 1080 ? 'text-orange-400 font-bold' : ''}>{1111 - inputText.length}</span> characters left
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};
