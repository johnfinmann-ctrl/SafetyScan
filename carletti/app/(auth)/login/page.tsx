import { LoginForm } from '@/components/auth/LoginForm'

export const metadata = { title: 'Log ind — Carletti SafetyScan' }

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div
            className="inline-block w-12 h-12 rounded-xl mb-4"
            style={{ background: 'var(--carletti-red)' }}
            aria-hidden="true"
          />
          <h1 className="text-xl font-semibold text-white">
            Carletti SafetyScan
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Log ind med din arbejds-e-mail
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  )
}
