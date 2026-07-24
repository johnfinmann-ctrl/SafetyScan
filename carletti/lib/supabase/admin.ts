/**
 * Supabase Admin-klient med service-role-nøgle.
 *
 * ⚠️  KRITISK SIKKERHEDSREGEL:
 * Denne fil må KUN importeres i:
 *   - app/api/** /route.ts  (Route Handlers)
 *   - Server Actions med 'use server'
 *   - lib/utils/adminActions.ts
 *
 * Den må ALDRIG importeres i:
 *   - Client Components ('use client')
 *   - lib/supabase/client.ts
 *   - Nogen fil der kan bundle til browseren
 *
 * Service-role-nøglen omgår RLS og har fuld databaseadgang.
 * Eksponering i browseren er en kritisk sikkerhedsfejl.
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Valider at vi ikke kører i browser-kontekst
if (typeof window !== 'undefined') {
  throw new Error(
    '[SIKKERHEDSFEJL] lib/supabase/admin.ts blev importeret i browser-kontekst. ' +
    'Service-role-nøglen må aldrig eksponeres til klienten.'
  )
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Manglende miljøvariabler: NEXT_PUBLIC_SUPABASE_URL og ' +
      'SUPABASE_SERVICE_ROLE_KEY skal begge være sat i .env.local'
    )
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
