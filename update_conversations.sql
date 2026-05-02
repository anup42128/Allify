-- ============================================================
-- ALLIFY — Cross-Device Chat Sync Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Step 1: Add the initiated_by column to the conversations table.
-- This records WHO opened the chat, so it syncs across all their devices.
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES profiles(id);


-- Step 2: Update the find_or_create_conversation function
-- to record user_a (the person clicking "Message") as the initiator.
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
    GROUP BY cp1.conversation_id
    HAVING COUNT(*) = 2
    LIMIT 1;

    -- If one already exists, return it (no changes needed)
    IF existing_conversation_id IS NOT NULL THEN
        RETURN existing_conversation_id;
    END IF;

    -- Otherwise create a new conversation and record user_a as the initiator
    INSERT INTO conversations (initiated_by) 
    VALUES (user_a)
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
-- DONE ✓
-- After running this, opening a chat on any device will sync
-- to all other devices the user logs into, without revealing
-- the chat to the other person until a message is sent.
-- ============================================================
