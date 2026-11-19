export const ADMIN_PASSWORD_MIN_LENGTH = 8

export function validateAdminPassword(
  password: string,
  confirmation: string
): { ok: true } | { ok: false; error: string } {
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      error: `La contraseña debe tener al menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres`,
    }
  }
  if (password !== confirmation) {
    return { ok: false, error: 'Las contraseñas no coinciden' }
  }
  return { ok: true }
}
