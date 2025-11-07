import { AuthError, AuthApiError, AuthInvalidCredentialsError } from '@supabase/supabase-js'

/**
 * Mapea errores de autenticación de Supabase a mensajes amigables en español
 * @param error - Error de Supabase Auth
 * @returns Mensaje de error amigable para el usuario
 */
export function getAuthErrorMessage(error: AuthError | Error | unknown): string {
  // Si no es un error, retornar mensaje genérico
  if (!error) {
    return 'Error inesperado. Intenta nuevamente.'
  }

  // Si es AuthInvalidCredentialsError, es credenciales incorrectas
  if (error instanceof AuthInvalidCredentialsError) {
    return 'Credenciales incorrectas. Verifica tu email y contraseña.'
  }

  // Si es AuthApiError, revisar el mensaje y código
  if (error instanceof AuthApiError) {
    const message = error.message?.toLowerCase() || ''
    const status = error.status

    // Errores específicos por código de estado
    switch (status) {
      case 400:
        // Bad Request - puede ser varios casos
        if (message.includes('invalid') || message.includes('incorrect')) {
          return 'Credenciales incorrectas. Verifica tu email y contraseña.'
        }
        if (message.includes('email') && message.includes('not confirmed')) {
          return 'Tu email no ha sido confirmado. Revisa tu bandeja de entrada para verificar tu cuenta.'
        }
        if (message.includes('email') && message.includes('not verified')) {
          return 'Tu email no ha sido verificado. Revisa tu bandeja de entrada para verificar tu cuenta.'
        }
        return 'Datos inválidos. Verifica la información ingresada.'
      
      case 401:
        // Unauthorized
        if (message.includes('invalid') || message.includes('incorrect') || message.includes('wrong')) {
          return 'Credenciales incorrectas. Verifica tu email y contraseña.'
        }
        return 'No autorizado. Verifica tus credenciales.'
      
      case 403:
        // Forbidden
        if (message.includes('email') && (message.includes('not confirmed') || message.includes('not verified'))) {
          return 'Tu email no ha sido confirmado. Revisa tu bandeja de entrada para verificar tu cuenta.'
        }
        if (message.includes('disabled') || message.includes('blocked')) {
          return 'Tu cuenta ha sido deshabilitada. Contacta al administrador.'
        }
        return 'Acceso denegado. Contacta al administrador si crees que esto es un error.'
      
      case 404:
        // Not Found
        if (message.includes('user') || message.includes('email')) {
          return 'No se encontró una cuenta con este email. Verifica tu dirección de correo.'
        }
        return 'Recurso no encontrado.'
      
      case 429:
        // Too Many Requests
        return 'Demasiados intentos de inicio de sesión. Por favor, espera unos minutos antes de intentar nuevamente.'
      
      case 500:
      case 502:
      case 503:
      case 504:
        // Server Errors
        return 'Error del servidor. Por favor, intenta nuevamente en unos momentos.'
      
      default:
        // Revisar mensajes específicos comunes
        if (message.includes('invalid login credentials') || 
            message.includes('invalid credentials') ||
            message.includes('incorrect password') ||
            message.includes('wrong password')) {
          return 'Credenciales incorrectas. Verifica tu email y contraseña.'
        }
        
        if (message.includes('email not confirmed') || 
            message.includes('email not verified') ||
            message.includes('signup_disabled')) {
          return 'Tu email no ha sido confirmado. Revisa tu bandeja de entrada para verificar tu cuenta.'
        }
        
        if (message.includes('user not found') || 
            message.includes('email not found')) {
          return 'No se encontró una cuenta con este email. Verifica tu dirección de correo.'
        }
        
        if (message.includes('too many requests') || 
            message.includes('rate limit')) {
          return 'Demasiados intentos de inicio de sesión. Por favor, espera unos minutos antes de intentar nuevamente.'
        }
        
        if (message.includes('network') || 
            message.includes('connection') ||
            message.includes('timeout')) {
          return 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.'
        }
        
        // Mensaje genérico para errores de API
        return 'Error del servidor. Intenta nuevamente.'
    }
  }

  // Si es un Error genérico, revisar el mensaje
  if (error instanceof Error) {
    const message = error.message?.toLowerCase() || ''
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.'
    }
    
    // Retornar el mensaje original si es descriptivo
    if (message.length > 0 && message.length < 200) {
      return error.message
    }
  }

  // Fallback genérico
  return 'Error inesperado. Intenta nuevamente.'
}

