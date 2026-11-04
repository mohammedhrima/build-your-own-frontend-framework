// Small hand-drawn icon set. 16×16, stroke = currentColor.
const S = (body: string, fill = false) =>
  `<svg viewBox="0 0 16 16" width="16" height="16" fill="${fill ? "currentColor" : "none"}" stroke="${
    fill ? "none" : "currentColor"
  }" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS: Record<string, string> = {
  files: S(`<path d="M4 1.5h5l3 3v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z"/><path d="M9 1.5v3h3"/><path d="M6 14.5h6.5a1 1 0 0 0 1-1V6"/>`),
  search: S(`<circle cx="7" cy="7" r="4.5"/><path d="M10.4 10.4 14 14"/>`),
  steps: S(`<circle cx="3.5" cy="4" r="1.2"/><circle cx="3.5" cy="8" r="1.2"/><circle cx="3.5" cy="12" r="1.2"/><path d="M6.5 4h7M6.5 8h7M6.5 12h7"/>`),
  chevronRight: S(`<path d="M6 4l4 4-4 4"/>`),
  chevronDown: S(`<path d="M4 6l4 4 4-4"/>`),
  chevronLeft: S(`<path d="M10 4 6 8l4 4"/>`),
  folder: S(`<path d="M1.75 4.25a1 1 0 0 1 1-1h3.1l1.4 1.5h5.9a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H2.75a1 1 0 0 1-1-1z"/>`),
  folderOpen: S(`<path d="M1.75 12V4.25a1 1 0 0 1 1-1h3.1l1.4 1.5h5a1 1 0 0 1 1 1v1.1"/><path d="M1.75 12.75 3.6 7.6a1 1 0 0 1 .95-.65h9.3a.7.7 0 0 1 .65.95l-1.6 4.4a1 1 0 0 1-.95.65H2.6"/>`),
  close: S(`<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>`),
  arrowLeft: S(`<path d="M13 8H3.5M7.5 4 3.5 8l4 4"/>`),
  arrowRight: S(`<path d="M3 8h9.5M8.5 4l4 4-4 4"/>`),
  refresh: S(`<path d="M13 8a5 5 0 1 1-1.6-3.7"/><path d="M13 2.5v3h-3"/>`),
  info: S(`<circle cx="8" cy="8" r="5.75"/><path d="M8 7.25v3.5M8 5.2v.1"/>`),
  clear: S(`<circle cx="8" cy="8" r="5.75"/><path d="M3.9 12.1l8.2-8.2"/>`),
  filter: S(`<path d="M2.5 3.5h11l-4.25 5v4l-2.5 1.25V8.5z"/>`),
  warning: S(`<path d="M8 1.75 15 14H1z" fill="#f2c94c" stroke="none"/><path d="M8 6v4M8 11.6v.1" stroke="#1e1e1e" stroke-width="1.5"/>`),
  error: S(`<circle cx="8" cy="8" r="6.5" fill="#f28b82" stroke="none"/><path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke="#1e1e1e" stroke-width="1.5"/>`),
  diff: S(`<path d="M5 2v7M1.5 5.5h7"/><path d="M8.5 12.5h6" /><path d="M11 9V2.5h-1"/>`),
  download: S(`<path d="M8 2v8.5M4.5 7 8 10.5 11.5 7"/><path d="M2.5 13.5h11"/>`),
  revert: S(`<path d="M3 6.5h6.5a3.5 3.5 0 0 1 0 7H6"/><path d="M5.5 4 3 6.5 5.5 9"/>`),
  copy: S(`<rect x="5" y="5" width="8.5" height="8.5" rx="1.25"/><path d="M11 3.25V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h.25"/>`),
  check: S(`<path d="M3 8.5l3.2 3L13 4.5"/>`),
  collapse: S(`<path d="M3 2.5h10M3 13.5h10M5.5 6 8 8.5 10.5 6"/>`),
  cursor: S(`<path d="M3.5 2.5l9 4.6-3.9 1.2 2.6 4.4-1.6.9-2.6-4.4-2.6 2.9z"/>`),
  inspect: S(`<rect x="2" y="2" width="10" height="9" rx="1"/><path d="M8 8l6 2.5-2.6.8-.8 2.6z"/>`),
  layers: S(`<path d="M8 2 14 5.25 8 8.5 2 5.25z"/><path d="M2 8.5 8 11.75 14 8.5"/>`),
  bolt: S(`<path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z"/>`),
  terminal: S(`<rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1"/><path d="M4.5 6.5l2 1.75-2 1.75M8 10.5h3.5"/>`),
  more: S(`<circle cx="3.5" cy="8" r=".9" fill="currentColor"/><circle cx="8" cy="8" r=".9" fill="currentColor"/><circle cx="12.5" cy="8" r=".9" fill="currentColor"/>`),
  split: S(`<rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1"/><path d="M8 2.75v10.5"/>`),
  sun: S(`<circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"/>`),
  moon: S(`<path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z"/>`),
  play: S(`<path d="M5 3.5v9l7-4.5z" fill="currentColor"/>`),
  pause: S(`<path d="M5.5 3.5v9M10.5 3.5v9" stroke-width="2"/>`),
  panel: S(`<rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1"/><path d="M1.75 9.5h12.5"/>`),
  sidebar: S(`<rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1"/><path d="M6 2.75v10.5"/>`),
};

// ---- file icons: small colored glyphs, keyed by extension -------------------
type Glyph = { label: string; color: string };
const GLYPHS: Record<string, Glyph> = {
  ts: { label: "TS", color: "#4d9de0" },
  tsx: { label: "TSX", color: "#4cc3d9" },
  "d.ts": { label: "TS", color: "#8a96a8" },
  js: { label: "JS", color: "#e5c158" },
  jsx: { label: "JSX", color: "#e5c158" },
  json: { label: "{}", color: "#d8b45a" },
  html: { label: "<>", color: "#e07a4d" },
  css: { label: "#", color: "#a074d6" },
  md: { label: "M", color: "#7aa2c7" },
};

export function glyphFor(path: string): Glyph {
  const name = path.split("/").pop() ?? path;
  if (name.endsWith(".d.ts")) return GLYPHS["d.ts"];
  if (name === "package.json") return { label: "{}", color: "#8fbf6a" };
  if (name.startsWith("tsconfig")) return { label: "TS", color: "#4d9de0" };
  if (name.startsWith("vite.config")) return { label: "V", color: "#a37ff0" };
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
  return GLYPHS[ext] ?? { label: "•", color: "#8a96a8" };
}

export function languageName(path: string): string {
  if (path.endsWith(".tsx")) return "TypeScript JSX";
  if (path.endsWith(".ts")) return "TypeScript";
  if (path.endsWith(".json")) return path.includes("tsconfig") ? "JSON with Comments" : "JSON";
  if (path.endsWith(".html")) return "HTML";
  if (path.endsWith(".css")) return "CSS";
  return "Plain Text";
}
