import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance;

try {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase URL or Anon Key');
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
    console.error('Supabase initialization failed:', error.message);
    // Fallback dummy client to prevent app crash
    supabaseInstance = {
        auth: {
            getUser: () => Promise.resolve({ data: { user: null }, error: null }),
            signInWithPassword: () => Promise.resolve({ error: { message: 'Supabase not configured correctly. Check console.' } }),
            signUp: () => Promise.resolve({ error: { message: 'Supabase not configured correctly. Check console.' } }),
            signInWithOtp: () => Promise.resolve({ error: { message: 'Supabase not configured correctly. Check console.' } }),
            signInWithOAuth: () => Promise.resolve({ error: { message: 'Supabase not configured correctly. Check console.' } }),
        },
        from: () => ({
            upsert: () => Promise.resolve({ error: { message: 'Supabase not configured correctly. Check console.' } }),
            select: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured correctly. Check console.' } }),
        })
    };
}

export const supabase = supabaseInstance;
