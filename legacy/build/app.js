const LABS_KEY = "ctf-playbook:labs:v1";
const OPEN_LABS_KEY = "ctf-playbook:open-labs:v1";
const ACTIVE_LAB_KEY = "ctf-playbook:active-lab:v1";
const REF_CHECKS_KEY = "ctf-playbook:ref-checks:v1";

const LAB_STEPS = [
  "Recon: đọc đề, source, endpoint, version",
  "Xác định dấu hiệu / attack surface",
  "Chọn hướng + payload thử",
  "Chạy exploit, ghi kết quả",
  "Lấy flag / xác nhận",
  "Viết writeup ngắn"
];

const STATUS = {
  todo: { label: "Todo", cls: "todo" },
  doing: { label: "Doing", cls: "doing" },
  solved: { label: "Solved", cls: "solved" }
};

const ALL_ITEMS = [];
const ITEM_MAP = {};
const SECTION_MAP = {};
DATA.forEach(section => {
  SECTION_MAP[section.id] = section;
  section.items.forEach(item => {
    item.section = section.id;
    ALL_ITEMS.push(item);
    ITEM_MAP[item.id] = item;
  });
});

function normalize(s) {
  return String(s || "").toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
}

ALL_ITEMS.forEach(item => {
  const parts = [
    item.title, item.summary, ...(item.tags || []),
    ...(item.signals || []), ...(item.checklist || []),
    ...(item.payloads || []).flatMap(p => [p.title, p.code]),
    ...(item.commands || []).flatMap(c => [c.title, c.code]),
    ...(item.gotchas || []),
    ...(item.links || []).map(l => l.title),
    ...(item.tree || []).flatMap(t => [t.sign, ...(t.actions || [])])
  ];
  item._search = normalize(parts.join(" \n "));
});

function loadJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v === null || v === undefined ? fallback : v;
  } catch (e) { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

let labs = loadJSON(LABS_KEY, []);
if (!Array.isArray(labs)) labs = [];
labs = labs.filter(l => l && l.id);
labs.forEach(lab => {
  if (!Array.isArray(lab.checklist) || lab.checklist.length !== LAB_STEPS.length) {
    lab.checklist = LAB_STEPS.map((_, i) => Boolean(lab.checklist && lab.checklist[i]));
  }
  if (!STATUS[lab.status]) lab.status = "todo";
  if (!lab.category) lab.category = "Web";
  if (typeof lab.notes !== "string") lab.notes = "";
  if (typeof lab.flag !== "string") lab.flag = "";
  if (typeof lab.target !== "string") lab.target = "";
});

let openLabIds = loadJSON(OPEN_LABS_KEY, []);
if (!Array.isArray(openLabIds)) openLabIds = [];
openLabIds = openLabIds.filter(id => labs.some(l => l.id === id));
let activeLabId = localStorage.getItem(ACTIVE_LAB_KEY) || null;
if (!labs.some(l => l.id === activeLabId)) activeLabId = openLabIds[openLabIds.length - 1] || null;
if (activeLabId && !openLabIds.includes(activeLabId)) openLabIds.push(activeLabId);

let refChecks = loadJSON(REF_CHECKS_KEY, {});
if (!refChecks || typeof refChecks !== "object" || Array.isArray(refChecks)) refChecks = {};
let refItemId = null;
let refTab = null;
let codeStore = [];
let searchResults = [];

const $ = sel => document.querySelector(sel);
const sidebarEl = $("#sidebar");
const tabbarEl = $("#tabbar");
const contentEl = $("#content");
const searchEl = $("#search");
const topProgressEl = $("#topProgress");
const toastEl = $("#toast");

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function inline(s) {
  return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
}
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove("show"), 1400);
}
async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e2) {}
    ta.remove();
  }
  if (btn) {
    const old = btn.textContent;
    btn.textContent = "Copied";
    btn.classList.add("ok");
    setTimeout(() => { btn.textContent = old; btn.classList.remove("ok"); }, 1100);
  }
  showToast("Đã copy");
}

function saveLabs() { saveJSON(LABS_KEY, labs); }
function saveOpen() { saveJSON(OPEN_LABS_KEY, openLabIds); }
function saveActive() {
  try {
    if (activeLabId) localStorage.setItem(ACTIVE_LAB_KEY, activeLabId);
    else localStorage.removeItem(ACTIVE_LAB_KEY);
  } catch (e) {}
}
function saveRefChecks() { saveJSON(REF_CHECKS_KEY, refChecks); }

function getLab(id) { return labs.find(l => l.id === id); }
function labById(id) { return labs.find(l => l.id === id); }

function newLab() {
  const now = Date.now();
  const lab = {
    id: "lab-" + now,
    title: "Lab " + (labs.length + 1),
    category: "Web",
    target: "",
    status: "todo",
    notes: "",
    flag: "",
    checklist: LAB_STEPS.map(() => false),
    createdAt: now,
    updatedAt: now
  };
  labs.push(lab);
  openLabIds.push(lab.id);
  activeLabId = lab.id;
  saveLabs(); saveOpen(); saveActive();
  closeReference();
  renderAll();
  setTimeout(() => {
    const el = document.getElementById("labTitle");
    if (el) { el.focus(); el.select(); }
  }, 0);
}

function deleteLab(id) {
  const lab = getLab(id);
  if (!lab) return;
  if (!confirm('Xoá lab "' + lab.title + '"? Không thể hoàn tác.')) return;
  labs = labs.filter(l => l.id !== id);
  openLabIds = openLabIds.filter(x => x !== id);
  if (activeLabId === id) activeLabId = openLabIds[openLabIds.length - 1] || null;
  saveLabs(); saveOpen(); saveActive();
  renderAll();
}

function closeLabTab(id) {
  openLabIds = openLabIds.filter(x => x !== id);
  if (activeLabId === id) activeLabId = openLabIds[openLabIds.length - 1] || null;
  saveOpen(); saveActive();
  renderTabs(); renderContent();
}

function openLab(id) {
  if (!getLab(id)) return;
  if (!openLabIds.includes(id)) openLabIds.push(id);
  activeLabId = id;
  saveOpen(); saveActive();
  closeReference();
  renderTabs(); renderContent();
}

function showBoard() {
  activeLabId = null;
  saveActive();
  closeReference();
  renderTabs(); renderContent();
}

function updateLab(id, patch, opts) {
  const lab = getLab(id);
  if (!lab) return;
  Object.assign(lab, patch);
  lab.updatedAt = Date.now();
  saveLabs();
  if (opts && opts.tabs) renderTabs();
  if (opts && opts.content) renderContent();
  if (opts && opts.top) updateTopProgress();
}

function statusMeta(s) { return STATUS[s] || STATUS.todo; }
function solvedCount() { return labs.filter(l => l.status === "solved").length; }

function navItem(item) {
  const btn = document.createElement("button");
  btn.className = "nav-item" + (refItemId === item.id ? " active" : "");
  btn.type = "button";
  const total = item.checklist ? item.checklist.length : 0;
  const done = item.checklist ? item.checklist.reduce((n, _, i) => n + (refChecks[item.id + ":" + i] ? 1 : 0), 0) : 0;
  btn.innerHTML =
    '<span class="nav-title"><span class="dot ' + esc(item.priority || "low") + '"></span>' +
    "<span>" + esc(item.title) + "</span></span>" +
    (total ? '<span class="nav-progress">' + done + "/" + total + "</span>" : "");
  btn.addEventListener("click", () => openReference(item.id));
  return btn;
}

function sectionTitle(text, count) {
  const div = document.createElement("div");
  div.className = "section-title";
  div.innerHTML = "<span>" + esc(text) + "</span>" +
    (count !== undefined ? '<span class="count">' + count + "</span>" : "");
  return div;
}

function filteredItems() {
  const q = normalize(searchEl.value.trim());
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  return ALL_ITEMS.filter(item => terms.every(t => item._search.includes(t)));
}

function renderSidebar() {
  sidebarEl.innerHTML = "";
  const q = searchEl.value.trim();
  if (q) {
    searchResults = filteredItems();
    sidebarEl.appendChild(sectionTitle("Kết quả", searchResults.length));
    if (!searchResults.length) {
      const empty = document.createElement("div");
      empty.className = "nav-empty";
      empty.textContent = "Không tìm thấy reference.";
      sidebarEl.appendChild(empty);
    } else {
      searchResults.forEach(item => sidebarEl.appendChild(navItem(item)));
    }
  } else {
    DATA.forEach(section => {
      sidebarEl.appendChild(sectionTitle(section.title, section.items.length));
      section.items.forEach(item => sidebarEl.appendChild(navItem(item)));
    });
  }

  const footer = document.createElement("div");
  footer.className = "sidebar-footer";
  const newBtn = document.createElement("button");
  newBtn.className = "btn btn-primary";
  newBtn.textContent = "＋ New lab";
  newBtn.addEventListener("click", newLab);
  const boardBtn = document.createElement("button");
  boardBtn.className = "btn";
  boardBtn.textContent = "Lab board";
  boardBtn.addEventListener("click", showBoard);
  const resetBtn = document.createElement("button");
  resetBtn.className = "btn";
  resetBtn.textContent = "Reset refs";
  resetBtn.addEventListener("click", () => {
    if (!confirm("Xoá trạng thái checklist reference?")) return;
    refChecks = {};
    saveRefChecks();
    renderSidebar();
    if (refItemId) renderDrawer();
  });
  footer.appendChild(newBtn);
  footer.appendChild(boardBtn);
  footer.appendChild(resetBtn);
  sidebarEl.appendChild(footer);
}

function tabStatusDot(lab) {
  return '<span class="status-dot ' + statusMeta(lab.status).cls + '"></span>';
}

function renderTabs() {
  tabbarEl.innerHTML = "";
  openLabIds.forEach(id => {
    const lab = getLab(id);
    if (!lab) return;
    const wrap = document.createElement("div");
    wrap.className = "tab" + (activeLabId === id ? " active" : "");
    const label = document.createElement("button");
    label.className = "tab-label";
    label.type = "button";
    label.innerHTML = tabStatusDot(lab) + "<span>" + esc(lab.title) + "</span>";
    label.title = lab.title;
    label.addEventListener("click", () => openLab(id));
    const close = document.createElement("button");
    close.className = "tab-close";
    close.type = "button";
    close.textContent = "×";
    close.title = "Đóng tab (lab vẫn còn trong board)";
    close.addEventListener("click", e => { e.stopPropagation(); closeLabTab(id); });
    wrap.appendChild(label);
    wrap.appendChild(close);
    tabbarEl.appendChild(wrap);
  });
  const add = document.createElement("button");
  add.className = "tab-add";
  add.type = "button";
  add.textContent = "＋";
  add.title = "Lab mới";
  add.addEventListener("click", newLab);
  tabbarEl.appendChild(add);
  if (!openLabIds.length) {
    const empty = document.createElement("span");
    empty.className = "tab-empty";
    empty.textContent = "Chưa mở lab nào";
    tabbarEl.appendChild(empty);
  }
}

function updateTopProgress() {
  topProgressEl.textContent = labs.length + " labs · " + solvedCount() + " solved";
}

function formatTime(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("vi-VN", {
      hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit"
    });
  } catch (e) { return ""; }
}

function renderBoard() {
  let html = '<div class="welcome">' +
    '<div class="kicker">CTF Playbook / Web + Pwn</div>' +
    '<h1>Labs</h1>' +
    '<p class="summary">Mỗi tab là một lab. Mở nhiều lab cùng lúc, ghi target/notes/flag, và mở reference ở sidebar khi cần.</p>' +
    '<div class="board-actions"><button class="btn btn-primary" id="newLabTop">＋ New lab</button>' +
    '<button class="btn" id="openFirstRef">Mở reference</button></div>' +
    '<div class="callout">20–30 phút/bài rồi rotate · easy points trước · ghi note · không dùng AI.</div>' +
    '<div class="lab-list">';

  if (!labs.length) {
    html += '<div class="empty-state">Chưa có lab nào. Tạo lab đầu tiên để bắt đầu.</div>';
  } else {
    labs.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).forEach(lab => {
      const st = statusMeta(lab.status);
      html += '<button class="lab-row" type="button" data-lab="' + esc(lab.id) + '">' +
        '<span class="status-dot ' + st.cls + '"></span>' +
        '<span class="lab-row-main"><strong>' + esc(lab.title) + "</strong>" +
        '<small>' + esc(lab.category) + (lab.target ? " · " + esc(lab.target) : "") + "</small></span>" +
        '<span class="lab-row-meta">' + esc(st.label) + " · " + esc(formatTime(lab.updatedAt)) + "</span>" +
        "</button>";
    });
  }
  html += "</div>";
  html += '<div class="board-help"><h2>Cách dùng</h2><ul>' +
    "<li>Tạo tab lab bằng nút <code>＋</code> trên tab bar hoặc <code>New lab</code>.</li>" +
    "<li>Click reference ở sidebar để mở drawer bên phải; lab đang làm vẫn giữ nguyên.</li>" +
    "<li>Mọi thứ lưu trong <code>localStorage</code> của file này.</li>" +
    "</ul></div></div>";
  contentEl.innerHTML = html;

  const newTop = document.getElementById("newLabTop");
  if (newTop) newTop.addEventListener("click", newLab);
  const openRef = document.getElementById("openFirstRef");
  if (openRef) openRef.addEventListener("click", () => openReference("web-decision"));
  contentEl.querySelectorAll("[data-lab]").forEach(btn => {
    btn.addEventListener("click", () => openLab(btn.dataset.lab));
  });
}

function renderLab(lab) {
  const st = statusMeta(lab.status);
  const done = lab.checklist.filter(Boolean).length;
  let html = '<div class="crumb">Lab / ' + esc(lab.category) + "</div>";
  html += '<input id="labTitle" class="lab-title" value="' + esc(lab.title) + '" placeholder="Tên lab..." spellcheck="false">';
  html += '<div class="lab-meta">' +
    '<label class="field"><span>Category</span><select id="labCategory">' +
    ["Web", "Pwn", "Other"].map(c => '<option value="' + c + '"' + (lab.category === c ? " selected" : "") + ">" + c + "</option>").join("") +
    "</select></label>" +
    '<label class="field"><span>Status</span><select id="labStatus">' +
    Object.keys(STATUS).map(k => '<option value="' + k + '"' + (lab.status === k ? " selected" : "") + ">" + STATUS[k].label + "</option>").join("") +
    "</select></label>" +
    '<label class="field field-wide"><span>Target</span><input id="labTarget" value="' + esc(lab.target) + '" placeholder="http://target:port hoặc host:port" spellcheck="false"></label>' +
    '<span class="lab-updated">sửa ' + esc(formatTime(lab.updatedAt)) + "</span>" +
    "</div>";

  html += '<div class="lab-grid"><div class="lab-main">';
  html += '<section class="block"><div class="block-head"><h2>Notes</h2><span class="block-meta">tự lưu</span></div>' +
    '<textarea id="labNotes" class="lab-notes" placeholder="Manh mối, hypothesis, payload đã thử, kết quả...">' +
    esc(lab.notes) + "</textarea></section>";
  html += '<section class="block"><div class="block-head"><h2>Checklist</h2><span class="block-meta">' +
    done + "/" + LAB_STEPS.length + '</span></div><div id="labChecks">' +
    LAB_STEPS.map((step, i) => '<label class="check"><input type="checkbox" data-step="' + i + '"' +
      (lab.checklist[i] ? " checked" : "") + "><span>" + inline(step) + "</span></label>").join("") +
    "</div></section>";
  html += "</div>";

  html += '<aside class="lab-rail">';
  html += '<section class="rail-block"><h2>Flag</h2><input id="labFlag" class="field-input" value="' +
    esc(lab.flag) + '" placeholder="flag{...}" spellcheck="false">' +
    '<button class="btn btn-primary" id="markSolved">Mark solved</button></section>';
  html += '<section class="rail-block"><h2>Reference nhanh</h2><div class="ref-links">' +
    ["web-xss", "web-upload", "web-jwt", "web-injection", "pwn-ret2libc", "pwn-fmt"]
      .filter(id => ITEM_MAP[id])
      .map(id => '<button class="ref-link" type="button" data-ref="' + id + '">' + esc(ITEM_MAP[id].title) + "</button>")
      .join("") + "</div></section>";
  html += '<section class="rail-block"><h2>Lab</h2><div class="rail-actions">' +
    '<button class="btn" id="boardFromLab">Lab board</button>' +
    '<button class="btn btn-danger" id="deleteLab">Delete lab</button></div></section>';
  html += "</aside></div>";

  contentEl.innerHTML = html;

  const titleEl = document.getElementById("labTitle");
  titleEl.addEventListener("input", () => {
    updateLab(lab.id, { title: titleEl.value }, { tabs: true });
  });
  const categoryEl = document.getElementById("labCategory");
  categoryEl.addEventListener("change", () => {
    updateLab(lab.id, { category: categoryEl.value }, { content: true });
  });
  const statusEl = document.getElementById("labStatus");
  statusEl.addEventListener("change", () => {
    updateLab(lab.id, { status: statusEl.value }, { content: true, tabs: true, top: true });
  });
  const targetEl = document.getElementById("labTarget");
  targetEl.addEventListener("input", () => {
    updateLab(lab.id, { target: targetEl.value });
  });
  const notesEl = document.getElementById("labNotes");
  let notesTimer = null;
  notesEl.addEventListener("input", () => {
    clearTimeout(notesTimer);
    notesTimer = setTimeout(() => updateLab(lab.id, { notes: notesEl.value }), 120);
  });
  const flagEl = document.getElementById("labFlag");
  flagEl.addEventListener("input", () => {
    updateLab(lab.id, { flag: flagEl.value });
  });
  document.getElementById("markSolved").addEventListener("click", () => {
    updateLab(lab.id, { status: "solved" }, { content: true, tabs: true, top: true });
    showToast("Đã đánh dấu solved");
  });
  document.getElementById("boardFromLab").addEventListener("click", showBoard);
  document.getElementById("deleteLab").addEventListener("click", () => deleteLab(lab.id));
  contentEl.querySelectorAll("#labChecks input[data-step]").forEach(cb => {
    cb.addEventListener("change", () => {
      const i = Number(cb.dataset.step);
      lab.checklist[i] = cb.checked;
      updateLab(lab.id, { checklist: lab.checklist });
      const meta = contentEl.querySelector("#labChecks").previousElementSibling.querySelector(".block-meta");
      if (meta) meta.textContent = lab.checklist.filter(Boolean).length + "/" + LAB_STEPS.length;
    });
  });
  contentEl.querySelectorAll("[data-ref]").forEach(btn => {
    btn.addEventListener("click", () => openReference(btn.dataset.ref));
  });
}

function availableTabs(item) {
  const tabs = [];
  if (item.signals) tabs.push(["signals", "Dấu hiệu"]);
  if (item.tree) tabs.push(["tree", "Decision tree"]);
  if (item.checklist) tabs.push(["checklist", "Checklist"]);
  if (item.payloads) tabs.push(["payloads", "Payloads"]);
  if (item.commands) tabs.push(["commands", "Commands"]);
  if (item.gotchas) tabs.push(["gotchas", "Gotchas"]);
  if (item.links) tabs.push(["links", "Links"]);
  return tabs;
}

function codeBlock(title, code) {
  const idx = codeStore.length;
  codeStore.push(code);
  return '<div class="code-block"><div class="code-head"><span>' + esc(title) +
    '</span><button class="copy" type="button" data-idx="' + idx + '">Copy</button></div>' +
    "<pre><code>" + esc(code) + "</code></pre></div>";
}

function treeCard(node) {
  return '<div class="tree-card"><div class="tree-sign">' + inline(node.sign) + "</div>" +
    '<ul class="tree-actions">' + (node.actions || []).map(a => "<li>" + inline(a) + "</li>").join("") +
    "</ul></div>";
}

function drawerBody(item) {
  codeStore = [];
  if (refTab === "signals") {
    return '<div class="chips">' + item.signals.map(s => '<span class="chip">' + inline(s) + "</span>").join("") + "</div>";
  }
  if (refTab === "tree") {
    return '<div class="tree">' + item.tree.map(treeCard).join("") + "</div>";
  }
  if (refTab === "checklist") {
    return item.checklist.map((step, i) => {
      const key = item.id + ":" + i;
      return '<label class="check"><input type="checkbox" data-ref-check="' + esc(key) + '"' +
        (refChecks[key] ? " checked" : "") + "><span>" + inline(step) + "</span></label>";
    }).join("");
  }
  if (refTab === "payloads") {
    return item.payloads.map(p => codeBlock(p.title, p.code)).join("");
  }
  if (refTab === "commands") {
    return item.commands.map(c => codeBlock(c.title, c.code)).join("");
  }
  if (refTab === "gotchas") {
    return "<ul>" + item.gotchas.map(g => "<li>" + inline(g) + "</li>").join("") + "</ul>";
  }
  if (refTab === "links") {
    return '<div class="links">' + item.links.map(l => '<a href="' + esc(l.url) +
      '" target="_blank" rel="noopener">' + esc(l.title) + "</a>").join("") + "</div>";
  }
  return "";
}

function renderDrawer() {
  const old = document.getElementById("refDrawer");
  const oldBackdrop = document.getElementById("refBackdrop");
  if (old) old.remove();
  if (oldBackdrop) oldBackdrop.remove();
  if (!refItemId || !ITEM_MAP[refItemId]) return;

  const item = ITEM_MAP[refItemId];
  const section = SECTION_MAP[item.section];
  const tabs = availableTabs(item);
  if (!tabs.some(t => t[0] === refTab)) refTab = tabs.length ? tabs[0][0] : null;

  const backdrop = document.createElement("div");
  backdrop.className = "ref-backdrop";
  backdrop.id = "refBackdrop";
  backdrop.addEventListener("click", closeReference);

  const drawer = document.createElement("aside");
  drawer.className = "ref-drawer";
  drawer.id = "refDrawer";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");

  let html = '<div class="ref-head"><div class="ref-head-top"><span class="crumb">Reference / ' +
    esc(section.title) + '</span><button class="ref-close" type="button" title="Đóng">×</button></div>' +
    "<h2>" + esc(item.title) + '</h2><p class="summary">' + inline(item.summary || "") + "</p>" +
    '<div class="tags"><span class="tag ' + esc(item.priority || "") + '">' + esc(item.priority || "low") + "</span>" +
    (item.tags || []).map(t => '<span class="tag">' + esc(t) + "</span>").join("") + "</div></div>";

  html += '<div class="ref-tabs">' + tabs.map(([id, label]) =>
    '<button class="ref-tab' + (id === refTab ? " active" : "") + '" type="button" data-ref-tab="' + id + '">' +
    esc(label) + "</button>").join("") + "</div>";
  html += '<div class="ref-body" id="refBody">' + drawerBody(item) + "</div>";
  drawer.innerHTML = html;

  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);

  drawer.querySelector(".ref-close").addEventListener("click", closeReference);
  drawer.querySelectorAll("[data-ref-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      refTab = btn.dataset.refTab;
      renderDrawer();
    });
  });
  drawer.querySelectorAll(".copy").forEach(btn => {
    btn.addEventListener("click", () => copyText(codeStore[Number(btn.dataset.idx)], btn));
  });
  drawer.querySelectorAll("input[data-ref-check]").forEach(cb => {
    cb.addEventListener("change", () => {
      const key = cb.dataset.refCheck;
      if (cb.checked) refChecks[key] = true;
      else delete refChecks[key];
      saveRefChecks();
      renderSidebar();
    });
  });
}

function openReference(id) {
  if (!ITEM_MAP[id]) return;
  refItemId = id;
  const tabs = availableTabs(ITEM_MAP[id]);
  refTab = tabs.length ? tabs[0][0] : null;
  renderDrawer();
  renderSidebar();
}

function closeReference() {
  refItemId = null;
  refTab = null;
  const d = document.getElementById("refDrawer");
  const b = document.getElementById("refBackdrop");
  if (d) d.remove();
  if (b) b.remove();
  renderSidebar();
}

function renderContent() {
  if (!activeLabId) { renderBoard(); return; }
  const lab = getLab(activeLabId);
  if (!lab) { activeLabId = null; renderBoard(); return; }
  renderLab(lab);
}

function renderAll() {
  renderSidebar();
  renderTabs();
  renderContent();
  updateTopProgress();
}

function bindGlobal() {
  searchEl.addEventListener("input", renderSidebar);
  searchEl.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const results = filteredItems();
      if (results.length) openReference(results[0].id);
    }
    if (e.key === "Escape") {
      searchEl.value = "";
      searchEl.blur();
      renderSidebar();
    }
  });
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchEl.focus();
      searchEl.select();
    } else if (e.key === "/" && document.activeElement !== searchEl &&
      document.activeElement.tagName !== "INPUT" &&
      document.activeElement.tagName !== "TEXTAREA" &&
      document.activeElement.tagName !== "SELECT") {
      e.preventDefault();
      searchEl.focus();
    } else if (e.key === "Escape" && refItemId) {
      closeReference();
    }
  });
  const brand = document.querySelector(".brand");
  if (brand) {
    brand.style.cursor = "pointer";
    brand.addEventListener("click", showBoard);
  }
}

bindGlobal();
renderAll();
