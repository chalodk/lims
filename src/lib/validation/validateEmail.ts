/**
 * Valida el formato de un email. Sin dependencias de servidor,
 * para poder usarlo desde componentes de cliente.
 */
export function validateEmail(email: string): boolean {
  if (!email || !email.trim()) {
    return false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}
