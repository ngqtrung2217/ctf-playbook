"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TEMPLATES, TEMPLATE_MAP, searchTemplates } from "@/lib/templates";
import { loadJSON, saveJSON, uid, normalize } from "@/lib/storage";

const LABS_KEY = "ctf-playbook:labs:v4";
const OPEN_KEY = "ctf-playbook:open-labs:v4";
const ACTIVE_KEY = "ctf-playbook:active-lab:v4";
const SCALE_KEY = "ctf-playbook:ui-scale:v1";
const SCALES = [75, 80, 90, 100, 110, 120, 125, 130, 140, 150];

const STATUS = {
  todo: { label: "Todo", cls: "todo" },
  doing: { label: "Doing", cls: "doing" },
  solved: { label: "Solved", cls: "solved" }
};

const QUICK_PATTERNS = {
  Web: [
    ["pattern-csp-bypass", "CSP"],
    ["pattern-xss-waf-bot", "XSS+WAF"],
    ["pattern-phar-chain", "Upload/Phar"],
    ["pattern-jwt-auth", "JWT"],
    ["pattern-auth-idor", "Auth/IDOR"],
    ["pattern-sqli-context", "SQLi"],
    ["pattern-ssti", "SSTI"],
    ["pattern-logic-type", "Logic"],
    ["pattern-php-cookie", "PHP cookie"],
    ["pattern-command-injection", "Cmd inj"],
    ["pattern-ssrf", "SSRF"],
    ["pattern-xxe", "XXE"],
    ["pattern-devserver-cve", "Dev/CVE"],
    ["pattern-multiflag-recon", "Recon"]
  ],
  Pwn: [
    ["pattern-pwn-recon", "Recon"],
    ["pattern-rop-args", "ROP"],
    ["pattern-stack-variable", "Stack var"],
    ["pattern-format-string", "Format"],
    ["pattern-prng", "PRNG"],
    ["pattern-int-overflow", "Integer"],
    ["pattern-negative-logic", "Logic"],
    ["pattern-heap-fptr", "Heap"]
  ]
};

function statusMeta(status) {
  return STATUS[status] || STATUS.todo;
}

function now() {
  return Date.now();
}

function formatTime(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit"
    });
  } catch {
    return "";
  }
}

function newStep(text) {
  return { id: uid("step"), text, done: false };
}

function newBlockFromTemplate(template) {
  return {
    id: uid("block"),
    type: "checklist",
    templateId: template.id,
    title: template.title,
    group: template.group || template.category || "Checklist",
    category: template.category || "",
    steps: (template.steps || []).map((text) => newStep(text)),
    payloads: template.payloads || [],
    commands: template.commands || [],
    gotchas: template.gotchas || [],
    links: template.links || []
  };
}

function newBlankBlock() {
  return {
    id: uid("block"),
    type: "checklist",
    templateId: null,
    title: "Checklist trắng",
    group: "",
    category: "",
    steps: [],
    payloads: [],
    commands: [],
    gotchas: [],
    links: []
  };
}

function newNoteBlock(note = "") {
  return {
    id: uid("block"),
    type: "note",
    title: "Notes",
    note,
    steps: [],
    payloads: [],
    commands: [],
    gotchas: [],
    links: []
  };
}

function newLab(title, category = "Web", blocks = []) {
  return {
    id: uid("lab"),
    title,
    category,
    target: "",
    status: "todo",
    flag: "",
    solvedAt: null,
    blocks,
    createdAt: now(),
    updatedAt: now()
  };
}

function normalizeLab(lab) {
  const blocks = Array.isArray(lab.blocks)
    ? lab.blocks.map((block) => ({
        ...block,
        steps: Array.isArray(block.steps) ? block.steps : [],
        payloads: Array.isArray(block.payloads) ? block.payloads : [],
        commands: Array.isArray(block.commands) ? block.commands : [],
        gotchas: Array.isArray(block.gotchas) ? block.gotchas : [],
        links: Array.isArray(block.links) ? block.links : [],
        note: typeof block.note === "string" ? block.note : ""
      }))
    : [];
  return {
    ...lab,
    blocks,
    target: lab.target || "",
    flag: lab.flag || "",
    status: STATUS[lab.status] ? lab.status : "todo",
    category: lab.category || "Web",
    title: lab.title || "Lab",
    solvedAt: lab.solvedAt || null
  };
}

export default function Playbook() {
  const [hydrated, setHydrated] = useState(false);
  const [labs, setLabs] = useState([]);
  const [openIds, setOpenIds] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [focusBlockId, setFocusBlockId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1280;
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [uiScale, setUiScale] = useState(() => {
    if (typeof window === "undefined") return 100;
    try {
      const value = Number(window.localStorage.getItem(SCALE_KEY));
      return SCALES.includes(value) ? value : 100;
    } catch {
      return 100;
    }
  });
  const searchRef = useRef(null);
  const paletteInputRef = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    const loadedLabs = (loadJSON(LABS_KEY, []) || [])
      .filter((lab) => lab && lab.id)
      .map(normalizeLab);
    const loadedOpen = (loadJSON(OPEN_KEY, []) || []).filter((id) =>
      loadedLabs.some((lab) => lab.id === id)
    );
    let savedActive = null;
    try {
      savedActive = window.localStorage.getItem(ACTIVE_KEY);
    } catch {}
    let nextActive = loadedLabs.some((lab) => lab.id === savedActive)
      ? savedActive
      : loadedOpen[loadedOpen.length - 1] || null;
    if (nextActive && !loadedOpen.includes(nextActive)) loadedOpen.push(nextActive);
    setLabs(loadedLabs);
    setOpenIds(loadedOpen);
    setActiveId(nextActive);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveJSON(LABS_KEY, labs);
  }, [labs, hydrated]);

  useEffect(() => {
    if (hydrated) saveJSON(OPEN_KEY, openIds);
  }, [openIds, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (activeId) window.localStorage.setItem(ACTIVE_KEY, activeId);
      else window.localStorage.removeItem(ACTIVE_KEY);
    } catch {}
  }, [activeId, hydrated]);

  useEffect(() => {
    if (!toast) return;
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1700);
    return () => clearTimeout(toastTimer.current);
  }, [toast]);

  useEffect(() => {
    document.body.style.zoom = String(uiScale / 100);
    try {
      window.localStorage.setItem(SCALE_KEY, String(uiScale));
    } catch {}
    if (uiScale >= 120) setSidebarOpen(false);
  }, [uiScale]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1279px)");
    function onChange(event) {
      setSidebarOpen(!event.matches);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!paletteOpen) return;
    const timer = setTimeout(() => paletteInputRef.current?.focus(), 20);
    return () => clearTimeout(timer);
  }, [paletteOpen]);

  useEffect(() => {
    setPaletteIndex(0);
  }, [paletteQuery]);

  useEffect(() => {
    function onKeyDown(event) {
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setSidebarOpen((value) => !value);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
        setPaletteQuery("");
        setPaletteIndex(0);
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "Escape") {
        if (document.activeElement === searchRef.current) {
          setQuery("");
          searchRef.current?.blur();
        } else if (window.matchMedia("(max-width: 1279px)").matches) {
          setSidebarOpen(false);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const activeLab = labs.find((lab) => lab.id === activeId) || null;
  const solvedCount = labs.filter((lab) => lab.status === "solved").length;
  const visibleLabs = useMemo(() => {
    const q = normalize(query.trim());
    const sorted = labs
      .slice()
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (!q) return sorted;
    return sorted.filter((lab) =>
      normalize([lab.title, lab.category, lab.target, statusMeta(lab.status).label].join(" ")).includes(q)
    );
  }, [labs, query]);

  const paletteItems = useMemo(() => {
    const items = [];
    for (const template of TEMPLATES) {
      const haystack = normalize(
        [
          template.title,
          template.summary,
          template.group,
          template.category,
          ...(template.tags || []),
          ...(template.steps || []),
          ...(template.payloads || []).flatMap((payload) => [
            payload.title,
            payload.code
          ]),
          ...(template.commands || []).flatMap((command) => [
            command.title,
            command.code
          ]),
          ...(template.gotchas || [])
        ].join(" ")
      );
      items.push({
        type: "template",
        id: template.id,
        title: template.title,
        group: template.group || template.category,
        category: template.category,
        priority: template.priority,
        hay: haystack
      });
      (template.payloads || []).forEach((payload, index) => {
        items.push({
          type: "payload",
          id: `${template.id}:payload:${index}`,
          title: payload.title,
          group: template.title,
          category: template.category,
          code: payload.code,
          hay: normalize(
            [payload.title, payload.code, template.title, ...(template.tags || [])].join(" ")
          )
        });
      });
      (template.commands || []).forEach((command, index) => {
        items.push({
          type: "command",
          id: `${template.id}:command:${index}`,
          title: command.title,
          group: template.title,
          category: template.category,
          code: command.code,
          hay: normalize(
            [command.title, command.code, template.title].join(" ")
          )
        });
      });
    }
    for (const lab of labs) {
      items.push({
        type: "lab",
        id: lab.id,
        title: lab.title,
        group: `Lab · ${lab.category}`,
        category: lab.category,
        hay: normalize(
          [lab.title, lab.category, lab.target, statusMeta(lab.status).label].join(" ")
        )
      });
    }
    return items;
  }, [labs]);

  const paletteResults = useMemo(() => {
    const q = normalize(paletteQuery.trim());
    if (!q) {
      const category =
        activeLab && activeLab.category !== "Other" ? activeLab.category : null;
      const candidates = paletteItems.filter(
        (item) =>
          item.type === "template" &&
          item.priority === "high" &&
          (!category || item.category === category)
      );
      const patterns = candidates.filter((item) =>
        item.group.toLowerCase().includes("patterns")
      );
      const rest = candidates.filter(
        (item) => !item.group.toLowerCase().includes("patterns")
      );
      return [...patterns, ...rest].slice(0, 10);
    }
    const terms = q.split(/\s+/).filter(Boolean);
    const scored = [];
    for (const item of paletteItems) {
      if (!terms.every((term) => item.hay.includes(term))) continue;
      const title = normalize(item.title);
      let score = 1;
      if (title === q) score += 100;
      if (title.startsWith(q)) score += 50;
      if (title.includes(q)) score += 30;
      if (item.type === "template") score += 14;
      if (item.type === "template" && item.id.startsWith("pattern-")) score += 18;
      if (item.type === "payload") score += 8;
      if (item.type === "command") score += 6;
      if (item.type === "lab") score += 10;
      if (activeLab && item.category === activeLab.category) score += 6;
      scored.push({ item, score });
    }
    scored.sort(
      (a, b) =>
        b.score - a.score ||
        a.item.title.localeCompare(b.item.title, "vi")
    );
    return scored.slice(0, 40).map((entry) => entry.item);
  }, [paletteQuery, paletteItems, activeLab]);

  useEffect(() => {
    setPaletteIndex((value) =>
      Math.max(0, Math.min(value, paletteResults.length - 1))
    );
  }, [paletteResults.length]);

  useEffect(() => {
    if (!paletteOpen) return;
    document
      .querySelector(".palette-item.active")
      ?.scrollIntoView({ block: "nearest" });
  }, [paletteIndex, paletteOpen, paletteResults]);

  function showToast(message) {
    setToast(message);
  }

  function collapseSidebar() {
    if (window.matchMedia("(max-width: 1279px)").matches) setSidebarOpen(false);
  }

  function jumpToBlock(blockId) {
    collapseSidebar();
    setTimeout(() => {
      document
        .querySelector(`[data-block-id="${blockId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function stepScale(direction) {
    setUiScale((current) => {
      const index = SCALES.indexOf(current);
      const base = index < 0 ? SCALES.indexOf(100) : index;
      return SCALES[
        Math.max(0, Math.min(SCALES.length - 1, base + direction))
      ];
    });
  }

  function changeScale(value) {
    if (SCALES.includes(value)) setUiScale(value);
  }

  function openPalette() {
    collapseSidebar();
    setPaletteOpen(true);
    setPaletteQuery("");
    setPaletteIndex(0);
  }

  function closePalette() {
    setPaletteOpen(false);
    setPaletteQuery("");
    setPaletteIndex(0);
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {}
      textarea.remove();
      return ok;
    }
  }

  function addPatternBlock(labId, template) {
    if (!template) return;
    const lab = labs.find((item) => item.id === labId);
    if (!lab) return;
    if (lab.blocks.some((block) => block.templateId === template.id)) {
      showToast("Pattern đã có trong lab");
      return;
    }
    const block = newBlockFromTemplate(template);
    setLabs((prev) =>
      prev.map((item) =>
        item.id === labId
          ? { ...item, blocks: [...item.blocks, block], updatedAt: now() }
          : item
      )
    );
    closePalette();
    showToast(`Đã thêm pattern: ${template.title}`);
    setTimeout(() => {
      document
        .querySelector(`[data-block-id="${block.id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
  }

  function createLabWithTemplate(template) {
    const category =
      template.category === "Pwn"
        ? "Pwn"
        : template.category === "Web"
          ? "Web"
          : "Web";
    const lab = newLab(template.title, category, [newBlockFromTemplate(template)]);
    setLabs((prev) => [lab, ...prev]);
    setOpenIds((prev) => [...prev, lab.id]);
    setActiveId(lab.id);
    closePalette();
    showToast(`Đã tạo lab từ pattern: ${template.title}`);
  }

  async function runPaletteAction(item) {
    if (!item) return;
    if (item.type === "template") {
      const template = TEMPLATE_MAP[item.id];
      if (!template) return;
      closePalette();
      if (activeLab) addPatternBlock(activeLab.id, template);
      else createLabWithTemplate(template);
      return;
    }
    if (item.type === "lab") {
      openLab(item.id);
      closePalette();
      return;
    }
    if (item.code) {
      closePalette();
      const ok = await copyToClipboard(item.code);
      showToast(ok ? `Đã copy: ${item.title}` : "Không copy được");
    }
  }

  function updateLab(id, patch) {
    setLabs((prev) =>
      prev.map((lab) => (lab.id === id ? { ...lab, ...patch, updatedAt: now() } : lab))
    );
  }

  function renameLab(id, title) {
    const value = String(title || "").trim();
    if (!value) return;
    updateLab(id, { title: value });
    showToast("Đã đổi tên lab");
  }

  function createBlankLab() {
    const lab = newLab(`Lab ${labs.length + 1}`);
    setLabs((prev) => [lab, ...prev]);
    setOpenIds((prev) => [...prev, lab.id]);
    setActiveId(lab.id);
    collapseSidebar();
    showToast("Đã tạo lab mới");
  }

  function openLab(id) {
    if (!labs.some((lab) => lab.id === id)) return;
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveId(id);
    collapseSidebar();
  }

  function closeTab(id) {
    const next = openIds.filter((x) => x !== id);
    setOpenIds(next);
    if (activeId === id) setActiveId(next[next.length - 1] || null);
  }

  function deleteLab(id) {
    const lab = labs.find((item) => item.id === id);
    if (!lab) return;
    if (!window.confirm(`Xoá lab "${lab.title}"? Không thể hoàn tác.`)) return;
    setLabs((prev) => prev.filter((item) => item.id !== id));
    setOpenIds((prev) => prev.filter((x) => x !== id));
    if (activeId === id) setActiveId(null);
    showToast("Đã xoá lab");
  }

  function showBoard() {
    setActiveId(null);
  }

  function addBlock(labId, type) {
    const block = type === "note" ? newNoteBlock() : newBlankBlock();
    setLabs((prev) =>
      prev.map((lab) =>
        lab.id === labId
          ? { ...lab, blocks: [...lab.blocks, block], updatedAt: now() }
          : lab
      )
    );
    if (type === "checklist") setFocusBlockId(block.id);
    showToast(type === "note" ? "Đã thêm note block" : "Đã thêm checklist block");
  }

  function removeBlock(labId, block) {
    const hasContent =
      (block.steps && block.steps.length) ||
      (block.payloads && block.payloads.length) ||
      (block.note && block.note.trim());
    if (hasContent && !window.confirm("Xoá block này?")) return;
    setLabs((prev) =>
      prev.map((lab) =>
        lab.id === labId
          ? {
              ...lab,
              blocks: lab.blocks.filter((item) => item.id !== block.id),
              updatedAt: now()
            }
          : lab
      )
    );
    showToast("Đã xoá block");
  }

  function updateBlock(labId, blockId, patch) {
    setLabs((prev) =>
      prev.map((lab) => {
        if (lab.id !== labId) return lab;
        return {
          ...lab,
          updatedAt: now(),
          blocks: lab.blocks.map((block) => {
            if (block.id !== blockId) return block;
            return typeof patch === "function" ? patch(block) : { ...block, ...patch };
          })
        };
      })
    );
  }

  function loadTemplate(labId, blockId, template) {
    const next = newBlockFromTemplate(template);
    updateBlock(labId, blockId, { ...next, id: blockId });
    showToast(`Đã nhập template: ${template.title}`);
  }

  function addStep(labId, blockId, text) {
    const value = String(text || "").trim();
    if (!value) return;
    updateBlock(labId, blockId, (block) => ({
      ...block,
      steps: [...block.steps, newStep(value)]
    }));
  }

  function toggleStep(labId, blockId, stepId) {
    updateBlock(labId, blockId, (block) => ({
      ...block,
      steps: block.steps.map((step) =>
        step.id === stepId ? { ...step, done: !step.done } : step
      )
    }));
  }

  function editStep(labId, blockId, stepId, text) {
    updateBlock(labId, blockId, (block) => ({
      ...block,
      steps: block.steps.map((step) =>
        step.id === stepId ? { ...step, text } : step
      )
    }));
  }

  function deleteStep(labId, blockId, stepId) {
    updateBlock(labId, blockId, (block) => ({
      ...block,
      steps: block.steps.filter((step) => step.id !== stepId)
    }));
  }

  function toggleSolved(labId, solved) {
    setLabs((prev) =>
      prev.map((lab) => {
        if (lab.id !== labId) return lab;
        return {
          ...lab,
          status: solved
            ? "solved"
            : lab.status === "solved"
              ? "todo"
              : lab.status,
          solvedAt: solved ? lab.solvedAt || now() : null,
          updatedAt: now()
        };
      })
    );
    showToast(solved ? "Đã tick solved" : "Đã bỏ solved");
  }

  if (!hydrated) {
    return <div className="boot">CTF/PLAYBOOK</div>;
  }

  return (
    <div
      className={`app${sidebarOpen ? " sidebar-open" : " sidebar-closed"}${
        uiScale >= 120 ? " scale-up" : ""
      }${uiScale >= 140 ? " scale-xl" : ""}`}
      style={{ "--ui-inv": 100 / uiScale }}
    >
      <TopBar
        query={query}
        setQuery={setQuery}
        searchRef={searchRef}
        labCount={labs.length}
        solved={solvedCount}
        onBoard={showBoard}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((value) => !value)}
        onPalette={openPalette}
        uiScale={uiScale}
        onScaleStep={stepScale}
        onScaleChange={changeScale}
      />
      <div className="shell">
        <Sidebar
          labs={visibleLabs}
          total={labs.length}
          query={query}
          activeId={activeId}
          activeLab={activeLab}
          sidebarOpen={sidebarOpen}
          onOpen={openLab}
          onNew={createBlankLab}
          onBoard={showBoard}
          onJumpBlock={jumpToBlock}
          onRenameLab={renameLab}
          onClose={() => setSidebarOpen(false)}
        />
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Đóng sidebar"
          onClick={() => setSidebarOpen(false)}
        />
        <main className="main">
          <LabTabs
            labs={labs}
            openIds={openIds}
            activeId={activeId}
            onOpen={openLab}
            onClose={closeTab}
            onNew={createBlankLab}
          />
          {activeLab ? (
            <LabWorkspace
              lab={activeLab}
              onUpdate={(patch) => updateLab(activeLab.id, patch)}
              onDelete={() => deleteLab(activeLab.id)}
              onBoard={showBoard}
              onToggleSolved={(solved) => toggleSolved(activeLab.id, solved)}
              onAddChecklist={() => addBlock(activeLab.id, "checklist")}
              onAddNote={() => addBlock(activeLab.id, "note")}
              onQuickAdd={(id) => addPatternBlock(activeLab.id, TEMPLATE_MAP[id])}
              onRemoveBlock={removeBlock}
              onUpdateBlock={updateBlock}
              onLoadTemplate={loadTemplate}
              onAddStep={addStep}
              onToggleStep={toggleStep}
              onEditStep={editStep}
              onDeleteStep={deleteStep}
              focusBlockId={focusBlockId}
              onFocusHandled={() => setFocusBlockId(null)}
            />
          ) : (
            <Board labs={labs} onOpen={openLab} onNew={createBlankLab} />
          )}
        </main>
      </div>
      {paletteOpen ? (
        <div className="palette-backdrop" onMouseDown={closePalette}>
          <div
            className="palette"
            role="dialog"
            aria-modal="true"
            aria-label="Pattern palette"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="palette-top">
              <input
                ref={paletteInputRef}
                className="palette-input"
                value={paletteQuery}
                onChange={(event) => setPaletteQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    if (paletteResults.length) {
                      setPaletteIndex((value) =>
                        Math.min(value + 1, paletteResults.length - 1)
                      );
                    }
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setPaletteIndex((value) => Math.max(0, value - 1));
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    runPaletteAction(paletteResults[paletteIndex]);
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    closePalette();
                  }
                }}
                placeholder="Gõ: csp, html, base64, rop, jwt, upload..."
                spellCheck={false}
              />
              <div className="palette-context">
                {activeLab
                  ? `Thêm vào: ${activeLab.title}`
                  : "Chưa mở lab · Enter tạo lab mới từ pattern"}
              </div>
            </div>
            <div className="palette-results" role="listbox">
              {paletteResults.map((item, index) => (
                <button
                  key={`${item.type}:${item.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === paletteIndex}
                  className={`palette-item${index === paletteIndex ? " active" : ""}`}
                  onMouseEnter={() => setPaletteIndex(index)}
                  onClick={() => runPaletteAction(item)}
                >
                  <span className="palette-kind">
                    {item.type === "template"
                      ? "PATTERN"
                      : item.type === "payload"
                        ? "PAYLOAD"
                        : item.type === "command"
                          ? "CMD"
                          : "LAB"}
                  </span>
                  <span className="palette-main">
                    <span className="palette-title">{item.title}</span>
                    <span className="palette-sub">{item.group}</span>
                    {item.code ? (
                      <code className="palette-code">
                        {item.code.split("\n")[0].slice(0, 110)}
                      </code>
                    ) : null}
                  </span>
                  <span className="palette-action">
                    {item.type === "template"
                      ? activeLab
                        ? "Thêm"
                        : "Tạo lab"
                      : item.type === "lab"
                        ? "Mở"
                        : "Copy"}
                  </span>
                </button>
              ))}
              {!paletteResults.length ? (
                <div className="palette-empty">
                  Không thấy. Thử “csp”, “html”, “base64”, “rop”, “upload”.
                </div>
              ) : null}
            </div>
            <div className="palette-foot">
              <span>↑↓ chọn · Enter thêm/copy/mở · Esc đóng</span>
              <span>{paletteResults.length} kết quả</span>
            </div>
          </div>
        </div>
      ) : null}
      {toast ? <div className="toast show">{toast}</div> : null}
    </div>
  );
}

function TopBar({
  query,
  setQuery,
  searchRef,
  labCount,
  solved,
  onBoard,
  sidebarOpen,
  onToggleSidebar,
  onPalette,
  uiScale,
  onScaleStep,
  onScaleChange
}) {
  return (
    <header className="topbar">
      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggleSidebar}
        title="Ẩn/hiện sidebar (Ctrl+B)"
        aria-label="Ẩn/hiện sidebar"
        aria-expanded={sidebarOpen}
      >
        <span />
        <span />
        <span />
      </button>
      <button type="button" className="brand" onClick={onBoard} title="Lab board">
        <span className="brand-mark">BK</span>
        <span className="brand-text">
          <strong>
            CTF<span>/</span>PLAYBOOK
          </strong>
          <small>Web + Pwn · block workspace</small>
        </span>
      </button>
      <button
        type="button"
        className="palette-btn"
        onClick={onPalette}
        title="Tìm pattern / payload (Ctrl+K)"
      >
        <span>Ctrl K</span> Patterns
      </button>
      <div className="search-wrap">
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm lab... (/)"
          spellCheck={false}
        />
      </div>
      <div
        className="scale-control"
        role="group"
        aria-label="Thu phóng giao diện"
        title="Thu phóng toàn bộ giao diện"
      >
        <button
          type="button"
          className="scale-step"
          onClick={() => onScaleStep(-1)}
          disabled={uiScale <= SCALES[0]}
          aria-label="Giảm scale"
        >
          −
        </button>
        <select
          className="scale-select"
          value={uiScale}
          onChange={(event) => onScaleChange(Number(event.target.value))}
          aria-label="Scale giao diện"
        >
          {SCALES.map((value) => (
            <option key={value} value={value}>
              {value}%
            </option>
          ))}
        </select>
        <button
          type="button"
          className="scale-step"
          onClick={() => onScaleStep(1)}
          disabled={uiScale >= SCALES[SCALES.length - 1]}
          aria-label="Tăng scale"
        >
          +
        </button>
      </div>
      <div className="top-progress">
        {labCount} labs · {solved} solved
      </div>
    </header>
  );
}

function Sidebar({
  labs,
  total,
  query,
  activeId,
  activeLab,
  sidebarOpen,
  onOpen,
  onNew,
  onBoard,
  onJumpBlock,
  onRenameLab,
  onClose
}) {
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  function startRename(lab) {
    setRenamingId(lab.id);
    setRenameValue(lab.title);
  }

  function commitRename() {
    const value = renameValue.trim();
    if (renamingId && value) onRenameLab(renamingId, value);
    setRenamingId(null);
    setRenameValue("");
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  return (
    <aside
      className="sidebar"
      aria-label="Danh sách lab"
      inert={!sidebarOpen ? true : undefined}
    >
      <div className="side-head">
        <span className="side-label">Labs</span>
        <span className="side-count">
          {labs.length}
          {query ? `/${total}` : ""}
        </span>
        <button
          type="button"
          className="side-close"
          onClick={onClose}
          title="Đóng sidebar"
        >
          ×
        </button>
      </div>
      <div className="side-scroll">
        <div className="side-cells">
          {labs.map((lab) => {
            const status = statusMeta(lab.status);
            return (
              <div
                key={lab.id}
                className={`lab-cell${activeId === lab.id ? " active" : ""}`}
              >
                {renamingId === lab.id ? (
                  <input
                    className="lab-cell-rename"
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onBlur={commitRename}
                    onFocus={(event) => event.target.select()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitRename();
                      } else if (event.key === "Escape") {
                        event.preventDefault();
                        cancelRename();
                      }
                    }}
                    aria-label="Đổi tên lab"
                    spellCheck={false}
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    className="lab-cell-main"
                    onClick={() => onOpen(lab.id)}
                    onDoubleClick={() => startRename(lab)}
                    title={`${lab.title}${lab.target ? ` · ${lab.target}` : ""}`}
                    aria-current={activeId === lab.id ? "page" : undefined}
                  >
                    <span className="lab-cell-top">
                      <span className={`status-dot ${status.cls}`} />
                      <span className="lab-cell-title">{lab.title}</span>
                    </span>
                    <span className="lab-cell-meta">
                      {lab.category} · {lab.blocks.length}{" "}
                      {lab.blocks.length === 1 ? "block" : "blocks"} ·{" "}
                      {status.label}
                    </span>
                  </button>
                )}
                {renamingId !== lab.id ? (
                  <button
                    type="button"
                    className="lab-cell-edit"
                    onClick={() => startRename(lab)}
                    title="Đổi tên lab"
                    aria-label="Đổi tên lab"
                  >
                    ✎
                  </button>
                ) : null}
              </div>
            );
          })}
        {!labs.length ? (
          <div className="side-empty">
            {query ? "Không thấy lab." : "Chưa có lab."}
          </div>
        ) : null}
      </div>
      {activeLab ? (
        <div className="side-blocks">
          <div className="side-subhead">
            <span>Blocks</span>
            <span className="side-count">{activeLab.blocks.length}</span>
          </div>
          <div className="side-block-list">
            {activeLab.blocks.map((block) => {
              const steps = block.steps || [];
              const done = steps.filter((step) => step.done).length;
              return (
                <button
                  key={block.id}
                  type="button"
                  className="side-block-cell"
                  onClick={() => onJumpBlock(block.id)}
                  title={`${block.title || "Block"}${
                    block.group ? ` · ${block.group}` : ""
                  }`}
                >
                  <span className="side-block-top">
                    <span className="side-block-title">
                      {block.type === "note" ? "Notes" : block.title}
                    </span>
                    {block.type === "checklist" && steps.length ? (
                      <span className="side-block-progress">
                        {done}/{steps.length}
                      </span>
                    ) : null}
                  </span>
                  <span className="side-block-meta">
                    {block.type === "note"
                      ? "Note"
                      : block.group || "Checklist"}
                  </span>
                </button>
              );
            })}
            {!activeLab.blocks.length ? (
              <div className="side-blocks-empty">Chưa có block.</div>
            ) : null}
          </div>
        </div>
      ) : null}
      </div>
      <div className="sidebar-footer">
        <button type="button" className="btn btn-primary" onClick={onNew}>
          ＋ New lab
        </button>
        <button type="button" className="btn" onClick={onBoard}>
          Lab board
        </button>
      </div>
    </aside>
  );
}

function LabTabs({ labs, openIds, activeId, onOpen, onClose, onNew }) {
  return (
    <div className="tabbar">
      {openIds.map((id) => {
        const lab = labs.find((item) => item.id === id);
        if (!lab) return null;
        const status = statusMeta(lab.status);
        return (
          <div key={id} className={`tab${activeId === id ? " active" : ""}`}>
            <button type="button" className="tab-label" onClick={() => onOpen(id)}>
              <span className={`status-dot ${status.cls}`} />
              <span>{lab.title}</span>
            </button>
            <button
              type="button"
              className="tab-close"
              onClick={() => onClose(id)}
              title="Đóng tab (lab vẫn còn trong board)"
            >
              ×
            </button>
          </div>
        );
      })}
      <button type="button" className="tab-add" onClick={onNew} title="New lab">
        ＋
      </button>
      {!openIds.length ? <span className="tab-empty">Chưa mở lab</span> : null}
    </div>
  );
}

function Board({ labs, onOpen, onNew }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const sorted = labs
    .slice()
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const filtered = sorted.filter(
    (lab) =>
      (statusFilter === "all" || lab.status === statusFilter) &&
      (catFilter === "all" || lab.category === catFilter)
  );
  const solved = labs.filter((lab) => lab.status === "solved").length;
  const webLabs = labs.filter((lab) => lab.category === "Web");
  const pwnLabs = labs.filter((lab) => lab.category === "Pwn");
  const webSolved = webLabs.filter((lab) => lab.status === "solved").length;
  const pwnSolved = pwnLabs.filter((lab) => lab.status === "solved").length;

  return (
    <div className="welcome">
      <div className="kicker">CTF Playbook / Web + Pwn</div>
      <h1>Labs</h1>
      <p className="summary">
        Mỗi tab là một lab. Trong lab, thêm block rồi nhập template checklist
        (csp, upload, ret2libc, easy csp...) để làm việc. Tick Solved khi xong.
      </p>
      <div className="board-actions">
        <button type="button" className="btn btn-primary" onClick={onNew}>
          ＋ New lab
        </button>
      </div>

      <div className="board-stats">
        {solved}/{labs.length} solved · Web {webSolved}/{webLabs.length} · Pwn{" "}
        {pwnSolved}/{pwnLabs.length}
      </div>

      <div className="filter-chips">
        <span className="filter-label">Status</span>
        {["all", "todo", "doing", "solved"].map((value) => (
          <button
            key={value}
            type="button"
            className={`chip-btn${statusFilter === value ? " active" : ""}`}
            onClick={() => setStatusFilter(value)}
          >
            {value === "all" ? "All" : statusMeta(value).label}
          </button>
        ))}
        <span className="filter-label">Category</span>
        {["all", "Web", "Pwn"].map((value) => (
          <button
            key={value}
            type="button"
            className={`chip-btn${catFilter === value ? " active" : ""}`}
            onClick={() => setCatFilter(value)}
          >
            {value === "all" ? "All" : value}
          </button>
        ))}
      </div>

      <div className="lab-list">
        {filtered.length ? (
          filtered.map((lab) => {
            const status = statusMeta(lab.status);
            const steps = lab.blocks.reduce(
              (n, block) =>
                n + (block.type === "checklist" ? block.steps.length : 0),
              0
            );
            const meta =
              lab.status === "solved"
                ? `Solved ${formatTime(lab.solvedAt)}`
                : `${status.label} · ${formatTime(lab.updatedAt)}`;
            return (
              <button
                key={lab.id}
                type="button"
                className="lab-row"
                onClick={() => onOpen(lab.id)}
              >
                <span className={`status-dot ${status.cls}`} />
                <span className="lab-row-main">
                  <strong>{lab.title}</strong>
                  <small>
                    {lab.category} · {lab.blocks.length} blocks · {steps} steps
                    {lab.target ? ` · ${lab.target}` : ""}
                  </small>
                </span>
                <span className="lab-row-meta">{meta}</span>
              </button>
            );
          })
        ) : (
          <div className="empty-state">
            {labs.length
              ? "Không có lab khớp filter."
              : "Chưa có lab. Tạo lab đầu tiên để bắt đầu."}
          </div>
        )}
      </div>

      <div className="board-help">
        <h2>Cách dùng</h2>
        <ul>
          <li>
            Tạo lab bằng <code>＋ New lab</code>, một tab lab sẽ mở.
          </li>
          <li>
            <code>Ctrl+K</code> mở palette: gõ <code>csp</code>,{" "}
            <code>jwt</code>, <code>base64</code>, <code>rop</code>... rồi Enter
            để thêm pattern hoặc copy payload.
          </li>
          <li>
            Trong lab, dùng hàng <code>Quick add</code> để thêm pattern một
            click; hoặc bấm <code>＋ Add checklist block</code> và nhập template.
          </li>
          <li>
            Sidebar luôn hiện toàn bộ lab dạng cell lớn; bấm bút chì ✎ hoặc
            double-click tên lab để đổi tên. Lab đang mở có thêm mục{" "}
            <code>Blocks</code> để bấm thẳng tới từng block. Header và footer{" "}
            <code>New lab</code> / <code>Lab board</code> luôn cố định.
          </li>
          <li>
            Rail phải sticky và có scroll riêng khi màn thấp; scale ≥120% tự đưa
            rail xuống dưới.
          </li>
          <li>
            <code>Ctrl+B</code> ẩn/hiện sidebar; layout tự co khi chia đôi màn
            hình. Encode/Decode nằm ở rail phải.
          </li>
          <li>
            Góc phải topbar có <code>− 100% +</code> để thu phóng 75–150% cho
            màn lớn/nhỏ; scale được lưu lại.
          </li>
          <li>
            Mỗi block có checklist và payload riêng. Tick <code>Solved</code>{" "}
            trong rail khi xong.
          </li>
          <li>Mọi thứ lưu trong localStorage của trình duyệt.</li>
        </ul>
      </div>
    </div>
  );
}

function LabWorkspace({
  lab,
  onUpdate,
  onDelete,
  onBoard,
  onToggleSolved,
  onAddChecklist,
  onAddNote,
  onQuickAdd,
  onRemoveBlock,
  onUpdateBlock,
  onLoadTemplate,
  onAddStep,
  onToggleStep,
  onEditStep,
  onDeleteStep,
  focusBlockId,
  onFocusHandled
}) {
  const status = statusMeta(lab.status);
  const totalSteps = lab.blocks.reduce(
    (n, block) => n + (block.type === "checklist" ? block.steps.length : 0),
    0
  );
  const doneSteps = lab.blocks.reduce(
    (n, block) =>
      n +
      (block.type === "checklist"
        ? block.steps.filter((step) => step.done).length
        : 0),
    0
  );
  const quickPatterns =
    lab.category === "Pwn"
      ? QUICK_PATTERNS.Pwn
      : lab.category === "Web"
        ? QUICK_PATTERNS.Web
        : [...QUICK_PATTERNS.Web, ...QUICK_PATTERNS.Pwn];

  return (
    <div className="lab-page">
      <div className="crumb">
        Lab / {lab.category} / {status.label}
      </div>
      <input
        className="lab-title"
        value={lab.title}
        onChange={(event) => onUpdate({ title: event.target.value })}
        placeholder="Tên lab..."
        spellCheck={false}
      />
      <div className="lab-meta">
        <label className="field">
          <span>Category</span>
          <select
            value={lab.category}
            onChange={(event) => onUpdate({ category: event.target.value })}
          >
            <option>Web</option>
            <option>Pwn</option>
            <option>Other</option>
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select
            value={lab.status}
            onChange={(event) =>
              onUpdate({
                status: event.target.value,
                solvedAt:
                  event.target.value === "solved"
                    ? lab.solvedAt || Date.now()
                    : null
              })
            }
          >
            <option value="todo">Todo</option>
            <option value="doing">Doing</option>
            <option value="solved">Solved</option>
          </select>
        </label>
        <label className="field field-wide">
          <span>Target</span>
          <input
            value={lab.target}
            onChange={(event) => onUpdate({ target: event.target.value })}
            placeholder="http://host:port hoặc host:port"
            spellCheck={false}
          />
        </label>
        <span className="lab-updated">
          {lab.blocks.length} blocks · {doneSteps}/{totalSteps} steps
        </span>
      </div>

      <div className="quick-patterns">
        <span className="quick-label">Quick add</span>
        {quickPatterns.map(([id, label]) => {
          const exists = lab.blocks.some((block) => block.templateId === id);
          return (
            <button
              key={id}
              type="button"
              className={`quick-chip${exists ? " done" : ""}`}
              disabled={exists}
              onClick={() => onQuickAdd(id)}
              title={exists ? "Pattern đã có trong lab" : `Thêm pattern ${label}`}
            >
              {label}
              {exists ? " ✓" : ""}
            </button>
          );
        })}
      </div>

      <div className="lab-grid">
        <div className="lab-blocks">
          {lab.blocks.map((block, index) => (
            <Block
              key={block.id}
              labId={lab.id}
              labCategory={lab.category}
              block={block}
              index={index}
              onChange={onUpdateBlock}
              onRemove={onRemoveBlock}
              onLoadTemplate={onLoadTemplate}
              onAddStep={onAddStep}
              onToggleStep={onToggleStep}
              onEditStep={onEditStep}
              onDeleteStep={onDeleteStep}
              focusBlockId={focusBlockId}
              onFocusHandled={onFocusHandled}
            />
          ))}
          {!lab.blocks.length ? (
            <div className="empty-blocks">
              Chưa có block. Bấm <b>Add checklist block</b> rồi nhập template
              checklist vào ô tìm kiếm.
            </div>
          ) : null}
          <div className="add-block">
            <button type="button" className="btn btn-primary" onClick={onAddChecklist}>
              ＋ Add checklist block
            </button>
            <button type="button" className="btn" onClick={onAddNote}>
              ＋ Note block
            </button>
          </div>
        </div>

        <aside className="lab-rail">
          <section className="rail-block">
            <h2>Flag</h2>
            <input
              className="field-input"
              value={lab.flag}
              onChange={(event) => onUpdate({ flag: event.target.value })}
              placeholder="flag{...}"
              spellCheck={false}
            />
          </section>
          <section className="rail-block">
            <h2>Status</h2>
            <label className="solved-toggle">
              <input
                type="checkbox"
                checked={lab.status === "solved"}
                onChange={(event) => onToggleSolved(event.target.checked)}
              />
              <span>Solved</span>
            </label>
            {lab.solvedAt ? (
              <p className="rail-copy">Solved {formatTime(lab.solvedAt)}</p>
            ) : null}
          </section>
          <section className="rail-block">
            <h2>Blocks</h2>
            <p className="rail-copy">
              {lab.blocks.length} blocks · {totalSteps} steps
            </p>
          </section>
          <section className="rail-block encoding-block">
            <h2>Encode / Decode</h2>
            <EncodePanel />
          </section>
          <section className="rail-block">
            <h2>Lab</h2>
            <div className="rail-actions">
              <button type="button" className="btn" onClick={onBoard}>
                Lab board
              </button>
              <button type="button" className="btn btn-danger" onClick={onDelete}>
                Delete lab
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Block({
  labId,
  labCategory,
  block,
  index,
  onChange,
  onRemove,
  onLoadTemplate,
  onAddStep,
  onToggleStep,
  onEditStep,
  onDeleteStep,
  focusBlockId,
  onFocusHandled
}) {
  const [search, setSearch] = useState("");
  const [changing, setChanging] = useState(!block.templateId);
  const [newStepText, setNewStepText] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInput = useRef(null);
  const isChecklist = block.type === "checklist";
  const isBlank = !block.templateId;
  const steps = block.steps || [];
  const done = steps.filter((step) => step.done).length;
  const hasSearch = search.trim().length > 0;
  const searchExpanded =
    !isBlank || searchFocused || hasSearch || steps.length > 0;

  function handleSearchBlur(event) {
    const next = event.relatedTarget;
    const container = event.currentTarget.closest(".block");
    if (!next || !container?.contains(next)) setSearchFocused(false);
  }
  const results = useMemo(
    () => searchTemplates(search, labCategory),
    [search, labCategory]
  );
  const searchPlaceholder =
    labCategory === "Pwn"
      ? "Nhập mẫu checklist Pwn: ret2libc, fmt, heap, bof3..."
      : labCategory === "Web"
        ? "Nhập mẫu checklist Web: csp, upload, jwt, ssti..."
        : "Nhập mẫu checklist: csp, upload, ret2libc...";

  useEffect(() => {
    if (focusBlockId === block.id) {
      setChanging(true);
      const timer = setTimeout(() => searchInput.current?.focus(), 40);
      onFocusHandled();
      return () => clearTimeout(timer);
    }
  }, [focusBlockId, block.id]);

  function pickTemplate(template) {
    if (
      (block.templateId || block.steps.length) &&
      !window.confirm(`Thay checklist hiện tại bằng "${template.title}"?`)
    ) {
      return;
    }
    onLoadTemplate(labId, block.id, template);
    setSearch("");
    setChanging(false);
  }

  const showSearch =
    block.type === "checklist" && (!block.templateId || changing);

  return (
    <section className={`block ${block.type}`} data-block-id={block.id}>
      <div className="block-head">
        <span className="block-num">Block {String(index + 1).padStart(2, "0")}</span>
        <span className="block-kind">
          {block.type === "note"
            ? "Note"
            : block.templateId
              ? block.group || "Checklist"
              : "Checklist trắng"}
        </span>
        <span className="block-title">
          {block.type === "note" ? "Notes" : block.title}
        </span>
        {isChecklist ? (
          <span className="block-progress">
            {done}/{steps.length}
          </span>
        ) : null}
        <button
          type="button"
          className="block-remove"
          onClick={() => onRemove(labId, block)}
          title="Xoá block"
        >
          ×
        </button>
      </div>

      <div className="block-body">
        {block.type === "note" ? (
          <textarea
            className="note-block"
            value={block.note || ""}
            onChange={(event) => onChange(labId, block.id, { note: event.target.value })}
            placeholder="Ghi chú, payload đã thử, kết quả..."
          />
        ) : (
          <>
            {showSearch ? (
              <div className="template-search">
                <input
                  ref={searchInput}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={handleSearchBlur}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && results[0]) {
                      event.preventDefault();
                      pickTemplate(results[0]);
                    }
                    if (event.key === "Escape") {
                      setSearch("");
                      if (block.templateId) setChanging(false);
                    }
                  }}
                  placeholder={searchPlaceholder}
                  spellCheck={false}
                  autoFocus={focusBlockId === block.id}
                />
                {searchExpanded ? (
                  <>
                    <div className="template-hint">
                      Enter chọn gợi ý đầu tiên · gõ để tìm đầy đủ · Esc đóng
                    </div>
                    {hasSearch ? (
                      <div className="template-results">
                        {results.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            className="template-result"
                            onClick={() => pickTemplate(template)}
                          >
                            <span className="template-result-title">
                              {template.title}
                            </span>
                            <span className="template-result-meta">
                              {template.group} · {template.steps?.length || 0} bước
                              {template.payloads?.length
                                ? ` · ${template.payloads.length} payload`
                                : ""}
                            </span>
                          </button>
                        ))}
                        {!results.length ? (
                          <div className="template-empty">
                            Không thấy template. Thử “csp”, “upload”, “ret2libc”.
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="template-suggest">
                        {results.slice(0, 3).map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            className="template-chip"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => pickTemplate(template)}
                          >
                            {template.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : null}
                {block.templateId ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setChanging(false)}
                  >
                    Đóng
                  </button>
                ) : null}
              </div>
            ) : null}

            {steps.length > 0 ? (
              <div className="step-list">
                {steps.map((step) => (
                  <div key={step.id} className="step-row">
                    <input
                      type="checkbox"
                      checked={step.done}
                      onChange={() => onToggleStep(labId, block.id, step.id)}
                    />
                    <input
                      key={`${step.id}:${step.text}`}
                      className="step-text"
                      defaultValue={step.text}
                      onBlur={(event) =>
                        onEditStep(labId, block.id, step.id, event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                    />
                    <button
                      type="button"
                      className="step-del"
                      onClick={() => onDeleteStep(labId, block.id, step.id)}
                      title="Xoá bước"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {searchExpanded ? (
              <form
                className="add-step"
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = newStepText.trim();
                  if (!value) return;
                  onAddStep(labId, block.id, value);
                  setNewStepText("");
                }}
              >
                <input
                  value={newStepText}
                  onChange={(event) => setNewStepText(event.target.value)}
                  placeholder="Thêm bước..."
                />
                <button type="submit" className="btn">
                  Add step
                </button>
              </form>
            ) : null}

            {block.templateId && !changing ? (
              <button
                type="button"
                className="link-btn"
                onClick={() => setChanging(true)}
              >
                Đổi template
              </button>
            ) : null}

            {block.payloads?.length ? (
              <details className="block-details" open>
                <summary>Payloads ({block.payloads.length})</summary>
                {block.payloads.map((payload) => (
                  <CodeBlock
                    key={`${payload.title}:${payload.code.slice(0, 24)}`}
                    title={payload.title}
                    code={payload.code}
                  />
                ))}
              </details>
            ) : null}

            {block.commands?.length ? (
              <details className="block-details">
                <summary>Commands ({block.commands.length})</summary>
                {block.commands.map((command) => (
                  <CodeBlock
                    key={`${command.title}:${command.code.slice(0, 24)}`}
                    title={command.title}
                    code={command.code}
                  />
                ))}
              </details>
            ) : null}

            {block.gotchas?.length ? (
              <details className="block-details">
                <summary>Gotchas</summary>
                <ul>
                  {block.gotchas.map((gotcha, idx) => (
                    <li key={idx}>{gotcha}</li>
                  ))}
                </ul>
              </details>
            ) : null}

            {block.links?.length ? (
              <details className="block-details">
                <summary>Links</summary>
                <div className="links">
                  {block.links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.title}
                    </a>
                  ))}
                </div>
              </details>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function EncodePanel() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  function apply(label, fn) {
    try {
      setOutput(fn(input));
      setNote(label);
    } catch (error) {
      setOutput("ERROR: " + String(error.message || error));
      setNote(label);
    }
  }

  function urlEncode(value) {
    return encodeURIComponent(value);
  }

  function urlDecode(value) {
    return decodeURIComponent(value);
  }

  function htmlEncode(value) {
    return value.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  function htmlDecode(value) {
    const ta = document.createElement("textarea");
    ta.innerHTML = value;
    return ta.value;
  }

  function bytesToBase64(bytes) {
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }

  function base64Encode(value) {
    return bytesToBase64(new TextEncoder().encode(value));
  }

  function base64Decode(value) {
    const binary = atob(value.replace(/\s+/g, ""));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function base64UrlEncode(value) {
    return base64Encode(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlDecode(value) {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    return base64Decode(padded);
  }

  function hexEncode(value) {
    return Array.from(new TextEncoder().encode(value))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function hexDecode(value) {
    const clean = value.replace(/[^0-9a-f]/gi, "");
    if (clean.length % 2 !== 0) throw new Error("hex lẻ");
    const bytes = Uint8Array.from(
      (clean.match(/.{2}/g) || []).map((x) => parseInt(x, 16))
    );
    return new TextDecoder().decode(bytes);
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = output;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {}
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1100);
  }

  return (
    <div className="encoding-panel">
      <textarea
        className="encoding-input"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Paste payload/text..."
        spellCheck={false}
      />
      <div className="encoding-grid">
        <button className="btn" type="button" onClick={() => apply("URL encode", urlEncode)}>URL enc</button>
        <button className="btn" type="button" onClick={() => apply("URL decode", urlDecode)}>URL dec</button>
        <button className="btn" type="button" onClick={() => apply("HTML encode", htmlEncode)}>HTML enc</button>
        <button className="btn" type="button" onClick={() => apply("HTML decode", htmlDecode)}>HTML dec</button>
        <button className="btn" type="button" onClick={() => apply("Base64 encode", base64Encode)}>B64 enc</button>
        <button className="btn" type="button" onClick={() => apply("Base64 decode", base64Decode)}>B64 dec</button>
        <button className="btn" type="button" onClick={() => apply("Base64URL encode", base64UrlEncode)}>B64url enc</button>
        <button className="btn" type="button" onClick={() => apply("Base64URL decode", base64UrlDecode)}>B64url dec</button>
        <button className="btn" type="button" onClick={() => apply("Hex encode", hexEncode)}>HEX enc</button>
        <button className="btn" type="button" onClick={() => apply("Hex decode", hexDecode)}>HEX dec</button>
      </div>
      <textarea
        className="encoding-output"
        value={output}
        readOnly
        placeholder="Kết quả..."
        spellCheck={false}
      />
      <div className="encoding-actions">
        <span className="encoding-note">{note || "URL · HTML · B64 · HEX"}</span>
        <button className="btn" type="button" onClick={() => setInput(output)} disabled={!output}>
          Dùng output
        </button>
        <button className="btn" type="button" onClick={copyOutput} disabled={!output}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function CodeBlock({ title, code }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch {}
      textarea.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1100);
  }

  return (
    <div className="code-block">
      <div className="code-head">
        <span>{title}</span>
        <button type="button" className="copy" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
