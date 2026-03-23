-- ============================================================
-- ADD THIS POLICY TO ALLOW UNSENDING MESSAGES
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Ensure the policy doesn't already exist to avoid errors
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Allow users to delete their own messages
CREATE POLICY "Users can delete their own messages"
    ON messages FOR DELETE
    USING (sender_id = auth.uid());

-- NOTE: The realtime subscription on the frontend will automatically
-- detect the DELETE event and remove the message bubble instantly.
