import base from "./templates.json";
import presets from "./presets";
import { normalize } from "./storage";

export const TEMPLATES = [...base, ...presets];
export const TEMPLATE_MAP = Object.fromEntries(
  TEMPLATES.map((template) => [template.id, template])
);

export const GROUPS = ["Web", "Pwn", "Web patterns", "Pwn patterns"];

export function searchTemplates(query, category) {
  const pool =
    category && category !== "Other"
      ? TEMPLATES.filter((template) => template.category === category)
      : TEMPLATES;
  const q = normalize(query.trim());
  if (!q) {
    return pool.filter((template) => template.priority === "high").slice(0, 12);
  }
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const template of pool) {
    const title = normalize(template.title);
    const group = normalize(template.group);
    const tags = normalize((template.tags || []).join(" "));
    const haystack = normalize(
      [
        template.title,
        template.summary,
        template.group,
        template.category,
        ...(template.tags || []),
        ...(template.steps || []),
        ...(template.payloads || []).flatMap((p) => [p.title, p.code]),
        ...(template.commands || []).flatMap((c) => [c.title, c.code]),
        ...(template.gotchas || [])
      ].join(" ")
    );
    if (!terms.every((term) => haystack.includes(term))) continue;
    let score = 1;
    if (title === q) score += 100;
    if (title.startsWith(q)) score += 50;
    if (title.includes(q)) score += 30;
    if (tags.split(/\s+/).includes(q)) score += 20;
    if (group.includes(q)) score += 10;
    if (template.id.startsWith("pattern-")) score += 18;
    scored.push({ template, score });
  }
  scored.sort(
    (a, b) => b.score - a.score || a.template.title.localeCompare(b.template.title)
  );
  return scored.slice(0, 20).map((item) => item.template);
}
