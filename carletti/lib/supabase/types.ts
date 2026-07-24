/**
 * Database-typer for SafetyScan Carletti.
 *
 * I produktion: generer med `supabase gen types typescript`
 * Her er de håndskrevet til Fase 0 (organizations, profiles, audit_log).
 */

export type Role = 'employee' | 'manager' | 'admin'

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          primary_color: string
          secondary_color: string
          logo_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          primary_color?: string
          secondary_color?: string
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
      }

      profiles: {
        Row: {
          id: string
          organization_id: string
          full_name: string
          email: string
          role: Role
          is_active: boolean
          deactivated_at: string | null
          deactivated_by: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id: string
          organization_id: string
          full_name: string
          email: string
          role?: Role
          is_active?: boolean
          deactivated_at?: string | null
          deactivated_by?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }

      audit_log: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          user_email: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          old_value: Record<string, unknown> | null
          new_value: Record<string, unknown> | null
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          user_email?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          old_value?: Record<string, unknown> | null
          new_value?: Record<string, unknown> | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Update: never // Audit-log er append-only
      }
    }

    Functions: {
      get_user_org: {
        Args: Record<string, never>
        Returns: string
      }
      get_user_role: {
        Args: Record<string, never>
        Returns: string
      }
      is_current_user_active: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
  }
}

// Convenience-typer
export type Organization = Database['public']['Tables']['organizations']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type AuditLogEntry = Database['public']['Tables']['audit_log']['Row']
