import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Si hay un next param, usarlo; si no, determinar según el rol
      if (nextParam) {
        return NextResponse.redirect(`${origin}${nextParam}`)
      }

      // Obtener el rol del usuario para redirigir correctamente
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role_id, roles(name)')
          .eq('id', user.id)
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
          return NextResponse.redirect(`${origin}${redirectPath}`)
        }
      }
      
      // Fallback a dashboard si no se puede obtener el rol
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
