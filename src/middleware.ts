import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup']
  const isPublicRoute = publicRoutes.includes(pathname)
  
  // API routes should handle their own auth
  const isApiRoute = pathname.startsWith('/api/')
  
  // Skip middleware for API routes
  if (isApiRoute) {
    return NextResponse.next()
  }

  // Skip middleware for static files
  if (pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next()
  }

  try {
    console.log('🔍 Middleware checking:', pathname, 'isPublicRoute:', isPublicRoute)
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    console.log('📋 Session result:', { session: !!session, error: !!error })

    // If there's an error getting the session, redirect to login for protected routes
    if (error) {
      console.error('❌ Middleware session error:', error)
      if (!isPublicRoute) {
        console.log('🔄 Redirecting to login due to session error')
        return NextResponse.redirect(new URL('/login', request.url))
      }
      return NextResponse.next()
    }

    // If user is not authenticated and trying to access protected route
    if (!session && !isPublicRoute) {
      console.log('🔄 No session, redirecting to login')
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // If user is authenticated and trying to access auth pages
    if (session && isPublicRoute) {
      console.log('🔄 Authenticated user accessing auth page, redirecting to dashboard')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    console.log('✅ Middleware allowing access')
    return NextResponse.next()
  } catch (error) {
    console.error('❌ Middleware error:', error)
    // On error, redirect to login for protected routes
    if (!isPublicRoute) {
      console.log('🔄 Redirecting to login due to error')
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }
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