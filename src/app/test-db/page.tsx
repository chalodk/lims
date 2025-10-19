'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/singleton'

export default function TestDbPage() {
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function testDatabase() {
      const supabase = getSupabaseClient()
      const logs: string[] = []

      try {
        logs.push('Testing database connection...')
        
        // Test 1: Check if we can connect at all
        logs.push('Test 1: Basic connection test')
        const { error: healthError } = await supabase.from('clients').select('count', { count: 'exact', head: true })
        if (healthError) {
          logs.push(`❌ Connection test failed: ${healthError.message}`)
        } else {
          logs.push('✅ Basic connection works')
        }

        // Test 2: Check companies table
        logs.push('Test 2: Companies table')
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('*')
          .limit(5)
        
        if (companiesError) {
          logs.push(`❌ Companies error: ${companiesError.message}`)
        } else {
          logs.push(`✅ Companies table accessible, found ${companies?.length || 0} companies`)
          if (companies?.length) {
            logs.push(`  First company: ${companies[0].name} (${companies[0].id})`)
          }
        }

        // Test 3: Check roles table
        logs.push('Test 3: Roles table')
        const { data: roles, error: rolesError } = await supabase
          .from('roles')
          .select('*')
          .limit(5)
        
        if (rolesError) {
          logs.push(`❌ Roles error: ${rolesError.message}`)
        } else {
          logs.push(`✅ Roles table accessible, found ${roles?.length || 0} roles`)
          if (roles?.length) {
            roles.forEach(role => {
              logs.push(`  Role: ${role.name} (id: ${role.id})`)
            })
          }
        }

        // Test 4: Check users table
        logs.push('Test 4: Users table')
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .limit(5)
        
        if (usersError) {
          logs.push(`❌ Users error: ${usersError.message}`)
        } else {
          logs.push(`✅ Users table accessible, found ${users?.length || 0} users`)
          if (users?.length) {
            users.forEach(user => {
              logs.push(`  User: ${user.name || user.email} (${user.id})`)
            })
          }
        }

        // Test 5: Check clients table
        logs.push('Test 5: Clients table')
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('*')
          .limit(5)
        
        if (clientsError) {
          logs.push(`❌ Clients error: ${clientsError.message}`)
        } else {
          logs.push(`✅ Clients table accessible, found ${clients?.length || 0} clients`)
          if (clients?.length) {
            clients.forEach(client => {
              logs.push(`  Client: ${client.name}`)
            })
          }
        }

      } catch (error) {
        logs.push(`❌ Unexpected error: ${error}`)
      }

      setResults(logs)
      setLoading(false)
    }

    testDatabase()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
        <p>Testing database connectivity...</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test Results</h1>
      <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
        {results.map((result, index) => (
          <div key={index} className="mb-1">
            {result}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <a href="/clients" className="text-blue-600 hover:text-blue-800">
          ← Back to Clients
        </a>
      </div>
    </div>
  )
}