/**
 * PATCH /api/admin/users/[userId]
 *
 * Håndterer: deaktivering, genaktivering og rolleændring.
 * Body: { action: 'deactivate' | 'reactivate' | 'change_role', new_role?: Role }
 *
 * Kræver admin-rolle. Bruger service-role server-side.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  deactivateUser,
  reactivateUser,
  changeUserRole,
} from '@/lib/utils/adminActions'
import { changeRoleSchema, deactivateUserSchema } from '@/lib/schemas/user'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  // 1. Verificer admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role, is_active, organization_id, email')
    .eq('id', user.id)
    .single()

  if (!callerProfile?.is_active || callerProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Ikke tilladt' }, { status: 403 })
  }

  // 2. Forhindre selv-deaktivering
  if (userId === user.id) {
    return NextResponse.json(
      { error: 'Du kan ikke deaktivere din egen konto' },
      { status: 400 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const { action, new_role } = body

  const orgId         = callerProfile.organization_id
  const callerId      = user.id
  const callerEmail   = callerProfile.email

  // 3. Udfør handling
  switch (action) {
    case 'deactivate': {
      const parsed = deactivateUserSchema.safeParse({ user_id: userId })
      if (!parsed.success) {
        return NextResponse.json({ error: 'Ugyldigt bruger-id' }, { status: 400 })
      }
      const result = await deactivateUser({
        user_id:              parsed.data.user_id,
        organization_id:      orgId,
        deactivated_by_id:    callerId,
        deactivated_by_email: callerEmail,
      })
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ message: 'Bruger deaktiveret' })
    }

    case 'reactivate': {
      const result = await reactivateUser({
        user_id:               userId,
        organization_id:       orgId,
        reactivated_by_id:     callerId,
        reactivated_by_email:  callerEmail,
      })
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ message: 'Bruger genaktiveret' })
    }

    case 'change_role': {
      const parsed = changeRoleSchema.safeParse({ user_id: userId, new_role })
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Ugyldig rolle', details: parsed.error.issues },
          { status: 400 }
        )
      }
      const result = await changeUserRole({
        user_id:          parsed.data.user_id,
        new_role:         parsed.data.new_role,
        organization_id:  orgId,
        changed_by_id:    callerId,
        changed_by_email: callerEmail,
      })
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ message: 'Rolle opdateret' })
    }

    default:
      return NextResponse.json(
        { error: 'Ukendt handling. Brug: deactivate, reactivate eller change_role' },
        { status: 400 }
      )
  }
}
