// Supabase client initialization for Allify (Option B)
// Replace the placeholders below with your project's values from Supabase settings
const SUPABASE_URL = 'https://lmdbjqslkqgxctnpxoqq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZGJqcXNsa3FneGN0bnB4b3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTQ0NDAsImV4cCI6MjA3NjAzMDQ0MH0.rHWd3O77KzPe4195eC77dKwB07QI2R9Of7aWL8TmbKo ';

// Expose a single shared client instance
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
