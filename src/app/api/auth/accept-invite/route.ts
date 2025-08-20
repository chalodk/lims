import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: 'token and password are required' },
        { status: 400 }
      )
    }

    // Find the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select(`
        *,
        clients (id, name),
        companies (id, name)
      `)
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: users } = await supabase.auth.admin.listUsers()
    const existingUser = users?.users?.find(user => user.email === invitation.email)
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      )
    }

    // For client users, check if client already has 2 users
    if (invitation.role === 'client_user' && invitation.client_id) {
      const { data: existingClientUsers } = await supabase
        .from('users')
        .select('id')
        .eq('client_id', invitation.client_id)

      if (existingClientUsers && existingClientUsers.length >= 2) {
        return NextResponse.json(
          { error: 'Client already has maximum number of users (2)' },
          { status: 409 }
        )
      }
    }

    // Create the user account
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: {
        role: invitation.role,
        client_id: invitation.client_id,
        company_id: invitation.company_id
      }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    if (!authUser.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        name: invitation.email.split('@')[0], // Default name from email
        email: invitation.email,
        client_id: invitation.client_id,
        company_id: invitation.company_id
      })

    if (profileError) {
      // If profile creation fails, we should clean up the auth user
      console.error('Profile creation failed:', profileError)
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Mark invitation as accepted
    const { error: acceptError } = await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    if (acceptError) {
      console.error('Error marking invitation as accepted:', acceptError)
    }

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        channel: 'email',
        to_ref: { 
          email: invitation.invited_by_email || invitation.email,
          user_id: invitation.invited_by 
        },
        template_code: 'invitation_accepted',
        payload: {
          invitee_email: invitation.email,
          role: invitation.role,
          accepted_at: new Date().toISOString()
        },
        status: 'queued'
      })

    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        role: invitation.role,
        client: invitation.clients,
        company: invitation.companies
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}