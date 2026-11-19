export const SET_PASSWORD_PATH = '/auth/establecer-contrasena'

const PUBLIC_PAGE_ROUTES = ['/login', '/signup', SET_PASSWORD_PATH]

export function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGE_ROUTES.includes(pathname)
}

/** Login y signup sacan al dashboard a quien ya tiene sesión. Elegir contraseña no. */
export function redirectsAuthenticatedUserToApp(pathname: string): boolean {
  return isPublicPage(pathname) && pathname !== SET_PASSWORD_PATH
}
