import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

export const supa = createClient(SUPABASE_URL, SUPABASE_KEY);

// ログイン中ユーザーのプロフィールを取得（未ログインなら null）
export async function currentProfile() {
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  const { data, error } = await supa
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) return null;
  return data;
}

// ログイン必須ページの入口処理。無効化されたアカウントは弾く
export async function requireLogin() {
  const profile = await currentProfile();
  if (!profile) {
    location.href = "index.html";
    return null;
  }
  if (!profile.is_active) {
    await supa.auth.signOut();
    alert("このアカウントは現在利用できません。管理者にお問い合わせください。");
    location.href = "index.html";
    return null;
  }
  return profile;
}

export async function logout() {
  await supa.auth.signOut();
  location.href = "index.html";
}

// 日付表示ヘルパー
export const fmtDate = (d) =>
  `${d.getMonth() + 1}/${d.getDate()}(${"日月火水木金土"[d.getDay()]})`;
export const fmtTime = (d) =>
  `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
export const fmtDateTime = (iso) => {
  const d = new Date(iso);
  return `${fmtDate(d)} ${fmtTime(d)}`;
};
