import type { Val, VNodeSnap } from "../../../types/protocol";
import { h, icon } from "../../atoms/dom";
import { valueView, type ValueCtx } from "./valueView";

type Flat = { node: VNodeSnap; path: string; depth: number };

const sig = (n: VNodeSnap) =>
  JSON.stringify([n.type, n.tag, n.value, n.key, n.props, n.hooks?.map((x) => x.value)]);

function brief(v: Val): string {
  switch (v.t) {
    case "str":
      return JSON.stringify(v.v.length > 24 ? v.v.slice(0, 24) + "…" : v.v);
    case "num":
    case "big":
      return v.v;
    case "bool":
      return String(v.v);
    case "null":
      return "null";
    case "undef":
      return "undefined";
    case "fn":
      return "ƒ";
    case "arr":
      return `[…${v.len}]`;
    case "node":
      return v.tag ?? "node";
    default:
      return "{…}";
  }
}

/**
 * The learner's virtual DOM, as committed by mount()/rerender(). Nodes whose
 * props/value/hooks changed since the previous commit are marked.
 */
export class VdomPanel {
  el: HTMLElement;
  private tree: HTMLElement;
  private side: HTMLElement;
  private status: HTMLElement;
  private root: VNodeSnap | null = null;
  private prev = new Map<string, string>();
  private collapsed = new Set<string>();
  private selected: string | null = null;
  private commits = 0;

  onHover: (domId: number | null) => void = () => {};

  constructor(private ctx: ValueCtx) {
    this.tree = h("div", { class: "vd-tree" });
    this.side = h("div", { class: "vd-side" });
    this.status = h("span", { class: "tb-label dim" });
    this.el = h(
      "div",
      { class: "dt-panel vd" },
      h("div", { class: "dt-toolbar" }, h("span", { class: "tb-label" }, icon("layers"), "Virtual DOM"), h("span", { class: "tb-sep" }), this.status),
      h("div", { class: "vd-body" }, h("div", { class: "vd-scroll", onmouseleave: () => this.onHover(null) }, this.tree), this.side),
    );
    this.reset();
  }

  reset() {
    this.root = null;
    this.prev.clear();
    this.commits = 0;
    this.selected = null;
    this.status.textContent = "";
    this.tree.replaceChildren(
      h("div", { class: "vd-empty" }, h("div", null, "No tree committed yet."), h("div", { class: "dim" }, "mount() reports each render here.")),
    );
    this.side.replaceChildren();
  }

  commit(tree: VNodeSnap | null) {
    if (!tree) return;
    this.commits++;
    const flat = this.flatten(tree);
    const changed = new Set<string>();
    const next = new Map<string, string>();
    for (const f of flat) {
      const s = sig(f.node);
      next.set(f.path, s);
      if (this.commits > 1 && this.prev.get(f.path) !== s) changed.add(f.path);
    }
    this.prev = next;
    this.root = tree;
    this.status.textContent = `commit #${this.commits} · ${flat.length} nodes${changed.size && this.commits > 1 ? ` · ${changed.size} changed` : ""}`;
    this.render(changed);
  }

  private flatten(root: VNodeSnap): Flat[] {
    const out: Flat[] = [];
    const walk = (n: VNodeSnap, path: string, depth: number) => {
      out.push({ node: n, path, depth });
      n.kids.forEach((k, i) => walk(k, path + "/" + (k.key != null ? "k" + k.key : i) + ":" + (k.tag ?? k.type), depth + 1));
    };
    walk(root, "0:" + (root.tag ?? root.type), 0);
    return out;
  }

  private render(changed: Set<string> = new Set()) {
    if (!this.root) return;
    const scroller = this.tree.parentElement!;
    const top = scroller.scrollTop;
    this.tree.replaceChildren();
    const walk = (n: VNodeSnap, path: string, depth: number) => {
      const isOpen = !this.collapsed.has(path);
      this.tree.append(this.row(n, path, depth, isOpen, changed.has(path)));
      if (isOpen) n.kids.forEach((k, i) => walk(k, path + "/" + (k.key != null ? "k" + k.key : i) + ":" + (k.tag ?? k.type), depth + 1));
    };
    walk(this.root, "0:" + (this.root.tag ?? this.root.type), 0);
    scroller.scrollTop = top;
    this.renderSide();
  }

  private row(n: VNodeSnap, path: string, depth: number, open: boolean, changed: boolean) {
    const tri = n.kids.length
      ? h("span", {
          class: "el-tri" + (open ? " open" : ""),
          onclick: (e: Event) => {
            e.stopPropagation();
            if (open) this.collapsed.add(path);
            else this.collapsed.delete(path);
            this.render();
          },
        })
      : h("span", { class: "el-tri none" });

    const label = h("span", { class: "vd-label" });
    if (n.type === "text") {
      label.append(h("span", { class: "t-text" }, JSON.stringify(n.value ?? "")));
    } else {
      const comp = n.type === "component";
      label.append(h("span", { class: comp ? "vd-comp" : "t-name" }, comp ? n.tag ?? "Anonymous" : n.tag ?? "?"));
      if (n.key != null) label.append(" ", h("span", { class: "t-attr" }, "key"), "=", h("span", { class: "t-val" }, JSON.stringify(n.key)));
      for (const [k, v] of n.props.slice(0, 4)) {
        label.append(" ", h("span", { class: "t-attr" }, k), "=", h("span", { class: "t-val" }, "{" + brief(v) + "}"));
      }
      if (n.props.length > 4) label.append(h("span", { class: "dim" }, " …"));
      if (comp && n.hooks?.length) label.append(h("span", { class: "vd-hooks" }, `${n.hooks.length} hook${n.hooks.length > 1 ? "s" : ""}`));
    }
    const row = h(
      "div",
      {
        class: "vd-row" + (changed ? " changed" : "") + (this.selected === path ? " selected" : ""),
        style: { paddingLeft: 6 + depth * 14 + "px" },
        onmouseenter: () => this.onHover(n.domId ?? null),
        onclick: () => {
          this.selected = path;
          this.tree.querySelectorAll(".vd-row.selected").forEach((r) => r.classList.remove("selected"));
          row.classList.add("selected");
          this.renderSide();
        },
      },
      tri,
      label,
    );
    return row;
  }

  private find(path: string): VNodeSnap | null {
    if (!this.root) return null;
    let found: VNodeSnap | null = null;
    const walk = (n: VNodeSnap, p: string) => {
      if (p === path) found = n;
      if (!found) n.kids.forEach((k, i) => walk(k, p + "/" + (k.key != null ? "k" + k.key : i) + ":" + (k.tag ?? k.type)));
    };
    walk(this.root, "0:" + (this.root.tag ?? this.root.type));
    return found;
  }

  private renderSide() {
    this.side.replaceChildren();
    const n = this.selected ? this.find(this.selected) : null;
    if (!n) {
      this.side.append(h("div", { class: "vd-side-empty dim" }, "Select a node"));
      return;
    }
    const title = n.type === "text" ? "text" : n.type === "component" ? n.tag ?? "Anonymous" : `<${n.tag}>`;
    this.side.append(h("div", { class: "vd-side-title" + (n.type === "component" ? " vd-comp" : "") }, title));
    const section = (name: string, rows: [string, Val][]) => {
      this.side.append(h("div", { class: "vd-sec" }, name));
      if (!rows.length) this.side.append(h("div", { class: "vd-prop dim" }, "none"));
      for (const [k, v] of rows) {
        this.side.append(h("div", { class: "vd-prop" }, h("span", { class: "v-key" }, k), h("span", { class: "v-plain" }, ": "), valueView(v, this.ctx)));
      }
    };
    if (n.type === "text") section("value", [["value", { t: "str", v: n.value ?? "" }]]);
    else section("props", n.key != null ? [["key", { t: "str", v: n.key }], ...n.props] : n.props);
    if (n.hooks) section("hooks", n.hooks.map((x, i) => [`${i} ${x.name}`, x.value]));
  }
}
