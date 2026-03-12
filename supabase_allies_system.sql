-- ============================================================
-- ALLIFY: Allies System Schema (v3 - Cached counts on profiles)
-- ============================================================
-- Terminology:
--   "Allies"  = People who follow YOU (your follower count)
--   "Alling"  = People YOU follow     (your following count)
--   "Allied"  = BOTH follow each other (mutual friendship count)
--
-- Strategy: Cache the 3 counts directly on the profiles table.
-- Triggers on the follows table keep these counts in sync
-- automatically whenever someone follows or unfollows.
-- This means fetching a profile also gives you all 3 stats
-- in one single query — no extra joins needed.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- STEP 1: Add counter columns to the profiles table
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS allies_count INT DEFAULT 0, -- people who follow me
    ADD COLUMN IF NOT EXISTS alling_count INT DEFAULT 0, -- people I follow
    ADD COLUMN IF NOT EXISTS allied_count INT DEFAULT 0; -- mutual follows


-- ─────────────────────────────────────────────────────────────
-- STEP 2: FOLLOWS TABLE
--    One row = A follows B (directional, no status needed).
--    Mutual = two rows: (A→B) AND (B→A).
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.follows (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- The user who pressed Follow
    follower_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    follower_username   TEXT NOT NULL,

    -- The user being followed
    following_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_username  TEXT NOT NULL,

    created_at          TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate follows
    UNIQUE (follower_id, following_id)
);


-- ─────────────────────────────────────────────────────────────
-- STEP 3: INDEXES
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_follows_follower        ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following       ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_uname  ON public.follows(follower_username);
CREATE INDEX IF NOT EXISTS idx_follows_following_uname ON public.follows(following_username);


-- ─────────────────────────────────────────────────────────────
-- STEP 4: ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select" ON public.follows
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "follows_insert" ON public.follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete" ON public.follows
    FOR DELETE USING (auth.uid() = follower_id);


-- ─────────────────────────────────────────────────────────────
-- STEP 5: TRIGGER FUNCTION — runs after every INSERT on follows
--
-- When A follows B:
--   - A's alling_count   += 1
--   - B's allies_count   += 1
--   - If B already follows A → A and B allied_count += 1
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.on_follow_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    is_mutual BOOLEAN;
BEGIN
    -- Increase the follower's Alling count (people they follow)
    UPDATE public.profiles
    SET alling_count = alling_count + 1
    WHERE id = NEW.follower_id;

    -- Increase the followee's Allies count (people who follow them)
    UPDATE public.profiles
    SET allies_count = allies_count + 1
    WHERE id = NEW.following_id;

    -- Check if the followee already follows the follower (mutual)
    SELECT EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id  = NEW.following_id
          AND following_id = NEW.follower_id
    ) INTO is_mutual;

    IF is_mutual THEN
        -- Both become Allied
        UPDATE public.profiles
        SET allied_count = allied_count + 1
        WHERE id = NEW.follower_id OR id = NEW.following_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_follow_insert
    AFTER INSERT ON public.follows
    FOR EACH ROW EXECUTE FUNCTION public.on_follow_insert();


-- ─────────────────────────────────────────────────────────────
-- STEP 6: TRIGGER FUNCTION — runs after every DELETE on follows
--
-- When A unfollows B:
--   - A's alling_count  -= 1
--   - B's allies_count  -= 1
--   - If B still follows A → A and B allied_count -= 1
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.on_follow_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    was_mutual BOOLEAN;
BEGIN
    -- Decrease the follower's Alling count
    UPDATE public.profiles
    SET alling_count = GREATEST(alling_count - 1, 0)
    WHERE id = OLD.follower_id;

    -- Decrease the followee's Allies count
    UPDATE public.profiles
    SET allies_count = GREATEST(allies_count - 1, 0)
    WHERE id = OLD.following_id;

    -- Check if the other direction still exists (was mutual before this unfollow)
    SELECT EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id  = OLD.following_id
          AND following_id = OLD.follower_id
    ) INTO was_mutual;

    IF was_mutual THEN
        -- They were Allied — subtract Allied from both
        UPDATE public.profiles
        SET allied_count = GREATEST(allied_count - 1, 0)
        WHERE id = OLD.follower_id OR id = OLD.following_id;
    END IF;

    RETURN OLD;
END;
$$;

CREATE TRIGGER trg_follow_delete
    AFTER DELETE ON public.follows
    FOR EACH ROW EXECUTE FUNCTION public.on_follow_delete();


-- ─────────────────────────────────────────────────────────────
-- STEP 7: RECALCULATE function (run once after setup to
--         backfill counts if the table already has data)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.recalculate_all_ally_counts()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    -- Reset all counts
    UPDATE public.profiles SET allies_count = 0, alling_count = 0, allied_count = 0;

    -- Recalculate allies_count (people who follow each profile)
    UPDATE public.profiles p
    SET allies_count = (
        SELECT COUNT(*) FROM public.follows WHERE following_id = p.id
    );

    -- Recalculate alling_count (people each profile follows)
    UPDATE public.profiles p
    SET alling_count = (
        SELECT COUNT(*) FROM public.follows WHERE follower_id = p.id
    );

    -- Recalculate allied_count (mutual follows)
    UPDATE public.profiles p
    SET allied_count = (
        SELECT COUNT(*) FROM public.follows f1
        WHERE f1.follower_id = p.id
          AND EXISTS (
              SELECT 1 FROM public.follows f2
              WHERE f2.follower_id  = f1.following_id
                AND f2.following_id = f1.follower_id
          )
    );
END;
$$;

-- Run this once after creating the table (safe to re-run anytime):
-- SELECT recalculate_all_ally_counts();


-- ─────────────────────────────────────────────────────────────
-- STEP 8: VIEW — who follows who, with relationship type
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.follow_relationships WITH (security_invoker = on) AS
SELECT
    f.follower_id,
    f.follower_username,
    f.following_id,
    f.following_username,
    f.created_at,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.follows rev
            WHERE rev.follower_id  = f.following_id
              AND rev.following_id = f.follower_id
        ) THEN 'Allied'
        ELSE 'One-way'
    END AS relationship_type
FROM public.follows f;


-- ─────────────────────────────────────────────────────────────
-- STEP 9: EXAMPLE QUERIES
-- ─────────────────────────────────────────────────────────────

-- Fetch a user's profile WITH their real stats (single query!):
-- SELECT username, full_name, avatar_url, bio, allies_count, alling_count, allied_count
-- FROM profiles WHERE username = 'anup42';

-- Who follows "anup42" (their Allies list):
-- SELECT follower_username, created_at FROM follows WHERE following_username = 'anup42';

-- Who does "anup42" follow (their Alling list):
-- SELECT following_username, created_at FROM follows WHERE follower_username = 'anup42';

-- All Allied pairs for "anup42":
-- SELECT following_username AS allied_with, created_at
-- FROM follows
-- WHERE follower_username = 'anup42'
--   AND following_username IN (
--       SELECT follower_username FROM follows WHERE following_username = 'anup42'
--   );

-- Backfill counts after running this script for the first time:
-- SELECT recalculate_all_ally_counts();
