-- ============================================================
-- UPGRADE SCRIPT: VOICE MESSAGES
-- Run this securely to upgrade your existing ALLIFY database
-- without hitting "already exists" errors.
-- ============================================================

-- 1. Add new columns safely (Postgres ignores if they exist)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_duration INTEGER; 

-- 2. Drop the NOT NULL constraint on content (so voice-only works)
ALTER TABLE messages
  ALTER COLUMN content DROP NOT NULL;

-- 3. Allow message deletion (handle "already exists" gracefully)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'messages' 
        AND policyname = 'Users can delete their own messages'
    ) THEN
        CREATE POLICY "Users can delete their own messages"
            ON messages FOR DELETE
            USING (sender_id = auth.uid());
    END IF;
END
$$;

-- 4. Create the voice-messages Storage Bucket 
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Add Storage Policies Safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Voice messages are publicly accessible.') THEN
        CREATE POLICY "Voice messages are publicly accessible."
            ON storage.objects FOR SELECT
            USING (bucket_id = 'voice-messages');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload voice messages.') THEN
        CREATE POLICY "Authenticated users can upload voice messages."
            ON storage.objects FOR INSERT
            WITH CHECK (
                bucket_id = 'voice-messages' 
                AND auth.role() = 'authenticated'
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own voice messages.') THEN
        CREATE POLICY "Users can delete their own voice messages."
            ON storage.objects FOR DELETE
            USING (
                bucket_id = 'voice-messages' 
                AND auth.uid() = owner
            );
    END IF;
END
$$;
