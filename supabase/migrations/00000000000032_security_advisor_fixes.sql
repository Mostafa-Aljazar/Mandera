-- Addresses Supabase Security Advisor (splinter) warnings:
--   * Function Search Path Mutable: public.set_updated_at
--   * Public/Signed-In Users Can Execute SECURITY DEFINER Function:
--     public.auth_company_id(), public.auth_role()
--
-- set_updated_at() had no search_path pinned -- a caller able to redefine an
-- object earlier in a mutable search_path could shadow something the
-- function resolves at runtime. It only touches NEW/OLD row fields (no
-- schema-qualified lookups), so pinning to '' is safe.
alter function public.set_updated_at() set search_path = '';

-- auth_role()/auth_company_id() are SECURITY DEFINER (see migration 00005 for
-- why) and every function gets EXECUTE granted to PUBLIC by default on
-- creation. Neither function is needed by anonymous callers -- every RLS
-- policy that uses them protects authenticated-only tables -- so drop the
-- PUBLIC grant and keep only `authenticated`.
revoke execute on function public.auth_role() from public;
revoke execute on function public.auth_company_id() from public;
grant execute on function public.auth_role() to authenticated;
grant execute on function public.auth_company_id() to authenticated;
