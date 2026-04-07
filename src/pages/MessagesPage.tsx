import { useState, useEffect, useLayoutEffect, useRef, useCallback, Fragment } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { getCachedConversations, cachedMessages, subscribeToChatUpdates, fetchGlobalConversations, updateCachedConversationsSilently } from '../lib/chatStore';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Participant {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
}

export interface Conversation {
    id: string;
    last_message: string | null;
    last_message_time: string | null;
    other_user: Participant;
    unread_count: number;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    seen: boolean;
    optimistic?: boolean;
    reply_to_id?: string | null;
    message_reactions?: { user_id: string; emoji: string; }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatMessageTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

// ─── Avatar Component ─────────────────────────────────────────────────────────
const Avatar = ({ user, size = 'md' }: { user: Partial<Participant>; size?: 'sm' | 'md' | 'lg' }) => {
    const sizes = { sm: 'w-8 h-8', md: 'w-11 h-11', lg: 'w-14 h-14' };
    return (
        <div className={`${sizes[size]} rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden flex items-center justify-center border border-zinc-700`}>
            {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
            ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-1/2 h-1/2 text-zinc-500">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
            )}
        </div>
    );
};

// ─── Global Cache imported natively from chatStore ─────────────────────────────

// ─── Main Component ───────────────────────────────────────────────────────────
export const MessagesPage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [conversations, setConversations] = useState<Conversation[]>(getCachedConversations() || []);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const activeConvIdRef = useRef<string | null>(null);
    useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    // If we have cached conversations, don't show the loading skeleton initially
    const [isLoadingConvs, setIsLoadingConvs] = useState(!getCachedConversations());
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [activeConvUser, setActiveConvUser] = useState<Participant | null>(null);
    const [unsendMsgId, setUnsendMsgId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
    const [activeReplyMsg, setActiveReplyMsg] = useState<Message | null>(null);
    const [activeReactMsg, setActiveReactMsg] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messageChannelRef = useRef<any>(null);
    const reactionChannelRef = useRef<any>(null);
    const startChatHandledRef = useRef(false);
    // New message search
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Participant[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpeningChat, setIsOpeningChat] = useState<string | null>(null);
    const [initialUnreadId, setInitialUnreadId] = useState<string | null>(null);
    const handledUnreadScrollRef = useRef<string | null>(null);
    const handledBottomScrollRef = useRef<string | null>(null);
    const isProgrammaticScrollRef = useRef<boolean>(false);
    
    // Typing Indicators
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingChannelRef = useRef<any>(null);
    const isSendingTypingRef = useRef(false);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const activeConv = conversations.find(c => c.id === activeConvId) ?? null;

    // ── Keep Memory Cache in Perfect Sync with Realtime Updates ───────────────
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

    // Push local UI mutations backwards blindly into offline memory instantly!
    useEffect(() => {
        if (conversations.length > 0) {
            updateCachedConversationsSilently(conversations);
        }
    }, [conversations]);

    // ── Scroll Logic ──────────────────────────────────────────────────────────
    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        setTimeout(() => {
            isProgrammaticScrollRef.current = true;
            messagesEndRef.current?.scrollIntoView({ behavior });
            setTimeout(() => { isProgrammaticScrollRef.current = false; }, behavior === 'smooth' ? 300 : 100);
        }, 50);
    }, []);

    useLayoutEffect(() => {
        // If there are messages rendered on screen:
        if (messages.length > 0 && activeConvId) {
            if (initialUnreadId) {
                if (handledUnreadScrollRef.current !== initialUnreadId) {
                    const el = document.getElementById(`unread-marker-${initialUnreadId}`);
                    if (el) {
                        isProgrammaticScrollRef.current = true; // Lock scroll listener from interpreting this jump
                        el.scrollIntoView({ behavior: 'instant', block: 'center' });
                        setTimeout(() => { isProgrammaticScrollRef.current = false; }, 150); // Release lock
                        handledUnreadScrollRef.current = initialUnreadId;
                        handledBottomScrollRef.current = activeConvId; // Prevent aggressive bottom jump
                    }
                }
            } else {
                if (handledBottomScrollRef.current !== activeConvId) {
                    isProgrammaticScrollRef.current = true;
                    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
                    setTimeout(() => { isProgrammaticScrollRef.current = false; }, 150);
                    handledBottomScrollRef.current = activeConvId;
                }
            }
        }
    }, [initialUnreadId, messages, activeConvId]);

    // ── Fetch current user ────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) { navigate('/auth/login'); return; }
            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            if (data) setCurrentUser(data);
        };
        init();
    }, [navigate]);

    // ── Scroll to Read Receipt Synchronizer ───────────────────────────────────
    const handleReadReceipts = useCallback((forceAnyPhysicalScroll = false) => {
        const container = scrollContainerRef.current;
        if (!container || !activeConvId || isProgrammaticScrollRef.current) return;

        const isAtBottom = (container.scrollHeight - container.scrollTop - container.clientHeight) < 150;
        
        // Mark read if forced by ANY physical scroll, OR if they are naturally at the very bottom
        if ((forceAnyPhysicalScroll || isAtBottom) && document.visibilityState === 'visible') {
            setMessages(prev => {
                const hasUnseen = prev.some(m => !m.seen && m.sender_id !== currentUser?.id);
                if (hasUnseen) {
                    const updated = prev.map(m => 
                        (m.sender_id !== currentUser?.id && !m.seen) ? { ...m, seen: true } : m
                    );
                    cachedMessages.set(activeConvId, updated);
                    
                    // Visually destroy the Unread Badge natively
                    setInitialUnreadId(null);
                    setConversations(prevConv => prevConv.map(c => 
                        c.id === activeConvId ? { ...c, unread_count: 0 } : c
                    ));

                    // Background db update fire-and-forget
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
    }, [activeConvId, currentUser]);


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
            .subscribe();

        typingChannelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            typingChannelRef.current = null;
        };
    }, [activeConvId, currentUser]);

    // ── Fetch conversations ───────────────────────────────────────────────────
    const fetchConversations = useCallback(async (userId: string) => {
        // Offset to the global chatStore listener daemon!
        await fetchGlobalConversations(userId);
    }, []);


    // ── Load conversations when currentUser is ready ───────────────────────────
    useEffect(() => {
        if (currentUser?.id) fetchConversations(currentUser.id);
    }, [currentUser, fetchConversations]);

    // ── Handle startChatWith navigation state (from SearchProfileView) ─────────
    useEffect(() => {
        const startWith = location.state?.startChatWith;
        // Guard: only fire once per navigation (prevents double-fire when currentUser loads)
        if (!startWith || !currentUser?.id || startChatHandledRef.current) return;
        startChatHandledRef.current = true;

        const openOrCreate = async () => {
            try {
                const { data: convId, error } = await supabase.rpc('find_or_create_conversation', {
                    user_a: currentUser.id,
                    user_b: startWith.id,
                });
                if (error) throw error;

                // Refresh conversation list so the new one appears
                await fetchConversations(currentUser.id);

                // Open the conversation
                setActiveConvId(convId);
                setActiveConvUser({
                    id: startWith.id,
                    username: startWith.username,
                    full_name: startWith.full_name,
                    avatar_url: startWith.avatar_url,
                });
            } catch (err) {
                console.error('Error opening chat:', err);
                startChatHandledRef.current = false; // allow retry on error
            }
        };

        openOrCreate();
    }, [location.state, currentUser, fetchConversations]);

    // ── Fetch messages for active conversation ─────────────────────────────────
    const fetchMessages = useCallback(async (convId: string) => {
        // If we have cached messages, load them instantly and do NOT show the loading skeleton
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

            // Mark unseen messages as seen
            if (currentUser?.id && unreadId) {
                const locallySeenData = fetched.map(m => 
                    (m.sender_id !== currentUser.id && !m.seen) ? { ...m, seen: true } : m
                );
                // Synchronously protect the cache so it doesn't resurrect them as unread later
                cachedMessages.set(convId, locallySeenData);
                setMessages(locallySeenData);

                setConversations(prevConv => prevConv.map(c => 
                    c.id === convId ? { ...c, unread_count: 0 } : c
                ));

                // Fire and forget db update
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

    // ── Resync data aggressively when returning to the tab physically ──────────
    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                handleReadReceipts(false); // Only trigger instantly if they are at the bottom!
                
                // Aggressively natively resync the specific active chat data just in case the Supabase
                // WebSocket JWT token expired or the laptop dozed off causing the client to miss UPDATE events!
                if (activeConvIdRef.current) {
                    fetchMessages(activeConvIdRef.current);
                }
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, [handleReadReceipts, fetchMessages]);

    // ── Fetch messages when active conversation changes ────────────────────────
    useEffect(() => {
        if (activeConvId) fetchMessages(activeConvId);
    }, [activeConvId, fetchMessages]);

    // ── Subscribe to realtime messages globally ──────────────────────────────
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
                // No filter: RLS already ensures we only get messages for our conversations
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newMsg = payload.new as Message;
                    
                    // 1. If this message belongs to the currently open chat, add it to the chat view
                    if (newMsg.conversation_id === activeConvIdRef.current) {
                        // ── INCOMING MESSAGE ARRIVED: INSTANTLY KILL TYPING INDICATOR! ──
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

                        // If it auto-scrolls and we aren't the sender, we inherently "see" it!
                        if (shouldAutoScroll && !isMeSending) {
                            newMsg.seen = true;
                            // Fire db update in background
                            supabase.from('messages').update({ seen: true }).eq('id', newMsg.id).then();
                        }

                        setMessages(prev => {
                            // If we perfectly matched the pre-generated ID structurally, OVERWRITE it with REAL server data so `optimistic: true` drops!
                            const existingIdx = prev.findIndex(m => m.id === newMsg.id);
                            if (existingIdx !== -1) {
                                const updated = [...prev];
                                updated[existingIdx] = newMsg;
                                cachedMessages.set(newMsg.conversation_id, updated);
                                return updated;
                            }
                            
                            // Fallback heuristic check functionally just in case
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
                                        handledUnreadScrollRef.current = newMsg.id; // Mark handled so useLayoutEffect won't jump to it
                                        return newMsg.id;
                                    }
                                    return curr;
                                });
                            }
                        }
                    }

                    // 2. Update the sidebar conversation list
                    setConversations(prev => {
                        const exists = prev.some(c => c.id === newMsg.conversation_id);
                        
                        if (exists) {
                            const isIncomingUnread = newMsg.sender_id !== currentUser.id && newMsg.conversation_id !== activeConvIdRef.current;
                            // Existing chat: update the last message and bump it to the top
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
                            // Brand new chat with someone we've never talked to!
                            // Fetch natively and rapidly without any arbitrary timeouts
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
                        // Secret payload smuggler to bypass RLS `DELETE` network dropping
                        const deletedId = updatedMsg.id;
                        setMessages(prev => prev.filter(m => m.id !== deletedId));
                        cachedMessages.forEach((msgs, convId) => {
                            cachedMessages.set(convId, msgs.filter(m => m.id !== deletedId));
                        });
                        fetchConversations(currentUser.id);
                    } else {
                        // Apply standard updates in real-time natively (e.g. Read Receipts marked seen=true)
                        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
                        cachedMessages.forEach((msgs, convId) => {
                            cachedMessages.set(convId, msgs.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
                        });
                    }
                } else if (payload.eventType === 'DELETE') {
                    const deletedId = payload.old.id;
                    
                    // Remove from active chat UI instantly
                    setMessages(prev => prev.filter(m => m.id !== deletedId));
                    cachedMessages.forEach((msgs, convId) => {
                        cachedMessages.set(convId, msgs.filter(m => m.id !== deletedId));
                    });
                    
                    // Background refresh sidebar to fix previews if the last message was deleted
                    fetchConversations(currentUser.id);
                }
            })
            .subscribe();

        messageChannelRef.current = channel;

        // ── Subscribe to realtime emoji reactions globally ───────────────────────
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
                
                // Do not Double-Trigger our own optimistic updates computationally!
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
    }, [currentUser, fetchConversations, scrollToBottom]);

    // ── Reaction Handler ───────────────────────────────────────────────────────
    const handleReaction = useCallback(async (messageId: string, emoji: string) => {
        setActiveReactMsg(null);
        if (!currentUser) return;

        const msgIndex = messages.findIndex(m => m.id === messageId);
        if (msgIndex === -1) return;
        const msg = messages[msgIndex];
        
        const currentReactions = msg.message_reactions || [];
        const myPreviousReaction = currentReactions.find(r => r.user_id === currentUser.id);

        // Optimistic UI Update locally securely
        let nextReactions;
        if (myPreviousReaction) {
            if (myPreviousReaction.emoji === emoji) {
                // Toggling off the exact same emoji
                nextReactions = currentReactions.filter(r => r.user_id !== currentUser.id);
            } else {
                // Reacting with a new emoji REPLACES the old one cleanly
                nextReactions = currentReactions.map(r => r.user_id === currentUser.id ? { ...r, emoji } : r);
            }
        } else {
            // First time reacting
            nextReactions = [...currentReactions, { user_id: currentUser.id, emoji }];
        }

        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, message_reactions: nextReactions } : m));
        
        if (activeConvIdRef.current) {
            const currentCache = cachedMessages.get(activeConvIdRef.current) || [];
            cachedMessages.set(activeConvIdRef.current, currentCache.map(m => m.id === messageId ? { ...m, message_reactions: nextReactions } : m));
        }

        try {
            if (myPreviousReaction) {
                if (myPreviousReaction.emoji === emoji) {
                    await supabase.from('message_reactions').delete().match({ message_id: messageId, user_id: currentUser.id });
                } else {
                    await supabase.from('message_reactions').update({ emoji }).match({ message_id: messageId, user_id: currentUser.id });
                }
            } else {
                await supabase.from('message_reactions').insert({ message_id: messageId, user_id: currentUser.id, emoji });
            }
        } catch (err: any) {
            console.error('Failed to react:', err);
        }
    }, [currentUser, messages]);

    // ── Send message ──────────────────────────────────────────────────────────
    const handleUnsendMessage = async (msgId: string) => {
        if (!activeConvId) return;
        try {
            // 1. Identify if this is the absolute latest message
            const isLastMessage = messages.length > 0 && messages[messages.length - 1].id === msgId;
            let newLastMsgContent = null;
            let newLastMsgTime = null;

            if (isLastMessage && messages.length > 1) {
                const secondToLast = messages[messages.length - 2];
                newLastMsgContent = secondToLast.content;
                newLastMsgTime = secondToLast.created_at;
            }

            // 2. Optimistic unsend (UI instantly updates for the sender)
            setMessages(prev => prev.filter(m => m.id !== msgId));
            setUnsendMsgId(null);
            
            cachedMessages.forEach((msgs, convId) => {
                cachedMessages.set(convId, msgs.filter(m => m.id !== msgId));
            });

            if (isLastMessage) {
                setConversations(prev => prev.map(c => 
                    c.id === activeConvId 
                        ? { ...c, last_message: newLastMsgContent, last_message_time: newLastMsgTime }
                        : c
                ).sort((a, b) => {
                    if (!a.last_message_time) return 1;
                    if (!b.last_message_time) return -1;
                    return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
                }));
            }

            // 3. Database operations (Update conversation FIRST to prevent race conditions for receivers)
            if (isLastMessage) {
                await supabase.from('conversations').update({
                    last_message: newLastMsgContent,
                    last_message_time: newLastMsgTime
                }).eq('id', activeConvId);
            }

            // Fire an UPDATE explicitly to bypass Supabase WebSockets dropping raw DELETEs across complex RLS bindings
            await supabase.from('messages').update({ content: '🚫 This message was unsent.' }).eq('id', msgId);
            await supabase.from('messages').delete().eq('id', msgId);
            
            // Re-fetch to guarantee absolute synchronization
            fetchConversations(currentUser.id);
        } catch (err) {
            console.error('Failed to unsend message:', err);
        }
    };

    const sendMessage = async () => {
        const text = inputText.trim();
        if (!text || !activeConvId || !currentUser?.id || isSending) return;

        // Instantly shut down the typing bounce globally when submitting!
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        isSendingTypingRef.current = false;
        typingChannelRef.current?.send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: currentUser?.id, typing: false }
        });

        setInputText('');
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
        setIsSending(true);

        // Generate the true DB UUID immediately on the client
        const realId = crypto.randomUUID();

        // Optimistic message (Looks 100% real instantly)
        const optimisticMsg: Message = {
            id: realId,
            conversation_id: activeConvId,
            sender_id: currentUser.id,
            content: text,
            created_at: new Date().toISOString(),
            seen: false,
            optimistic: true,
            reply_to_id: activeReplyMsg ? activeReplyMsg.id : null
        };
        
        // Cache the currently active reply message ID for the exact instant we send it to Supabase
        const pendingReplyId = activeReplyMsg ? activeReplyMsg.id : null;
        setActiveReplyMsg(null); // Drop the active reply UI instantly so they can type the next message without ghosting
        setMessages(prev => {
            const next = [...prev, optimisticMsg];
            cachedMessages.set(activeConvId, next);
            return next;
        });
        scrollToBottom();

        // Also update the conversation list preview optimistically
        setConversations(prev => prev.map(c =>
            c.id === activeConvId
                ? { ...c, last_message: text, last_message_time: optimisticMsg.created_at }
                : c
        ).sort((a, b) => {
            if (!a.last_message_time) return 1;
            if (!b.last_message_time) return -1;
            return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
        }));

        try {
            const { error: msgError } = await supabase.from('messages').insert({
                id: realId,
                conversation_id: activeConvId,
                sender_id: currentUser.id,
                content: text,
                reply_to_id: pendingReplyId
            });
            if (msgError) {
                console.error('🔴 Message insert RLS/DB error:', msgError.message, msgError.details, msgError.hint);
                throw msgError;
            }

            // Update conversation last_message (non-fatal if it fails)
            const { error: convError } = await supabase.from('conversations').update({
                last_message: text,
                last_message_time: new Date().toISOString(),
            }).eq('id', activeConvId);
            if (convError) {
                console.warn('⚠️ Conversation last_message update failed (non-fatal):', convError.message);
            }
        } catch (err: any) {
            console.error('Error sending message:', err?.message ?? err);
            // Remove the optimistic message and restore input on failure
            setMessages(prev => prev.filter(m => m.id !== realId));
            setInputText(text);
        } finally {
            setIsSending(false);
        }
    };

    // ── Open conversation ─────────────────────────────────────────────────────
    const openConversation = (conv: Conversation) => {
        setActiveConvId(conv.id);
        setActiveConvUser(conv.other_user);
        inputRef.current?.focus();
    };

    // ── Handle Enter key in textarea ──────────────────────────────────────────
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // ── Broadcast typing state via Supabase Presence ──────────────────────────
    const setRemoteTypingState = (status: boolean) => {
        typingChannelRef.current?.send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: currentUser?.id, typing: status }
        });
    };

    const handleTyping = (text: string) => {
        if (!typingChannelRef.current || !currentUser?.id) return;
        
        // Instant drop-off if the user completely clears the text box
        if (text.length === 0) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            isSendingTypingRef.current = false;
            setRemoteTypingState(false);
            return;
        }

        // Only broadcast if we haven't already locked the true state online!
        if (!isSendingTypingRef.current) {
            isSendingTypingRef.current = true;
            setRemoteTypingState(true);
        }
        
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        
        typingTimeoutRef.current = setTimeout(() => {
            isSendingTypingRef.current = false;
            setRemoteTypingState(false);
        }, 500); // Super-tight 500ms dropoff as requested
    };

    // ── Auto-resize textarea ──────────────────────────────────────────────────
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInputText(val);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
        handleTyping(val);
    };

    // ── Group messages by date ────────────────────────────────────────────────
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

    const displayUser = activeConvUser ?? activeConv?.other_user ?? null;

    return (
        <div className="flex h-full w-full bg-black overflow-hidden" onClick={() => { setActiveReactMsg(null); setUnsendMsgId(null); }}>
            {/* ── LEFT PANEL: Conversation List ────────────────────────────────── */}
            <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-[440px] flex-shrink-0 h-full border-r border-zinc-800/60 flex flex-col bg-black"
            >
                {/* Header */}
                <div className="px-5 pt-8 pb-4">
                    <div className="flex items-center justify-between mb-5">
                        <h1 className="text-white text-xl font-bold tracking-tight">Messages</h1>
                        <button
                            title={isSearchOpen ? 'Close' : 'New Message'}
                            onClick={() => {
                                setIsSearchOpen(v => !v);
                                setSearchQuery('');
                                setSearchResults([]);
                                setTimeout(() => searchInputRef.current?.focus(), 80);
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                isSearchOpen
                                    ? 'bg-zinc-700 text-white rotate-45'
                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white'
                            }`}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 transition-transform">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        </button>
                    </div>

                    {/* Animated search-to-message panel */}
                    <AnimatePresence>
                        {isSearchOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                className="overflow-hidden mb-3"
                            >
                                {/* Search input */}
                                <div className="relative mb-2">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                    </svg>
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => {
                                            const q = e.target.value;
                                            setSearchQuery(q);
                                            if (!q.trim()) { setSearchResults([]); return; }
                                            setIsSearching(true);
                                            clearTimeout((window as any).__msgSearchTimer);
                                            (window as any).__msgSearchTimer = setTimeout(async () => {
                                                const { data } = await supabase
                                                    .from('profiles')
                                                    .select('id, username, full_name, avatar_url')
                                                    .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
                                                    .neq('id', currentUser?.id ?? '')
                                                    .limit(8);
                                                setSearchResults((data as Participant[]) ?? []);
                                                setIsSearching(false);
                                            }, 300);
                                        }}
                                        placeholder="Search people…"
                                        className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-700/60 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>

                                {/* Search results */}
                                <AnimatePresence>
                                    {searchResults.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -4 }}
                                            className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden"
                                        >
                                            {searchResults.map((user, idx) => (
                                                <button
                                                    key={user.id}
                                                    onClick={async () => {
                                                        if (!currentUser?.id) return;
                                                        setIsOpeningChat(user.id);
                                                        try {
                                                            const { data: convId, error } = await supabase.rpc('find_or_create_conversation', {
                                                                user_a: currentUser.id,
                                                                user_b: user.id,
                                                            });
                                                            if (error) throw error;
                                                            await fetchConversations(currentUser.id);
                                                            setActiveConvId(convId);
                                                            setActiveConvUser(user);
                                                            setIsSearchOpen(false);
                                                            setSearchQuery('');
                                                            setSearchResults([]);
                                                        } catch (err) {
                                                            console.error('Error opening chat:', err);
                                                        } finally {
                                                            setIsOpeningChat(null);
                                                        }
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/80 transition-colors text-left ${
                                                        idx < searchResults.length - 1 ? 'border-b border-zinc-800/60' : ''
                                                    }`}
                                                >
                                                    <Avatar user={user} size="sm" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white text-sm font-semibold truncate">{user.full_name || user.username}</p>
                                                        <p className="text-zinc-500 text-xs truncate">@{user.username}</p>
                                                    </div>
                                                    {isOpeningChat === user.id ? (
                                                        <div className="w-4 h-4 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin flex-shrink-0" />
                                                    ) : (
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-zinc-600 flex-shrink-0">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                    {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-zinc-600 text-xs text-center py-3"
                                        >
                                            No users found for "{searchQuery}"
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Static search bar (shown when compose is closed) */}
                    {!isSearchOpen && (
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search conversations"
                                className="w-full pl-9 pr-4 py-2 bg-zinc-900 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:bg-zinc-800 transition-colors"
                            />
                        </div>
                    )}
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto px-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700">
                    {isLoadingConvs ? (
                        <div className="flex flex-col gap-3 px-3 pt-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-11 h-11 rounded-full bg-zinc-800 flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-zinc-800 rounded-full w-2/3" />
                                        <div className="h-3 bg-zinc-800/60 rounded-full w-4/5" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full pb-16 text-center px-4">
                            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-zinc-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                                </svg>
                            </div>
                            <p className="text-zinc-400 text-sm font-semibold mb-1">No messages yet</p>
                            <p className="text-zinc-600 text-xs leading-relaxed">Find someone on the Search page and hit Message to start a conversation.</p>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {conversations.map((conv, idx) => (
                                <motion.button
                                    key={conv.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    onClick={() => openConversation(conv)}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left group ${activeConvId === conv.id ? 'bg-zinc-800/80' : 'hover:bg-zinc-900/70'}`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <Avatar user={conv.other_user} />
                                        {/* Online indicator - decorative */}
                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-zinc-900 border-2 border-zinc-900 overflow-hidden">
                                            <div className="w-full h-full rounded-full bg-emerald-500" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-white text-sm font-semibold truncate">{conv.other_user.full_name || conv.other_user.username}</span>
                                            {conv.last_message_time && (
                                                <span className="text-zinc-500 text-[11px] flex-shrink-0 ml-2">{formatTime(conv.last_message_time)}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className={`text-xs truncate pr-2 ${conv.unread_count > 0 ? 'text-white font-medium' : 'text-zinc-500'}`}>
                                                {conv.unread_count > 7 ? (
                                                    <span className="text-blue-400 font-semibold">7+ New messages</span>
                                                ) : (
                                                    conv.last_message || <span className="italic text-zinc-600">Say hello!</span>
                                                )}
                                            </p>
                                            {conv.unread_count > 0 && (
                                                <div className="min-w-[18px] h-[18px] px-1.5 flex flex-shrink-0 items-center justify-center bg-blue-500 text-white rounded-full text-[10px] font-bold shadow-md shadow-blue-500/20">
                                                    {conv.unread_count > 7 ? '7+' : conv.unread_count}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </motion.div>

            {/* ── RIGHT PANEL: Chat Window ──────────────────────────────────────── */}
            <div className="flex-1 h-full flex flex-col bg-black overflow-hidden">
                <AnimatePresence mode="wait">
                    {activeConvId && displayUser ? (
                        <motion.div
                            key={activeConvId}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col h-full"
                        >
                            {/* Chat Header */}
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/60 flex-shrink-0 bg-black/80 backdrop-blur-md">
                                <Avatar user={displayUser} />
                                <div>
                                    <p className="text-white font-bold text-sm">{displayUser.full_name || displayUser.username}</p>
                                    <p className="text-zinc-500 text-xs">@{displayUser.username}</p>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div ref={scrollContainerRef} onScroll={() => handleReadReceipts(true)} className="flex-1 overflow-y-auto px-4 pt-2 pb-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700">
                                {isLoadingMessages ? (
                                    <div className="flex flex-col justify-end min-h-full gap-2 py-4">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'} animate-pulse`}>
                                                <div className={`h-8 rounded-2xl bg-zinc-800 ${i % 3 === 0 ? 'w-36' : i % 3 === 1 ? 'w-52' : 'w-24'}`} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col min-h-full pt-2 pb-0 space-y-0.5">
                                        {/* Scrollable Conversation Intro Header */}
                                        <div className="flex flex-col items-center justify-start shrink-0 gap-3 text-center pt-24 pb-12">
                                            <div className="transform scale-[2] mb-6 drop-shadow-2xl">
                                                <Avatar user={displayUser} size="lg" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400">
                                                    {displayUser.full_name || displayUser.username}
                                                </h3>
                                                <p className="text-zinc-500 font-medium tracking-wide text-sm">@{displayUser.username}</p>
                                            </div>
                                            <p className="text-zinc-400 text-sm max-w-[280px] leading-relaxed mt-4">
                                                Don't be shy! Break the ice and start the conversation. ✨
                                            </p>
                                        </div>

                                        {/* Expanding spacer forces early messages to sit at the bottom edge */}
                                        <div className="flex-1" />

                                        {groupedMessages.map(group => (
                                            <div key={group.date}>
                                                {/* Date separator */}
                                                <div className="flex items-center gap-3 my-4">
                                                    <div className="flex-1 h-px bg-zinc-800/60" />
                                                    <span className="text-zinc-600 text-[10px] font-semibold tracking-wider uppercase">{group.date}</span>
                                                    <div className="flex-1 h-px bg-zinc-800/60" />
                                                </div>

                                                {group.msgs.map((msg, msgIdx) => {
                                                    const isMe = msg.sender_id === currentUser?.id;
                                                    const prevMsg = group.msgs[msgIdx - 1];
                                                    const nextMsg = group.msgs[msgIdx + 1];
                                                    const isContinuation = prevMsg && prevMsg.sender_id === msg.sender_id;
                                                    const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;

                                                    return (
                                                        <Fragment key={msg.id}>
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

                                                            <div className={`group/msg ${isMe ? 'max-w-[85%] sm:max-w-[70%]' : 'max-w-[78%] sm:max-w-[63%]'} min-w-0 flex flex-col relative ${isMe ? 'items-end' : 'items-start'}`}>
                                                                
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
                                                                                    // Wait for smooth scroll to finish before triggering the ring
                                                                                    setTimeout(() => {
                                                                                        element.style.transition = 'box-shadow 0.25s ease';
                                                                                        element.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.85), 0 0 22px rgba(139, 92, 246, 0.35)';
                                                                                        // Hold the ring for 2s then slowly fade over 1.2s
                                                                                        setTimeout(() => {
                                                                                            element.style.transition = 'box-shadow 1.2s ease';
                                                                                            element.style.boxShadow = '0 0 0 0px rgba(139, 92, 246, 0)';
                                                                                        }, 2000);
                                                                                        // Clean up inline styles fully after fade completes
                                                                                        setTimeout(() => {
                                                                                            element.style.boxShadow = '';
                                                                                            element.style.transition = '';
                                                                                        }, 3300);
                                                                                    }, 420);
                                                                                }
                                                                            }}
                                                                            className={`relative z-0 flex flex-col cursor-pointer mb-2 pb-3 pt-1.5 pl-3 pr-6 min-w-[120px] sm:min-w-[140px] max-w-[90%] rounded-2xl overflow-hidden transition-colors active:scale-[0.98] ${
                                                                                isMe ? 'bg-zinc-800/60 hover:bg-zinc-800/80 self-end mr-6' : 'bg-zinc-800/40 hover:bg-zinc-800/60 self-start ml-2'
                                                                            }`}
                                                                            style={{ width: 'fit-content' }}
                                                                        >
                                                                            {/* Accent Line */}
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
                                                                    {/* ── Universal Hover Timestamp (Side-Aligned) ── */}
                                                                    <span 
                                                                        className={`absolute top-1/2 -translate-y-1/2 ${
                                                                            isMe ? 'right-[calc(100%+8px)]' : 'left-[calc(100%+8px)]'
                                                                        } text-[10px] font-medium text-zinc-500 whitespace-nowrap opacity-0 group-hover/msg:opacity-100 transition-opacity pointer-events-none`}
                                                                    >
                                                                        {formatMessageTime(msg.created_at)}
                                                                        {isMe && !msg.optimistic && (
                                                                            <span className="ml-1">{msg.seen ? '· Seen' : ''}</span>
                                                                        )}
                                                                    </span>

                                                                    {/* Action Button & Popover */}
                                                                    {isMe && !msg.optimistic && (
                                                                        <div className="relative flex items-center self-center">
                                                                            {/* ── Emoji Picker Popover anchored above the icon row ── */}
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
                                                                                                className={`text-[26px] leading-none w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-[1.2] focus:outline-none ${
                                                                                                    (msg.message_reactions || []).some(r => r.user_id === currentUser?.id && r.emoji === emoji)
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
                                                                                className={`p-1.5 rounded-full bg-red-500/10 text-red-500 hover:text-white hover:bg-red-600 transition-all duration-200 ease-out mr-1.5 ${
                                                                                    unsendMsgId === msg.id ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-0 scale-90 group-hover/msg:opacity-100 group-hover/msg:scale-100'
                                                                                }`}
                                                                                title="Quick Delete"
                                                                            >
                                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                                                                    <path d="M3 6h18"/>
                                                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                                                                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                                                                </svg>
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); setUnsendMsgId(msg.id); }}
                                                                                className={`p-1.5 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all duration-200 ease-out ${
                                                                                    unsendMsgId === msg.id ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-0 scale-90 group-hover/msg:opacity-100 group-hover/msg:scale-100'
                                                                                }`}
                                                                            >
                                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                                                                    <polyline points="15 18 9 12 15 6"></polyline>
                                                                                </svg>
                                                                            </button>
                                                                            
                                                                            {/* Popover */}
                                                                            <AnimatePresence>
                                                                                {unsendMsgId === msg.id && (
                                                                                    <motion.div
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        initial={{ opacity: 0, scale: 0.9, x: 10 }}
                                                                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                                                                        exit={{ opacity: 0, scale: 0.9, x: 10 }}
                                                                                        className="absolute right-0 flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl z-50 backdrop-blur-xl"
                                                                                    >
                                                                                        <button 
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setActiveReactMsg(msg.id);
                                                                                                setUnsendMsgId(null);
                                                                                            }}
                                                                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" 
                                                                                            title="React"
                                                                                        >
                                                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                                                                                <circle cx="12" cy="12" r="10"></circle>
                                                                                                <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                                                                                                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                                                                                                <line x1="15" y1="9" x2="15.01" y2="9"></line>
                                                                                            </svg>
                                                                                        </button>
                                                                                        <button 
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setActiveReplyMsg(msg);
                                                                                                setUnsendMsgId(null);
                                                                                                inputRef.current?.focus();
                                                                                            }}
                                                                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" 
                                                                                            title="Reply"
                                                                                        >
                                                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                                                                                <polyline points="9 14 4 9 9 4"></polyline>
                                                                                                <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                                                                                            </svg>
                                                                                        </button>
                                                                                        <button 
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                navigator.clipboard.writeText(msg.content);
                                                                                                setCopiedMsgId(msg.id);
                                                                                                setTimeout(() => setCopiedMsgId(null), 1500);
                                                                                            }}
                                                                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors relative" 
                                                                                            title="Copy"
                                                                                        >
                                                                                            {copiedMsgId === msg.id ? (
                                                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-green-400">
                                                                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                                                                </svg>
                                                                                            ) : (
                                                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                                                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                                                                </svg>
                                                                                            )}
                                                                                        </button>
                                                                                        <div className="w-px h-4 bg-zinc-800 mx-0.5" />
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setConfirmDeleteId(msg.id);
                                                                                                setUnsendMsgId(null);
                                                                                            }}
                                                                                            title="Delete"
                                                                                            className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors"
                                                                                        >
                                                                                            <span className="sr-only">Delete</span>
                                                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                                                                                <path d="M3 6h18"/>
                                                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                                                                                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                                                                            </svg>
                                                                                        </button>
                                                                                        <div className="w-px h-4 bg-zinc-800 mx-0.5" />
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setUnsendMsgId(null);
                                                                                            }}
                                                                                            className="p-1 px-2 text-zinc-400 hover:text-white"
                                                                                        >
                                                                                            <span className="text-sm font-medium">✕</span>
                                                                                        </button>
                                                                                    </motion.div>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        </div>
                                                                    )}

                                                                    <div
                                                                        id={`msg-${msg.id}`}
                                                                        onClick={() => navigator.clipboard.writeText(msg.content)}
                                                                        title="Click to copy"
                                                                        className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap [word-break:break-word] max-w-full transition-opacity cursor-pointer active:scale-[0.98] relative ${
                                                                            isMe
                                                                                ? 'bg-white text-black rounded-[20px] rounded-br-[6px]'
                                                                                : 'bg-zinc-800 text-white rounded-[20px] rounded-bl-[6px]'
                                                                        } ${isContinuation && isMe ? '!rounded-br-[20px] !rounded-tr-[6px]' : ''}
                                                                        ${isContinuation && !isMe ? '!rounded-bl-[20px] !rounded-tl-[6px]' : ''}`}
                                                                    >
                                                                        {msg.content}

                                                                        {/* ── Reaction Badges Overlay ── */}
                                                                        {msg.message_reactions && msg.message_reactions.length > 0 && (
                                                                            <div className={`absolute -bottom-4 ${isMe ? 'right-2 flex-row-reverse' : 'left-2 flex-row'} flex items-center gap-1 z-20`}>
                                                                                {Object.entries(
                                                                                    msg.message_reactions.reduce((acc, r) => {
                                                                                        if(!acc[r.emoji]) acc[r.emoji] = { count: 0, hasMe: false };
                                                                                        acc[r.emoji].count++;
                                                                                        if(r.user_id === currentUser?.id) acc[r.emoji].hasMe = true;
                                                                                        return acc;
                                                                                    }, {} as Record<string, {count: number, hasMe: boolean}>)
                                                                                ).map(([emoji, data]) => (
                                                                                    <div
                                                                                        key={emoji}
                                                                                        onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                                                                                        className={`flex items-center gap-1.5 px-2 py-[3px] rounded-full border border-zinc-700/60 cursor-pointer transition-all hover:scale-110 active:scale-95 shadow-sm ${
                                                                                            data.hasMe 
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
                                                                    
                                                                    {/* Invisible fixed-width column for Read-Receipt rendering WITHOUT layout shifting! */}
                                                                    {isMe && (
                                                                        <div className="w-[14px] flex-shrink-0 flex items-end justify-center self-end mb-1">
                                                                            <AnimatePresence>
                                                                                {msg.seen && !msg.optimistic ? (
                                                                                    <motion.div 
                                                                                        initial={{ opacity: 0, scale: 0, y: 5 }}
                                                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                                        className="w-[14px] h-[14px] rounded-full overflow-hidden shrink-0 shadow-sm shadow-black/20" 
                                                                                        title="Read"
                                                                                    >
                                                                                        {displayUser.avatar_url ? (
                                                                                            <img src={displayUser.avatar_url} className="w-full h-full object-cover" alt="Seen" />
                                                                                        ) : (
                                                                                            <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                                                                                                <span className="text-[7px] text-white font-bold">{displayUser.full_name?.charAt(0).toUpperCase() || displayUser.username.charAt(0).toUpperCase()}</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </motion.div>
                                                                                ) : null}
                                                                            </AnimatePresence>
                                                                        </div>
                                                                    )}

                                                                    {/* Action Button & Popover for INCOMING messages */}
                                                                    {!isMe && !msg.optimistic && (
                                                                        <div className="relative flex items-center self-center">
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); setUnsendMsgId(msg.id); }}
                                                                                className={`p-1.5 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all duration-200 ease-out ml-1 ${
                                                                                    unsendMsgId === msg.id ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-0 scale-90 group-hover/msg:opacity-100 group-hover/msg:scale-100'
                                                                                }`}
                                                                            >
                                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                                                                    <polyline points="9 18 15 12 9 6"></polyline>
                                                                                </svg>
                                                                            </button>

                                                                            {/* ── Emoji Picker Popover for INCOMING messages ── */}
                                                                            <AnimatePresence>
                                                                                {activeReactMsg === msg.id && (
                                                                                    <motion.div
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        initial={{ opacity: 0, scale: 0.9, y: 6 }}
                                                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                                        exit={{ opacity: 0, scale: 0.9, y: 6 }}
                                                                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                                                                        className="absolute bottom-full mb-3 left-0 z-[60] flex items-center gap-2 px-2.5 py-2 bg-zinc-900 border border-zinc-700/60 rounded-[28px] shadow-2xl shadow-black/50 backdrop-blur-md"
                                                                                    >
                                                                                        {['❤️', '👍', '😂', '😮', '😢', '🙏'].map(emoji => (
                                                                                            <button
                                                                                                key={emoji}
                                                                                                onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                                                                                                className={`text-[26px] leading-none w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-[1.2] focus:outline-none ${
                                                                                                    (msg.message_reactions || []).some(r => r.user_id === currentUser?.id && r.emoji === emoji)
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
                                                                            
                                                                            <AnimatePresence>
                                                                                {unsendMsgId === msg.id && (
                                                                                    <motion.div
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        initial={{ opacity: 0, scale: 0.9, x: -10 }}
                                                                                            animate={{ opacity: 1, scale: 1, x: 0 }}
                                                                                            exit={{ opacity: 0, scale: 0.9, x: -10 }}
                                                                                            className="absolute left-0 flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl z-50 backdrop-blur-xl"
                                                                                        >
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setUnsendMsgId(null);
                                                                                                }}
                                                                                                className="p-1 px-2 text-zinc-400 hover:text-white"
                                                                                            >
                                                                                                <span className="text-sm font-medium">✕</span>
                                                                                            </button>
                                                                                            <div className="w-px h-4 bg-zinc-800 mx-0.5" />
                                                                                            <button 
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    navigator.clipboard.writeText(msg.content);
                                                                                                    setCopiedMsgId(msg.id);
                                                                                                    setTimeout(() => setCopiedMsgId(null), 1500);
                                                                                                }}
                                                                                                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors relative" 
                                                                                                title="Copy"
                                                                                            >
                                                                                                {copiedMsgId === msg.id ? (
                                                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-green-400">
                                                                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                                                                    </svg>
                                                                                                ) : (
                                                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                                                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                                                                    </svg>
                                                                                                )}
                                                                                            </button>
                                                                                            <button 
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setActiveReplyMsg(msg);
                                                                                                    setUnsendMsgId(null);
                                                                                                    inputRef.current?.focus();
                                                                                                }}
                                                                                                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" 
                                                                                                title="Reply"
                                                                                            >
                                                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                                                                                    <polyline points="9 14 4 9 9 4"></polyline>
                                                                                                    <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                                                                                                </svg>
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setActiveReactMsg(msg.id);
                                                                                                    setUnsendMsgId(null);
                                                                                                }}
                                                                                                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                                                                                title="React"
                                                                                            >
                                                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                                                                                    <circle cx="12" cy="12" r="10"></circle>
                                                                                                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                                                                                                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                                                                                                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                                                                                                </svg>
                                                                                            </button>
                                                                                        </motion.div>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* (Timestamp logic migrated cleanly adjacent to the dynamic message array to prevent vertical layout shifts natively) */}
                                                            </div>
                                                            {/* Right spacer for incoming messages — mirrors the read-receipt column on outgoing side */}
                                                            {!isMe && <div className="w-[14px] flex-shrink-0" />}
                                                        </div>
                                                        </Fragment>
                                                    );
                                                })}
                                            </div>
                                        ))}

                                        {/* ── Live Ghost Trace Typing UI ── */}
                                        <AnimatePresence>
                                            {isTyping && activeConvUser && (
                                                <motion.div
                                                    layout
                                                    initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                                    animate={{ height: 'auto', opacity: 1, overflow: 'hidden' }}
                                                    exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    {/* Using padding instead of margins ensures it smoothly unrolls inside the hidden wrapper! */}
                                                    <div className="flex items-end gap-2 py-3 w-full">
                                                        <div className="w-[28px] h-[28px] shrink-0">
                                                            <Avatar user={activeConvUser} size="sm" />
                                                        </div>
                                                        
                                                        <div className="bg-zinc-800 rounded-[20px] rounded-bl-[6px] px-4 py-3 flex items-center justify-center w-[58px] h-[36px] overflow-hidden shadow-sm shadow-black/20 shrink-0">
                                                            <svg viewBox="0 0 100 20" className="w-[45px] h-full opacity-70">
                                                                {/* A chaotic glowing 'ghost pen' trace animating infinitely */}
                                                                <motion.path 
                                                                    d="M 5,10 Q 15,-6 25,10 T 45,10 T 65,10 T 85,10 T 95,8"
                                                                    fill="transparent"
                                                                    stroke="white"
                                                                    strokeWidth="3.5"
                                                                    strokeLinecap="round"
                                                                    initial={{ pathLength: 0, opacity: 0 }}
                                                                    animate={{ 
                                                                        pathLength: [0, 1, 1, 0, 0],
                                                                        opacity: [0, 1, 0.8, 1, 0],
                                                                        stroke: ['#a1a1aa', '#ffffff', '#a1a1aa', '#a1a1aa'] 
                                                                    }}
                                                                    transition={{
                                                                        duration: 1.8,
                                                                        repeat: Infinity,
                                                                        ease: "easeInOut",
                                                                        times: [0, 0.4, 0.5, 0.9, 1]
                                                                    }}
                                                                />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                            </div>

                            {/* Message Input */}
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
                                                            {activeReplyMsg.sender_id === currentUser.id ? 'Replying to yourself' : `Replying to ${displayUser.username}`}
                                                        </span>
                                                    </div>
                                                    <div className="relative max-h-[38px] overflow-hidden">
                                                        <p className="text-xs text-zinc-400 leading-[1.3] whitespace-pre-wrap break-words pr-8 line-clamp-2">{activeReplyMsg.content}</p>
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={() => setActiveReplyMsg(null)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-zinc-700/60 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="flex items-end gap-2 p-1.5 pl-4 bg-transparent w-full">
                                        <textarea
                                            ref={inputRef}
                                            rows={1}
                                            maxLength={1111}
                                            value={inputText}
                                            onChange={handleTextareaChange}
                                            onKeyDown={handleKeyDown}
                                            placeholder={`Message ${displayUser.username}...`}
                                            className="flex-1 min-w-0 break-words bg-transparent text-white text-base placeholder-zinc-500 resize-none focus:outline-none py-1.5 max-h-[120px]"
                                            style={{ minHeight: '24px' }}
                                            autoFocus
                                        />
                                        <button
                                            onClick={sendMessage}
                                            disabled={!inputText.trim()}
                                            className={`w-9 h-9 flex items-center justify-center flex-shrink-0 transition-colors duration-150 ${
                                                inputText.trim() 
                                                    ? 'text-white active:scale-95 cursor-pointer' 
                                                    : 'text-zinc-600 cursor-default'
                                            }`}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
                                                <polygon points="12 3 4 21 12 17 20 21"></polygon>
                                                <line x1="12" y1="3" x2="12" y2="17"></line>
                                            </svg>
                                        </button>
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
                                                    <span>({1111 - inputText.length})</span>
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 h-full flex flex-col items-center justify-center text-center px-8"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1, type: 'spring' }}
                                className="mb-6 p-6 rounded-full border border-zinc-800/50 bg-zinc-900/30"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="w-14 h-14 text-zinc-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                                </svg>
                            </motion.div>
                            <h2 className="text-white text-2xl font-bold mb-2 tracking-tight">Your Messages</h2>
                            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
                                Send private messages to anyone on Allify. Find someone on Search and hit <span className="text-zinc-300 font-medium">Message</span> to get started.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {confirmDeleteId && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => setConfirmDeleteId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col"
                        >
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500 mx-auto">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                                    <path d="M3 6h18"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </div>
                            <h3 className="text-white text-lg font-bold text-center mb-2">Delete Message</h3>
                            <p className="text-zinc-400 text-sm text-center mb-6 leading-relaxed">
                                Are you sure you want to delete this message? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        handleUnsendMessage(confirmDeleteId);
                                        setConfirmDeleteId(null);
                                    }}
                                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
