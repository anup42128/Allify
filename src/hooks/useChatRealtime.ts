import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { cachedMessages } from '../lib/chatStore';
import type { Message } from '../types/chat';

interface UseChatRealtimeOptions {
    currentUser: any;
    activeConvIdRef: React.MutableRefObject<string | null>;
    activeConvId: string | null;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setConversations: React.Dispatch<React.SetStateAction<any[]>>;
    setIsTyping: React.Dispatch<React.SetStateAction<boolean>>;
    setInitialUnreadId: React.Dispatch<React.SetStateAction<string | null>>;
    handledUnreadScrollRef: React.MutableRefObject<string | null>;
    scrollToBottom: (behavior?: ScrollBehavior) => void;
    fetchConversations: (userId: string) => Promise<void>;
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function useChatRealtime({
    currentUser,
    activeConvIdRef,
    activeConvId,
    setMessages,
    setConversations,
    setIsTyping,
    setInitialUnreadId,
    handledUnreadScrollRef,
    scrollToBottom,
    fetchConversations,
    scrollContainerRef
}: UseChatRealtimeOptions) {
    const typingChannelRef = useRef<any>(null);
    const messageChannelRef = useRef<any>(null);
    const reactionChannelRef = useRef<any>(null);

    // ── Live Typing Indicator Ephemeral Channel ───────────────────────────────
    // Minimum display time prevents the indicator from flickering during ultra-fast
    // type-send bursts where typing:false arrives within ~80ms of typing:true.
    const typingVisibleSinceRef = useRef<number>(0);
    const typingDeferredFalseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const MIN_TYPING_DISPLAY_MS = 400;

    const dismissTyping = useCallback(() => {
        const elapsed = Date.now() - typingVisibleSinceRef.current;

        if (typingDeferredFalseRef.current) {
            clearTimeout(typingDeferredFalseRef.current);
            typingDeferredFalseRef.current = null;
        }

        if (elapsed >= MIN_TYPING_DISPLAY_MS || typingVisibleSinceRef.current === 0) {
            setIsTyping(false);
        } else {
            // Defer the dismissal until the minimum display time has elapsed
            typingDeferredFalseRef.current = setTimeout(() => {
                setIsTyping(false);
                typingDeferredFalseRef.current = null;
            }, MIN_TYPING_DISPLAY_MS - elapsed);
        }
    }, [setIsTyping]);

    useEffect(() => {
        if (!activeConvId || !currentUser?.id) return;
        
        setIsTyping(false); // Reset organically on conv change
        typingVisibleSinceRef.current = 0;
        
        const channel = supabase.channel(`typing:room:${activeConvId}`);

        channel
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (payload.payload?.user_id !== currentUser.id) {
                    if (payload.payload?.typing) {
                        // Show instantly on first keystroke — zero delay
                        typingVisibleSinceRef.current = Date.now();
                        if (typingDeferredFalseRef.current) {
                            clearTimeout(typingDeferredFalseRef.current);
                            typingDeferredFalseRef.current = null;
                        }
                        setIsTyping(true);
                    } else {
                        dismissTyping();
                    }
                }
            })
            .on('broadcast', { event: 'reaction_deleted' }, (payload) => {
                const { message_id, user_id } = payload.payload;
                if (!message_id || !user_id || user_id === currentUser.id) return;
                
                setMessages(prev => prev.map(m => {
                    if (m.id === message_id) {
                        const current = m.message_reactions || [];
                        return { ...m, message_reactions: current.filter(c => c.user_id !== user_id) };
                    }
                    return m;
                }));
            })
            .subscribe();

        typingChannelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            typingChannelRef.current = null;
            if (typingDeferredFalseRef.current) {
                clearTimeout(typingDeferredFalseRef.current);
                typingDeferredFalseRef.current = null;
            }
        };
    }, [activeConvId, currentUser, setIsTyping, dismissTyping]);

    // ── Subscribe to realtime messages & reactions globally ───────────────────
    useEffect(() => {
        if (!currentUser?.id) return;

        if (messageChannelRef.current) {
            supabase.removeChannel(messageChannelRef.current);
            messageChannelRef.current = null;
        }

        const channel = supabase
            .channel(`messages:all:${currentUser.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages',
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newMsg = payload.new as Message;
                    
                    if (newMsg.conversation_id === activeConvIdRef.current) {
                        if (newMsg.sender_id !== currentUser.id) {
                            dismissTyping();
                        }

                        const isVisible = document.visibilityState === 'visible';
                        const container = scrollContainerRef.current;
                        const isAtBottom = container 
                            ? (container.scrollHeight - container.scrollTop - container.clientHeight) < 200 
                            : true;

                        const isMeSending = newMsg.sender_id === currentUser.id;
                        const shouldAutoScroll = isMeSending || (isVisible && isAtBottom);

                        if (shouldAutoScroll && !isMeSending) {
                            newMsg.seen = true;
                            supabase.from('messages').update({ seen: true }).eq('id', newMsg.id).then();
                        }

                        setMessages(prev => {
                            const existingIdx = prev.findIndex(m => m.id === newMsg.id);
                            if (existingIdx !== -1) {
                                const updated = [...prev];
                                const existingMsg = updated[existingIdx];
                                if (existingMsg.audio_url?.startsWith('blob:')) {
                                    newMsg.audio_url = existingMsg.audio_url;
                                }
                                updated[existingIdx] = newMsg;
                                cachedMessages.set(newMsg.conversation_id, updated);
                                return updated;
                            }
                            
                            const optimisticIdx = prev.findIndex(m => m.optimistic && m.content === newMsg.content && m.sender_id === newMsg.sender_id);
                            let next;
                            if (optimisticIdx !== -1) {
                                const updated = [...prev];
                                updated[optimisticIdx] = newMsg;
                                next = updated;
                            } else {
                                next = [...prev, newMsg];
                            }
                            cachedMessages.set(newMsg.conversation_id, next);
                            return next;
                        });

                        if (shouldAutoScroll) {
                            scrollToBottom();
                        } else {
                            if (!isMeSending) {
                                setInitialUnreadId(curr => {
                                    if (!curr) {
                                        handledUnreadScrollRef.current = newMsg.id;
                                        return newMsg.id;
                                    }
                                    return curr;
                                });
                            }
                        }
                    }

                    // Conversation list updates (unread counts, last message, new chats) are entirely handled 
                    // by the global chatStore.ts realtime engine. This prevents race conditions where both 
                    // this hook and the global store attempt to update the conversations array simultaneously.
                } else if (payload.eventType === 'UPDATE') {
                    const updatedMsg = payload.new as Message;
                    if (updatedMsg.content === '🚫 This message was unsent.') {
                        const deletedId = updatedMsg.id;
                        setMessages(prev => prev.filter(m => m.id !== deletedId));
                        cachedMessages.forEach((msgs, convId) => {
                            cachedMessages.set(convId, msgs.filter(m => m.id !== deletedId));
                        });
                    } else {
                        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
                        cachedMessages.forEach((msgs, convId) => {
                            cachedMessages.set(convId, msgs.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
                        });
                    }
                } else if (payload.eventType === 'DELETE') {
                    const deletedId = payload.old.id;
                    setMessages(prev => prev.filter(m => m.id !== deletedId));
                    cachedMessages.forEach((msgs, convId) => {
                        cachedMessages.set(convId, msgs.filter(m => m.id !== deletedId));
                    });
                }
            })
            .subscribe();

        messageChannelRef.current = channel;

        if (reactionChannelRef.current) {
            supabase.removeChannel(reactionChannelRef.current);
            reactionChannelRef.current = null;
        }

        const reactionChannel = supabase
            .channel(`message_reactions:all:${currentUser.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'message_reactions'
            }, (payload) => {
                const isInsert = payload.eventType === 'INSERT';
                const isDelete = payload.eventType === 'DELETE';
                const isUpdate = payload.eventType === 'UPDATE';
                const react = (isInsert || isUpdate ? payload.new : payload.old) as any;
                
                if (react.user_id === currentUser.id) return;
                
                setMessages(prev => prev.map(m => {
                    if (m.id === react.message_id) {
                        const current = m.message_reactions || [];
                        if (isInsert) {
                            if (!current.some(c => c.user_id === react.user_id)) {
                                return { ...m, message_reactions: [...current, { user_id: react.user_id, emoji: react.emoji }] };
                            }
                        }
                        if (isUpdate) {
                            return { ...m, message_reactions: current.map(c => c.user_id === react.user_id ? { ...c, emoji: react.emoji } : c) };
                        }
                        if (isDelete) {
                            return { ...m, message_reactions: current.filter(c => c.user_id !== react.user_id) };
                        }
                    }
                    return m;
                }));

                // If user is close to the bottom, scroll down so the reaction badge doesn't push content off-screen
                const container = scrollContainerRef.current;
                if (container) {
                    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
                    if (distFromBottom < 200) {
                        scrollToBottom('smooth');
                    }
                }
            })
            .subscribe();

        reactionChannelRef.current = reactionChannel;

        return () => {
            if (messageChannelRef.current) {
                supabase.removeChannel(messageChannelRef.current);
                messageChannelRef.current = null;
            }
            if (reactionChannelRef.current) {
                supabase.removeChannel(reactionChannelRef.current);
                reactionChannelRef.current = null;
            }
        };
    }, [currentUser, fetchConversations, scrollToBottom, activeConvIdRef, setConversations, setInitialUnreadId, dismissTyping, setMessages, scrollContainerRef, handledUnreadScrollRef]);

    return { typingChannelRef };
}
