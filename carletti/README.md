# Carletti SafetyScan

Sikkerhedsregistrering til Carletti A/S — produktionspilot.

**Teknologistack:** Next.js 15 · React · TypeScript · Tailwind CSS · Supabase · PostgreSQL

---

## Forudsætninger

- Node.js 18+
- En Supabase-konto med projekt i **EU-region** (Frankfurt anbefales)

---

## Installation

```bash
git clone <repository-url> carletti-safetyscan
cd carletti-safetyscan
npm install
cp .env.example .env.local
# Udfyld .env.local med Supabase-nøgler
```

Kør SQL-migrationerne i Supabase SQL Editor i rækkefølge:

```
supabase/migrations/0001_initial_schema.sql
supabase/migrations/0002_rls_policies.sql
supabase/migrations/0003_carletti_seed.sql
```

Start:

```bash
npm run dev
```

---

## Opret første administrator

Første admin-bruger kan ikke oprettes via appen — det sker direkte i Supabase.

**Trin 1:** Supabase Dashboard → Authentication → Users → Add user
- Email: admin@carletti.dk · Password: valgfrit · Auto Confirm: aktiveret

**Trin 2:** Kopiér det genererede UUID

**Trin 3:** Kør i SQL Editor:

```sql
INSERT INTO public.profiles (
  id, organization_id, full_name, email, role, is_active
) VALUES (
  'UUID-FRA-TRIN-2',
  (SELECT id FROM public.organizations WHERE slug = 'carletti'),
  'Admin Navn',
  'admin@carletti.dk',
  'admin',
  true
);
```

**Trin 4:** Log ind på /login

---

## Tests

```bash
npm test
```

Forventet: **29/29 tests bestået**

---

## Miljøvariabler

| Variabel | Bruges i | Beskrivelse |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + Server | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + Server | Anon-nøgle (RLS-begrænset) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Kun server** | Service-role — omgår RLS |
| `NEXT_PUBLIC_APP_URL` | Server | App-URL til redirects |

⚠️ `SUPABASE_SERVICE_ROLE_KEY` må aldrig committes eller eksponeres til browseren.

---

## Sikkerhed

- Service-role bruges kun i `lib/supabase/admin.ts` — kaster fejl ved browser-import
- RLS aktiveret på alle tabeller
- Deaktiverede brugere blokeres på DB-niveau (ikke kun i UI)
- Audit-log er append-only
- Org-isolation: ingen bruger kan se anden organisations data
