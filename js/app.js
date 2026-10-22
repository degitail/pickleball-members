import { supa, requireLogin, logout, fmtDate, fmtTime, fmtDateTime } from "./supa.js";

const $ = (id) => document.getElementById(id);
const profile = await requireLogin();
if (!profile) throw new Error("not logged in");

// ---------- ヘッダー・プロフィール表示 ----------
$("btn-logout").onclick = logout;
$("who").textContent = profile.name;
if (profile.role === "admin") $("btn-admin").classList.remove("hidden");

function renderProfile(p) {
  $("pf-name").textContent = p.name;
  $("pf-email").textContent = p.email;
  const lv = $("pf-level");
  lv.textContent = p.level;
  lv.className = "tag tag-" + p.level;
  if (p.role === "admin") $("pf-role").classList.remove("hidden");
}
renderProfile(profile);

$("btn-edit-profile").onclick = () => {
  $("ed-name").value = profile.name;
  $("ed-years").value = String(profile.experience_years);
  $("form-profile").classList.remove("hidden");
};
$("btn-cancel-profile").onclick = () => $("form-profile").classList.add("hidden");

$("form-profile").onsubmit = async (e) => {
  e.preventDefault();
  const { data, error } = await supa
    .from("profiles")
    .update({ name: $("ed-name").value.trim(), experience_years: Number($("ed-years").value) })
    .eq("id", profile.id)
    .select()
    .single();
  const el = $("profile-msg");
  if (error) {
    el.textContent = "保存できませんでした: " + error.message;
    el.className = "form-msg err";
    return;
  }
  Object.assign(profile, data);
  renderProfile(profile);
  $("form-profile").classList.add("hidden");
};

// ---------- カレンダー ----------
let viewYear, viewMonth; // month: 0-11
let events = [];          // 表示中の月の予定
let joinedSet = new Set(); // 自分が参加登録済みのevent_id
let counts = {};           // event_id -> 参加人数

const today = new Date();
viewYear = today.getFullYear();
viewMonth = today.getMonth();

$("cal-prev").onclick = () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } loadMonth(); };
$("cal-next").onclick = () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } loadMonth(); };

async function loadMonth() {
  $("cal-month").textContent = `${viewYear}年${viewMonth + 1}月`;
  const start = new Date(viewYear, viewMonth, 1);
  const end = new Date(viewYear, viewMonth + 1, 1);

  const { data: evs } = await supa
    .from("events")
    .select("*")
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at");
  events = evs ?? [];

  const ids = events.map((e) => e.id);
  joinedSet = new Set();
  counts = {};
  if (ids.length) {
    const { data: mine } = await supa
      .from("event_participants")
      .select("event_id")
      .eq("user_id", profile.id)
      .in("event_id", ids);
    (mine ?? []).forEach((r) => joinedSet.add(r.event_id));

    const { data: cnts } = await supa.rpc("participant_counts", { event_ids: ids });
    (cnts ?? []).forEach((r) => (counts[r.event_id] = r.cnt));
  }
  renderCalendar();
  renderList();
}

function renderCalendar() {
  const grid = $("cal-grid");
  grid.innerHTML = "";
  "日月火水木金土".split("").forEach((d) => {
    const c = document.createElement("div");
    c.className = "cal-cell dow";
    c.textContent = d;
    grid.appendChild(c);
  });

  const first = new Date(viewYear, viewMonth, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = Math.ceil((startDow + daysInMonth) / 7) * 7;

  for (let i = 0; i < cells; i++) {
    const dayNum = i - startDow + 1;
    const cell = document.createElement("div");
    cell.className = "cal-cell";
    if (dayNum < 1 || dayNum > daysInMonth) {
      cell.classList.add("other");
    } else {
      const d = new Date(viewYear, viewMonth, dayNum);
      if (d.toDateString() === today.toDateString()) cell.classList.add("today");
      const num = document.createElement("span");
      num.className = "daynum";
      num.textContent = dayNum;
      cell.appendChild(num);
      events
        .filter((e) => new Date(e.starts_at).getDate() === dayNum)
        .forEach((e) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "cal-ev" + (joinedSet.has(e.id) ? " joined" : "");
          b.textContent = fmtTime(new Date(e.starts_at)) + " " + e.title;
          b.onclick = () => openDetail(e.id);
          cell.appendChild(b);
        });
    }
    grid.appendChild(cell);
  }
}

function renderList() {
  const list = $("ev-list");
  list.innerHTML = "";
  if (!events.length) {
    list.innerHTML = '<p class="muted mt">この月の予定はありません</p>';
    return;
  }
  events.forEach((e) => {
    const d = new Date(e.starts_at);
    const item = document.createElement("div");
    item.className = "ev-item";
    item.innerHTML = `
      <span class="ev-when">${fmtDate(d)} ${fmtTime(d)}</span>
      <span class="grow"><span class="ev-title">${escapeHtml(e.title)}</span>
        <span class="ev-meta">${escapeHtml(e.location)} / 参加 ${counts[e.id] ?? 0}名${joinedSet.has(e.id) ? " ・参加登録済み" : ""}</span></span>`;
    const btn = document.createElement("button");
    btn.className = "btn btn-outline btn-sm";
    btn.textContent = "詳細";
    btn.onclick = () => openDetail(e.id);
    item.appendChild(btn);
    list.appendChild(item);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- 予定詳細・出欠 ----------
let currentEvent = null;

async function openDetail(eventId) {
  currentEvent = events.find((e) => e.id === eventId);
  if (!currentEvent) return;
  const e = currentEvent;
  $("evd-title").textContent = e.title;
  $("evd-meta").textContent =
    `${fmtDateTime(e.starts_at)} 〜 ${fmtTime(new Date(e.ends_at))}` +
    (e.location ? ` ／ ${e.location}` : "");
  $("evd-note").textContent = e.note || "";
  $("evd-count").textContent = counts[e.id] ?? 0;
  $("evd-msg").textContent = "";
  updateJoinButtons();
  await renderCourts(e.id);
  $("ev-detail").classList.remove("hidden");
  $("ev-detail").scrollIntoView({ behavior: "smooth" });
}

function updateJoinButtons() {
  const joined = joinedSet.has(currentEvent.id);
  $("btn-join").classList.toggle("hidden", joined);
  $("btn-leave").classList.toggle("hidden", !joined);
}

$("btn-close-detail").onclick = () => $("ev-detail").classList.add("hidden");

$("btn-join").onclick = async () => {
  const { error } = await supa
    .from("event_participants")
    .insert({ event_id: currentEvent.id, user_id: profile.id });
  if (error && !error.message.includes("duplicate")) {
    $("evd-msg").textContent = "登録できませんでした: " + error.message;
    $("evd-msg").className = "form-msg err";
    return;
  }
  joinedSet.add(currentEvent.id);
  counts[currentEvent.id] = (counts[currentEvent.id] ?? 0) + 1;
  $("evd-count").textContent = counts[currentEvent.id];
  updateJoinButtons();
  renderCalendar();
  renderList();
};

$("btn-leave").onclick = async () => {
  const { data: assigned } = await supa
    .from("court_assignments")
    .select("id")
    .eq("event_id", currentEvent.id)
    .eq("user_id", profile.id)
    .limit(1);
  if (assigned?.length && !confirm("この日はコート割りが決まっています。取り消すと管理者に振り分け直してもらう必要があります。取り消しますか？")) return;
  const { error } = await supa
    .from("event_participants")
    .delete()
    .eq("event_id", currentEvent.id)
    .eq("user_id", profile.id);
  if (error) {
    $("evd-msg").textContent = "取り消しできませんでした: " + error.message;
    $("evd-msg").className = "form-msg err";
    return;
  }
  joinedSet.delete(currentEvent.id);
  counts[currentEvent.id] = Math.max(0, (counts[currentEvent.id] ?? 1) - 1);
  $("evd-count").textContent = counts[currentEvent.id];
  updateJoinButtons();
  renderCalendar();
  renderList();
  renderCourts(currentEvent.id);
};

// ---------- コート割り表示 ----------
async function renderCourts(eventId) {
  const box = $("evd-courts");
  const { data: rows } = await supa
    .from("court_assignments")
    .select("round, court, slot, user_id, member_number")
    .eq("event_id", eventId)
    .order("round")
    .order("court")
    .order("slot");

  if (!rows || !rows.length) {
    box.classList.add("hidden");
    return;
  }

  const mine = rows.find((r) => r.user_id === profile.id);
  $("evd-mynum").innerHTML = mine && !joinedSet.has(eventId)
    ? "参加を取り消しています。管理者が振り分け直すまで、下の表にはあなたの番号が残ります"
    : mine
    ? `あなたの番号は <strong style="font-size:1.3em">${mine.member_number}番</strong> です`
    : "あなたはこの日のコート割りに含まれていません（参加登録後に管理者が再割り当てすると反映されます）";

  const grid = $("evd-court-grid");
  grid.innerHTML = "";

  const rounds = [...new Set(rows.map((r) => r.round))];
  rounds.forEach((round) => {
    const h = document.createElement("h3");
    h.textContent = `第${round}ゲーム`;
    grid.appendChild(h);

    const courtsWrap = document.createElement("div");
    courtsWrap.className = "court-grid";
    const inRound = rows.filter((r) => r.round === round && r.court > 0);
    const courts = [...new Set(inRound.map((r) => r.court))];

    courts.forEach((court) => {
      const cRows = inRound.filter((r) => r.court === court);
      const pairA = cRows.filter((r) => r.slot <= 2);
      const pairB = cRows.filter((r) => r.slot >= 3);
      const el = document.createElement("div");
      el.className = "court";
      const num = (r) =>
        `<span class="p-num${r.user_id === profile.id ? " me" : ""}">${r.member_number}</span>`;
      el.innerHTML = `
        <div class="court-name">コート${court}</div>
        <div class="pairs">
          <div class="pair">${pairA.map(num).join("")}</div>
          <div class="pair">${pairB.map(num).join("")}</div>
        </div>`;
      courtsWrap.appendChild(el);
    });
    grid.appendChild(courtsWrap);

    const rest = rows.filter((r) => r.round === round && r.court === 0);
    if (rest.length) {
      const p = document.createElement("p");
      p.className = "rest-row muted";
      p.innerHTML =
        "休憩: " +
        rest
          .map((r) => `<span class="p-num${r.user_id === profile.id ? " me" : ""}">${r.member_number}</span>`)
          .join(" ");
      grid.appendChild(p);
    }
  });

  box.classList.remove("hidden");
}

// 初期表示
loadMonth();
