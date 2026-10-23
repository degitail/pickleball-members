-- ============================================================
-- 追加（2026-10-23）: マイパドル（ラケット）の有無
-- SupabaseのSQL Editorにこのファイル全体を貼り付けて実行してください
-- 元に戻す: alter table public.profiles drop column has_paddle;
--          （登録処理の関数は has_paddle を読まない元の版に戻す必要あり）
-- ============================================================

-- null = 未回答 / true = 持っている / false = 持っていない
alter table public.profiles add column if not exists has_paddle boolean;

-- 会員が自分で変更できる列に追加（RLSで自分の行だけに制限済み）
grant update (has_paddle) on public.profiles to authenticated;

-- 新規登録時に has_paddle も保存する（送られてこない場合は未回答のまま）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  yrs numeric;
begin
  yrs := coalesce((new.raw_user_meta_data->>'experience_years')::numeric, 0);
  insert into public.profiles (id, email, name, experience_years, level, has_paddle)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    yrs,
    public.compute_level(yrs),
    case new.raw_user_meta_data->>'has_paddle'
      when 'true' then true
      when 'false' then false
    end
  );
  return new;
end;
$$;
