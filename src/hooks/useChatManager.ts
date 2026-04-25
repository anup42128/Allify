import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCachedConversations, cachedMessages, subscribeToChatUpdates, fetchGlobalConversations, updateCachedConversationsSilently } from '../lib/chatStore';
import { initGlobalPresenceSync } from '../lib/presenceStore';
import { useChatScroll } from './useChatScroll';
import { useChatRealtime } from './useChatRealtime';
import { useChatActions } from './useChatActions';
import type { Participant, Conversation, Message } from '../types/chat';

export function useChatManager() {
    const location = useLocation();
    const navigate = useNavigate();
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [conversations, setConversations] = useState<Conversation[]>(getCachedConversations() || []);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const activeConvIdRef = useRef<string | null>(null);
    
    useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);
    
    const [messages, setMessages] = useState<Message[]>([]);

    const [isLoadingConvs, setIsLoadingConvs] = useState(!getCachedConversations());
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (currentUser?.id) {
            initGlobalPresenceSync(currentUser.id);
        }
    }, [currentUser?.id]);

    const [activeConvUser, setActiveConvUser] = useState<Participant | null>(null);
    const [unsendMsgId, setUnsendMsgId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
    const [activeReplyMsg, setActiveReplyMsg] = useState<Message | null>(null);
    const [activeReactMsg, setActiveReactMsg] = useState<string | null>(null);

    const startChatHandledRef = useRef(false);

    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSendingTypingRef = useRef(false);

    const [initialUnreadId, setInitialUnreadId] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [isOpeningChat, setIsOpeningChat] = useState(false);

    const fetchConversations = useCallback(async (userId: string) => {
        await fetchGlobalConversations(userId);
    }, []);

    const {
        scrollContainerRef,
        messagesEndCallbackRef,
        handledUnreadScrollRef,
        scrollToBottom,
        handleReadReceipts
    } = useChatScroll({
        messages,
        activeConvId,
        currentUser,
        initialUnreadId,
        setMessages,
        setConversations,
        setInitialUnreadId
    });

    const { typingChannelRef } = useChatRealtime({
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
    });

    useEffect(() => {
        const unsub = subscribeToChatUpdates(() => {
            const fresh = getCachedConversations();
            if (fresh) {
                setConversations(fresh);
                setIsLoadingConvs(false);
            }
        });
        return () => { unsub(); };
    }, []);

    useEffect(() => {
        if (conversations.length > 0) {
            updateCachedConversationsSilently(conversations);
        }
    }, [conversations]);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) { navigate('/auth/login'); return; }
            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            if (data) setCurrentUser(data);
        };
        init();
    }, [navigate]);

    useEffect(() => {
        if (currentUser?.id) fetchConversations(currentUser.id);
    }, [currentUser, fetchConversations]);

    useEffect(() => {
        const startWith = location.state?.startChatWith;
        if (!startWith || !currentUser?.id || startChatHandledRef.current) return;
        startChatHandledRef.current = true;

        const openOrCreate = async () => {
            try {
                setIsOpeningChat(true);
                const { data: convId, error } = await supabase.rpc('find_or_create_conversation', {
                    user_a: currentUser.id,
                    user_b: startWith.id,
                });
                if (error) throw error;

                const { data: fullProfile } = await supabase
                    .from('profiles')
                    .select('id, username, full_name, avatar_url, last_seen')
                    .eq('id', startWith.id)
                    .single();

                // Save to localStorage so it stays in the initiator's sidebar as a draft
                const initiatedStr = localStorage.getItem(`initiated_chats_${currentUser.id}`) || '[]';
                let initiatedIds: string[] = [];
                try { initiatedIds = JSON.parse(initiatedStr); } catch (e) {}
                if (!initiatedIds.includes(convId)) {
                    initiatedIds.push(convId);
                    localStorage.setItem(`initiated_chats_${currentUser.id}`, JSON.stringify(initiatedIds));
                }

                await fetchConversations(currentUser.id);

                setActiveConvId(convId);
                setActiveConvUser({
                    id: startWith.id,
                    username: startWith.username,
                    full_name: startWith.full_name,
                    avatar_url: startWith.avatar_url,
                    ...(fullProfile?.last_seen ? { last_seen: fullProfile.last_seen } : {}),
                } as Participant);
            } catch (err) {
                console.error('Error opening chat:', err);
                startChatHandledRef.current = false;
            } finally {
                setIsOpeningChat(false);
            }
        };

        openOrCreate();
    }, [location.state, currentUser, fetchConversations]);

    const fetchMessages = useCallback(async (convId: string) => {
        const hasCached = cachedMessages.has(convId);
        if (hasCached) {
            const cachedArr = cachedMessages.get(convId)!;
            setMessages(cachedArr);
            const unreadId = cachedArr.find(m => !m.seen && m.sender_id !== currentUser?.id)?.id || null;
            setInitialUnreadId(unreadId);
        } else {
            setIsLoadingMessages(true);
        }

        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*, message_reactions(user_id, emoji)')
                .eq('conversation_id', convId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            const fetched = data || [];
            cachedMessages.set(convId, fetched);
            setMessages(fetched);

            const unreadId = fetched.find(m => !m.seen && m.sender_id !== currentUser?.id)?.id || null;
            setInitialUnreadId(unreadId);

            if (currentUser?.id && unreadId) {
                const locallySeenData = fetched.map(m =>
                    (m.sender_id !== currentUser.id && !m.seen) ? { ...m, seen: true } : m
                );
                cachedMessages.set(convId, locallySeenData);
                setMessages(locallySeenData);

                setConversations(prevConv => prevConv.map(c =>
                    c.id === convId ? { ...c, unread_count: 0 } : c
                ));

                supabase
                    .from('messages')
                    .update({ seen: true })
                    .eq('conversation_id', convId)
                    .neq('sender_id', currentUser.id)
                    .eq('seen', false)
                    .then();
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
        } finally {
            setIsLoadingMessages(false);
        }
    }, [currentUser, scrollToBottom]);

    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                handleReadReceipts(false);
                if (activeConvIdRef.current) {
                    fetchMessages(activeConvIdRef.current);
                }
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, [handleReadReceipts, fetchMessages]);

    useEffect(() => {
        if (activeConvId) fetchMessages(activeConvId);
    }, [activeConvId, fetchMessages]);

    const {
        handleReaction,
        handleUnsendMessage,
        handleVoiceRecordStopFromInput,
        handleSendMessageText
    } = useChatActions({
        currentUser,
        messages,
        setMessages,
        setConversations,
        activeConvId,
        activeConvIdRef,
        fetchConversations,
        scrollToBottom,
        activeReplyMsg,
        setActiveReplyMsg,
        setActiveReactMsg,
        setUnsendMsgId,
        typingChannelRef,
        isSending,
        setIsSending,
        typingTimeoutRef,
        isSendingTypingRef
    });



    const openConversation = (conv: Conversation) => {
        setActiveConvId(conv.id);
        setActiveConvUser(conv.other_user);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleStartNewChat = async (user: Participant) => {
        if (!currentUser?.id) return;
        const { data: convId, error } = await supabase.rpc('find_or_create_conversation', {
            user_a: currentUser.id,
            user_b: user.id,
        });
        if (error) {
            console.error('Error opening chat:', error);
            throw error;
        }

        // Save to localStorage so it stays in the initiator's sidebar as a draft
        const initiatedStr = localStorage.getItem(`initiated_chats_${currentUser.id}`) || '[]';
        let initiatedIds: string[] = [];
        try { initiatedIds = JSON.parse(initiatedStr); } catch (e) {}
        if (!initiatedIds.includes(convId)) {
            initiatedIds.push(convId);
            localStorage.setItem(`initiated_chats_${currentUser.id}`, JSON.stringify(initiatedIds));
        }

        await fetchConversations(currentUser.id);
        setActiveConvId(convId);
        setActiveConvUser(user);
    };

    const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((groups, msg) => {
        const date = new Date(msg.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const last = groups[groups.length - 1];
        if (last && last.date === date) {
            last.msgs.push(msg);
        } else {
            groups.push({ date, msgs: [msg] });
        }
        return groups;
    }, []);

    const activeConv = conversations.find(c => c.id === activeConvId);
    const displayUser = activeConvUser ?? activeConv?.other_user ?? null;

    return {
        // State Models
        currentUser,
        conversations,
        messages,
        groupedMessages,
        activeConvId,
        activeConvUser,
        displayUser,
        activeConv,
        isLoadingConvs,
        isLoadingMessages,
        isSending,
        isOpeningChat,
        isTyping,
        initialUnreadId,
        
        // Toggles / Modal Modifiers
        unsendMsgId,
        confirmDeleteId,
        copiedMsgId,
        activeReplyMsg,
        activeReactMsg,
        setUnsendMsgId,
        setConfirmDeleteId,
        setCopiedMsgId,
        setActiveReplyMsg,
        setActiveReactMsg,

        // Actions
        openConversation,
        handleStartNewChat,
        handleSendMessageText,
        handleVoiceRecordStopFromInput,
        handleReaction,
        handleUnsendMessage,
        handleReadReceipts,

        // DOM Refs
        inputRef,
        scrollContainerRef,
        messagesEndCallbackRef,
        typingChannelRef
    };
}
