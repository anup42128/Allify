import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { cachedMessages } from '../lib/chatStore';
import type { Message, Conversation } from '../types/chat';

export interface UseChatActionsParams {
    currentUser: any;
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
    activeConvId: string | null;
    activeConvIdRef: React.MutableRefObject<string | null>;
    fetchConversations: (userId: string) => Promise<void>;
    scrollToBottom: () => void;
    activeReplyMsg: Message | null;
    setActiveReplyMsg: (msg: Message | null) => void;
    setActiveReactMsg: (msgId: string | null) => void;
    setUnsendMsgId: (msgId: string | null) => void;
    typingChannelRef: React.MutableRefObject<any>;
    isSending: boolean;
    setIsSending: (val: boolean) => void;
    typingTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
    isSendingTypingRef: React.MutableRefObject<boolean>;
}

export function useChatActions({
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
}: UseChatActionsParams) {

    const handleReaction = useCallback(async (messageId: string, emoji: string) => {
        setActiveReactMsg(null);
        if (!currentUser) return;

        const msgIndex = messages.findIndex(m => m.id === messageId);
        if (msgIndex === -1) return;
        const msg = messages[msgIndex];

        const currentReactions = msg.message_reactions || [];
        const myPreviousReaction = currentReactions.find(r => r.user_id === currentUser.id);

        let nextReactions;
        if (myPreviousReaction) {
            if (myPreviousReaction.emoji === emoji) {
                nextReactions = currentReactions.filter(r => r.user_id !== currentUser.id);
            } else {
                nextReactions = currentReactions.map(r => r.user_id === currentUser.id ? { ...r, emoji } : r);
            }
        } else {
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
                    
                    typingChannelRef.current?.send({
                        type: 'broadcast',
                        event: 'reaction_deleted',
                        payload: { message_id: messageId, user_id: currentUser.id }
                    });
                } else {
                    await supabase.from('message_reactions').update({ emoji }).match({ message_id: messageId, user_id: currentUser.id });
                }
            } else {
                await supabase.from('message_reactions').insert({ message_id: messageId, user_id: currentUser.id, emoji });
            }
        } catch (err: any) {
            console.error('Failed to react:', err);
        }
    }, [currentUser, messages, typingChannelRef, activeConvIdRef, setMessages, setActiveReactMsg]);

    const handleUnsendMessage = useCallback(async (msgId: string) => {
        if (!activeConvId) return;
        try {
            const isLastMessage = messages.length > 0 && messages[messages.length - 1].id === msgId;
            let newLastMsgContent = null;
            let newLastMsgTime = null;

            if (isLastMessage && messages.length > 1) {
                const secondToLast = messages[messages.length - 2];
                newLastMsgContent = secondToLast.content;
                newLastMsgTime = secondToLast.created_at;
            }

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

            if (isLastMessage) {
                await supabase.from('conversations').update({
                    last_message: newLastMsgContent,
                    last_message_time: newLastMsgTime
                }).eq('id', activeConvId);
            }

            const targetMsg = messages.find(m => m.id === msgId);
            if (targetMsg && targetMsg.audio_url) {
                try {
                    const urlParts = targetMsg.audio_url.split('/voice-messages/');
                    if (urlParts.length === 2) {
                        const filePath = urlParts[1];
                        await supabase.storage.from('voice-messages').remove([filePath]);
                    }
                } catch (e) {
                    console.error('Failed to clear storage:', e);
                }
            }

            await supabase.from('messages').update({ content: '🚫 This message was unsent.' }).eq('id', msgId);
            await supabase.from('messages').delete().eq('id', msgId);

            if (currentUser?.id) fetchConversations(currentUser.id);
        } catch (err) {
            console.error('Failed to unsend message:', err);
        }
    }, [activeConvId, currentUser, fetchConversations, messages, setConversations, setMessages, setUnsendMsgId]);

    const sendVoiceMessage = useCallback(async (audioBlob: Blob, audioDuration: number, preGeneratedId?: string) => {
        if (!activeConvId || !currentUser?.id || isSending) return;
        setIsSending(true);

        try {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            isSendingTypingRef.current = false;
            typingChannelRef.current?.send({
                type: 'broadcast',
                event: 'typing',
                payload: { user_id: currentUser?.id, typing: false }
            });

            const realId = preGeneratedId || crypto.randomUUID();
            const localAudioUrl = URL.createObjectURL(audioBlob);
            const pendingReplyId = activeReplyMsg ? activeReplyMsg.id : null;

            if (!preGeneratedId) {
                const optimisticMsg: Message = {
                    id: realId,
                    conversation_id: activeConvId,
                    sender_id: currentUser.id,
                    content: null,
                    audio_url: localAudioUrl,
                    audio_duration: audioDuration,
                    created_at: new Date().toISOString(),
                    seen: false,
                    optimistic: true,
                    reply_to_id: pendingReplyId
                };

                setActiveReplyMsg(null);

                setMessages(prev => {
                    const next = [...prev, optimisticMsg];
                    cachedMessages.set(activeConvId, next);
                    return next;
                });
                scrollToBottom();
            } else {
                setMessages(prev => {
                    const next = prev.map(m => m.id === realId ? { ...m, audio_url: localAudioUrl } : m);
                    cachedMessages.set(activeConvId, next);
                    return next;
                });
            }

            setConversations(prev => prev.map(c =>
                c.id === activeConvId
                    ? { ...c, last_message: '🎤 Voice message', last_message_time: new Date().toISOString() }
                    : c
            ).sort((a, b) => {
                if (!a.last_message_time) return 1;
                if (!b.last_message_time) return -1;
                return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
            }));

            const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            const date = new Date();
            const filePath = `${activeConvId}/${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('voice-messages')
                .upload(filePath, audioBlob, {
                    contentType: audioBlob.type,
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('voice-messages')
                .getPublicUrl(filePath);

            const { error: dbError } = await supabase.from('messages')
                .insert({
                    id: realId,
                    conversation_id: activeConvId,
                    sender_id: currentUser.id,
                    content: null,
                    audio_url: publicUrl,
                    audio_duration: audioDuration,
                    reply_to_id: pendingReplyId,
                    seen: false
                })
                .single();

            if (dbError) throw dbError;

            await supabase.from('conversations').update({
                last_message: '🎤 Voice message',
                last_message_time: new Date().toISOString()
            }).eq('id', activeConvId);

            setMessages(prev => {
                const updated = prev.map(m => m.id === realId ? { ...m, optimistic: false } : m);
                cachedMessages.set(activeConvId, updated);
                return updated;
            });

        } catch (err: any) {
            console.error('Failed to send voice message:', err);
        } finally {
            setIsSending(false);
        }
    }, [activeConvId, activeReplyMsg, currentUser, isSending, scrollToBottom, setActiveReplyMsg, setConversations, setIsSending, setMessages, typingChannelRef, isSendingTypingRef, typingTimeoutRef]);

    const handleVoiceRecordStopFromInput = useCallback(async (blob: Blob, durationSeconds: number) => {
        if (!activeConvId || !currentUser) return;

        const tempId = crypto.randomUUID();
        const pendingReplyId = activeReplyMsg ? activeReplyMsg.id : null;
        const currentDuration = Math.max(1, durationSeconds);

        const tempMsg: Message = {
            id: tempId,
            conversation_id: activeConvId,
            sender_id: currentUser.id,
            content: null,
            audio_url: 'pending',
            audio_duration: currentDuration,
            created_at: new Date().toISOString(),
            seen: false,
            optimistic: true,
            reply_to_id: pendingReplyId
        };

        setActiveReplyMsg(null);
        setMessages(prev => {
            const next = [...prev, tempMsg];
            cachedMessages.set(activeConvId, next);
            return next;
        });
        scrollToBottom();

        if (blob.size > 0) {
            await sendVoiceMessage(blob, currentDuration, tempId);
        } else {
            setMessages(prev => {
                const next = prev.filter(m => m.id !== tempId);
                cachedMessages.set(activeConvId, next);
                return next;
            });
        }
    }, [activeConvId, activeReplyMsg, currentUser, scrollToBottom, setActiveReplyMsg, setMessages, sendVoiceMessage]);

    const handleSendMessageText = useCallback(async (text: string) => {
        if (!text || !activeConvId || !currentUser?.id || isSending) return;

        setIsSending(true);
        const realId = crypto.randomUUID();

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

        const pendingReplyId = activeReplyMsg ? activeReplyMsg.id : null;
        setActiveReplyMsg(null);
        setMessages(prev => {
            const next = [...prev, optimisticMsg];
            cachedMessages.set(activeConvId, next);
            return next;
        });
        scrollToBottom();

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
            if (msgError) throw msgError;

            await supabase.from('conversations').update({
                last_message: text,
                last_message_time: new Date().toISOString(),
            }).eq('id', activeConvId);
        } catch (err: any) {
            console.error('Error sending message:', err?.message ?? err);
            setMessages(prev => prev.filter(m => m.id !== realId));
        } finally {
            setIsSending(false);
        }
    }, [activeConvId, activeReplyMsg, currentUser, isSending, scrollToBottom, setActiveReplyMsg, setConversations, setIsSending, setMessages]);

    return {
        handleReaction,
        handleUnsendMessage,
        handleVoiceRecordStopFromInput,
        handleSendMessageText
    };
}
