
import { motion, AnimatePresence } from 'framer-motion';
import { ConversationSidebar } from '../components/chat/ConversationSidebar';
import { Avatar } from '../components/chat/Avatar';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageInputArea } from '../components/chat/MessageInputArea';
import { MessageBubble } from '../components/chat/MessageBubble';
import { DeleteMessageModal } from '../components/chat/DeleteMessageModal';
import { useChatManager } from '../hooks/useChatManager';

export const MessagesPage = () => {
    const {
        // State Models
        currentUser,
        conversations,
        messages,
        groupedMessages,
        activeConvId,
        activeConvUser,
        displayUser,
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
    } = useChatManager();

    return (
        <div className="flex h-full w-full bg-black overflow-hidden" onClick={() => { setActiveReactMsg(null); setUnsendMsgId(null); }}>
            <ConversationSidebar
                currentUser={currentUser}
                conversations={conversations}
                activeConvId={activeConvId}
                isLoadingConvs={isLoadingConvs}
                onStartNewChat={handleStartNewChat}
                onSelectConversation={openConversation}
            />

            {/* ── RIGHT PANEL: Chat Window ──────────────────────────────────────── */}
            <div className="flex-1 h-full flex flex-col bg-black overflow-hidden">
                <AnimatePresence mode="wait">
                    {activeConvId && displayUser ? (
                        <motion.div
                            key={activeConvId}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            {/* Chat Header */}
                            <ChatHeader user={displayUser} />

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
                                                        <MessageBubble
                                                            key={msg.id}
                                                            msg={msg}
                                                            messages={messages}
                                                            currentUser={currentUser}
                                                            displayUser={displayUser}
                                                            isMe={isMe}
                                                            isContinuation={isContinuation}
                                                            isLastInGroup={isLastInGroup}
                                                            initialUnreadId={initialUnreadId}
                                                            activeReactMsg={activeReactMsg}
                                                            unsendMsgId={unsendMsgId}
                                                            copiedMsgId={copiedMsgId}
                                                            setActiveReactMsg={setActiveReactMsg}
                                                            setUnsendMsgId={setUnsendMsgId}
                                                            setConfirmDeleteId={setConfirmDeleteId}
                                                            setCopiedMsgId={setCopiedMsgId}
                                                            setActiveReplyMsg={setActiveReplyMsg}
                                                            handleReaction={handleReaction}
                                                            inputRef={inputRef}
                                                        />
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

                                        <div ref={messagesEndCallbackRef} />
                                    </div>
                                )}
                            </div>

                            {/* Message Input — lives OUTSIDE key={activeConvId} motion.div so it        */}
                            {/* never remounts on conversation switch, keeping draftsRef alive.          */}
                        </motion.div>
                    ) : isOpeningChat ? (
                        <motion.div
                            key="opening"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 h-full flex flex-col items-center justify-center text-center px-8"
                        >
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-10 h-10 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
                                <p className="text-zinc-500 text-sm font-medium animate-pulse">Preparing chat...</p>
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
                {activeConvId && displayUser && (
                    <MessageInputArea
                        ref={inputRef}
                        currentUser={currentUser}
                        displayUser={displayUser}
                        activeConvId={activeConvId}
                        activeReplyMsg={activeReplyMsg}
                        isSending={isSending}
                        onSendMessage={handleSendMessageText}
                        onSendVoiceMessage={handleVoiceRecordStopFromInput}
                        onClearReply={() => setActiveReplyMsg(null)}
                        onTypingStatusChange={(status) => {
                            typingChannelRef.current?.send({
                                type: 'broadcast',
                                event: 'typing',
                                payload: { user_id: currentUser?.id, typing: status }
                            });
                        }}
                    />
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteMessageModal
                isOpen={confirmDeleteId !== null}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={() => {
                    if (confirmDeleteId) handleUnsendMessage(confirmDeleteId);
                }}
            />
        </div>
    );
};
