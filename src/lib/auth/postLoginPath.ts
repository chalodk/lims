export function getPostLoginPath(roleName: string | undefined): string {
  if (roleName === 'consumidor') {
    return '/cliente'
  }
  return '/dashboard'
}
