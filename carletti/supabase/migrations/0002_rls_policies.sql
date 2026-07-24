-- ═══════════════════════════════════════════════════════════
-- SafetyScan Carletti — Migration 0002
-- Row Level Security-politikker
--
-- PRINCIPPER:
-- 1. Ingen bruger kan se en anden organisations data (org-isolation)
-- 2. Deaktiverede brugere blokeres på DB-niveau, ikke kun i UI
-- 3. Service-role-nøglen omgår RLS — bruges ALDRIG i browseren
-- 4. Audit-log er append-only — ingen kan opdatere eller slette
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- ORGANIZATIONS
-- ───────────────────────────────────────────────────────────
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Brugere kan se deres egen organisation
CREATE POLICY "org_select_own"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id = public.get_user_org()
    AND public.is_current_user_active()
  );

-- Kun service-role kan oprette/ændre organisationer
-- (ingen browser-politik — blokeret som standard)

-- ───────────────────────────────────────────────────────────
-- PROFILES
-- ───────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Alle aktive brugere kan se profiler i samme org
-- (employee har brug for at kende afdeling/ansvarlige-navne)
CREATE POLICY "profiles_select_same_org"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.get_user_org()
    AND public.is_current_user_active()
  );

-- Brugere kan opdatere egne profil-data (kun full_name)
-- Rolleændringer og deaktivering sker server-side via service-role
CREATE POLICY "profiles_update_own_name"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    AND public.is_current_user_active()
  )
  WITH CHECK (
    id = auth.uid()
    AND organization_id = public.get_user_org()
    -- Forhindrer selv-rettelse af rolle og is_active
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND is_active = true
  );

-- INSERT og DELETE af profiler sker kun via service-role (admin-handlinger)

-- ───────────────────────────────────────────────────────────
-- AUDIT_LOG — append-only
-- ───────────────────────────────────────────────────────────
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Admin kan læse audit-log for sin org
CREATE POLICY "audit_log_select_admin"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.get_user_org()
    AND public.get_user_role() = 'admin'
    AND public.is_current_user_active()
  );

-- Ingen bruger kan indsætte direkte i audit-log fra browser
-- Audit-log indsættes udelukkende via server-side service-role

-- ───────────────────────────────────────────────────────────
-- VERIFIKATION
-- Kør disse queries efter migration for at bekræfte RLS er aktiv
-- ───────────────────────────────────────────────────────────

-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- Forventet output:
-- audit_log   | true
-- organizations | true
-- profiles    | true
