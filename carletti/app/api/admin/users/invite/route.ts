/**
 * POST /api/admin/users/invite
 *
 * Inviterer en ny bruger via Supabase Admin API.
 * Kræver admin-rolle. Service-role bruges kun her server-side.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inviteUser } from '@/lib/utils/adminActions'
import { inviteUserSchema } from '@/lib/schemas/user'

export async function POST(request: NextRequest) {
  // 1. Verificer at den kaldende bruger er logget ind og er admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active, organization_id, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active) {
    return NextResponse.json({ error: 'Bruger er ikke aktiv' }, { status: 403 })
  }

  if (profile.role !== 'admin') {
    return NextResponse.json(
      { error: 'Kun administratorer kan invitere brugere' },
      { status: 403 }
    )
  }

  // 2. Valider input
  const body = await request.json().catch(() => null)
  const parsed = inviteUserSchema.safeParse({
    ...body,
    organization_id: profile.organization_id,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ugyldig input', details: parsed.error.issues },
      { status: 400 }
    )
  }

  // 3. Udfør invitation (service-role bruges her — aldrig i browser)
  const result = await inviteUser({
    ...parsed.data,
    invited_by_id:    user.id,
    invited_by_email: profile.email,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json(
    { message: 'Invitation sendt', user_id: result.user_id },
    { status: 201 }
  )
}
