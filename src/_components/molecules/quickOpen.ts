import { basename, dirname, fileIcon, h, icon } from "../atoms/dom";

export type Command = { id: string; label: string; keys?: string; run: () => void };

type Item = { label: string; detail?: string; icon?: HTMLElement; keys?: string; run: () => void; score: number; hits: number[] };

/** Fuzzy subsequence match. Returns matched indexes or null. */
export function fuzzy(query: string, text: string): { score: number; hits: number[] } | null {
  if (!query) return { score: 0, hits: [] };
  const q = query.toLowerCase();
  const s = text.toLowerCase();
  const hits: number[] = [];
  let score = 0;
  let last = -1;
  for (let i = 0, j = 0; i < q.length; i++) {
    const found = s.indexOf(q[i], j);
    if (found < 0) return null;
    hits.push(found);
    score += found === last + 1 ? 3 : 1;
    if (found === 0 || "/._- ".includes(s[found - 1] ?? "")) score += 2;
    last = found;
    j = found + 1;
  }
  return { score: score - s.length * 0.01, hits };
}

/**
 * Quick open (Ctrl+P), command palette (">"), go to line (":"), steps ("#").
 */
export class QuickOpen {
  private el: HTMLElement | null = null;
  private input!: HTMLInputElement;
  private listEl!: HTMLElement;
  private items: Item[] = [];
  private index = 0;
  private restore: HTMLElement | null = null;

  constructor(
    private src: {
      files(): string[];
      commands(): Command[];
      steps(): { label: string; detail: string; run: () => void }[];
      openFile(path: string): void;
      gotoLine(line: number): void;
    },
  ) {}

  show(prefix = "") {
    if (this.el) {
      this.input.value = prefix;
      this.refresh();
      this.input.focus();
      return;
    }
    this.restore = document.activeElement as HTMLElement | null;
    this.input = h("input", {
      class: "qo-input",
      spellcheck: "false",
      placeholder: "Search files by name (> commands, : line, # step)",
      oninput: () => this.refresh(),
      onkeydown: (e: KeyboardEvent) => this.key(e),
    }) as HTMLInputElement;
    this.listEl = h("div", { class: "qo-list", role: "listbox" });
    this.el = h(
      "div",
      { class: "qo-backdrop", onmousedown: (e: MouseEvent) => e.target === e.currentTarget && this.hide() },
      h("div", { class: "qo" }, this.input, this.listEl),
    );
    document.body.append(this.el);
    this.input.value = prefix;
    this.refresh();
    this.input.focus();
  }

  hide(refocus = true) {
    this.el?.remove();
    this.el = null;
    if (refocus) this.restore?.focus?.();
  }

  private refresh() {
    const v = this.input.value;
    let items: Item[] = [];
    if (v.startsWith(">")) {
      const q = v.slice(1).trim();
      for (const c of this.src.commands()) {
        const m = fuzzy(q, c.label);
        if (m) items.push({ label: c.label, keys: c.keys, run: c.run, ...m });
      }
    } else if (v.startsWith(":")) {
      const n = parseInt(v.slice(1), 10);
      items = [
        {
          label: Number.isFinite(n) ? `Go to line ${n}` : "Type a line number",
          run: () => Number.isFinite(n) && this.src.gotoLine(n),
          score: 0,
          hits: [],
        },
      ];
    } else if (v.startsWith("#")) {
      const q = v.slice(1).trim();
      for (const s of this.src.steps()) {
        const m = fuzzy(q, s.label);
        if (m) items.push({ label: s.label, detail: s.detail, run: s.run, ...m });
      }
      if (!q) items.forEach((it, i) => (it.score = -i));
    } else {
      const q = v.trim();
      for (const f of this.src.files()) {
        const name = basename(f);
        const m = fuzzy(q, name) ?? fuzzy(q, f);
        if (m) {
          const onName = fuzzy(q, name);
          items.push({
            label: name,
            detail: dirname(f),
            icon: fileIcon(f),
            run: () => this.src.openFile(f),
            score: (onName?.score ?? m.score - 5) + (onName ? 5 : 0),
            hits: onName?.hits ?? [],
          });
        }
      }
    }
    if (!v.startsWith("#")) items.sort((a, b) => b.score - a.score);
    else items.sort((a, b) => b.score - a.score);
    this.items = items.slice(0, 50);
    this.index = 0;
    this.render();
  }

  private render() {
    this.listEl.replaceChildren();
    if (!this.items.length) {
      this.listEl.append(h("div", { class: "qo-empty" }, "No matching results"));
      return;
    }
    this.items.forEach((it, i) => {
      const label = h("span", { class: "qo-label" });
      const hits = new Set(it.hits);
      for (let c = 0; c < it.label.length; c++) {
        label.append(hits.has(c) ? h("b", null, it.label[c]) : it.label[c]);
      }
      this.listEl.append(
        h(
          "div",
          {
            class: "qo-item" + (i === this.index ? " active" : ""),
            role: "option",
            onmousemove: () => {
              if (this.index !== i) {
                this.index = i;
                this.render();
              }
            },
            onclick: () => this.pick(i),
          },
          it.icon ?? (this.input.value.startsWith(">") ? icon("chevronRight", "qo-cmd") : null),
          label,
          it.detail ? h("span", { class: "qo-detail" }, it.detail) : null,
          it.keys ? h("span", { class: "qo-keys" }, ...it.keys.split(" ").map((k) => h("kbd", null, k))) : null,
        ),
      );
    });
    this.listEl.querySelector(".active")?.scrollIntoView({ block: "nearest" });
  }

  private pick(i: number) {
    const it = this.items[i];
    if (!it) return;
    this.hide(false);
    it.run();
  }

  private key(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      this.hide();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = this.items.length;
      if (!n) return;
      this.index = (this.index + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
      this.render();
    } else if (e.key === "Enter") {
      e.preventDefault();
      this.pick(this.index);
    }
  }
}
