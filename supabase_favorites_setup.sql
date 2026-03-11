-- Create a table to track which users have favorited which posts
CREATE TABLE public.saved_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure a user can only favorite a post once
  UNIQUE(user_id, post_id)
);

-- Turn on Row Level Security
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own saved/favorited posts
CREATE POLICY "Users can view their own saved posts"
  ON public.saved_posts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can add a post to their favorites
CREATE POLICY "Users can insert their own saved posts"
  ON public.saved_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can remove a post from their favorites
CREATE POLICY "Users can delete their own saved posts"
  ON public.saved_posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create an index to quickly pull up a user's favorites
CREATE INDEX saved_posts_user_id_idx ON public.saved_posts(user_id);
