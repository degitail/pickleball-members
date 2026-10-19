import { supa, requireLogin, logout, fmtDate, fmtTime, fmtDateTime } from "./supa.js";

const $ = (id) => document.getElementById(id);
const profile = await requireLogin();
if (!profile) throw new Error("not logged in");
if (profile.role !== "admin") {
  alert("管理者専用ページです");
  location.href = "app.html";
  throw new Error("not admin");
}

$("btn-logout").onclick = logout;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ============================================================
// メンバー管理
// ============================================================
let members = [];

async function loadMembers() {
  const { data } = await supa
    .from("profiles")
    .select("*")
    .order("created_at");
  members = data ?? [];
  const tbody = $("member-table").querySelector("tbody");
  tbody.innerHTML = "";
  members.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(m.name)}</td>
      <td>${escapeHtml(m.email)}</td>
      <td><span class="tag tag-${m.level}">${m.level}</span></td>
      <td>${m.experience_years}年</td>
      <td>${m.role === "admin" ? '<span class="tag tag-admin">管理者</span>' : "メンバー"}</td>
      <td>${m.is_active ? "有効" : '<span style="color:var(--danger)">無効</span>'}</td>`;
    const td = document.createElement("td");

    if (m.id !== profile.id) {
      const roleBtn = document.createElement("button");
      roleBtn.className = "btn btn-outline btn-sm";
      roleBtn.textContent = m.role === "admin" ? "メンバーに戻す" : "管理者にする";
      roleBtn.onclick = async () => {
        if (!confirm(`${m.name} さんを「${m.role === "admin" ? "メンバー" : "管理者"}」に変更しますか？`)) return;
        const { error } = await supa.rpc("admin_set_role", {
          target: m.id,
          new_role: m.role === "admin" ? "member" : "admin",
        });
        if (error) alert("変更できませんでした: " + error.message);
        loadMembers();
      };
      td.appendChild(roleBtn);

      const activeBtn = document.createElement("button");
      activeBtn.className = m.is_active ? "btn btn-danger btn-sm" : "btn btn-outline btn-sm";
      activeBtn.style.marginLeft = "6px";
      activeBtn.textContent = m.is_active ? "無効化" : "有効化";
      activeBtn.onclick = async () => {
        const msg = m.is_active
          ? `${m.name} さんを無効化（除名）しますか？本人はログインできなくなります。`
          : `${m.name} さんを有効化して復帰させますか？`;
        if (!confirm(msg)) return;
        const { error } = await supa.rpc("admin_set_active", { target: m.id, active: !m.is_active });
        if (error) alert("変更できませんでした: " + error.message);
        loadMembers();
      };
      td.appendChild(activeBtn);
    } else {
      td.innerHTML = '<span class="muted">自分</span>';
    }
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
}

// ============================================================
// 予定の作成（繰り返し対応）
// ============================================================
$("form-event").onsubmit = async (e) => {
  e.preventDefault();
  const msgEl = $("event-msg");
  msgEl.textContent = "";

  const date = $("ev-date").value;
  const startT = $("ev-start").value;
  const endT = $("ev-end").value;
  const repeat = $("ev-repeat").value;
  const times = repeat === "none" ? 1 : Number($("ev-repeat-count").value);
  const stepDays = repeat === "biweekly" ? 14 : 7;
  const seriesId = crypto.randomUUID();

  const rows = [];
  for (let i = 0; i < times; i++) {
    const d = new Date(date + "T00:00:00");
    if (i > 0) d.setDate(d.getDate() + stepDays * i);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const starts = new Date(`${ymd}T${startT}:00`);
    const ends = new Date(`${ymd}T${endT}:00`);
    if (ends <= starts) {
      msgEl.textContent = "終了時刻は開始時刻より後にしてください";
      msgEl.className = "form-msg err";
      return;
    }
    rows.push({
      series_id: seriesId,
      title: $("ev-title").value.trim() || "練習",
      location: $("ev-location").value.trim(),
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      note: $("ev-note").value.trim(),
      created_by: profile.id,
    });
  }

  const { error } = await supa.from("events").insert(rows);
  if (error) {
    msgEl.textContent = "登録できませんでした: " + error.message;
    msgEl.className = "form-msg err";
    return;
  }
  msgEl.textContent = `${rows.length}件の予定を登録しました`;
  msgEl.className = "form-msg ok";
  loadEvents();
};

// ============================================================
// 今後の予定一覧
// ============================================================
let upcoming = [];

async function loadEvents() {
  const since = new Date();
  since.setDate(since.getDate() - 1);
  const { data } = await supa
    .from("events")
    .select("*")
    .gte("starts_at", since.toISOString())
    .order("starts_at")
    .limit(30);
  upcoming = data ?? [];

  const ids = upcoming.map((e) => e.id);
  const counts = {};
  if (ids.length) {
    const { data: cnts } = await supa.rpc("participant_counts", { event_ids: ids });
    (cnts ?? []).forEach((r) => (counts[r.event_id] = r.cnt));
  }

  const list = $("admin-ev-list");
  list.innerHTML = upcoming.length ? "" : '<p class="muted">今後の予定はありません</p>';
  upcoming.forEach((e) => {
    const d = new Date(e.starts_at);
    const item = document.createElement("div");
    item.className = "ev-item";
    item.innerHTML = `
      <span class="ev-when">${fmtDate(d)} ${fmtTime(d)}</span>
      <span class="grow"><span class="ev-title">${escapeHtml(e.title)}</span>
        <span class="ev-meta">${escapeHtml(e.location)} / 参加 ${counts[e.id] ?? 0}名</span></span>`;
    const assignBtn = document.createElement("button");
    assignBtn.className = "btn btn-primary btn-sm";
    assignBtn.textContent = "コート振り分け";
    assignBtn.onclick = () => openAssign(e);
    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-danger btn-sm";
    delBtn.textContent = "削除";
    delBtn.onclick = async () => {
      if (!confirm(`「${e.title} ${fmtDateTime(e.starts_at)}」を削除しますか？出欠・コート割りも消えます。`)) return;
      const { error } = await supa.from("events").delete().eq("id", e.id);
      if (error) alert("削除できませんでした: " + error.message);
      $("assign-panel").classList.add("hidden");
      loadEvents();
    };
    item.appendChild(assignBtn);
    item.appendChild(delBtn);
    list.appendChild(item);
  });
}

// ============================================================
// コート自動振り分け
// ============================================================
let assignEvent = null;
let assignParticipants = []; // {user_id, name}

async function openAssign(ev) {
  assignEvent = ev;
  $("as-title").textContent = `コート振り分け: ${ev.title}（${fmtDateTime(ev.starts_at)}）`;
  $("as-msg").textContent = "";
  $("as-result").innerHTML = "";

  const { data: parts } = await supa
    .from("event_participants")
    .select("user_id")
    .eq("event_id", ev.id);
  const ids = (parts ?? []).map((p) => p.user_id);

  // 管理者はprofilesを全件参照できるので名前を紐づけ
  assignParticipants = ids.map((id) => {
    const m = members.find((x) => x.id === id);
    return { user_id: id, name: m ? m.name : "（不明）" };
  });

  $("as-participants").textContent = assignParticipants.length
    ? `参加者 ${assignParticipants.length}名: ` + assignParticipants.map((p) => p.name).join("、")
    : "まだ参加者がいません";

  await showExistingAssignment();
  $("assign-panel").classList.remove("hidden");
  $("assign-panel").scrollIntoView({ behavior: "smooth" });
}

$("btn-close-assign").onclick = () => $("assign-panel").classList.add("hidden");

async function showExistingAssignment() {
  const { data: rows } = await supa
    .from("court_assignments")
    .select("*")
    .eq("event_id", assignEvent.id)
    .order("round").order("court").order("slot");
  $("btn-clear-assign").classList.toggle("hidden", !(rows && rows.length));
  if (rows && rows.length) renderAssignment(rows);
}

$("btn-clear-assign").onclick = async () => {
  if (!confirm("この予定のコート割りを削除しますか？")) return;
  await supa.from("court_assignments").delete().eq("event_id", assignEvent.id);
  $("as-result").innerHTML = "";
  $("btn-clear-assign").classList.add("hidden");
};

// ペア・対戦の重複をできるだけ避けるランダム振り分け
function buildAssignment(participants, courts, rounds) {
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const partnerCount = {};
  const oppCount = {};
  const restCount = {};
  participants.forEach((p) => (restCount[p.user_id] = 0));

  // その日の番号を割り振り（ランダム）
  const numbered = shuffle(participants).map((p, i) => ({ ...p, member_number: i + 1 }));

  const result = [];
  for (let round = 1; round <= rounds; round++) {
    const playingCount = Math.min(courts * 4, Math.floor(numbered.length / 4) * 4);
    // 休憩が少ない人から順に休憩に回す（全員の休憩回数を均等に）
    const byRest = shuffle(numbered).sort((a, b) => restCount[a.user_id] - restCount[b.user_id]);
    const resting = byRest.slice(0, numbered.length - playingCount);
    const playing = byRest.slice(numbered.length - playingCount);

    // ペア作成: 過去に組んだ回数が最少の相手を選ぶ
    let pool = shuffle(playing);
    const pairs = [];
    while (pool.length) {
      const a = pool.shift();
      let best = 0;
      let bestScore = Infinity;
      pool.forEach((b, i) => {
        const s = partnerCount[key(a.user_id, b.user_id)] ?? 0;
        if (s < bestScore) { bestScore = s; best = i; }
      });
      const b = pool.splice(best, 1)[0];
      pairs.push([a, b]);
    }

    // 対戦カード作成: 過去の対戦回数が最少のペア同士を当てる
    let pairPool = shuffle(pairs);
    const matches = [];
    while (pairPool.length >= 2) {
      const p1 = pairPool.shift();
      let best = 0;
      let bestScore = Infinity;
      pairPool.forEach((p2, i) => {
        let s = 0;
        p1.forEach((x) => p2.forEach((y) => (s += oppCount[key(x.user_id, y.user_id)] ?? 0)));
        if (s < bestScore) { bestScore = s; best = i; }
      });
      matches.push([p1, pairPool.splice(best, 1)[0]]);
    }

    matches.forEach(([pA, pB], i) => {
      const court = i + 1;
      pA.forEach((p, s) => result.push({ round, court, slot: s + 1, ...p }));
      pB.forEach((p, s) => result.push({ round, court, slot: s + 3, ...p }));
      partnerCount[key(pA[0].user_id, pA[1].user_id)] = (partnerCount[key(pA[0].user_id, pA[1].user_id)] ?? 0) + 1;
      partnerCount[key(pB[0].user_id, pB[1].user_id)] = (partnerCount[key(pB[0].user_id, pB[1].user_id)] ?? 0) + 1;
      pA.forEach((x) => pB.forEach((y) => {
        oppCount[key(x.user_id, y.user_id)] = (oppCount[key(x.user_id, y.user_id)] ?? 0) + 1;
      }));
    });

    resting.forEach((p, i) => {
      restCount[p.user_id]++;
      result.push({ round, court: 0, slot: i + 1, ...p });
    });
  }
  return result;
}

$("btn-run-assign").onclick = async () => {
  const msgEl = $("as-msg");
  msgEl.textContent = "";
  if (assignParticipants.length < 4) {
    msgEl.textContent = "参加者が4名以上必要です";
    msgEl.className = "form-msg err";
    return;
  }
  const courts = Number($("as-courts").value);
  const rounds = Number($("as-rounds").value);
  const rows = buildAssignment(assignParticipants, courts, rounds);

  // 既存の割りを消してから保存
  await supa.from("court_assignments").delete().eq("event_id", assignEvent.id);
  const { error } = await supa.from("court_assignments").insert(
    rows.map((r) => ({
      event_id: assignEvent.id,
      round: r.round,
      court: r.court,
      slot: r.slot,
      user_id: r.user_id,
      member_number: r.member_number,
    }))
  );
  if (error) {
    msgEl.textContent = "保存できませんでした: " + error.message;
    msgEl.className = "form-msg err";
    return;
  }
  msgEl.textContent = "振り分けを保存しました。メンバーの画面にも反映されています。";
  msgEl.className = "form-msg ok";
  $("btn-clear-assign").classList.remove("hidden");
  renderAssignment(rows);
};

function renderAssignment(rows) {
  const box = $("as-result");
  box.innerHTML = "";
  const nameOf = (r) => {
    if (r.name) return r.name;
    const m = members.find((x) => x.id === r.user_id);
    return m ? m.name : "?";
  };
  const rounds = [...new Set(rows.map((r) => r.round))];
  rounds.forEach((round) => {
    const h = document.createElement("h3");
    h.textContent = `第${round}ゲーム`;
    box.appendChild(h);
    const wrap = document.createElement("div");
    wrap.className = "court-grid";
    const inRound = rows.filter((r) => r.round === round && r.court > 0);
    [...new Set(inRound.map((r) => r.court))].forEach((court) => {
      const cRows = inRound.filter((r) => r.court === court);
      const cell = (r) => `<span class="p-num">${r.member_number} ${escapeHtml(nameOf(r))}</span>`;
      const el = document.createElement("div");
      el.className = "court";
      el.innerHTML = `
        <div class="court-name">コート${court}</div>
        <div class="pairs">
          <div class="pair">${cRows.filter((r) => r.slot <= 2).map(cell).join("")}</div>
          <div class="pair">${cRows.filter((r) => r.slot >= 3).map(cell).join("")}</div>
        </div>`;
      wrap.appendChild(el);
    });
    box.appendChild(wrap);
    const rest = rows.filter((r) => r.round === round && r.court === 0);
    if (rest.length) {
      const p = document.createElement("p");
      p.className = "rest-row muted";
      p.innerHTML = "休憩: " + rest.map((r) => `${r.member_number} ${escapeHtml(nameOf(r))}`).join(" / ");
      box.appendChild(p);
    }
  });
}

// 初期ロード
await loadMembers();
await loadEvents();
