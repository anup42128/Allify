-- Refactored Likes Table (Human Readable)
-- Run this in Supabase SQL Editor

-- 0. Force drop existing likes table to avoid "already exists" errors
DROP TABLE IF EXISTS public.likes CASCADE;

-- 1. Create likes table with username and additional metadata for readability
create table public.likes (
  id uuid not null default uuid_generate_v4(),
  username text not null references public.profiles(username) on update cascade on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  post_author_username text, -- The user who owns the post
  post_url text, -- The image URL of the liked post
  created_at timestamp with time zone not null default now(),
  constraint likes_pkey primary key (id),
  -- Ensure a user can only like a specific post once
  constraint likes_user_post_unique unique (username, post_id)
);

-- 2. Enable Row Level Security
alter table public.likes enable row level security;

-- 3. Policies
create policy "Public likes are viewable by everyone." 
  on public.likes for select using ( true );

create policy "Users can insert their own likes." 
  on public.likes for insert with check ( 
    -- Verify the username belongs to the authenticated user
    exists (
      select 1 from public.profiles 
      where username = likes.username 
      and id = auth.uid()
    )
  );

create policy "Users can delete their own likes." 
  on public.likes for delete using ( 
    exists (
      select 1 from public.profiles 
      where username = likes.username 
      and id = auth.uid()
    )
  );
