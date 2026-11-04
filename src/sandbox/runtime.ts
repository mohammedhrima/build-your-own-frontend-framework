/* eslint-disable */
// Runs INSIDE the preview iframe. It is injected as `(${runtime.toString()})()`,
// so it must be fully self-contained: no imports, no outer variables.
//
// Responsibilities: console capture, error capture, a tiny CommonJS module
// system for the bundled project, DOM snapshots + mutation tracking (Elements
// panel), a VDOM devtools hook, element highlighting and a REPL.

export function runtime() {
  const w = window as any;
  const post = (msg: any) => {
    try {
      parent.postMessage({ __mini: true, ...msg }, "*");
    } catch {
      // un-cloneable payload: drop it rather than break the page
    }
  };

  // ---------- node ids ----------
  const ids = new WeakMap<Node, number>();
  const byId = new Map<number, WeakRef<Node>>();
  let nextId = 1;
  const idOf = (n: Node) => {
    let id = ids.get(n);
    if (!id) {
      id = nextId++;
      ids.set(n, id);
      byId.set(id, new WeakRef(n));
    }
    return id;
  };
  const nodeById = (id: number) => byId.get(id)?.deref() ?? null;
  const isDevtoolsNode = (n: Node | null): boolean => {
    for (let x: Node | null = n; x; x = x.parentNode)
      if ((x as Element).hasAttribute?.("data-mini-devtools")) return true;
    return false;
  };

  // ---------- value serializer ----------
  const MAX_ITEMS = 100;
  const ser = (v: any, depth = 0, seen: Set<any> = new Set()): any => {
    const t = typeof v;
    if (t === "string") return { t: "str", v };
    if (t === "number") return { t: "num", v: Object.is(v, -0) ? "-0" : String(v) };
    if (t === "boolean") return { t: "bool", v };
    if (t === "undefined") return { t: "undef" };
    if (t === "bigint") return { t: "big", v: String(v) + "n" };
    if (t === "symbol") return { t: "sym", v: String(v) };
    if (v === null) return { t: "null" };
    if (t === "function") {
      let src = "";
      try {
        src = Function.prototype.toString.call(v).split("\n")[0].slice(0, 120);
      } catch { }
      return { t: "fn", name: v.name || "", src };
    }
    if (v instanceof Error)
      return { t: "err", name: v.name, message: v.message, stack: String(v.stack || "") };
    if (typeof Node !== "undefined" && v instanceof Node) {
      const n = v as Node;
      if (n.nodeType === 1) {
        const el = n as Element;
        return {
          t: "node",
          id: idOf(n),
          kind: "el",
          tag: el.tagName.toLowerCase(),
          attrs: Array.from(el.attributes)
            .slice(0, 8)
            .map((a) => [a.name, a.value.slice(0, 80)]),
        };
      }
      if (n.nodeType === 3) return { t: "node", id: idOf(n), kind: "text", text: (n.nodeValue || "").slice(0, 200) };
      if (n.nodeType === 9) return { t: "node", id: idOf(n), kind: "doc" };
      return { t: "node", id: idOf(n), kind: "other", tag: n.nodeName };
    }
    if (v instanceof Date) return { t: "date", v: isNaN(+v) ? "Invalid Date" : v.toString() };
    if (v instanceof RegExp) return { t: "re", v: String(v) };
    if (seen.has(v)) return { t: "circ" };
    const ctor = (() => {
      try {
        const p = Object.getPrototypeOf(v);
        if (p === null) return "Object";
        return (p.constructor && p.constructor.name) || "Object";
      } catch {
        return "Object";
      }
    })();
    if (depth > 6) return { t: "deep", ctor: Array.isArray(v) ? "Array(" + v.length + ")" : ctor };
    seen.add(v);
    try {
      if (Array.isArray(v)) {
        return {
          t: "arr",
          len: v.length,
          items: v.slice(0, MAX_ITEMS).map((x) => ser(x, depth + 1, seen)),
          more: v.length > MAX_ITEMS,
        };
      }
      if (v instanceof Map) {
        const entries: any[] = [];
        for (const [k, x] of v) {
          if (entries.length >= MAX_ITEMS) break;
          entries.push([ser(k, depth + 1, seen), ser(x, depth + 1, seen)]);
        }
        return { t: "map", size: v.size, entries };
      }
      if (v instanceof Set) {
        const items: any[] = [];
        for (const x of v) {
          if (items.length >= MAX_ITEMS) break;
          items.push(ser(x, depth + 1, seen));
        }
        return { t: "set", size: v.size, items };
      }
      if (typeof v.then === "function") return { t: "obj", ctor: "Promise", entries: [], more: false };
      const keys = Object.keys(v);
      return {
        t: "obj",
        ctor,
        entries: keys.slice(0, MAX_ITEMS).map((k) => {
          let x: any;
          try {
            x = v[k];
          } catch (e) {
            x = e;
          }
          return [k, ser(x, depth + 1, seen)];
        }),
        more: keys.length > MAX_ITEMS,
      };
    } finally {
      seen.delete(v);
    }
  };

  // ---------- source location from a stack ----------
  const SRC = /((?:src\/)[^\s:()]+|index\.html):(\d+):(\d+)/;
  const sourceOf = (stack: string) => {
    for (const line of stack.split("\n")) {
      const m = SRC.exec(line);
      if (m) return { file: m[1], line: +m[2], col: +m[3] };
    }
    return undefined;
  };
  const here = () => sourceOf(String(new Error().stack || ""));

  // ---------- console ----------
  const orig: any = {};
  const send = (method: string, level: string, args: any[], source = here(), stack?: string) =>
    post({ kind: "console", method, level, args: args.map((a) => ser(a)), source, stack });
  const counts = new Map<string, number>();
  const timers = new Map<string, number>();
  const methods: Record<string, string> = {
    log: "log",
    info: "info",
    debug: "debug",
    warn: "warn",
    error: "error",
    dir: "log",
    dirxml: "log",
    table: "log",
    trace: "log",
    group: "log",
    groupCollapsed: "log",
  };
  for (const m in methods) {
    orig[m] = (console as any)[m];
    (console as any)[m] = function (...args: any[]) {
      send(m, methods[m], args, here(), m === "trace" || m === "error" ? String(new Error().stack || "") : undefined);
      try {
        orig[m]?.apply(console, args);
      } catch { }
    };
  }
  const passthrough = (m: string, fn: (...a: any[]) => void) => {
    orig[m] = (console as any)[m];
    (console as any)[m] = function (...args: any[]) {
      fn(...args);
      try {
        orig[m]?.apply(console, args);
      } catch { }
    };
  };
  passthrough("groupEnd", () => send("groupEnd", "log", []));
  passthrough("clear", () => send("clear", "log", []));
  passthrough("assert", (cond: any, ...rest: any[]) => {
    if (!cond) send("assert", "error", ["Assertion failed:", ...(rest.length ? rest : ["console.assert"])]);
  });
  passthrough("count", (label = "default") => {
    const n = (counts.get(label) || 0) + 1;
    counts.set(label, n);
    send("count", "info", [label + ": " + n]);
  });
  passthrough("countReset", (label = "default") => counts.set(label, 0));
  passthrough("time", (label = "default") => timers.set(label, performance.now()));
  const timeLog = (end: boolean) => (label = "default", ...rest: any[]) => {
    const t0 = timers.get(label);
    if (t0 == null) return send("warn", "warn", ["Timer '" + label + "' does not exist"]);
    send("time", "info", [label + ": " + (performance.now() - t0).toFixed(3) + " ms", ...rest]);
    if (end) timers.delete(label);
  };
  passthrough("timeLog", timeLog(false));
  passthrough("timeEnd", timeLog(true));

  // ---------- errors ----------
  window.addEventListener("error", (e) => {
    e.preventDefault();
    const err = e.error;
    if (err instanceof Error) {
      const stack = String(err.stack || "");
      post({
        kind: "console",
        method: "uncaught",
        level: "error",
        args: [ser(err)],
        source: sourceOf(stack) || (e.filename ? { file: e.filename, line: e.lineno, col: e.colno } : undefined),
        stack,
      });
    } else {
      post({ kind: "console", method: "uncaught", level: "error", args: [ser("Uncaught " + e.message)] });
    }
  });
  window.addEventListener("unhandledrejection", (e) => {
    e.preventDefault();
    const r = e.reason;
    post({
      kind: "console",
      method: "uncaught",
      level: "error",
      args: r instanceof Error ? [ser(r)] : [ser("Uncaught (in promise)"), ser(r)],
      source: r instanceof Error ? sourceOf(String(r.stack || "")) : undefined,
      stack: r instanceof Error ? String(r.stack || "") : undefined,
      inPromise: true,
    });
  });

  // ---------- module system ----------
  const defs: Record<string, (require: any, module: any, exports: any) => void> = {};
  const cache: Record<string, any> = {};
  const norm = (p: string) => {
    const out: string[] = [];
    for (const seg of p.split("/")) {
      if (!seg || seg === ".") continue;
      if (seg === "..") out.pop();
      else out.push(seg);
    }
    return out.join("/");
  };
  const resolve = (from: string, spec: string) => {
    if (!spec.startsWith(".") && !spec.startsWith("/")) return null;
    const base = spec.startsWith("/") ? spec : from.split("/").slice(0, -1).join("/") + "/" + spec;
    const p = norm(base);
    for (const c of [p, p + ".ts", p + ".tsx", p + ".js", p + ".jsx", p + "/index.ts", p + "/index.tsx", p + "/index.js", p + "/index.jsx"])
      if (defs[c]) return c;
    return null;
  };
  const load = (id: string): any => {
    if (cache[id]) return cache[id].exports;
    const module = { exports: {} as any };
    cache[id] = module;
    const req = (spec: string) => {
      const target = resolve(id, spec);
      if (!target) {
        const err = new Error("Cannot find module '" + spec + "' from '" + id + "'");
        throw err;
      }
      return load(target);
    };
    defs[id](req, module, module.exports);
    return module.exports;
  };
  w.__define = (id: string, fn: any) => (defs[id] = fn);
  w.__start = (entry: string) => {
    try {
      load(entry);
    } catch (e) {
      // surfaces through the "error" listener with its real stack
      setTimeout(() => {
        throw e;
      });
    }
  };
  w.__css = (id: string, css: string) => {
    const style = document.createElement("style");
    style.setAttribute("data-file", id);
    style.textContent = css;
    document.head.appendChild(style);
  };

  // ---------- VDOM devtools hook ----------
  const snapProps = (props: any) => {
    const out: any[] = [];
    for (const k in props || {}) {
      if (k === "children" || k === "key") continue;
      out.push([k, ser(props[k], 4)]);
    }
    return out;
  };
  const snapHook = (slot: any) => {
    if (slot && typeof slot === "object") {
      if ("set" in slot && "value" in slot) return { name: "State", value: ser(slot.value, 3) };
      if (slot.kind === "effect") return { name: "Effect", value: ser(slot.deps, 4) };
      if ("current" in slot && Object.keys(slot).length === 1) return { name: "Ref", value: ser(slot.current, 4) };
      if ("deps" in slot && "value" in slot) return { name: "Memo", value: ser(slot.value, 3) };
    }
    return { name: "Hook", value: ser(slot, 3) };
  };
  const snapV = (v: any, depth = 0): any => {
    if (!v || typeof v !== "object" || depth > 60) return null;
    const isComp = v.type === "component" || typeof v.tag === "function";
    const tag = isComp ? (v.tag && v.tag.name) || "Anonymous" : v.tag;
    const kids: any[] = [];
    if (isComp) {
      if (v.child) kids.push(snapV(v.child, depth + 1));
    } else {
      const children = v.props?.children;
      if (Array.isArray(children)) for (const c of children) {
        const s = snapV(c, depth + 1);
        if (s) kids.push(s);
      } else if (children != null) kids.push({ type: "text", value: String(children), props: [], kids: [] });
    }
    return {
      type: isComp ? "component" : v.type || (v.tag ? "element" : "text"),
      tag: typeof tag === "string" ? tag : undefined,
      value: v.value != null ? String(v.value) : undefined,
      props: isComp || v.type === "element" || v.tag ? snapProps(v.props) : [],
      key: v.props?.key != null ? String(v.props.key) : undefined,
      domId: v.dom instanceof Node ? idOf(v.dom) : undefined,
      hooks: Array.isArray(v.hooks) ? v.hooks.map(snapHook) : undefined,
      kids,
    };
  };
  w.__MINI_DEVTOOLS__ = {
    commit(tree: any) {
      try {
        post({ kind: "vdom", tree: snapV(tree) });
      } catch { }
    },
  };

  // ---------- DOM snapshots ----------
  const snapDom = (n: Node, depth = 0): any => {
    if (depth > 80) return null;
    if (n.nodeType === 3) {
      const text = n.nodeValue || "";
      if (!text.trim()) return null;
      return { id: idOf(n), k: 3, text: text.length > 400 ? text.slice(0, 400) + "…" : text };
    }
    if (n.nodeType === 8) return { id: idOf(n), k: 8, text: (n.nodeValue || "").slice(0, 200) };
    if (n.nodeType !== 1) return null;
    const el = n as Element;
    if (el.hasAttribute("data-mini-devtools") || el.hasAttribute("data-mini-runtime")) return null;
    const tag = el.tagName.toLowerCase();
    const kids: any[] = [];
    if (tag !== "script" && tag !== "style") {
      for (const c of Array.from(el.childNodes)) {
        const s = snapDom(c, depth + 1);
        if (s) kids.push(s);
      }
    } else if (el.textContent) {
      kids.push({ id: idOf(el.firstChild || el), k: 3, text: "…" });
    }
    return {
      id: idOf(el),
      k: 1,
      tag,
      attrs: Array.from(el.attributes).map((a) => [a.name, a.value]),
      kids,
    };
  };

  let pending = new Set<number>();
  let pendingAttrs: Record<number, string[]> = {};
  let scheduled = false;
  let flashUpdates = false;
  const flush = () => {
    scheduled = false;
    const changed = Array.from(pending);
    const attrs = pendingAttrs;
    pending = new Set();
    pendingAttrs = {};
    post({ kind: "dom", tree: snapDom(document.documentElement), changed, attrs, title: document.title });
    if (flashUpdates) for (const id of changed) outline(nodeById(id));
  };
  const schedule = () => {
    if (!scheduled) {
      scheduled = true;
      setTimeout(flush, 40);
    }
  };
  const mo = new MutationObserver((records) => {
    let relevant = false;
    for (const r of records) {
      if (isDevtoolsNode(r.target)) continue;
      relevant = true;
      if (r.type === "attributes") {
        const id = idOf(r.target);
        pending.add(id);
        (pendingAttrs[id] ||= []).push(r.attributeName || "");
      } else if (r.type === "characterData") {
        pending.add(idOf(r.target));
      } else {
        r.addedNodes.forEach((n) => {
          if (!isDevtoolsNode(n)) pending.add(idOf(n));
        });
        if (r.removedNodes.length) pending.add(idOf(r.target));
      }
    }
    if (relevant) schedule();
  });
  mo.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });

  // ---------- highlight overlay ----------
  let layer: HTMLElement | null = null;
  const getLayer = () => {
    if (layer && layer.isConnected) return layer;
    layer = document.createElement("div");
    layer.setAttribute("data-mini-devtools", "");
    layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647";
    document.documentElement.appendChild(layer);
    return layer;
  };
  const rectOf = (n: Node | null) => {
    if (!n) return null;
    if (n.nodeType === 1) return (n as Element).getBoundingClientRect();
    if (n.nodeType === 3) {
      const r = document.createRange();
      r.selectNodeContents(n);
      return r.getBoundingClientRect();
    }
    return null;
  };
  let box: HTMLElement | null = null;
  const highlight = (id: number | null) => {
    box?.remove();
    box = null;
    if (id == null) return;
    const n = nodeById(id);
    const r = rectOf(n);
    if (!n || !r) return;
    if (n.nodeType === 1) (n as Element).scrollIntoView?.({ block: "nearest" });
    const r2 = rectOf(n)!;
    box = document.createElement("div");
    box.style.cssText =
      "position:fixed;background:rgba(111,168,220,.45);outline:1px dashed rgba(111,168,220,.9);" +
      `left:${r2.left}px;top:${r2.top}px;width:${r2.width}px;height:${r2.height}px`;
    if (n.nodeType === 1) {
      const el = n as Element;
      const label = document.createElement("div");
      const cls = el.getAttribute("class");
      label.textContent =
        el.tagName.toLowerCase() + (cls ? "." + cls.trim().split(/\s+/).join(".") : "") + "  " +
        Math.round(r2.width) + " × " + Math.round(r2.height);
      label.style.cssText =
        "position:absolute;left:0;font:11px/1.4 ui-monospace,Menlo,monospace;background:#232327;color:#e8eaed;" +
        "padding:2px 6px;border-radius:3px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.4);" +
        (r2.top > 24 ? "bottom:100%;margin-bottom:4px" : "top:100%;margin-top:4px");
      box.appendChild(label);
    }
    getLayer().appendChild(box);
  };
  const outline = (n: Node | null) => {
    const r = rectOf(n);
    if (!r || (!r.width && !r.height)) return;
    const o = document.createElement("div");
    o.style.cssText =
      `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;` +
      "outline:2px solid #e8a33d;outline-offset:-1px;transition:opacity .6s ease .3s;opacity:1";
    getLayer().appendChild(o);
    requestAnimationFrame(() => (o.style.opacity = "0"));
    setTimeout(() => o.remove(), 1000);
  };

  // what changed since the previous step: glowing boxes that fade out
  const mark = (marks: { id: number; label: string }[]) => {
    let first = true;
    for (const { id, label } of marks) {
      const n = nodeById(id);
      if (first && n && n.nodeType === 1) (n as Element).scrollIntoView?.({ block: "nearest" });
      first = false;
      const r = rectOf(n);
      if (!r || (!r.width && !r.height)) continue;
      const o = document.createElement("div");
      o.style.cssText =
        `position:fixed;left:${r.left - 3}px;top:${r.top - 3}px;width:${r.width + 6}px;height:${r.height + 6}px;` +
        "border:2px solid #22d3ee;border-radius:6px;background:rgba(34,211,238,.1);" +
        "box-shadow:0 0 0 4px rgba(34,211,238,.18);transition:opacity .8s ease;opacity:0";
      if (label) {
        const t = document.createElement("div");
        t.textContent = label;
        t.style.cssText =
          "position:absolute;right:-2px;bottom:100%;margin-bottom:3px;padding:1px 6px;border-radius:4px;" +
          "background:#22d3ee;color:#04202a;font:600 10px/1.5 ui-sans-serif,system-ui,sans-serif;white-space:nowrap";
        o.appendChild(t);
      }
      getLayer().appendChild(o);
      requestAnimationFrame(() => (o.style.opacity = "1"));
      setTimeout(() => (o.style.opacity = "0"), 2600);
      setTimeout(() => o.remove(), 3500);
    }
  };

  // ---------- messages from the workbench ----------
  window.addEventListener("message", (e) => {
    if (e.source !== parent) return;
    const d = e.data || {};
    if (d.kind === "highlight") highlight(d.id);
    else if (d.kind === "flash-updates") flashUpdates = !!d.on;
    else if (d.kind === "mark") mark(d.marks || []);
    else if (d.kind === "nav") {
      if (d.to === "back") history.back();
      else if (d.to === "forward") history.forward();
      else location.hash = d.to;
    } else if (d.kind === "eval") {
      try {
        const value = (0, eval)(d.code);
        w.$_ = value;
        post({ kind: "eval-result", ok: true, value: ser(value) });
      } catch (err) {
        post({ kind: "eval-result", ok: false, value: ser(err) });
      }
    } else if (d.kind === "select") {
      const n = nodeById(d.id);
      w.$0 = n;
    }
  });

  const sendLocation = () => post({ kind: "location", hash: location.hash || "", title: document.title });
  window.addEventListener("hashchange", sendLocation);
  window.addEventListener("load", () => {
    post({ kind: "ready", hash: location.hash || "", title: document.title });
    flush();
  });
}
