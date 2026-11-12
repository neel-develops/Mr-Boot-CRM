import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Routes anyone may open without signing in.
const PUBLIC_PREFIXES = ['/login', '/track/'];
// Cron route checks its own CRON_SECRET bearer token.
const SELF_AUTHED_PREFIXES = ['/api/cron/'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (SELF_AUTHED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Android home-screen widgets can't share the WebView login, so they send a shared key.
  if (pathname.startsWith('/api/widget')) {
    const expected = process.env.WIDGET_API_KEY;
    const provided = request.headers.get('x-widget-key');
    if (expected && provided === expected) return NextResponse.next();
    // Fall through: a signed-in browser session may also read widget data.
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Refreshes the session cookie if needed and verifies it with Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));

  if (!user && !isPublic) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
    return NextResponse.redirect(url);
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals and static files.
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)$).*)',
  ],
};
