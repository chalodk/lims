import { NextResponse, type NextRequest } from 'next/server'

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

  const supabaseResponse = NextResponse.next({
    request,
  })

  // Check for Supabase auth cookies
  const cookies = request.cookies.getAll()
  const hasAuthCookie = cookies.some(cookie => 
    cookie.name.includes('auth-token') || 
    (cookie.name.startsWith('sb-') && (cookie.name.includes('auth-token') || cookie.name.includes('access-token')))
  )

  // If user doesn't have auth cookie and trying to access protected route
  if (!hasAuthCookie && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user has auth cookie and trying to access auth pages
  if (hasAuthCookie && isPublicRoute) {
    // Skip session verification for better performance
    // The AuthContext will handle session validation
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