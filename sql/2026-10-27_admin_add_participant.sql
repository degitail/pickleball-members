-- ============================================================
-- 追加（2026-10-27）: 管理者が他の会員を参加者に追加できるようにする
-- SupabaseのSQL Editorに貼り付けて実行してください
-- 元に戻す: drop policy "participants_admin_insert" on public.event_participants;
-- ============================================================
create policy "participants_admin_insert" on public.event_participants
  for insert with check (public.is_admin());
