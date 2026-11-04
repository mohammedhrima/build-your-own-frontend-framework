import type { FileStatus } from "../../steps";
import { basename, fileIcon, h, icon, safeStorage } from "../atoms/dom";

type TreeNode = { name: string; path: string; dir: boolean; kids: TreeNode[] };

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: "", path: "", dir: true, kids: [] };
  for (const p of paths) {
    const parts = p.split("/");
    let cur = root;
    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join("/");
      const dir = i < parts.length - 1;
      let next = cur.kids.find((k) => k.name === part && k.dir === dir);
      if (!next) {
        next = { name: part, path, dir, kids: [] };
        cur.kids.push(next);
      }
      cur = next;
    });
  }
  const sort = (n: TreeNode) => {
    // the generated out/ folder goes last, after the files you edit
    const rank = (k: TreeNode) => (k.path === "out" ? 2 : k.dir ? 0 : 1);
    n.kids.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    n.kids.forEach(sort);
  };
  sort(root);
  return root;
}

export type ExplorerState = {
  files: string[];
  status: Record<string, FileStatus>;
  dirty: Set<string>;
  active: string | null;
};

/** File tree with folder/file icons and git-style U/M decorations. */
export class Explorer {
  el: HTMLElement;
  private list: HTMLElement;
  private collapsed = safeStorage<string[]>("byof:collapsed2", ["out"]);
  private state: ExplorerState = { files: [], status: {}, dirty: new Set(), active: null };
  private cursor: string | null = null;

  onOpen: (path: string) => void = () => {};

  constructor() {
    this.list = h("div", { class: "tree", role: "tree", tabindex: "0", onkeydown: (e: KeyboardEvent) => this.key(e) });
    this.el = h("div", { class: "files" }, this.list);
  }

  update(s: ExplorerState) {
    this.state = s;
    if (s.active) this.cursor = s.active;
    // make sure the active file is visible
    if (s.active) {
      const c = new Set(this.collapsed.get());
      const parts = s.active.split("/");
      for (let i = 1; i < parts.length; i++) c.delete(parts.slice(0, i).join("/"));
      this.collapsed.set([...c]);
    }
    this.render();
  }

  private dirStatus(path: string): FileStatus {
    let st: FileStatus;
    for (const f of this.state.files) {
      if (!f.startsWith(path + "/")) continue;
      const s = this.state.status[f];
      if (s === "added" && !st) st = "added";
      if (s === "modified") st = "modified";
    }
    return st;
  }

  private visible: string[] = [];

  private render() {
    const tree = buildTree(this.state.files);
    const collapsed = new Set(this.collapsed.get());
    this.list.replaceChildren();
    this.visible = [];
    const walk = (n: TreeNode, depth: number) => {
      for (const k of n.kids) {
        this.visible.push(k.path);
        const open = k.dir && !collapsed.has(k.path);
        const st = k.dir ? this.dirStatus(k.path) : this.state.status[k.path];
        const dirty = !k.dir && this.state.dirty.has(k.path);
        const guides = h("span", { class: "guides" });
        for (let i = 0; i < depth; i++) guides.append(h("span", { class: "guide" }));
        const row = h(
          "div",
          {
            class:
              "tree-row" +
              (k.path === this.state.active ? " active" : "") +
              (k.path === this.cursor ? " cursor" : "") +
              (st ? " st-" + st : "") +
              (k.path === "out" || k.path.startsWith("out/") ? " is-compiled" : ""),
            role: "treeitem",
            title:
              k.path === "out"
                ? "The JavaScript the browser runs, made from src/ by the TypeScript compiler (like UraJS). Read-only."
                : k.path + (st === "added" ? " • New in this step" : st === "modified" ? " • Changed in this step" : ""),
            "data-path": k.path,
            onclick: () => {
              this.cursor = k.path;
              if (k.dir) this.toggle(k.path);
              else this.onOpen(k.path);
              this.list.focus({ preventScroll: true });
            },
          },
          guides,
          k.dir ? icon(open ? "chevronDown" : "chevronRight", "twisty") : h("span", { class: "twisty" }),
          k.dir ? icon(open ? "folderOpen" : "folder", "folder-i") : fileIcon(k.path),
          h("span", { class: "tree-name" }, k.name),
          dirty ? h("span", { class: "tree-dirty", title: "Edited by you" }) : null,
          st && !k.dir ? h("span", { class: "tree-badge" }, st === "added" ? "+" : "~") : null,
          st && k.dir ? h("span", { class: "tree-dot" }) : null,
        );
        this.list.append(row);
        if (open) walk(k, depth + 1);
      }
    };
    walk(tree, 0);
  }

  private toggle(path: string) {
    const c = new Set(this.collapsed.get());
    if (c.has(path)) c.delete(path);
    else c.add(path);
    this.collapsed.set([...c]);
    this.render();
  }

  private key(e: KeyboardEvent) {
    const i = this.cursor ? this.visible.indexOf(this.cursor) : -1;
    const isDir = (p: string) => !this.state.files.includes(p);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = this.visible[Math.max(0, Math.min(this.visible.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))];
      if (next) {
        this.cursor = next;
        this.render();
        this.list.querySelector(`[data-path="${CSS.escape(next)}"]`)?.scrollIntoView({ block: "nearest" });
      }
    } else if ((e.key === "Enter" || e.key === " ") && this.cursor) {
      e.preventDefault();
      if (isDir(this.cursor)) this.toggle(this.cursor);
      else this.onOpen(this.cursor);
    } else if (e.key === "ArrowRight" && this.cursor && isDir(this.cursor)) {
      const c = new Set(this.collapsed.get());
      c.delete(this.cursor);
      this.collapsed.set([...c]);
      this.render();
    } else if (e.key === "ArrowLeft" && this.cursor) {
      if (isDir(this.cursor) && !this.collapsed.get().includes(this.cursor)) this.toggle(this.cursor);
      else if (this.cursor.includes("/")) {
        this.cursor = this.cursor.slice(0, this.cursor.lastIndexOf("/"));
        this.render();
      }
    }
  }
}

export { basename };
