import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database'

export async function middleware(request: NextRequest) {
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

  // If user is not signed in and trying to access protected route
  if (!isAuthenticated && !isPublicRoute) {
    // Clear any stale cookies
    const response = NextResponse.redirect(new URL('/login', request.url))
    
    // Clear all possible auth cookies
    const cookieNames = ['sb-access-token', 'sb-refresh-token', 'sb-auth-token']
    cookieNames.forEach(name => {
      response.cookies.delete(name)
      // Also try with the project ref prefix
      response.cookies.delete(`sb-mknzstzwhbfoyxzfudfw-auth-token`)
      response.cookies.delete(`sb-mknzstzwhbfoyxzfudfw-auth-token.0`)
      response.cookies.delete(`sb-mknzstzwhbfoyxzfudfw-auth-token.1`)
    })
    
    return response
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