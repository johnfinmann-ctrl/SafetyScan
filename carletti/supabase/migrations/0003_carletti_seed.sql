-- ═══════════════════════════════════════════════════════════
-- SafetyScan Carletti — Migration 0003
-- Seed: Carletti-organisation
--
-- Kør EFTER 0001 og 0002.
-- Gemmer org-id i en lokal variabel til reference.
-- ═══════════════════════════════════════════════════════════

-- Opret Carletti-organisationen
INSERT INTO public.organizations (
  id,
  name,
  slug,
  primary_color,
  secondary_color,
  is_active
) VALUES (
  gen_random_uuid(),
  'Carletti',
  'carletti',
  '#D71920',
  '#B5151A',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- ───────────────────────────────────────────────────────────
-- Hent org-id til brug i .env.local:
-- SELECT id FROM public.organizations WHERE slug = 'carletti';
-- ───────────────────────────────────────────────────────────

-- Bekræftelse
SELECT
  id,
  name,
  slug,
  primary_color,
  is_active,
  created_at
FROM public.organizations
WHERE slug = 'carletti';
