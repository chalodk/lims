# 🔧 TASK: Audit & Fix Authentication Flow (Nemachile LIMS)

## 🎯 Objective
Review and fix authentication and session management in the Nemachile LIMS project.
Ensure stable login persistence, cross-tab synchronization, SSR safety, and proper error handling.

---

## 🧩 Context
The project uses:
- Supabase Auth
- React Context API
- Next.js frontend
- Centralized AuthContext (`src/contexts/AuthContext.tsx`)
- Supabase client defined in `src/lib/supabase.ts`

Current issues involve:
- Session loss after reload
- Double refresh events
- Unclear distinction between client/server Supabase usage

---

## 🪜 Step-by-step Plan

### 1. **Audit existing files**
- `src/lib/supabase.ts`
- `src/contexts/AuthContext.tsx`
- `src/middleware.ts` (if exists)
- `src/utils/supabase/middleware.ts` (create if missing)

Confirm there are no duplicate Supabase client instances or circular imports.

---

### 2. **Refactor Supabase client**
Create the following structure:
src/utils/supabase/
├── client.ts // Browser-side client
├── server.ts // Server-side client (SSR)
└── middleware.ts // Session synchronization helper


**client.ts**
ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
) 

**server.ts** 

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createServerSupabase = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (key) => cookieStore.get(key)?.value } }
  )
}

### 3. **Add middleware for SSR session**

If missing, create src/middleware.ts:

import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/utils/supabase/server'

export async function middleware(req) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

### 4. **Error handling improvements**

Catch specific errors like AuthApiError and AuthInvalidCredentialsError.
Implement user-friendly error messages in LoginScreen.tsx.

### 5. **Testing**

Add a test suite:

__tests__/auth.test.tsx
Mocks for getSession() and onAuthStateChange
Cases: fresh load, logout event, invalid credentials, token refresh

### 7. **Verify environment configuration**
Ensure .env.local contains:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
and remove any VITE_ prefixes if running on Next.js.

## ✅ Deliverables

Auth flow fully stable after reload and cross-tab refresh

No double renders on session change
Middleware active for SSR routes
Tests passing for login/logout scenarios
Clear, user-friendly error messages

## Success Criteria

The user stays authenticated across refreshes and navigation.
Session auto-refreshes before expiry.
No redundant re-renders.
No unhandled promise rejections in console.
Tests pass without race conditions.