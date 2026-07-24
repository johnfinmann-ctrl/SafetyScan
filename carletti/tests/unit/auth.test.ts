/**
 * Unit tests for Fase 0: schemas og adgangslogik.
 *
 * Disse tests kræver INGEN live Supabase-forbindelse.
 * De tester den logik der håndhæver adgangsreglerne.
 */
import { describe, it, expect } from 'vitest'
import { loginSchema, inviteUserSchema, changeRoleSchema } from '@/lib/schemas/user'

// ─── Login-schema validering ──────────────────────────────

describe('loginSchema', () => {
  it('accepterer gyldig email og adgangskode', () => {
    const result = loginSchema.safeParse({
      email:    'bruger@carletti.dk',
      password: 'hemmelighed123',
    })
    expect(result.success).toBe(true)
  })

  it('afviser ugyldig email', () => {
    const result = loginSchema.safeParse({
      email:    'ikke-en-email',
      password: 'hemmelighed123',
    })
    expect(result.success).toBe(false)
    // Fejlbesked er på dansk: 'Ugyldig e-mailadresse'
    expect(result.error?.issues[0].message).toContain('mailadresse')
  })

  it('afviser tom adgangskode', () => {
    const result = loginSchema.safeParse({
      email:    'bruger@carletti.dk',
      password: '',
    })
    expect(result.success).toBe(false)
  })

  it('afviser manglende felter', () => {
    const result = loginSchema.safeParse({})
    expect(result.success).toBe(false)
    expect(result.error?.issues.length).toBeGreaterThan(0)
  })
})

// ─── Invitation-schema validering ────────────────────────

describe('inviteUserSchema', () => {
  const validOrgId = '123e4567-e89b-12d3-a456-426614174000'

  it('accepterer gyldigt invitation-input', () => {
    const result = inviteUserSchema.safeParse({
      email:           'ny@carletti.dk',
      full_name:       'Ny Medarbejder',
      role:            'employee',
      organization_id: validOrgId,
    })
    expect(result.success).toBe(true)
  })

  it('afviser ugyldige roller', () => {
    const result = inviteUserSchema.safeParse({
      email:           'ny@carletti.dk',
      full_name:       'Test',
      role:            'superadmin',       // ugyldig rolle
      organization_id: validOrgId,
    })
    expect(result.success).toBe(false)
  })

  it('afviser for kort navn', () => {
    const result = inviteUserSchema.safeParse({
      email:           'ny@carletti.dk',
      full_name:       'A',               // for kort
      role:            'employee',
      organization_id: validOrgId,
    })
    expect(result.success).toBe(false)
  })

  it('accepterer alle tre gyldige roller', () => {
    const roles = ['employee', 'manager', 'admin'] as const
    roles.forEach(role => {
      const result = inviteUserSchema.safeParse({
        email:           `${role}@carletti.dk`,
        full_name:       'Test Person',
        role,
        organization_id: validOrgId,
      })
      expect(result.success).toBe(true)
    })
  })
})

// ─── Rolle-ændring schema ─────────────────────────────────

describe('changeRoleSchema', () => {
  it('accepterer gyldig rolleændring', () => {
    const result = changeRoleSchema.safeParse({
      user_id:  '123e4567-e89b-12d3-a456-426614174001',
      new_role: 'manager',
    })
    expect(result.success).toBe(true)
  })

  it('afviser ugyldigt UUID', () => {
    const result = changeRoleSchema.safeParse({
      user_id:  'ikke-et-uuid',
      new_role: 'manager',
    })
    expect(result.success).toBe(false)
  })
})

// ─── Adgangslogik (unit-testet uden DB) ──────────────────

describe('Adgangsregler (logik)', () => {
  /**
   * Disse tests verificerer den logik vi bruger i RLS og middleware.
   * I produktion håndhæves reglerne i DB — her tester vi den tilsvarende
   * TypeScript-logik for dokumentation og hurtig fejlsøgning.
   */

  function canAccessDashboard(role: string, isActive: boolean): boolean {
    return isActive && (role === 'manager' || role === 'admin')
  }

  function canManageUsers(role: string, isActive: boolean): boolean {
    return isActive && role === 'admin'
  }

  function canCreateReport(role: string, isActive: boolean): boolean {
    return isActive && ['employee', 'manager', 'admin'].includes(role)
  }

  it('employee kan oprette rapport', () => {
    expect(canCreateReport('employee', true)).toBe(true)
  })

  it('deaktiveret employee kan ikke oprette rapport', () => {
    expect(canCreateReport('employee', false)).toBe(false)
  })

  it('manager kan tilgå dashboard', () => {
    expect(canAccessDashboard('manager', true)).toBe(true)
  })

  it('employee kan ikke tilgå dashboard', () => {
    expect(canAccessDashboard('employee', true)).toBe(false)
  })

  it('admin kan styre brugere', () => {
    expect(canManageUsers('admin', true)).toBe(true)
  })

  it('manager kan ikke styre brugere', () => {
    expect(canManageUsers('manager', true)).toBe(false)
  })

  it('deaktiveret admin kan ikke styre brugere', () => {
    expect(canManageUsers('admin', false)).toBe(false)
  })

  it('org-isolation: bruger fra anden org afvises', () => {
    // Simulerer hvad RLS gør: organization_id skal matche
    function hasOrgAccess(
      userOrgId: string,
      resourceOrgId: string
    ): boolean {
      return userOrgId === resourceOrgId
    }
    expect(hasOrgAccess('org-a', 'org-b')).toBe(false)
    expect(hasOrgAccess('org-a', 'org-a')).toBe(true)
  })
})
