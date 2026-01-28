-- Refactored Database Schema (Posts Only)
-- Run this in Supabase SQL Editor

-- 0. Force drop existing posts table to avoid "already exists" errors
DROP TABLE IF EXISTS public.posts CASCADE;

-- 1. Create posts table with human-readable username
create table public.posts (
  id uuid not null default uuid_generate_v4(),
  username text not null references public.profiles(username) on update cascade on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamp with time zone not null default now(),
  constraint posts_pkey primary key (id)
);

-- 2. Enable Row Level Security
alter table public.posts enable row level security;

-- 3. Post Policies
create policy "Public posts are viewable by everyone." 
  on public.posts for select using ( true );

create policy "Users can insert their own posts." 
  on public.posts for insert with check ( 
    exists (select 1 from public.profiles where username = posts.username and id = auth.uid())
  );

create policy "Users can update their own posts." 
  on public.posts for update using ( 
    exists (select 1 from public.profiles where username = posts.username and id = auth.uid())
  );

create policy "Users can delete their own posts." 
  on public.posts for delete using ( 
    exists (select 1 from public.profiles where username = posts.username and id = auth.uid())
  );

-- 4. Storage Setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('posts', 'posts', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images." ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images." ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images." ON storage.objects;

CREATE POLICY "Images are publicly accessible." ON storage.objects FOR SELECT USING ( bucket_id = 'posts' );
CREATE POLICY "Authenticated users can upload images." ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'posts' AND auth.role() = 'authenticated' );
CREATE POLICY "Users can update their own images." ON storage.objects FOR UPDATE USING ( bucket_id = 'posts' AND auth.uid() = owner );
CREATE POLICY "Users can delete their own images." ON storage.objects FOR DELETE USING ( bucket_id = 'posts' AND auth.uid() = owner );
