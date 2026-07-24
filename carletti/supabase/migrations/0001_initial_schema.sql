-- ═══════════════════════════════════════════════════════════
-- SafetyScan Carletti — Migration 0001
-- Initial schema: organizations, profiles, audit_log
-- Kør i Supabase SQL Editor (eller via Supabase CLI)
-- ═══════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ───────────────────────────────────────────────────────────
-- ORGANISATIONS
-- Multi-tenant fundament. Carletti er én organisation.
-- organization_id gentages i alle tabeller for isolation.
-- ───────────────────────────────────────────────────────────
CREATE TABLE public.organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  primary_color   TEXT NOT NULL DEFAULT '#D71920',
  secondary_color TEXT NOT NULL DEFAULT '#B5151A',
  logo_url        TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.organizations IS
  'En organisation = én kundeinstallation. Carletti er én post her.';

-- ───────────────────────────────────────────────────────────
-- PROFILES
-- Én profil pr. bruger pr. organisation.
-- Knyttet til auth.users via id-match.
-- ───────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  -- Samme UUID som auth.users.id
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,

  -- Rolle: employee | manager | admin
  role            TEXT NOT NULL DEFAULT 'employee'
                  CHECK (role IN ('employee', 'manager', 'admin')),

  -- Deaktivering (soft delete — data bevares)
  is_active       BOOLEAN NOT NULL DEFAULT true,
  deactivated_at  TIMESTAMPTZ,
  deactivated_by  UUID REFERENCES public.profiles(id),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES public.profiles(id)
);

COMMENT ON TABLE public.profiles IS
  'Brugerprofile. is_active=false blokerer adgang via RLS uden at slette data.';
COMMENT ON COLUMN public.profiles.role IS
  'employee: opretter rapporter og ser egne. manager: behandler sager. admin: styrer hele org.';

-- ───────────────────────────────────────────────────────────
-- REVISIONSLOG
-- Uforanderlig log over alle kritiske handlinger.
-- Indsættes server-side — aldrig direkte fra browser.
-- ───────────────────────────────────────────────────────────
CREATE TABLE public.audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),

  -- Hvem
  user_id         UUID REFERENCES public.profiles(id),
  user_email      TEXT,                        -- snapshot ved handlingstidspunkt

  -- Hvad
  action          TEXT NOT NULL,               -- se liste i kommentar nedenfor
  entity_type     TEXT,                        -- fx 'report', 'user'
  entity_id       UUID,                        -- UUID på det påvirkede objekt

  -- Detaljer
  old_value       JSONB,
  new_value       JSONB,
  metadata        JSONB,                       -- fri data, fx ip_address

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_log IS
  'Uforanderlig revisionslog. Ingen UPDATE eller DELETE tilladt via RLS.
   Actions: user.created, user.invited, user.login, user.logout,
   user.login_failed, user.deactivated, user.reactivated, user.role_changed,
   report.created, report.status_changed, report.priority_changed,
   report.assigned, report.comment_added, report.image_added,
   report.image_deleted, report.closed, report.reopened,
   report.supplier_sent';

-- ───────────────────────────────────────────────────────────
-- INDEKSER
-- ───────────────────────────────────────────────────────────
CREATE INDEX idx_profiles_org      ON public.profiles(organization_id);
CREATE INDEX idx_profiles_active   ON public.profiles(organization_id, is_active);
CREATE INDEX idx_audit_org_time    ON public.audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_entity      ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user        ON public.audit_log(user_id);

-- ───────────────────────────────────────────────────────────
-- TRIGGER: updated_at vedligeholdes automatisk
-- ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ───────────────────────────────────────────────────────────
-- HJÆLPEFUNKTIONER (bruges i RLS-politikker)
-- ───────────────────────────────────────────────────────────

-- Returnerer organization_id for den aktuelle bruger
CREATE OR REPLACE FUNCTION public.get_user_org()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Returnerer rolle for den aktuelle bruger
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Returnerer true hvis den aktuelle bruger er aktiv
CREATE OR REPLACE FUNCTION public.is_current_user_active()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;
