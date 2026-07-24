/**
 * Vitest global setup.
 * Mockes: next/navigation, next/headers, environment-variabler.
 */
import { vi } from 'vitest'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  redirect: vi.fn(),
}))

// Mock Next.js headers (cookies)
vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [],
    set:    vi.fn(),
    get:    vi.fn(),
  }),
}))

// Sæt miljøvariabler til test
process.env.NEXT_PUBLIC_SUPABASE_URL    = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY   = 'test-service-role-key'
process.env.NEXT_PUBLIC_APP_URL         = 'http://localhost:3000'
