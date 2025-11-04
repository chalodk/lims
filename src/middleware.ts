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

  // Skip middleware for 404 pages - let Next.js handle them
  // This prevents session loss when navigating to non-existent routes
  if (pathname.includes('404') || pathname.includes('_error')) {
    return NextResponse.next()
  }

  try {
    console.log('🔍 Middleware checking:', pathname, 'isPublicRoute:', isPublicRoute)
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    console.log('📋 Session result:', { session: !!session, error: !!error })

    // If there's an error getting the session, be more lenient
    // Only redirect to login if it's a critical error, not a temporary one
    if (error) {
      console.error('❌ Middleware session error:', error)
      // Only redirect for critical auth errors, not temporary network issues
      if (error.message?.includes('Invalid JWT') || error.message?.includes('expired')) {
        if (!isPublicRoute) {
          console.log('🔄 Redirecting to login due to critical session error')
          return NextResponse.redirect(new URL('/login', request.url))
        }
      }
      // For other errors, allow the request to continue
      return NextResponse.next()
    }

    // If user is not authenticated and trying to access protected route
    if (!session && !isPublicRoute) {
      console.log('🔄 No session, redirecting to login')
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Si el usuario está autenticado y es consumidor intentando acceder a /dashboard, redirigir a /reports
    if (session && pathname === '/dashboard') {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('role_id, roles(name)')
          .eq('id', session.user.id)
          .single()
        
        if (userData) {
          // Definir tipo para roleData para evitar errores de TypeScript
          type RoleData = { id: number; name: string } | { id: number; name: string }[]
          const roleData = userData.roles as RoleData
          const roleName = Array.isArray(roleData) 
            ? roleData[0]?.name 
            : (roleData as { id: number; name: string })?.name
          
          if (roleName === 'consumidor') {
            console.log('🔄 Consumer user trying to access dashboard, redirecting to /reports')
            return NextResponse.redirect(new URL('/reports', request.url))
          }
        }
      } catch (error) {
        console.error('❌ Error checking role for dashboard access:', error)
        // Continuar con el flujo normal si hay error
      }
    }

    // If user is authenticated and trying to access auth pages
    if (session && isPublicRoute) {
      console.log('🔄 Authenticated user accessing auth page, checking role for redirect')
      
      // Obtener el rol del usuario para redirigir correctamente
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('role_id, roles(name)')
          .eq('id', session.user.id)
          .single()
        
        if (userData) {
          // Definir tipo para roleData para evitar errores de TypeScript
          type RoleData = { id: number; name: string } | { id: number; name: string }[]
          const roleData = userData.roles as RoleData
          const roleName = Array.isArray(roleData) 
            ? roleData[0]?.name 
            : (roleData as { id: number; name: string })?.name
          
          // Redirigir según el rol: consumidor va a /reports, otros a /dashboard
          const redirectPath = roleName === 'consumidor' ? '/reports' : '/dashboard'
          console.log(`🔄 Redirecting to ${redirectPath} based on role: ${roleName}`)
          return NextResponse.redirect(new URL(redirectPath, request.url))
        }
      } catch (error) {
        console.error('❌ Error getting user role in middleware:', error)
        // Fallback a dashboard si hay error
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
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