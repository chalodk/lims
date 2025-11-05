import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Utility function for conditional logging
const isDev = process.env.NODE_ENV === 'development'
const log = isDev ? console.log : () => {}
const logError = console.error // Always log errors

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup']
  const isPublicRoute = publicRoutes.includes(pathname)
  
  // Public API routes (auth callbacks, etc.)
  const publicApiRoutes = ['/api/auth/callback']
  const isApiRoute = pathname.startsWith('/api/')
  const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route))

  // Skip middleware for static files
  if (pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // Skip middleware for 404 pages - let Next.js handle them
  if (pathname.includes('404') || pathname.includes('_error')) {
    return NextResponse.next()
  }

  try {
    log('🔍 Middleware checking:', pathname, 'isPublicRoute:', isPublicRoute, 'isApiRoute:', isApiRoute)
    const supabase = await createClient()
    
    // Use getUser() instead of getSession() for consistency with API routes
    // getUser() validates the JWT and automatically refreshes if needed
    const { data: { user }, error } = await supabase.auth.getUser()
    
    log('📋 User validation result:', { user: !!user, error: !!error })

    // Handle authentication errors
    if (error) {
      logError('❌ Middleware auth error:', error.message)
      
      // For API routes, return 401 JSON response
      if (isApiRoute && !isPublicApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      // For page routes, redirect to login if not public
      if (!isPublicRoute && !isApiRoute) {
        log('🔄 Redirecting to login due to auth error')
        return NextResponse.redirect(new URL('/login', request.url))
      }
      
      // Allow public routes to continue
      return NextResponse.next()
    }

    // Handle unauthenticated access to protected routes
    if (!user) {
      // For protected API routes, return 401
      if (isApiRoute && !isPublicApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      // For protected page routes, redirect to login
      if (!isPublicRoute && !isApiRoute) {
        log('🔄 No user, redirecting to login')
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }

    // If user is authenticated and trying to access auth pages
    if (user && isPublicRoute) {
      log('🔄 Authenticated user accessing auth page, redirecting to dashboard')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    log('✅ Middleware allowing access')
    return NextResponse.next()
  } catch (error) {
    logError('❌ Middleware error:', error)
    
    // For API routes, return 500 error
    if (isApiRoute && !isPublicApiRoute) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    
    // For page routes, redirect to login for protected routes
    if (!isPublicRoute && !isApiRoute) {
      log('🔄 Redirecting to login due to error')
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