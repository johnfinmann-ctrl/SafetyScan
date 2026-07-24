/**
 * App-layout: wrapper for alle beskyttede sider.
 * Tjekker at brugeren er logget ind OG aktiv.
 * Deaktiverede brugere sendes til login med besked.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Hent auth-bruger (verifikation via Supabase — ikke kun cookie)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Hent profil og tjek is_active
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // Bruger eksisterer i Auth men mangler profil — log ud
    redirect('/login?error=no_profile')
  }

  if (!profile.is_active) {
    // Deaktiveret bruger — log ud og vis besked
    // (supabase.auth.signOut() kan ikke kaldes her — kræver browser)
    redirect('/login?error=deactivated')
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {children}
    </div>
  )
}
