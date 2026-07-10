-- feedback (issue #500, ADR-0028): owner-scoped, with admin read-all + triage.

-- Owners may insert only rows attributed to themselves.
drop policy if exists ins_own_feedback on public.feedback;
create policy ins_own_feedback
  on public.feedback for insert
  to authenticated
  with check (user_id = auth.uid());

-- Owners read their own rows; admins read everyone's (the triage queue).
drop policy if exists sel_own_or_admin_feedback on public.feedback;
create policy sel_own_or_admin_feedback
  on public.feedback for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Only admins update (status transitions + github_issue_url). Owners cannot edit
-- after submit; the hot-path insert runs as the service role, which bypasses RLS.
drop policy if exists admin_upd_feedback on public.feedback;
create policy admin_upd_feedback
  on public.feedback for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
