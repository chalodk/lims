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
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    // If user is not authenticated and trying to access protected route
    if (!session && !isPublicRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // If user is authenticated and trying to access auth pages
    if (session && isPublicRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    // On error, redirect to login for protected routes
    if (!isPublicRoute) {
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