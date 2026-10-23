-- ============================================================
-- バドミントンサークル「ふわっと」メンバーサイト データベース定義
-- SupabaseのSQL Editorにこのファイル全体を貼り付けて実行してください
-- ============================================================

-- ---------- レベル判定関数 ----------
create or replace function public.compute_level(years numeric)
returns text
language sql
immutable
as $$
  select case
    when years is null or years <= 0 then '未経験者'
    when years <= 1 then '初心者'
    when years <= 3 then '中級'
    else '中上級'
  end;
$$;

-- ---------- プロフィール ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  experience_years numeric not null default 0,
  level text not null default '未経験者',
  role text not null default 'member' check (role in ('member', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 新規ユーザー登録時にプロフィールを自動作成
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  yrs numeric;
begin
  yrs := coalesce((new.raw_user_meta_data->>'experience_years')::numeric, 0);
  insert into public.profiles (id, email, name, experience_years, level)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    yrs,
    public.compute_level(yrs)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 経験年数を変更したらレベルを自動更新
create or replace function public.sync_level()
returns trigger
language plpgsql
as $$
begin
  new.level := public.compute_level(new.experience_years);
  return new;
end;
$$;

create trigger on_profile_level_sync
  before insert or update of experience_years on public.profiles
  for each row execute function public.sync_level();

-- ---------- 権限判定ヘルパー ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active
  );
$$;

-- ---------- 予定（イベント） ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null default gen_random_uuid(), -- 繰り返し作成した予定のグループID
  title text not null default '練習',
  location text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- 出欠 ----------
create table public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- 参加人数だけを全メンバーに公開するための関数（名前は出さない）
create or replace function public.participant_counts(event_ids uuid[])
returns table (event_id uuid, cnt bigint)
language sql
stable
security definer set search_path = public
as $$
  select ep.event_id, count(*)::bigint
  from public.event_participants ep
  where ep.event_id = any(event_ids)
  group by ep.event_id;
$$;

-- ---------- コート振り分け ----------
create table public.court_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  round int not null default 1,          -- 何ゲーム目か
  court int not null,                    -- コート番号（0 = 休憩）
  slot int not null,                     -- コート内の位置 1〜4（1,2がペアA / 3,4がペアB）
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_number int not null,            -- その練習日の割り振り番号
  created_at timestamptz not null default now()
);

create index on public.court_assignments (event_id);

-- ---------- シャトル平均価格 ----------
create table public.shuttle_price (
  id bigint generated always as identity primary key,
  recorded_on date not null unique,
  avg_unit_price numeric not null,       -- シャトル1個あたりの平均価格（円）
  item_count int not null default 0,     -- 集計対象の商品数
  created_at timestamptz not null default now()
);

-- ---------- 管理者用の操作関数 ----------
-- ロール変更（メンバー⇔管理者）
create or replace function public.admin_set_role(target uuid, new_role text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '管理者のみ実行できます';
  end if;
  if new_role not in ('member', 'admin') then
    raise exception '不正なロールです';
  end if;
  update public.profiles set role = new_role where id = target;
end;
$$;

-- 有効/無効（除名）切り替え
create or replace function public.admin_set_active(target uuid, active boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '管理者のみ実行できます';
  end if;
  if target = auth.uid() and not active then
    raise exception '自分自身を無効化することはできません';
  end if;
  update public.profiles set is_active = active where id = target;
end;
$$;

-- ---------- 行レベルセキュリティ（RLS） ----------
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.court_assignments enable row level security;
alter table public.shuttle_price enable row level security;

-- profiles: 自分の行のみ閲覧可。管理者は全員分閲覧可
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- profiles: 自分の行のみ更新可（更新できる列は下のGRANTで制限）
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- 一般ユーザーが更新できる列を名前と経験年数だけに制限
revoke update on public.profiles from authenticated;
grant update (name, experience_years) on public.profiles to authenticated;

-- events: 有効なメンバーは閲覧可。作成・変更・削除は管理者のみ
create policy "events_select" on public.events
  for select using (public.is_active_member());
create policy "events_admin_write" on public.events
  for all using (public.is_admin()) with check (public.is_admin());

-- event_participants: 自分の出欠のみ閲覧・登録・取消可。管理者は全件閲覧・削除可
create policy "participants_select" on public.event_participants
  for select using (user_id = auth.uid() or public.is_admin());
create policy "participants_insert_own" on public.event_participants
  for insert with check (user_id = auth.uid() and public.is_active_member());
create policy "participants_delete" on public.event_participants
  for delete using (user_id = auth.uid() or public.is_admin());

-- court_assignments: 有効なメンバーは閲覧可（画面には番号のみ表示し名前は出さない）
create policy "assignments_select" on public.court_assignments
  for select using (public.is_active_member());
create policy "assignments_admin_write" on public.court_assignments
  for all using (public.is_admin()) with check (public.is_admin());

-- shuttle_price: ログイン済みなら閲覧可（書き込みはサーバーキーのみ＝ポリシー無し）
create policy "shuttle_price_select" on public.shuttle_price
  for select using (auth.role() = 'authenticated');

-- ---------- 追加（2026-10-22）: 終了したゲーム番号 ----------
-- 管理者が「終了にする」を押したゲーム番号を保存。会員画面で灰色表示に使う
-- 既存の events の RLS（閲覧=有効メンバー / 更新=管理者）がそのまま効く
alter table public.events add column if not exists done_rounds int[] not null default '{}';

-- 追加（2026-10-23）: マイパドルの有無 → sql/2026-10-23_paddle.sql を参照
