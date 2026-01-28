-- Refactored Comments Table (Human Readable)
-- Run this in Supabase SQL Editor

-- 0. Force drop existing comments table to avoid "already exists" errors
DROP TABLE IF EXISTS public.comments CASCADE;

-- 1. Create comments table with detailed metadata for readability
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    username TEXT NOT NULL REFERENCES public.profiles(username) ON UPDATE CASCADE ON DELETE CASCADE, -- Who commented
    post_author_username TEXT, -- Who created the post
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 3. Policies
CREATE POLICY "Comments are viewable by everyone." 
    ON public.comments FOR SELECT USING (true);

CREATE POLICY "Users can post comments." 
    ON public.comments FOR INSERT WITH CHECK (
        -- Verify the username belongs to the authenticated user
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE username = comments.username 
            AND id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own comments." 
    ON public.comments FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE username = comments.username 
            AND id = auth.uid()
        )
    );
