import { ICONS, glyphFor } from "./icons";

type Attrs = Record<string, any>;
type Kid = Node | string | number | null | undefined | false | Kid[];

/** Tiny DOM builder for the workbench chrome. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs | null,
  ...kids: Kid[]
): HTMLElementTagNameMap[K];
export function h(tag: string, attrs?: Attrs | null, ...kids: Kid[]): HTMLElement;
export function h(tag: string, attrs: Attrs | null = {}, ...kids: Kid[]): HTMLElement {
  const el = document.createElement(tag);
  for (const k in attrs ?? {}) {
    const v = attrs![k];
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  append(el, kids);
  return el;
}

function append(el: HTMLElement, kids: Kid[]) {
  for (const kid of kids) {
    if (kid == null || kid === false) continue;
    if (Array.isArray(kid)) append(el, kid);
    else el.append(kid instanceof Node ? kid : String(kid));
  }
}

export function icon(name: string, cls = ""): HTMLElement {
  const span = document.createElement("span");
  span.className = "i" + (cls ? " " + cls : "");
  span.innerHTML = ICONS[name] ?? "";
  return span;
}

export function fileIcon(path: string): HTMLElement {
  const g = glyphFor(path);
  return h(
    "span",
    { class: "fi", style: { color: g.color }, "data-len": String(g.label.length) },
    g.label,
  );
}

export const basename = (p: string) => p.slice(p.lastIndexOf("/") + 1);
export const dirname = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");

export function safeStorage<T>(key: string, fallback: T): { get(): T; set(v: T): void } {
  return {
    get() {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : (JSON.parse(raw) as T);
      } catch {
        return fallback;
      }
    },
    set(v: T) {
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {
        // storage unavailable: per-viewer convenience only
      }
    },
  };
}
