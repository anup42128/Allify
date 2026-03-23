-- Execute this securely in the Supabase Dashboard SQL Editor to initialize Threaded Replies constraint support!
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;
