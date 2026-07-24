/**
 * Admin-handlinger: invitation, deaktivering, genaktivering, rolleændring.
 *
 * Alle funktioner her:
 * - Kører KUN server-side
 * - Bruger service-role via createAdminClient()
 * - Skriver til audit-log
 * - Tilbagekalder tokens ved deaktivering
 *
 * Eksponeres til browser via Route Handlers i /app/api/admin/users/
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { writeAuditLog } from './auditLog'
import type { Role } from '@/lib/supabase/types'

// ─── Typer ───────────────────────────────────────────────
interface ActionResult {
  success: boolean
  error?: string
}

// ─── Inviter bruger ──────────────────────────────────────
/**
 * Opretter en ny auth.user via Supabase Admin API og
 * sender en invitationsmail. Opretter dernæst en profil.
 */
export async function inviteUser(params: {
  email: string
  full_name: string
  role: Role
  organization_id: string
  invited_by_id: string
  invited_by_email: string
}): Promise<ActionResult & { user_id?: string }> {
  const admin = createAdminClient()

  // 1. Opret auth-bruger og send invitation
  const { data: authData, error: authError } =
    await admin.auth.admin.inviteUserByEmail(params.email, {
      data: {
        full_name: params.full_name,
        organization_id: params.organization_id,
        role: params.role,
      },
    })

  if (authError || !authData.user) {
    return {
      success: false,
      error: authError?.message ?? 'Invitation mislykkedes',
    }
  }

  const userId = authData.user.id

  // 2. Opret profil
  const { error: profileError } = await admin.from('profiles').insert({
    id:              userId,
    organization_id: params.organization_id,
    full_name:       params.full_name,
    email:           params.email,
    role:            params.role,
    is_active:       true,
    created_by:      params.invited_by_id,
  })

  if (profileError) {
    // Ryd op — slet auth-bruger hvis profil-oprettelse fejler
    await admin.auth.admin.deleteUser(userId)
    return {
      success: false,
      error: 'Bruger oprettet i Auth, men profil-oprettelse fejlede: ' +
             profileError.message,
    }
  }

  // 3. Skriv audit-log
  await writeAuditLog({
    organization_id: params.organization_id,
    user_id:         params.invited_by_id,
    user_email:      params.invited_by_email,
    action:          'user.invited',
    entity_type:     'user',
    entity_id:       userId,
    new_value: {
      email:    params.email,
      full_name: params.full_name,
      role:     params.role,
    },
  })

  return { success: true, user_id: userId }
}

// ─── Deaktiver bruger ────────────────────────────────────
/**
 * Deaktiverer en bruger:
 * 1. Sætter profiles.is_active = false (blokerer RLS)
 * 2. Tilbagekalder ALLE aktive tokens (logger brugeren ud øjeblikkeligt)
 * 3. Sletter IKKE data
 */
export async function deactivateUser(params: {
  user_id: string
  organization_id: string
  deactivated_by_id: string
  deactivated_by_email: string
}): Promise<ActionResult> {
  const admin = createAdminClient()

  // 1. Hent nuværende profil (til audit-log)
  const { data: profile, error: fetchError } = await admin
    .from('profiles')
    .select('full_name, email, role, is_active')
    .eq('id', params.user_id)
    .eq('organization_id', params.organization_id)
    .single()

  if (fetchError || !profile) {
    return { success: false, error: 'Bruger ikke fundet i organisationen' }
  }

  if (!profile.is_active) {
    return { success: false, error: 'Brugeren er allerede deaktiveret' }
  }

  // 2. Sæt profil inaktiv
  const { error: updateError } = await admin
    .from('profiles')
    .update({
      is_active:       false,
      deactivated_at:  new Date().toISOString(),
      deactivated_by:  params.deactivated_by_id,
    })
    .eq('id', params.user_id)
    .eq('organization_id', params.organization_id)

  if (updateError) {
    return {
      success: false,
      error: 'Opdatering af profil fejlede: ' + updateError.message,
    }
  }

  // 3. Tilbagekald alle tokens — logger brugeren ud øjeblikkeligt
  //    sign_out scope='global' ugyldiggør refresh-tokens på alle enheder
  const { error: signOutError } =
    await admin.auth.admin.signOut(params.user_id, 'global')

  if (signOutError) {
    // Log fejlen men behold deaktivering — RLS blokerer allerede adgang
    console.error('[deactivateUser] Token-tilbagekaldelse fejlede:', signOutError.message)
  }

  // 4. Skriv audit-log
  await writeAuditLog({
    organization_id: params.organization_id,
    user_id:         params.deactivated_by_id,
    user_email:      params.deactivated_by_email,
    action:          'user.deactivated',
    entity_type:     'user',
    entity_id:       params.user_id,
    old_value:  { is_active: true },
    new_value:  { is_active: false },
    metadata:   { target_email: profile.email, target_role: profile.role },
  })

  return { success: true }
}

// ─── Genaktiver bruger ───────────────────────────────────
export async function reactivateUser(params: {
  user_id: string
  organization_id: string
  reactivated_by_id: string
  reactivated_by_email: string
}): Promise<ActionResult> {
  const admin = createAdminClient()

  const { data: profile, error: fetchError } = await admin
    .from('profiles')
    .select('email, role, is_active')
    .eq('id', params.user_id)
    .eq('organization_id', params.organization_id)
    .single()

  if (fetchError || !profile) {
    return { success: false, error: 'Bruger ikke fundet' }
  }

  if (profile.is_active) {
    return { success: false, error: 'Brugeren er allerede aktiv' }
  }

  const { error: updateError } = await admin
    .from('profiles')
    .update({
      is_active:      true,
      deactivated_at: null,
      deactivated_by: null,
    })
    .eq('id', params.user_id)
    .eq('organization_id', params.organization_id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  await writeAuditLog({
    organization_id: params.organization_id,
    user_id:         params.reactivated_by_id,
    user_email:      params.reactivated_by_email,
    action:          'user.reactivated',
    entity_type:     'user',
    entity_id:       params.user_id,
    old_value:  { is_active: false },
    new_value:  { is_active: true },
    metadata:   { target_email: profile.email },
  })

  return { success: true }
}

// ─── Skift rolle ─────────────────────────────────────────
export async function changeUserRole(params: {
  user_id: string
  new_role: Role
  organization_id: string
  changed_by_id: string
  changed_by_email: string
}): Promise<ActionResult> {
  const admin = createAdminClient()

  const { data: profile, error: fetchError } = await admin
    .from('profiles')
    .select('email, role, is_active')
    .eq('id', params.user_id)
    .eq('organization_id', params.organization_id)
    .single()

  if (fetchError || !profile) {
    return { success: false, error: 'Bruger ikke fundet' }
  }

  if (!profile.is_active) {
    return { success: false, error: 'Kan ikke ændre rolle på en deaktiveret bruger' }
  }

  const old_role = profile.role

  const { error: updateError } = await admin
    .from('profiles')
    .update({ role: params.new_role })
    .eq('id', params.user_id)
    .eq('organization_id', params.organization_id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  await writeAuditLog({
    organization_id: params.organization_id,
    user_id:         params.changed_by_id,
    user_email:      params.changed_by_email,
    action:          'user.role_changed',
    entity_type:     'user',
    entity_id:       params.user_id,
    old_value:  { role: old_role },
    new_value:  { role: params.new_role },
    metadata:   { target_email: profile.email },
  })

  return { success: true }
}
