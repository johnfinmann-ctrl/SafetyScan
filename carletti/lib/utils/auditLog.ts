/**
 * Audit-log hjælpefunktion.
 * Bruges KUN server-side (Route Handlers, Server Actions).
 * Benytter admin-klienten — eksponeres aldrig til browser.
 */
import { createAdminClient } from '@/lib/supabase/admin'

export type AuditAction =
  | 'user.created'
  | 'user.invited'
  | 'user.login'
  | 'user.logout'
  | 'user.login_failed'
  | 'user.deactivated'
  | 'user.reactivated'
  | 'user.role_changed'
  | 'report.created'
  | 'report.status_changed'
  | 'report.priority_changed'
  | 'report.assigned'
  | 'report.comment_added'
  | 'report.image_added'
  | 'report.image_deleted'
  | 'report.closed'
  | 'report.reopened'
  | 'report.supplier_sent'

interface LogParams {
  organization_id: string
  user_id?: string
  user_email?: string
  action: AuditAction
  entity_type?: 'report' | 'user' | 'organization'
  entity_id?: string
  old_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

/**
 * Skriver en post til audit-loggen.
 * Fejler stille — audit-logfejl bør aldrig blokere selve handlingen.
 */
export async function writeAuditLog(params: LogParams): Promise<void> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('audit_log').insert({
      organization_id: params.organization_id,
      user_id:         params.user_id ?? null,
      user_email:      params.user_email ?? null,
      action:          params.action,
      entity_type:     params.entity_type ?? null,
      entity_id:       params.entity_id ?? null,
      old_value:       params.old_value ?? null,
      new_value:       params.new_value ?? null,
      metadata:        params.metadata ?? null,
    })

    if (error) {
      // Log til server-konsol men kast ikke videre
      console.error('[audit_log] Fejl ved skrivning:', error.message)
    }
  } catch (err) {
    console.error('[audit_log] Uventet fejl:', err)
  }
}
