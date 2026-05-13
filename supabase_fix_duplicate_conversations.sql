-- ============================================================
-- ALLIFY MESSAGING SYSTEM — DUPLICATE CONVERSATION FIX
-- Run this in your Supabase SQL Editor
-- ============================================================
-- 1. Correct the buggy find_or_create_conversation function
-- The old logic used HAVING COUNT(*) = 2 which ALWAYS failed because the JOIN
-- only produced 1 row. This caused the DB to always create duplicates.
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
    -- Ensure it is strictly a 2-person conversation (no third person)
    AND NOT EXISTS (
        SELECT 1 FROM conversation_participants cp3
        WHERE cp3.conversation_id = cp1.conversation_id
        AND cp3.user_id NOT IN (user_a, user_b)
    )
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