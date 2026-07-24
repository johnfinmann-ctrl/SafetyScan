'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { loginSchema } from '@/lib/schemas/user'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const raw = {
      email:    formData.get('email') as string,
      password: formData.get('password') as string,
    }

    // Klient-side validering
    const result = loginSchema.safeParse(raw)
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email:    result.data.email,
        password: result.data.password,
      })

      if (authError) {
        // Generisk fejlbesked — afslør ikke om email eksisterer
        setError('Forkert e-mailadresse eller adgangskode.')
        return
      }

      // Kontroller at profil er aktiv (dobbelttjek — RLS håndterer det også)
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active, role')
        .single()

      if (profile && !profile.is_active) {
        await supabase.auth.signOut()
        setError('Din konto er deaktiveret. Kontakt din administrator.')
        return
      }

      const next = searchParams.get('next') ?? '/'
      router.push(next)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          E-mailadresse
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="
            w-full px-3 py-2 rounded-lg border border-gray-700
            bg-gray-900 text-white placeholder-gray-500
            focus:outline-none focus:ring-2 focus:border-transparent
            focus:ring-[var(--carletti-red)]
            disabled:opacity-50
          "
          placeholder="din@carletti.dk"
          disabled={isPending}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Adgangskode
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="
            w-full px-3 py-2 rounded-lg border border-gray-700
            bg-gray-900 text-white placeholder-gray-500
            focus:outline-none focus:ring-2 focus:border-transparent
            focus:ring-[var(--carletti-red)]
            disabled:opacity-50
          "
          placeholder="••••••••"
          disabled={isPending}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="
          w-full py-2.5 px-4 rounded-lg font-semibold text-white
          transition-opacity disabled:opacity-60
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950
          focus:ring-[var(--carletti-red)]
        "
        style={{ background: 'var(--carletti-red)' }}
      >
        {isPending ? 'Logger ind…' : 'Log ind'}
      </button>
    </form>
  )
}
