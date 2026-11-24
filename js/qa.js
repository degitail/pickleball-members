import { requireLogin, logout } from "./supa.js";
import { QA_CATEGORIES, QA_ITEMS } from "./qa-data.js";

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

let activeCategory = "すべて";
let keyword = "";

const catsEl = document.getElementById("qa-cats");
const listEl = document.getElementById("qa-list");
const emptyEl = document.getElementById("qa-empty");

function renderCategories() {
  catsEl.innerHTML = QA_CATEGORIES.map((cat) => `
    <button type="button" class="btn btn-outline btn-sm qa-cat ${cat === activeCategory ? "active" : ""}" data-cat="${esc(cat)}">${esc(cat)}</button>
  `).join("");
  catsEl.querySelectorAll(".qa-cat").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderCategories();
      renderList();
    });
  });
}

function matches(item) {
  if (activeCategory !== "すべて" && item.category !== activeCategory) return false;
  if (!keyword) return true;
  const text = `${item.category} ${item.q} ${item.a}`;
  return keyword
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => text.includes(w));
}

function renderList() {
  const items = QA_ITEMS.filter(matches);
  emptyEl.classList.toggle("hidden", items.length > 0);
  listEl.innerHTML = items.map((item, i) => `
    <div class="qa-item">
      <button type="button" class="qa-q" data-i="${i}">Q. ${esc(item.q)}</button>
      <div class="qa-a hidden" id="qa-a-${i}">
        <p>${esc(item.a)}</p>
        <p class="muted">出典：${esc(item.source)}</p>
      </div>
    </div>
  `).join("");
  listEl.querySelectorAll(".qa-q").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById(`qa-a-${btn.dataset.i}`).classList.toggle("hidden");
    });
  });
}

document.getElementById("qa-search").addEventListener("input", (e) => {
  keyword = e.target.value.trim();
  renderList();
});

renderCategories();
renderList();
