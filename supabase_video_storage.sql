-- Video Storage Setup
-- Run this in Supabase SQL Editor

-- 1. Create a bucket for videos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS Policies for the 'videos' bucket

-- Drop existing specific policies to avoid conflicts
DROP POLICY IF EXISTS "Videos Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Videos Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Videos Owner Delete" ON storage.objects;
DROP POLICY IF EXISTS "Videos Owner Update" ON storage.objects;

-- Policy to allow anyone to view videos
CREATE POLICY "Videos Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

-- Policy to allow authenticated users to upload videos to their own folder
CREATE POLICY "Videos Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'videos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to delete their own videos
CREATE POLICY "Videos Owner Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'videos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to update their own videos
CREATE POLICY "Videos Owner Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'videos' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);
