/**
 * Next.js Middleware — auth-guard og session-refresh.
 *
 * Kører på ALLE requests. Gør to ting:
 * 1. Refresher Supabase-session (holder cookies opdateret)
 * 2. Redirecter uautoriserede brugere til /login
 *
 * Bemærk: Middleware kan ikke hente profil fra DB (for tungt).
 * Rollebaseret adgang håndhæves i de enkelte Route Handlers og
 * Server Components via get_user_role() + RLS.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Stier der er tilgængelige uden login
const PUBLIC_PATHS = ['/login', '/auth/callback', '/auth/confirm']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session (opdaterer cookies hvis token er udløbet)
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublicPath = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  // Ikke logget ind → redirect til login
  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Logget ind og forsøger at tilgå login → redirect til hjem
  if (user && pathname === '/login') {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/'
    return NextResponse.redirect(homeUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match alle paths undtagen:
     * - _next/static (statiske filer)
     * - _next/image (billede-optimering)
     * - favicon.ico
     * - API-routes (håndteres separat)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
