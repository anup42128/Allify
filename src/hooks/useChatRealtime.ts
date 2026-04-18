import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { cachedMessages } from '../lib/chatStore';
import type { Message, Participant } from '../types/chat';

interface UseChatRealtimeOptions {
    currentUser: any;
    activeConvIdRef: React.MutableRefObject<string | null>;
    activeConvId: string | null;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setConversations: React.Dispatch<React.SetStateAction<any[]>>;
    setIsTyping: React.Dispatch<React.SetStateAction<boolean>>;
    setInitialUnreadId: React.Dispatch<React.SetStateAction<string | null>>;
    handledUnreadScrollRef: React.MutableRefObject<string | null>;
    scrollToBottom: () => void;
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
    useEffect(() => {
        if (!activeConvId || !currentUser?.id) return;
        
        setIsTyping(false); // Reset organically on conv change
        
        const channel = supabase.channel(`typing:room:${activeConvId}`);

        channel
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (payload.payload?.user_id !== currentUser.id) {
                    setIsTyping(payload.payload?.typing ?? false);
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
        };
    }, [activeConvId, currentUser, setIsTyping]);

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
                            setIsTyping(false);
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

                    setConversations(prev => {
                        const exists = prev.some(c => c.id === newMsg.conversation_id);
                        
                        if (exists) {
                            const isIncomingUnread = newMsg.sender_id !== currentUser.id && newMsg.conversation_id !== activeConvIdRef.current;
                            return [...prev].map(c =>
                                c.id === newMsg.conversation_id
                                    ? { 
                                        ...c, 
                                        last_message: newMsg.content, 
                                        last_message_time: newMsg.created_at,
                                        unread_count: isIncomingUnread ? (c.unread_count || 0) + 1 : c.unread_count 
                                      }
                                    : c
                            ).sort((a, b) => {
                                if (!a.last_message_time) return 1;
                                if (!b.last_message_time) return -1;
                                return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
                            });
                        } else {
                            if (newMsg.sender_id !== currentUser.id) {
                                supabase.from('profiles').select('id, username, full_name, avatar_url').eq('id', newMsg.sender_id).single().then(({data}) => {
                                    if (data) {
                                        setConversations(p => {
                                            if (p.some(c => c.id === newMsg.conversation_id)) return p;
                                            return [{
                                                id: newMsg.conversation_id,
                                                last_message: newMsg.content,
                                                last_message_time: newMsg.created_at,
                                                other_user: data as Participant,
                                                unread_count: 0
                                            }, ...p].sort((a, b) => {
                                                if (!a.last_message_time) return 1;
                                                if (!b.last_message_time) return -1;
                                                return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
                                            });
                                        });
                                    }
                                });
                            } else {
                                fetchConversations(currentUser.id);
                            }
                            return prev; 
                        }
                    });
                } else if (payload.eventType === 'UPDATE') {
                    const updatedMsg = payload.new as Message;
                    if (updatedMsg.content === '🚫 This message was unsent.') {
                        const deletedId = updatedMsg.id;
                        setMessages(prev => prev.filter(m => m.id !== deletedId));
                        cachedMessages.forEach((msgs, convId) => {
                            cachedMessages.set(convId, msgs.filter(m => m.id !== deletedId));
                        });
                        fetchConversations(currentUser.id);
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
                    fetchConversations(currentUser.id);
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
                        scrollToBottom();
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
    }, [currentUser, fetchConversations, scrollToBottom, activeConvIdRef, setConversations, setInitialUnreadId, setIsTyping, setMessages, scrollContainerRef, handledUnreadScrollRef]);

    return { typingChannelRef };
}
