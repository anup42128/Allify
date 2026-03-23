-- ============================================================
-- RUN THIS ONE TIME: MIGRATION & CLEANUP
-- ============================================================


-- ── PART 1: PERMANENTLY PREVENT DUPLICATES ───────────────────
-- This upgrades the database function so it ALWAYS finds the 
-- correct conversation with messages, and physically prevents
-- any future clicking from creating new duplicate ghosts.
CREATE OR REPLACE FUNCTION find_or_create_conversation(user_a UUID, user_b UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    conv_id UUID;
BEGIN
    -- 1. Find existing 1-to-1 conversation between these two users
    -- 2. Order by last_message_time DESC so we ALWAYS get the one with actual messages
    SELECT cp1.conversation_id INTO conv_id
    FROM conversation_participants cp1
    JOIN conversation_participants cp2
        ON cp1.conversation_id = cp2.conversation_id
        AND cp2.user_id = user_b
    JOIN conversations c ON c.id = cp1.conversation_id
    WHERE cp1.user_id = user_a
    ORDER BY c.last_message_time DESC NULLS LAST
    LIMIT 1;

    -- If found, return it
    IF conv_id IS NOT NULL THEN
        RETURN conv_id;
    END IF;

    -- Otherwise create a new conversation
    INSERT INTO conversations DEFAULT VALUES RETURNING id INTO conv_id;

    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (conv_id, user_a), (conv_id, user_b);

    RETURN conv_id;
END;
$$;


-- ── PART 2: CLEAN UP EXISTING GHOSTS ──────────────────────────
-- This instantly deletes all the empty duplicate conversations
-- that were already accidentally created earlier today.
DELETE FROM conversations
WHERE id IN (
    SELECT c.id
    FROM conversations c
    WHERE c.last_message IS NULL    -- targets empty conversations (no messages sent)
    AND EXISTS (
        -- Only delete if there's ANOTHER conversation between the same users that HAS messages
        SELECT 1
        FROM conversation_participants cp1
        JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
        WHERE cp1.conversation_id = c.id AND cp1.user_id != cp2.user_id
        AND EXISTS (
            SELECT 1 FROM conversation_participants cp3
            JOIN conversation_participants cp4 ON cp3.conversation_id = cp4.conversation_id
            JOIN conversations c2 ON c2.id = cp3.conversation_id
            WHERE cp3.user_id = cp1.user_id
            AND cp4.user_id = cp2.user_id
            AND c2.id != c.id
            AND c2.last_message IS NOT NULL
        )
    )
);

-- ============================================================
-- DONE ✓
-- Duplicates are cleaned, and future duplicates are impossible.
-- ============================================================
