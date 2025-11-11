'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'

export default function AuthDebug() {
  const { user, authUser, role, userRole, isLoading, isAuthenticated, session, signOut, refreshSession } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full shadow-lg flex items-center"
      >
        Auth Debug {isOpen ? '▲' : '▼'}
      </button>

      {isOpen && (
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-xl mt-2 w-80 max-h-96 overflow-y-auto text-xs">
          <h3 className="font-bold text-sm mb-2">Auth State</h3>
          <pre className="whitespace-pre-wrap break-all">
            {JSON.stringify({
              isLoading,
              isAuthenticated,
              userRole,
              authUser: authUser ? { id: authUser.id, email: authUser.email, role: authUser.role } : null,
              user: user ? { id: user.id, email: user.email, name: user.name, company_id: user.company_id, role_id: user.role_id } : null,
              role: role,
              session: session ? { expires_at: session.expires_at, expires_in: session.expires_in, token_type: session.token_type, user_id: session.user.id } : null,
            }, null, 2)}
          </pre>
          <div className="mt-4 space-y-2">
            <button
              onClick={signOut}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded text-xs"
            >
              Sign Out
            </button>
            <button
              onClick={() => refreshSession()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded text-xs"
            >
              Refresh Session
            </button>
          </div>
        </div>
      )}
    </div>
  )
}