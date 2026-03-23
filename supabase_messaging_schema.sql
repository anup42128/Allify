-- ============================================================
-- ALLIFY MESSAGING SYSTEM — DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================================
-- Requires: profiles table with id (uuid) already existing
-- ============================================================


-- ============================================================
-- STEP 1: CONVERSATIONS TABLE
-- Each row = one chat thread (1-to-1 now, group-ready later)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message        TEXT,
    last_message_time   TIMESTAMPTZ
);


-- ============================================================
-- STEP 2: CONVERSATION PARTICIPANTS TABLE
-- Links users to conversations (supports future group chats)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_participants (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Prevent a user from being added twice to the same conversation
    UNIQUE (conversation_id, user_id)
);


-- ============================================================
-- STEP 3: MESSAGES TABLE
-- Each row = one message inside a conversation
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id           UUID NOT NULL REFERENCES profiles(id),
    content             TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    seen                BOOLEAN NOT NULL DEFAULT false
);


-- ============================================================
-- STEP 4: PERFORMANCE INDEXES
-- Critical for fast queries at scale (millions of records)
-- ============================================================

-- Find all messages in a conversation, ordered by time
CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_time
    ON messages(created_at DESC);

-- Find all conversations a user belongs to
CREATE INDEX IF NOT EXISTS idx_participants_user
    ON conversation_participants(user_id);

-- Find all participants in a conversation
CREATE INDEX IF NOT EXISTS idx_participants_conversation
    ON conversation_participants(conversation_id);

-- Composite index: speeds up "find all conversations for a user, sorted by last message time"
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_time
    ON conversations(last_message_time DESC NULLS LAST);


-- ============================================================
-- STEP 5: PREVENT DUPLICATE 1-TO-1 CONVERSATIONS
-- A PostgreSQL function to safely find or create a conversation
-- between exactly two users. Call this from your backend/edge
-- function instead of raw INSERT to avoid duplicates.
-- ============================================================
CREATE OR REPLACE FUNCTION find_or_create_conversation(
    user_a UUID,
    user_b UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing_conversation_id UUID;
    new_conversation_id      UUID;
BEGIN
    -- Look for an existing 1-to-1 conversation between both users
    SELECT cp1.conversation_id
    INTO existing_conversation_id
    FROM conversation_participants cp1
    JOIN conversation_participants cp2
        ON cp1.conversation_id = cp2.conversation_id
        AND cp2.user_id = user_b
    WHERE cp1.user_id = user_a
    -- Ensure it is strictly a 2-person conversation (not a group)
    GROUP BY cp1.conversation_id
    HAVING COUNT(*) = 2
    LIMIT 1;

    -- If one already exists, return it
    IF existing_conversation_id IS NOT NULL THEN
        RETURN existing_conversation_id;
    END IF;

    -- Otherwise create a new conversation
    INSERT INTO conversations DEFAULT VALUES
    RETURNING id INTO new_conversation_id;

    -- Add both users as participants
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES
        (new_conversation_id, user_a),
        (new_conversation_id, user_b);

    RETURN new_conversation_id;
END;
$$;


-- ============================================================
-- STEP 6: ROW LEVEL SECURITY (RLS)
-- Users can only see conversations and messages they belong to
-- ============================================================

-- Enable RLS on all messaging tables
ALTER TABLE conversations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                ENABLE ROW LEVEL SECURITY;


-- CONVERSATIONS: A user can only see conversations they are a participant of
CREATE POLICY "Users can view their own conversations"
    ON conversations FOR SELECT
    USING (
        id IN (
            SELECT conversation_id
            FROM conversation_participants
            WHERE user_id = auth.uid()
        )
    );


-- CONVERSATION_PARTICIPANTS: A user can only see participant rows for their own conversations
CREATE POLICY "Users can view participants of their conversations"
    ON conversation_participants FOR SELECT
    USING (
        conversation_id IN (
            SELECT conversation_id
            FROM conversation_participants
            WHERE user_id = auth.uid()
        )
    );


-- MESSAGES: A user can only read messages in conversations they belong to
CREATE POLICY "Users can read messages in their conversations"
    ON messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT conversation_id
            FROM conversation_participants
            WHERE user_id = auth.uid()
        )
    );

-- MESSAGES: A user can only insert messages as themselves (sender_id must match their own UUID)
CREATE POLICY "Users can send messages as themselves"
    ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND conversation_id IN (
            SELECT conversation_id
            FROM conversation_participants
            WHERE user_id = auth.uid()
        )
    );

-- MESSAGES: A user can update the "seen" status only on messages in their conversations
CREATE POLICY "Users can mark messages as seen"
    ON messages FOR UPDATE
    USING (
        conversation_id IN (
            SELECT conversation_id
            FROM conversation_participants
            WHERE user_id = auth.uid()
        )
    );


-- ============================================================
-- STEP 7: REALTIME — Enable Supabase Realtime on messages
-- This allows frontend subscriptions to new messages instantly
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;


-- ============================================================
-- DONE ✓
-- Tables:  conversations, conversation_participants, messages
-- Func:    find_or_create_conversation(user_a, user_b)
-- Indexes: 5 performance indexes
-- RLS:     Users can only see their own chats and messages
-- Realtime: Enabled on messages and conversations
-- ============================================================
