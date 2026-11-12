import { createBrowserClient } from '@supabase/ssr';

// Browser Supabase client. Stores the auth session in cookies (not localStorage)
// so the server — middleware, server components and server actions — can verify
// who is logged in before touching the database.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
