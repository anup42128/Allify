-- Migration to establish the message_reactions architecture specifically enabling users to map isolated emoji strings relationally into historical messages cleanly.

CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraint: A user can only leave one specific type of emoji per message natively (e.g. they cannot leave 5 '❤️'s).
    -- But they CAN leave multiple distinct emojis structurally (e.g. 1 '❤️' and 1 '😂').
    UNIQUE(message_id, user_id, emoji)
);

-- Secure Row Level Security (RLS) policies targeting interaction arrays explicitly
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read message reactions"
    ON public.message_reactions FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own reactions"
    ON public.message_reactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
    ON public.message_reactions FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
    ON public.message_reactions FOR UPDATE
    USING (auth.uid() = user_id);
    
-- Explicitly activate this table securely inside the Realtime publication channel natively ensuring websocket hooks broadcast payloads smoothly
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;

-- ==========================================
-- Performance Indexes for Massive Scale
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);
