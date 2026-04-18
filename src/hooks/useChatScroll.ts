import { useRef, useCallback, useLayoutEffect } from 'react';
import { supabase } from '../lib/supabase';
import { cachedMessages } from '../lib/chatStore';
import type { Message } from '../types/chat';

interface UseChatScrollOptions {
    messages: Message[];
    activeConvId: string | null;
    currentUser: any;
    initialUnreadId: string | null;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setConversations: React.Dispatch<React.SetStateAction<any[]>>;
    setInitialUnreadId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useChatScroll({
    messages,
    activeConvId,
    currentUser,
    initialUnreadId,
    setMessages,
    setConversations,
    setInitialUnreadId
}: UseChatScrollOptions) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isProgrammaticScrollRef = useRef(false);
    const handledUnreadScrollRef = useRef<string | null>(null);
    const handledBottomScrollRef = useRef<string | null>(null);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        setTimeout(() => {
            isProgrammaticScrollRef.current = true;
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior });
            }
            // Use 'scrollend' for precise detection — falls back to a timer for browsers that don't support it
            const container = scrollContainerRef.current;
            if (container) {
                const resetFlag = () => {
                    isProgrammaticScrollRef.current = false;
                    container.removeEventListener('scrollend', resetFlag);
                };
                container.addEventListener('scrollend', resetFlag, { once: true });
                // Safety fallback: always reset after 600ms regardless
                setTimeout(() => {
                    isProgrammaticScrollRef.current = false;
                    container.removeEventListener('scrollend', resetFlag);
                }, 600);
            } else {
                setTimeout(() => { isProgrammaticScrollRef.current = false; }, behavior === 'smooth' ? 300 : 100);
            }
        }, 50);
    }, []);

    // Reset scroll guards every time the conversation changes so revisiting a chat
    // always scrolls correctly instead of staying at the top.
    useLayoutEffect(() => {
        handledBottomScrollRef.current = null;
        handledUnreadScrollRef.current = null;
    }, [activeConvId]);

    // Native React rendering interception: this callback fires the *exact* millisecond 
    // Framer Motion mounts the new layout into the browser's DOM buffer, but *before* 
    // the browser paints it to the screen. 
    const messagesEndCallbackRef = useCallback((node: HTMLDivElement | null) => {
        messagesEndRef.current = node;
        if (!node) return;

        const messagesAreForThisConv = messages.some(m => m.conversation_id === activeConvId);
        if (messages.length > 0 && activeConvId && messagesAreForThisConv) {
            if (initialUnreadId) {
                if (handledUnreadScrollRef.current !== initialUnreadId) {
                    const el = document.getElementById(`unread-marker-${initialUnreadId}`);
                    if (el) {
                        isProgrammaticScrollRef.current = true;
                        el.scrollIntoView({ behavior: 'instant', block: 'center' });
                        setTimeout(() => { isProgrammaticScrollRef.current = false; }, 150);
                        handledUnreadScrollRef.current = initialUnreadId;
                        handledBottomScrollRef.current = activeConvId;
                    }
                }
            } else {
                if (handledBottomScrollRef.current !== activeConvId) {
                    isProgrammaticScrollRef.current = true;
                    // Force the actual scroll container manually for extreme speed
                    if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                    }
                    node.scrollIntoView({ behavior: 'instant' });
                    setTimeout(() => { isProgrammaticScrollRef.current = false; }, 150);
                    handledBottomScrollRef.current = activeConvId;
                }
            }
        }
    }, [initialUnreadId, messages, activeConvId]);

    const handleReadReceipts = useCallback((forceAnyPhysicalScroll = false) => {
        const container = scrollContainerRef.current;
        if (!container || !activeConvId || isProgrammaticScrollRef.current) return;

        const isAtBottom = (container.scrollHeight - container.scrollTop - container.clientHeight) < 150;
        
        if ((forceAnyPhysicalScroll || isAtBottom) && document.visibilityState === 'visible') {
            setMessages(prev => {
                const hasUnseen = prev.some(m => !m.seen && m.sender_id !== currentUser?.id);
                if (hasUnseen) {
                    const updated = prev.map(m => 
                        (m.sender_id !== currentUser?.id && !m.seen) ? { ...m, seen: true } : m
                    );
                    cachedMessages.set(activeConvId, updated);
                    
                    setInitialUnreadId(null);
                    setConversations(prevConv => prevConv.map(c => 
                        c.id === activeConvId ? { ...c, unread_count: 0 } : c
                    ));

                    supabase.from('messages').update({ seen: true })
                        .eq('conversation_id', activeConvId)
                        .neq('sender_id', currentUser?.id)
                        .eq('seen', false)
                        .then();
                    
                    return updated;
                }
                return prev;
            });
        }
    }, [activeConvId, currentUser, setMessages, setConversations, setInitialUnreadId]);

    return {
        scrollContainerRef,
        messagesEndRef,
        messagesEndCallbackRef,
        isProgrammaticScrollRef,
        handledUnreadScrollRef,
        scrollToBottom,
        handleReadReceipts
    };
}
