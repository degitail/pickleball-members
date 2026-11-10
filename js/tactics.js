import { requireLogin, logout } from "./supa.js";
import { TACTICS_ISSUES } from "./tactics-data.js";

const profile = await requireLogin();
if (profile) {
  document.getElementById("who").textContent = profile.name || "";
}

document.getElementById("btn-logout").addEventListener("click", logout);

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));

const list = document.getElementById("tactics-list");

list.innerHTML = TACTICS_ISSUES.map((issue) => `
  <div class="card">
    <h2>${esc(issue.title)}</h2>
    <p class="muted">${esc(issue.date)}</p>
    ${issue.items.map((item) => `
      <h3>${esc(item.title)}</h3>
      <p><img src="${esc(item.image)}" alt="${esc(item.imageAlt)}"></p>
      <p>${esc(item.body)}</p>
      <p class="muted">${esc(item.point)}</p>
      <p class="muted">出典：<a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener">${esc(item.sourceLabel)}</a>（要約・翻訳）</p>
    `).join("")}
  </div>
`).join("");
