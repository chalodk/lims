/**
 * Script de prueba para verificar la creación de usuarios
 * 
 * Este script verifica que el método de creación de usuarios
 * funcione correctamente y envíe correos de autenticación.
 * 
 * NOTA: Este script requiere que Supabase esté configurado
 * con las variables de entorno correctas.
 * 
 * Para ejecutar:
 * npx tsx src/scripts/test-user-creation.ts
 */

import { getSupabaseClient } from '@/lib/supabase/singleton'

async function testUserCreation() {
  console.log('🧪 Iniciando test de creación de usuario...\n')

  // Verificar variables de entorno
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ Error: Variables de entorno no configuradas')
    console.error('   Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY configuradas')
    process.exit(1)
  }

  const supabase = getSupabaseClient()
  const testEmail = `test-${Date.now()}@example.com`
  const testPassword = 'test123456'

  console.log(`📧 Email de prueba: ${testEmail}`)
  console.log(`🔑 Contraseña de prueba: ${testPassword}\n`)

  try {
    console.log('1️⃣ Intentando crear usuario con signUp...')
    
    // Usar exactamente el mismo método que el login y el modal
    // En el navegador se usa window.location.origin, aquí simulamos con la URL base
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: `${origin}/auth/callback`
      }
    })

    if (error) {
      console.error('❌ Error al crear usuario:', error.message)
      console.error('   Código:', error.status)
      console.error('   Detalles:', error)
      
      if (error.message.includes('email')) {
        console.error('\n💡 Sugerencia: Verifica que el email no esté ya registrado')
      }
      if (error.message.includes('password')) {
        console.error('\n💡 Sugerencia: Verifica que la contraseña cumpla con los requisitos')
      }
      if (error.message.includes('email rate limit')) {
        console.error('\n💡 Sugerencia: Has excedido el límite de envío de correos. Espera unos minutos.')
      }
      
      process.exit(1)
    }

    if (data.user) {
      console.log('✅ Usuario creado exitosamente!')
      console.log(`   ID: ${data.user.id}`)
      console.log(`   Email: ${data.user.email}`)
      console.log(`   Email confirmado: ${data.user.email_confirmed_at ? 'Sí' : 'No'}`)
      
      if (data.session) {
        console.log('   Sesión creada: Sí')
      } else {
        console.log('   Sesión creada: No (requiere confirmación de email)')
      }

      // Verificar si se envió el correo
      if (!data.user.email_confirmed_at) {
        console.log('\n📬 Estado del correo de autenticación:')
        console.log('   ⚠️  El usuario requiere confirmación de email')
        console.log('   📧 Debería haberse enviado un correo a:', testEmail)
        console.log('   🔗 El usuario debe hacer clic en el link del correo para autenticarse')
        console.log('\n💡 Verifica en Supabase Dashboard > Authentication > Users')
        console.log('   para ver el estado del usuario y el correo enviado.')
      } else {
        console.log('\n✅ Email ya confirmado (puede ser un usuario de prueba)')
      }

      console.log('\n✅ Test completado exitosamente!')
      console.log('\n📝 Próximos pasos:')
      console.log('   1. Revisa el correo electrónico:', testEmail)
      console.log('   2. Haz clic en el link de confirmación')
      console.log('   3. Verifica que puedas iniciar sesión con las credenciales')
      
    } else {
      console.error('❌ Error: No se recibió información del usuario')
      process.exit(1)
    }

  } catch (err) {
    console.error('❌ Error inesperado:', err)
    process.exit(1)
  }
}

// Ejecutar el test
testUserCreation()
  .then(() => {
    console.log('\n✨ Script finalizado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error)
    process.exit(1)
  })

