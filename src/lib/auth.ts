import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server components can't set cookies; middleware refreshes the session instead.
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );
}

export class UnauthorizedError extends Error {
  constructor() {
    super('You must be signed in to do this.');
    this.name = 'UnauthorizedError';
  }
}

/** Returns the signed-in user's email, or throws. Use at the top of every server action. */
export async function requireUser(): Promise<{ id: string; email: string }> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new UnauthorizedError();
  return { id: data.user.id, email: data.user.email ?? 'staff' };
}

/** Same as requireUser but returns null instead of throwing (for API routes). */
export async function getUser(): Promise<{ id: string; email: string } | null> {
  try {
    return await requireUser();
  } catch {
    return null;
  }
}
