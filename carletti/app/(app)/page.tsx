/**
 * Forside — placeholder til Fase 0.
 * Fase 1 erstatter denne med det komplette registreringsflow.
 */
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 text-center">
      <div
        className="w-12 h-12 rounded-xl mb-6"
        style={{ background: '#D71920' }}
        aria-hidden="true"
      />
      <h1 className="text-2xl font-semibold text-white mb-2">
        Carletti SafetyScan
      </h1>
      <p className="text-gray-400 mb-1">
        Logget ind som <span className="text-white font-medium">{profile?.full_name}</span>
      </p>
      <p className="text-sm text-gray-500 mb-8">
        Rolle: <span className="capitalize text-gray-400">{profile?.role}</span>
      </p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-4 max-w-sm">
        <p className="text-sm text-gray-400">
          Fase 0 er aktiv. Registreringsflowet bygges i Fase 1.
        </p>
      </div>

      <form action="/auth/signout" method="post" className="mt-6">
        <button
          type="submit"
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Log ud
        </button>
      </form>
    </main>
  )
}
