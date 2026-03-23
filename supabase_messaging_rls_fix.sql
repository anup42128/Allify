-- ============================================================
-- MESSAGING SYSTEM — RLS FIXES
-- Run this in your Supabase SQL Editor to fix message sending
-- ============================================================


-- ── FIX 1: Simplify conversation_participants SELECT policy ──
-- The original policy was self-referential (a table referencing
-- itself in its own RLS policy), which can cause recursion issues.
-- This safer version just lets users see rows where they are the user.

DROP POLICY IF EXISTS "Users can view participants of their conversations" ON conversation_participants;

-- Simple: you can always see your OWN participant rows
CREATE POLICY "Users can view own participation"
    ON conversation_participants FOR SELECT
    USING (user_id = auth.uid());

-- Also: you can see OTHER participants in conversations you belong to
-- We use a SECURITY DEFINER function to avoid self-referential recursion
CREATE OR REPLACE FUNCTION get_my_conversation_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT conversation_id
    FROM conversation_participants
    WHERE user_id = auth.uid();
$$;

CREATE POLICY "Users can view participants in their conversations"
    ON conversation_participants FOR SELECT
    USING (conversation_id IN (SELECT get_my_conversation_ids()));


-- ── FIX 2: Add UPDATE policy on conversations ─────────────────
-- Without this, updating last_message/last_message_time fails silently.

DROP POLICY IF EXISTS "Participants can update conversation metadata" ON conversations;

CREATE POLICY "Participants can update conversation metadata"
    ON conversations FOR UPDATE
    USING (id IN (SELECT get_my_conversation_ids()));


-- ── FIX 3: Rebuild messages SELECT policy using the safe function ─
DROP POLICY IF EXISTS "Users can read messages in their conversations" ON messages;

CREATE POLICY "Users can read messages in their conversations"
    ON messages FOR SELECT
    USING (conversation_id IN (SELECT get_my_conversation_ids()));


-- ── FIX 4: Rebuild messages INSERT policy using the safe function ─
DROP POLICY IF EXISTS "Users can send messages as themselves" ON messages;

CREATE POLICY "Users can send messages as themselves"
    ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND conversation_id IN (SELECT get_my_conversation_ids())
    );


-- ── FIX 5: Rebuild messages UPDATE (seen) policy ──────────────
DROP POLICY IF EXISTS "Users can mark messages as seen" ON messages;

CREATE POLICY "Users can mark messages as seen"
    ON messages FOR UPDATE
    USING (conversation_id IN (SELECT get_my_conversation_ids()));


-- ── FIX 6: conversations SELECT policy ───────────────────────
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;

CREATE POLICY "Users can view their own conversations"
    ON conversations FOR SELECT
    USING (id IN (SELECT get_my_conversation_ids()));


-- ============================================================
-- DONE ✓
-- All RLS policies now use a SECURITY DEFINER helper function
-- to avoid self-referential recursion on conversation_participants
-- ============================================================
