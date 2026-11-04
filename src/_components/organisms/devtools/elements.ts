import type { DomNode } from "../../../types/protocol";
import { h, icon, safeStorage } from "../../atoms/dom";

const COLLAPSED_BY_DEFAULT = new Set(["head", "script", "style", "svg"]);

/** Chrome-style Elements tree. Nodes the page just changed flash purple. */
export class ElementsPanel {
  el: HTMLElement;
  private tree: HTMLElement;
  private crumbs: HTMLElement;
  private root: DomNode | null = null;
  private open = new Map<number, boolean>();
  private selected: number | null = null;
  private parents = new Map<number, DomNode>();
  private byId = new Map<number, DomNode>();
  private flashOn = safeStorage("byof:flash-updates", false);

  onHover: (id: number | null) => void = () => {};
  onSelect: (id: number) => void = () => {};
  onFlashUpdates: (on: boolean) => void = () => {};

  constructor() {
    this.tree = h("div", { class: "el-tree", role: "tree", tabindex: "0", onkeydown: (e: KeyboardEvent) => this.key(e) });
    this.crumbs = h("div", { class: "el-crumbs" });
    const flash = h("input", {
      type: "checkbox",
      onchange: (e: Event) => {
        const on = (e.target as HTMLInputElement).checked;
        this.flashOn.set(on);
        this.onFlashUpdates(on);
      },
    }) as HTMLInputElement;
    flash.checked = this.flashOn.get();
    this.el = h(
      "div",
      { class: "dt-panel el" },
      h(
        "div",
        { class: "dt-toolbar" },
        h("span", { class: "tb-label" }, icon("inspect"), "DOM"),
        h("span", { class: "tb-sep" }),
        h("label", { class: "tb-check", title: "Outline changed elements inside the page" }, flash, "Highlight updates in page"),
      ),
      h("div", { class: "el-scroll", onmouseleave: () => this.onHover(null) }, this.tree),
      this.crumbs,
    );
  }

  get flashUpdates() {
    return this.flashOn.get();
  }

  reset() {
    this.root = null;
    this.open.clear();
    this.selected = null;
    this.tree.replaceChildren();
    this.crumbs.replaceChildren();
  }

  update(tree: DomNode | null, changed: number[], attrs: Record<number, string[]>) {
    this.root = tree;
    this.parents.clear();
    this.byId.clear();
    const index = (n: DomNode, parent?: DomNode) => {
      this.byId.set(n.id, n);
      if (parent) this.parents.set(n.id, parent);
      n.kids?.forEach((k) => index(k, n));
    };
    if (tree) index(tree);
    const scroller = this.tree.parentElement!;
    const top = scroller.scrollTop;
    this.render();
    scroller.scrollTop = top;
    this.flash(changed, attrs);
  }

  /** Select and scroll to a node (e.g. clicked in Console). */
  reveal(id: number) {
    for (let p = this.parents.get(id); p; p = this.parents.get(p.id)) this.open.set(p.id, true);
    this.selected = id;
    this.render();
    const row = this.tree.querySelector<HTMLElement>(`[data-id="${id}"]`);
    row?.scrollIntoView({ block: "center" });
    this.onSelect(id);
  }

  private isOpen(n: DomNode, depth: number) {
    const v = this.open.get(n.id);
    if (v != null) return v;
    return !COLLAPSED_BY_DEFAULT.has(n.tag ?? "") && depth < 40;
  }

  private render() {
    this.tree.replaceChildren();
    if (this.root) this.renderNode(this.root, 0, this.tree);
    this.renderCrumbs();
  }

  private inlineText(n: DomNode): string | null {
    if (n.kids?.length === 1 && n.kids[0].k === 3 && (n.kids[0].text ?? "").length <= 80 && !(n.kids[0].text ?? "").includes("\n"))
      return n.kids[0].text ?? "";
    return null;
  }

  private renderNode(n: DomNode, depth: number, into: HTMLElement) {
    const pad = { paddingLeft: 6 + depth * 14 + "px" };
    if (n.k === 3) {
      into.append(this.row(n, pad, h("span", { class: "t-text", "data-flash": n.id }, JSON.stringify(n.text).slice(1, -1).replace(/\\"/g, '"'))));
      return;
    }
    if (n.k === 8) {
      into.append(this.row(n, pad, h("span", { class: "t-comment" }, `<!--${n.text}-->`)));
      return;
    }
    const kids = n.kids ?? [];
    const text = this.inlineText(n);
    const expandable = kids.length > 0 && text == null;
    const open = expandable && this.isOpen(n, depth);
    const tri = expandable
      ? h("span", {
          class: "el-tri" + (open ? " open" : ""),
          onclick: (e: Event) => {
            e.stopPropagation();
            this.open.set(n.id, !open);
            this.render();
          },
        })
      : h("span", { class: "el-tri none" });

    const line = h("span", { class: "el-line" }, tri, this.openTag(n));
    if (text != null) {
      line.append(h("span", { class: "t-text", "data-flash": n.id + "-t", "data-text-of": n.kids![0].id }, text), this.closeTag(n));
    } else if (!kids.length) {
      line.append(this.closeTag(n));
    } else if (!open) {
      line.append(h("span", { class: "el-ellipsis" }, "…"), this.closeTag(n));
    }
    into.append(this.row(n, pad, line));
    if (open) {
      for (const k of kids) this.renderNode(k, depth + 1, into);
      into.append(this.row(n, pad, h("span", { class: "el-line" }, h("span", { class: "el-tri none" }), this.closeTag(n)), true));
    }
  }

  private openTag(n: DomNode) {
    const s = h("span", { class: "dom-tag", "data-flash": String(n.id) }, h("span", { class: "t-punc" }, "<"), h("span", { class: "t-name" }, n.tag!));
    for (const [name, val] of n.attrs ?? []) {
      const a = h("span", { class: "t-attr-pair", "data-attr": `${n.id}:${name}` }, " ", h("span", { class: "t-attr" }, name));
      if (val !== "") a.append(h("span", { class: "t-punc" }, '="'), h("span", { class: "t-val" }, val), h("span", { class: "t-punc" }, '"'));
      s.append(a);
    }
    s.append(h("span", { class: "t-punc" }, ">"));
    return s;
  }

  private closeTag(n: DomNode) {
    return h("span", { class: "dom-tag" }, h("span", { class: "t-punc" }, "</"), h("span", { class: "t-name" }, n.tag!), h("span", { class: "t-punc" }, ">"));
  }

  private row(n: DomNode, pad: Partial<CSSStyleDeclaration>, content: HTMLElement, closing = false) {
    const row = h(
      "div",
      {
        class: "el-row" + (this.selected === n.id && !closing ? " selected" : ""),
        "data-id": closing ? null : String(n.id),
        style: pad,
        onmouseenter: () => this.onHover(n.id),
        onclick: () => {
          this.selected = n.id;
          this.tree.querySelectorAll(".el-row.selected").forEach((r) => r.classList.remove("selected"));
          if (!closing) row.classList.add("selected");
          this.renderCrumbs();
          this.onSelect(n.id);
        },
      },
      content,
    );
    if (this.selected === n.id && !closing) row.append(h("span", { class: "el-dollar" }, " == $0"));
    return row;
  }

  private flash(changed: number[], attrs: Record<number, string[]>) {
    for (const id of changed) {
      const names = attrs[id];
      if (names) {
        for (const name of names) {
          const pair = this.tree.querySelector(`[data-attr="${id}:${CSS.escape(name)}"]`);
          (pair ?? this.tree.querySelector(`[data-flash="${id}"]`))?.classList.add("flash");
        }
        continue;
      }
      const node = this.byId.get(id);
      let el: Element | null = null;
      if (node?.k === 3) el = this.tree.querySelector(`[data-flash="${id}"], [data-text-of="${id}"]`);
      else el = this.tree.querySelector(`[data-id="${id}"]`);
      el?.classList.add("flash");
    }
    // restart animation on repeated flashes
    this.tree.querySelectorAll(".flash").forEach((el) => {
      el.addEventListener("animationend", () => el.classList.remove("flash"), { once: true });
    });
  }

  private renderCrumbs() {
    this.crumbs.replaceChildren();
    if (this.selected == null) return;
    const chain: DomNode[] = [];
    for (let n: DomNode | undefined = this.byId.get(this.selected); n; n = this.parents.get(n.id)) chain.unshift(n);
    for (const n of chain) {
      if (n.k !== 1) continue;
      const id = n.attrs?.find(([a]) => a === "id")?.[1];
      const cls = n.attrs?.find(([a]) => a === "class")?.[1];
      this.crumbs.append(
        h(
          "button",
          { class: "crumb" + (n.id === this.selected ? " active" : ""), onclick: () => this.reveal(n.id), onmouseenter: () => this.onHover(n.id) },
          h("span", { class: "t-name" }, n.tag!),
          id ? h("span", { class: "t-val" }, "#" + id) : null,
          cls ? h("span", { class: "t-attr" }, "." + cls.trim().split(/\s+/).join(".")) : null,
        ),
      );
    }
  }

  private key(e: KeyboardEvent) {
    if (this.selected == null) return;
    const rows = Array.from(this.tree.querySelectorAll<HTMLElement>(".el-row[data-id]"));
    const i = rows.findIndex((r) => r.dataset.id === String(this.selected));
    const node = this.byId.get(this.selected);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const next = rows[i + (e.key === "ArrowDown" ? 1 : -1)];
      if (next) {
        e.preventDefault();
        this.selected = +next.dataset.id!;
        this.render();
        this.tree.querySelector(`[data-id="${this.selected}"]`)?.scrollIntoView({ block: "nearest" });
        this.onHover(this.selected);
      }
    } else if (e.key === "ArrowRight" && node) {
      e.preventDefault();
      this.open.set(node.id, true);
      this.render();
    } else if (e.key === "ArrowLeft" && node) {
      e.preventDefault();
      if (this.open.get(node.id) !== false && node.kids?.length) this.open.set(node.id, false);
      else if (this.parents.get(node.id)) this.selected = this.parents.get(node.id)!.id;
      this.render();
    }
  }
}
