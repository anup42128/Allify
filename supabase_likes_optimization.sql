-- Likes count optimization
-- Run this in Supabase SQL Editor

-- 1. Add likes_count column to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- 2. Populate existing counts
UPDATE public.posts p
SET likes_count = (
    SELECT count(*)
    FROM public.likes l
    WHERE l.post_id = p.id
);

-- 3. Create function to increment/decrement likes_count
CREATE OR REPLACE FUNCTION public.handle_like_count_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.posts
        SET likes_count = likes_count + 1
        WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.posts
        SET likes_count = COALESCE(likes_count, 0) - 1
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger on likes table
DROP TRIGGER IF EXISTS on_like_change ON public.likes;
CREATE TRIGGER on_like_change
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.handle_like_count_sync();
