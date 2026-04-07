-- ==============================================================================
-- ALLIFY: HIGH-PERFORMANCE NOTIFICATIONS SYSTEM
-- ==========================================
-- COMPLETE NOTIFICATIONS SYSTEM WIPE & REBUILD
-- ==========================================

-- 0. DANGER: Drop existing system to start fresh
DROP TRIGGER IF EXISTS on_like_notification ON public.likes;
DROP TRIGGER IF EXISTS on_comment_notification ON public.comments;
DROP TRIGGER IF EXISTS on_ally_notification ON public.follows;

DROP FUNCTION IF EXISTS public.handle_new_like_notification();
DROP FUNCTION IF EXISTS public.handle_new_comment_notification();
DROP FUNCTION IF EXISTS public.handle_new_ally_notification();

DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;

-- 1. Create Fresh Notification Type Enum
CREATE TYPE notification_type AS ENUM ('like', 'comment', 'reply', 'ally_follow', 'allied', 'thanks');

-- 2. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_username TEXT NOT NULL, -- Who receives it
    actor_username TEXT NOT NULL,     -- Who triggered it
    type notification_type NOT NULL,
    entity_id TEXT, -- e.g., Post ID, Comment ID, or the Follower's ID
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent identical duplicate spam
    CONSTRAINT unique_notification UNIQUE (recipient_username, actor_username, type, entity_id)
);

-- 3. Highly Optimized Indexes for Scaling
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_feed ON public.notifications(recipient_username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread_badge ON public.notifications(recipient_username) WHERE is_read = false;

-- 4. Enable RLS & Realtime
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- VERY IMPORTANT: This enables instant push notifications to the React frontend!
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE POLICY "Users view their own notifications"
    ON public.notifications FOR SELECT
    USING (recipient_id = auth.uid());

CREATE POLICY "Users can send thanks notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (
        type = 'thanks'
        AND auth.uid() IN (SELECT id FROM profiles WHERE username = actor_username)
    );

CREATE POLICY "Users can mark their own notifications as read"
    ON public.notifications FOR UPDATE
    USING (recipient_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
    ON public.notifications FOR DELETE
    USING (recipient_id = auth.uid());

CREATE POLICY "Actors can view their sent notifications"
    ON public.notifications FOR SELECT
    USING (actor_username = (SELECT username FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Actors can delete their sent notifications"
    ON public.notifications FOR DELETE
    USING (actor_username = (SELECT username FROM public.profiles WHERE id = auth.uid()));

-- 5. AUTOMATED TRIGGERS
-- Since we are automating this, NO frontend inserts are allowed. Security is strict.

-- A) LIKES TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_like_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_recipient_id UUID;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Only notify if you are not liking your own post
        IF NEW.username != NEW.post_author_username THEN
            SELECT id INTO v_recipient_id FROM public.profiles WHERE username = NEW.post_author_username LIMIT 1;
            IF v_recipient_id IS NOT NULL THEN
                INSERT INTO public.notifications (recipient_id, recipient_username, actor_username, type, entity_id)
                VALUES (v_recipient_id, NEW.post_author_username, NEW.username, 'like', NEW.post_id::text)
                ON CONFLICT DO NOTHING;
            END IF;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        -- Clean up notification when unliked
        DELETE FROM public.notifications 
        WHERE recipient_username = OLD.post_author_username 
          AND actor_username = OLD.username 
          AND type = 'like' 
          AND entity_id = OLD.post_id::text;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_like_notification ON public.likes;
CREATE TRIGGER on_like_notification
    AFTER INSERT OR DELETE ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_like_notification();

-- B) COMMENTS TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_comment_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_recipient_id UUID;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Only notify if you are not commenting on your own post
        IF NEW.username != NEW.post_author_username THEN
            SELECT id INTO v_recipient_id FROM public.profiles WHERE username = NEW.post_author_username LIMIT 1;
            IF v_recipient_id IS NOT NULL THEN
                INSERT INTO public.notifications (recipient_id, recipient_username, actor_username, type, entity_id)
                VALUES (v_recipient_id, NEW.post_author_username, NEW.username, 'comment', NEW.post_id::text)
                ON CONFLICT DO NOTHING;
            END IF;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM public.notifications 
        WHERE recipient_username = OLD.post_author_username 
          AND actor_username = OLD.username 
          AND type = 'comment' 
          AND entity_id = OLD.post_id::text;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_notification ON public.comments;
CREATE TRIGGER on_comment_notification
    AFTER INSERT OR DELETE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment_notification();

-- C) ALLIES TRIGGER (Using the 'follows' table)
CREATE OR REPLACE FUNCTION public.handle_new_ally_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_recipient_id UUID;
    v_follower_id UUID;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.follower_username != NEW.following_username THEN
            SELECT id INTO v_recipient_id FROM public.profiles WHERE username = NEW.following_username LIMIT 1;
            SELECT id INTO v_follower_id FROM public.profiles WHERE username = NEW.follower_username LIMIT 1;

            IF v_recipient_id IS NOT NULL AND v_follower_id IS NOT NULL THEN
                -- 1. Standard one-way notification
                INSERT INTO public.notifications (recipient_id, recipient_username, actor_username, type, entity_id)
                VALUES (v_recipient_id, NEW.following_username, NEW.follower_username, 'ally_follow', NEW.follower_id::text)
                ON CONFLICT DO NOTHING;

                -- 2. Check if this completes a mutual relationship
                IF EXISTS (
                    SELECT 1 FROM public.follows
                    WHERE follower_username = NEW.following_username 
                      AND following_username = NEW.follower_username
                ) THEN
                    -- Mutual match! Send 'allied' to BOTH users
                    INSERT INTO public.notifications (recipient_id, recipient_username, actor_username, type, entity_id)
                    VALUES (v_recipient_id, NEW.following_username, NEW.follower_username, 'allied', NEW.follower_id::text)
                    ON CONFLICT DO NOTHING;

                    INSERT INTO public.notifications (recipient_id, recipient_username, actor_username, type, entity_id)
                    VALUES (v_follower_id, NEW.follower_username, NEW.following_username, 'allied', NEW.following_id::text)
                    ON CONFLICT DO NOTHING;
                END IF;
            END IF;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM public.notifications 
        WHERE recipient_username = OLD.following_username 
          AND actor_username = OLD.follower_username 
          AND type = 'ally_follow' 
          AND entity_id = OLD.follower_id::text;

        -- Clean up mutual notifications if they unfollow
        DELETE FROM public.notifications 
        WHERE type = 'allied' 
          AND (
               (recipient_username = OLD.following_username AND actor_username = OLD.follower_username)
            OR (recipient_username = OLD.follower_username AND actor_username = OLD.following_username)
          );
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_ally_notification ON public.follows;
CREATE TRIGGER on_ally_notification
    AFTER INSERT OR DELETE ON public.follows
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_ally_notification();
