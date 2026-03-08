-- 1. Add 'type', 'video_url', and trim columns to main posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'photo';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS start_time FLOAT DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS end_time FLOAT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS video_pan_x FLOAT DEFAULT 50;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS video_pan_y FLOAT DEFAULT 50;

-- 2. Create specialized photos table
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
    username TEXT NOT NULL REFERENCES public.profiles(username) ON UPDATE CASCADE ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create specialized videos table
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
    username TEXT NOT NULL REFERENCES public.profiles(username) ON UPDATE CASCADE ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    caption TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS for new tables
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Photos
DROP POLICY IF EXISTS "Photos are viewable by everyone." ON public.photos;
CREATE POLICY "Photos are viewable by everyone." ON public.photos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own mirrored photos." ON public.photos;
CREATE POLICY "Users can manage their own mirrored photos." ON public.photos FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE username = photos.username AND id = auth.uid())
);

-- 6. Policies for Videos
DROP POLICY IF EXISTS "Videos are viewable by everyone." ON public.videos;
CREATE POLICY "Videos are viewable by everyone." ON public.videos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own mirrored videos." ON public.videos;
CREATE POLICY "Users can manage their own mirrored videos." ON public.videos FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE username = videos.username AND id = auth.uid())
);

-- 7. Mirroring Function
CREATE OR REPLACE FUNCTION public.sync_posts_to_media_tables()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.type = 'photo') THEN
            INSERT INTO public.photos (id, username, image_url, caption, likes_count, created_at)
            VALUES (NEW.id, NEW.username, NEW.image_url, NEW.caption, NEW.likes_count, NEW.created_at);
        ELSIF (NEW.type = 'video') THEN
            INSERT INTO public.videos (id, username, video_url, caption, likes_count, created_at)
            VALUES (NEW.id, NEW.username, NEW.video_url, NEW.caption, NEW.likes_count, NEW.created_at);
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (NEW.type = 'photo') THEN
            -- Update or Insert into photos
            INSERT INTO public.photos (id, username, image_url, caption, likes_count, created_at)
            VALUES (NEW.id, NEW.username, NEW.image_url, NEW.caption, NEW.likes_count, NEW.created_at)
            ON CONFLICT (id) DO UPDATE SET
                image_url = EXCLUDED.image_url,
                caption = EXCLUDED.caption,
                likes_count = EXCLUDED.likes_count;
            -- Clean up videos if it was previously there
            DELETE FROM public.videos WHERE id = NEW.id;
        ELSIF (NEW.type = 'video') THEN
            -- Update or Insert into videos
            INSERT INTO public.videos (id, username, video_url, caption, likes_count, created_at)
            VALUES (NEW.id, NEW.username, NEW.video_url, NEW.caption, NEW.likes_count, NEW.created_at)
            ON CONFLICT (id) DO UPDATE SET
                video_url = EXCLUDED.video_url,
                caption = EXCLUDED.caption,
                likes_count = EXCLUDED.likes_count;
            -- Clean up photos if it was previously there
            DELETE FROM public.photos WHERE id = NEW.id;
        END IF;
    -- Note: DELETE is handled by CASCADE foreign key
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Mirroring Trigger
DROP TRIGGER IF EXISTS on_post_media_sync ON public.posts;
CREATE TRIGGER on_post_media_sync
AFTER INSERT OR UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.sync_posts_to_media_tables();

-- 9. Backfill existing posts
INSERT INTO public.photos (id, username, image_url, caption, likes_count, created_at)
SELECT id, username, image_url, caption, likes_count, created_at
FROM public.posts
WHERE type = 'photo'
ON CONFLICT (id) DO NOTHING;
