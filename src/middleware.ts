import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database'

export async function middleware(request: NextRequest) {
  // Basic trace to debug local hangs
  // Note: console.log in middleware appears in server logs
  console.log(`[middleware] path=${request.nextUrl.pathname}`)
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get session instead of just user to handle token refresh
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession()

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup']
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname)

  // Check if we have a valid session
  const isAuthenticated = !sessionError && !!session?.user && !!session?.access_token
  console.log('[middleware] isAuthenticated=', isAuthenticated, 'isPublicRoute=', isPublicRoute)

  // If user is not signed in and trying to access protected route
  if (!isAuthenticated && !isPublicRoute) {
    // Only redirect to login, don't clear cookies (let client handle session cleanup)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is signed in and trying to access auth pages
  if (isAuthenticated && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}