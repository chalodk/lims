import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, role, client_id } = body

    if (!email || !role) {
      return NextResponse.json(
        { error: 'email and role are required' },
        { status: 400 }
      )
    }

    if (!['client_user', 'collaborator'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be client_user or collaborator' },
        { status: 400 }
      )
    }

    // Generate unique invitation token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .insert({
        email,
        role,
        client_id: client_id || null,
        company_id: user.user_metadata?.company_id || null,
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 })
    }

    // TODO: Send invitation email
    // This would typically integrate with your email service
    // Example:
    // await sendInvitationEmail(email, token, role)

    // Create notification record
    await supabase
      .from('notifications')
      .insert({
        channel: 'email',
        to_ref: { email, invitation_id: invitation.id },
        template_code: 'invitation',
        payload: {
          inviter_name: user.user_metadata?.full_name || user.email,
          role,
          invitation_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${token}`
        },
        status: 'queued'
      })

    return NextResponse.json({
      ...invitation,
      invitation_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${token}`
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('invitations')
      .select(`
        *,
        clients (name),
        companies (name)
      `)
      .eq('company_id', user.user_metadata?.company_id)

    if (status === 'pending') {
      query = query.is('accepted_at', null).gt('expires_at', new Date().toISOString())
    } else if (status === 'accepted') {
      query = query.not('accepted_at', 'is', null)
    } else if (status === 'expired') {
      query = query.is('accepted_at', null).lt('expires_at', new Date().toISOString())
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}