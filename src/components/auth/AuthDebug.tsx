'use client'

import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'

export default function AuthDebug() {
  const { user, authUser, session, isLoading, isAuthenticated } = useAuth()
  const [showDebug, setShowDebug] = useState(false)

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="bg-red-500 text-white px-3 py-2 rounded text-xs"
      >
        Auth Debug
      </button>
      
      {showDebug && (
        <div className="absolute bottom-12 right-0 bg-black text-white p-4 rounded text-xs max-w-md">
          <div className="space-y-2">
            <div><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</div>
            <div><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</div>
            <div><strong>User ID:</strong> {user?.id || 'None'}</div>
            <div><strong>Auth User ID:</strong> {authUser?.id || 'None'}</div>
            <div><strong>Session:</strong> {session ? 'Active' : 'None'}</div>
            <div><strong>User Email:</strong> {user?.email || authUser?.email || 'None'}</div>
            <div><strong>User Name:</strong> {user?.name || 'None'}</div>
            <div><strong>Company ID:</strong> {user?.company_id || 'None'}</div>
          </div>
        </div>
      )}
    </div>
  )
}
