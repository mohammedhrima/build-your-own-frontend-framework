import { EditorView, keymap, placeholder } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { syntaxHighlighting } from "@codemirror/language";
import { closeBrackets } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import type { FromFrame, Source, Val } from "../../../types/protocol";
import { h, icon, safeStorage } from "../../atoms/dom";
import { highlight } from "../editor";
import { argsKey, argsView, stackView, valueView, type ValueCtx } from "./valueView";

type ConsoleMsg = Extract<FromFrame, { kind: "console" }>;
type Level = "verbose" | "info" | "warn" | "error";

type Row = {
  el: HTMLElement;
  level: Level;
  key: string;
  count: number;
  badge?: HTMLElement;
};

const levelOf = (m: ConsoleMsg): Level =>
  m.level === "debug" ? "verbose" : m.level === "warn" ? "warn" : m.level === "error" ? "error" : "info";

export class ConsolePanel {
  el: HTMLElement;
  private list: HTMLElement;
  private groups: HTMLElement[] = [];
  private last: Row | null = null;
  private rows: Row[] = [];
  private filter = "";
  private levels = safeStorage<Record<Level, boolean>>("byof:console-levels", {
    verbose: false,
    info: true,
    warn: true,
    error: true,
  });
  private levelBtn: HTMLElement;
  private hiddenNote: HTMLElement;
  private prompt: EditorView;
  private history: string[] = [];
  private histIndex = -1;

  onCounts: (errors: number, warnings: number) => void = () => {};
  onEval: (code: string) => void = () => {};

  constructor(private ctx: ValueCtx) {
    this.list = h("div", { class: "con-list", role: "log" });
    this.hiddenNote = h("span", { class: "con-hidden" });
    this.levelBtn = h("button", { class: "tb-btn tb-select", onclick: (e: Event) => this.levelMenu(e) });
    this.updateLevelLabel();

    const filter = h("input", {
      class: "tb-filter",
      placeholder: "Filter",
      spellcheck: "false",
      oninput: (e: Event) => {
        this.filter = (e.target as HTMLInputElement).value.toLowerCase();
        this.applyFilter();
      },
    });

    const promptHost = h("div", { class: "con-prompt-host" });
    this.el = h(
      "div",
      { class: "dt-panel con" },
      h(
        "div",
        { class: "dt-toolbar" },
        h("button", { class: "tb-icon", title: "Clear console (Ctrl+L)", onclick: () => this.clear(true) }, icon("clear")),
        h("span", { class: "tb-sep" }),
        h("span", { class: "tb-ctx" }, "top", icon("chevronDown")),
        h("span", { class: "tb-sep" }),
        h("label", { class: "tb-filter-wrap" }, icon("filter"), filter),
        this.levelBtn,
        this.hiddenNote,
      ),
      h(
        "div",
        { class: "con-scroll", onclick: (e: MouseEvent) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("con-list")) this.prompt.focus();
        } },
        this.list,
        h("div", { class: "con-prompt" }, h("span", { class: "con-caret" }, icon("chevronRight")), promptHost),
      ),
    );

    this.prompt = new EditorView({
      parent: promptHost,
      state: EditorState.create({
        doc: "",
        extensions: [
          javascript(),
          syntaxHighlighting(highlight),
          closeBrackets(),
          placeholder(""),
          EditorView.lineWrapping,
          keymap.of([
            { key: "Enter", run: () => this.submit() },
            { key: "Shift-Enter", run: () => false },
            { key: "ArrowUp", run: (v) => this.histMove(v, -1) },
            { key: "ArrowDown", run: (v) => this.histMove(v, 1) },
            { key: "Mod-l", run: () => (this.clear(true), true) },
          ]),
          EditorView.theme({
            "&": { background: "transparent", color: "var(--dt-fg)" },
            "&.cm-focused": { outline: "none" },
            ".cm-content": { padding: "0", fontFamily: "var(--mono)", fontSize: "12px", caretColor: "var(--dt-fg)" },
            ".cm-line": { padding: "0" },
            ".cm-scroller": { fontFamily: "var(--mono)", lineHeight: "16px" },
          }),
        ],
      }),
    });
  }

  private submit(): boolean {
    const code = this.prompt.state.doc.toString();
    if (!code.trim()) return true;
    this.history.push(code);
    this.histIndex = -1;
    this.prompt.dispatch({ changes: { from: 0, to: this.prompt.state.doc.length, insert: "" } });
    const row = h("div", { class: "con-row input" }, h("span", { class: "row-icon" }, icon("chevronRight")), h("span", { class: "msg-code" }, code));
    this.push(row, "info", "eval:" + Math.random());
    this.onEval(code);
    return true;
  }

  private histMove(v: EditorView, dir: -1 | 1): boolean {
    const { state } = v;
    const line = state.doc.lineAt(state.selection.main.head).number;
    if ((dir < 0 && line !== 1) || (dir > 0 && line !== state.doc.lines) || !this.history.length) return false;
    if (this.histIndex === -1) {
      if (dir > 0) return false;
      this.histIndex = this.history.length - 1;
    } else {
      this.histIndex += dir;
    }
    if (this.histIndex >= this.history.length) {
      this.histIndex = -1;
      v.dispatch({ changes: { from: 0, to: state.doc.length, insert: "" } });
      return true;
    }
    this.histIndex = Math.max(0, this.histIndex);
    const text = this.history[this.histIndex];
    v.dispatch({ changes: { from: 0, to: state.doc.length, insert: text }, selection: { anchor: text.length } });
    return true;
  }

  evalResult(ok: boolean, value: Val) {
    const body = ok ? valueView(value, this.ctx) : value.t === "err" ? stackView(value.name, value.message, value.stack, this.ctx, "Uncaught ") : valueView(value, this.ctx);
    const row = h(
      "div",
      { class: "con-row result" + (ok ? "" : " error") },
      h("span", { class: "row-icon" }, ok ? h("span", { class: "result-mark" }, "‹·") : icon("error")),
      h("div", { class: "msg" }, body),
    );
    this.push(row, ok ? "info" : "error", "res:" + Math.random());
  }

  add(m: ConsoleMsg) {
    const level = levelOf(m);
    if (m.method === "clear") return this.clear(true);
    if (m.method === "groupEnd") {
      this.groups.pop();
      this.last = null;
      return;
    }

    const key = m.method + "|" + level + "|" + argsKey(m.args) + "|" + JSON.stringify(m.source ?? null);
    if (this.last && this.last.key === key && m.method !== "group" && m.method !== "groupCollapsed") {
      this.last.count++;
      if (!this.last.badge) {
        this.last.badge = h("span", { class: "repeat" });
        this.last.el.querySelector(".row-icon")?.replaceChildren(this.last.badge);
      }
      this.last.badge.textContent = String(this.last.count);
      return;
    }

    let body: HTMLElement;
    if (m.method === "uncaught") {
      const err = m.args[0];
      body =
        err?.t === "err"
          ? stackView(err.name, err.message, m.stack || err.stack, this.ctx, m.inPromise ? "Uncaught (in promise) " : "Uncaught ")
          : argsView(m.args, this.ctx);
    } else if (m.method === "table" && m.args[0] && (m.args[0].t === "arr" || m.args[0].t === "obj")) {
      body = table(m.args[0], this.ctx);
    } else if (m.method === "trace") {
      body = stackView("console.trace", "", m.stack || "", this.ctx);
      if (m.args.length) body.firstChild!.replaceWith(argsView(m.args, this.ctx));
    } else if (m.method === "error" && m.stack && !m.args.some((a) => a.t === "err")) {
      body = h("div", null, argsView(m.args, this.ctx));
    } else {
      body = argsView(m.args, this.ctx);
    }

    const isGroup = m.method === "group" || m.method === "groupCollapsed";
    const row = h(
      "div",
      { class: `con-row ${level}${isGroup ? " group-head" : ""}` },
      h(
        "span",
        { class: "row-icon" },
        level === "error" ? icon("error") : level === "warn" ? icon("warning") : isGroup ? h("span", { class: "v-tri" }) : null,
      ),
      h("div", { class: "msg" }, body),
      m.source ? sourceLink(m.source, this.ctx) : null,
    );
    const r = this.push(row, level, key);
    this.last = r;

    if (isGroup) {
      const box = h("div", { class: "con-group" + (m.method === "groupCollapsed" ? " collapsed" : "") });
      row.classList.toggle("open", m.method === "group");
      row.addEventListener("click", () => {
        box.classList.toggle("collapsed");
        row.classList.toggle("open");
      });
      (this.groups.at(-1) ?? this.list).append(box);
      this.groups.push(box);
      this.last = null;
    }
  }

  private push(row: HTMLElement, level: Level, key: string): Row {
    const scroller = this.list.parentElement!;
    const atBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 24;
    (this.groups.at(-1) ?? this.list).append(row);
    const r: Row = { el: row, level, key, count: 1 };
    this.rows.push(r);
    this.applyFilterRow(r);
    if (atBottom) scroller.scrollTop = scroller.scrollHeight;
    this.reportCounts();
    return r;
  }

  clear(announce: boolean) {
    this.list.replaceChildren();
    this.rows = [];
    this.groups = [];
    this.last = null;
    if (announce) this.list.append(h("div", { class: "con-row cleared" }, h("span", { class: "row-icon" }), h("div", { class: "msg" }, "Console was cleared")));
    this.reportCounts();
  }

  focusPrompt() {
    this.prompt.focus();
  }

  private reportCounts() {
    let e = 0;
    let w = 0;
    for (const r of this.rows) {
      if (r.level === "error") e += r.count;
      else if (r.level === "warn") w += r.count;
    }
    this.onCounts(e, w);
    let hidden = 0;
    for (const r of this.rows) if (r.el.hidden) hidden++;
    this.hiddenNote.textContent = hidden ? `${hidden} hidden` : "";
  }

  private applyFilterRow(r: Row) {
    const lv = this.levels.get();
    const textOk = !this.filter || (r.el.textContent ?? "").toLowerCase().includes(this.filter);
    r.el.hidden = !lv[r.level] || !textOk;
  }

  private applyFilter() {
    for (const r of this.rows) this.applyFilterRow(r);
    this.reportCounts();
  }

  private updateLevelLabel() {
    const lv = this.levels.get();
    const all = lv.verbose && lv.info && lv.warn && lv.error;
    const def = !lv.verbose && lv.info && lv.warn && lv.error;
    const label = all ? "All levels" : def ? "Default levels" : "Custom levels";
    this.levelBtn.replaceChildren(label, icon("chevronDown"));
  }

  private levelMenu(e: Event) {
    e.stopPropagation();
    document.querySelector(".dt-menu")?.remove();
    const lv = this.levels.get();
    const item = (k: Level, label: string) =>
      h(
        "button",
        {
          class: "dt-menu-item",
          onclick: (ev: Event) => {
            ev.stopPropagation();
            const next = { ...this.levels.get(), [k]: !this.levels.get()[k] };
            this.levels.set(next);
            this.updateLevelLabel();
            this.applyFilter();
            menu.remove();
            this.levelMenu(e);
          },
        },
        h("span", { class: "dt-check" }, lv[k] ? icon("check") : null),
        label,
      );
    const menu = h(
      "div",
      { class: "dt-menu" },
      item("verbose", "Verbose"),
      item("info", "Info"),
      item("warn", "Warnings"),
      item("error", "Errors"),
    );
    const r = this.levelBtn.getBoundingClientRect();
    Object.assign(menu.style, { left: r.left + "px", top: r.bottom + 2 + "px" });
    document.body.append(menu);
    setTimeout(() => document.addEventListener("click", () => menu.remove(), { once: true }));
  }
}

function sourceLink(src: Source, ctx: ValueCtx): HTMLElement {
  return h(
    "a",
    {
      class: "src-link row-src",
      href: "#",
      title: `${src.file}:${src.line}:${src.col}`,
      onclick: (e: Event) => {
        e.preventDefault();
        ctx.openSource(src.file, src.line, src.col);
      },
    },
    `${src.file.split("/").pop()}:${src.line}`,
  );
}

function table(v: Val, ctx: ValueCtx): HTMLElement {
  const rows: [string, Val][] =
    v.t === "arr" ? v.items.map((x, i) => [String(i), x]) : v.t === "obj" ? v.entries : [];
  const cols: string[] = [];
  let hasValue = false;
  for (const [, x] of rows) {
    if (x.t === "obj") for (const [k] of x.entries) if (!cols.includes(k)) cols.push(k);
    else hasValue = true;
  }
  const head = h("tr", null, h("th", null, "(index)"), ...cols.map((c) => h("th", null, c)), hasValue ? h("th", null, "Value") : null);
  const body = rows.map(([k, x]) =>
    h(
      "tr",
      null,
      h("td", null, k),
      ...cols.map((c) => {
        const cell = x.t === "obj" ? x.entries.find(([n]) => n === c)?.[1] : undefined;
        return h("td", null, cell ? valueView(cell, ctx) : "");
      }),
      hasValue ? h("td", null, x.t !== "obj" ? valueView(x, ctx) : "") : null,
    ),
  );
  return h("table", { class: "con-table" }, h("thead", null, head), h("tbody", null, ...body));
}
