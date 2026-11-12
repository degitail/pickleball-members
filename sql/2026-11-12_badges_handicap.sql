-- ============================================================
-- 追加（2026-11-12）: 参加回数バッジ / ハンデ判定
-- SupabaseのSQL Editorにこのファイル全体を貼り付けて実行してください
-- テーブル・列の変更はありません（関数を2つ追加するだけ）
-- 元に戻す: drop function public.my_attendance_count();
--          drop function public.court_handicaps(uuid);
-- ============================================================

-- 自分の参加回数（コート割りに入った練習日の数。同じ日に何ゲーム入っても1回、休憩のみは数えない）
create or replace function public.my_attendance_count()
returns int
language sql
stable
security definer set search_path = public
as $$
  select count(distinct (e.starts_at at time zone 'Asia/Tokyo')::date)::int
  from public.court_assignments ca
  join public.events e on e.id = ca.event_id
  where ca.user_id = auth.uid() and ca.court > 0;
$$;

-- コートごとのハンデ判定。レベルそのものは返さず、弱い側のペア（'A' or 'B'）だけ返す
-- 点数: 未経験=0 / 初級=0 / ラケット競技経験あり=2 / 中級=3、ペア合計の差が2以上で弱い側にハンデ
-- null（未設定）は0点扱い
create or replace function public.court_handicaps(p_event uuid)
returns table (r_round int, r_court int, weak_pair text)
language sql
stable
security definer set search_path = public
as $$
  with s as (
    select ca.round, ca.court, (ca.slot >= 3) as is_b,
      case p.pb_level when 'ラケット競技経験あり' then 2 when '中級' then 3 else 0 end as pts
    from public.court_assignments ca
    join public.profiles p on p.id = ca.user_id
    where ca.event_id = p_event and ca.court > 0 and public.is_active_member()
  ), t as (
    select round, court,
      coalesce(sum(pts) filter (where not is_b), 0) as a,
      coalesce(sum(pts) filter (where is_b), 0) as b
    from s group by round, court
  )
  select round, court,
    case when abs(a - b) >= 2 then (case when a < b then 'A' else 'B' end) end
  from t;
$$;

grant execute on function public.my_attendance_count() to authenticated;
grant execute on function public.court_handicaps(uuid) to authenticated;
