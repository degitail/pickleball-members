-- ============================================================
-- 追加（2026-11-05）: ピックルボール用のレベル（4区分）
-- SupabaseのSQL Editorにこのファイル全体を貼り付けて実行してください
-- ふわっとと共用の level 列・compute_level 関数には触りません
-- 元に戻す: alter table public.profiles drop column pb_level;
--          （登録処理の関数は 2026-10-23_paddle.sql の版に戻す）
-- ============================================================

-- null = 未設定
alter table public.profiles add column if not exists pb_level text
  check (pb_level in ('未経験', '初級', '中級', 'ラケット競技経験あり'));

-- 会員が自分で変更できる列に追加（RLSで自分の行だけに制限済み）
grant update (pb_level) on public.profiles to authenticated;

-- 新規登録時に pb_level も保存する（送られてこない場合は未設定のまま）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  yrs numeric;
  lv text;
begin
  yrs := coalesce((new.raw_user_meta_data->>'experience_years')::numeric, 0);
  lv := new.raw_user_meta_data->>'pb_level';
  insert into public.profiles (id, email, name, experience_years, level, has_paddle, pb_level)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    yrs,
    public.compute_level(yrs),
    case new.raw_user_meta_data->>'has_paddle'
      when 'true' then true
      when 'false' then false
    end,
    case when lv in ('未経験', '初級', '中級', 'ラケット競技経験あり') then lv end
  );
  return new;
end;
$$;
