// Browser debugging utilities for LIMS

export function detectBrowserIssues() {
  if (typeof window === 'undefined') return

  const issues = []
  const userAgent = navigator.userAgent.toLowerCase()

  // Check for common problematic browser versions
  if (userAgent.includes('chrome/') && !userAgent.includes('edg/')) {
    const chromeMatch = userAgent.match(/chrome\/(\d+)\./)
    if (chromeMatch) {
      const version = parseInt(chromeMatch[1])
      if (version < 100) {
        issues.push(`Chrome version ${version} is outdated. Please update to latest version.`)
      }
    }
  }

  // Check for extensions that might block requests
  if (userAgent.includes('chrome') || userAgent.includes('firefox')) {
    // These can't be directly detected, but we can warn about common ones
    console.info('[LIMS] If experiencing loading issues, try disabling ad blockers or privacy extensions temporarily')
  }

  // Check for localStorage availability
  try {
    localStorage.setItem('test', 'test')
    localStorage.removeItem('test')
  } catch {
    issues.push('Local storage is disabled. This may cause authentication issues.')
  }

  // Check for third-party cookie blocking
  if (document.cookie === '' && window.location.hostname === 'localhost') {
    console.warn('[LIMS] Third-party cookies may be blocked. This can affect Supabase authentication.')
  }

  // Log browser info for debugging
  console.info('[LIMS] Browser info:', {
    userAgent: navigator.userAgent,
    cookiesEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    language: navigator.language,
    platform: navigator.platform
  })

  if (issues.length > 0) {
    console.warn('[LIMS] Potential browser issues detected:', issues)
    return issues
  }

  return []
}

export function addLoadingTimeout<T>(promise: Promise<T>, timeoutMs: number = 10000, description: string = 'Operation'): Promise<T> {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => {
        console.error(`[LIMS] ${description} timed out after ${timeoutMs}ms. This may indicate a browser extension or network issue.`)
        console.info('[LIMS] Try the following:')
        console.info('1. Disable browser extensions temporarily')
        console.info('2. Clear browser cache and cookies')
        console.info('3. Try an incognito/private browsing window')
        console.info('4. Try a different browser (Safari, Firefox, etc.)')
        reject(new Error(`${description} timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    )
  ])
}