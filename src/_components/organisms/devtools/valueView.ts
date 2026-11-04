import type { Val } from "../../../types/protocol";
import { h } from "../../atoms/dom";

/** What a rendered value can ask the workbench to do. */
export type ValueCtx = {
  openSource(file: string, line: number, col?: number): void;
  revealNode(id: number): void;
  hoverNode(id: number | null): void;
};

const span = (cls: string, text: string) => h("span", { class: cls }, text);

const quote = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n") + "'";

const isContainer = (v: Val) =>
  v.t === "obj" || v.t === "arr" || v.t === "map" || v.t === "set" || v.t === "err" || v.t === "deep";

/** Short form used inside previews: {…}, Array(3), 'str', ƒ. */
function brief(v: Val): HTMLElement {
  switch (v.t) {
    case "str":
      return span("v-str", quote(v.v.length > 60 ? v.v.slice(0, 60) + "…" : v.v));
    case "obj":
      return span("v-plain", v.ctor === "Object" ? "{…}" : v.ctor);
    case "arr":
      return span("v-plain", `Array(${v.len})`);
    case "map":
      return span("v-plain", `Map(${v.size})`);
    case "set":
      return span("v-plain", `Set(${v.size})`);
    case "deep":
      return span("v-plain", v.ctor === "Object" ? "{…}" : v.ctor);
    case "fn":
      return span("v-fn", "ƒ");
    case "node":
      return nodeTag(v, true);
    case "err":
      return span("v-plain", v.name);
    default:
      return primitive(v);
  }
}

function primitive(v: Val): HTMLElement {
  switch (v.t) {
    case "str":
      return span("v-str", quote(v.v));
    case "num":
      return span("v-num", v.v);
    case "big":
      return span("v-num", v.v);
    case "bool":
      return span("v-num", String(v.v));
    case "undef":
      return span("v-null", "undefined");
    case "null":
      return span("v-null", "null");
    case "sym":
      return span("v-str", v.v);
    case "date":
      return span("v-plain", v.v);
    case "re":
      return span("v-str", v.v);
    case "circ":
      return span("v-plain", "[Circular]");
    case "fn":
      return h("span", { class: "v-fn" }, h("i", null, "ƒ "), v.name || "anonymous", span("v-plain", "()"));
    default:
      return brief(v);
  }
}

function nodeTag(v: Extract<Val, { t: "node" }>, short = false): HTMLElement {
  if (v.kind === "text") return span("v-str", quote(v.text ?? ""));
  if (v.kind === "doc") return span("v-plain", "#document");
  if (v.kind !== "el") return span("v-plain", v.tag ?? "node");
  if (short) {
    const cls = v.attrs?.find(([n]) => n === "class")?.[1];
    return h("span", { class: "v-node" }, v.tag!, cls ? "." + cls.trim().split(/\s+/).join(".") : "");
  }
  const out = h("span", { class: "dom-tag" }, span("t-punc", "<"), span("t-name", v.tag!));
  for (const [n, val] of v.attrs ?? []) {
    out.append(" ", span("t-attr", n));
    if (val !== "") out.append(span("t-punc", '="'), span("t-val", val.length > 50 ? val.slice(0, 50) + "…" : val), span("t-punc", '"'));
  }
  out.append(span("t-punc", ">"), span("v-plain", "…"), span("t-punc", "</"), span("t-name", v.tag!), span("t-punc", ">"));
  return out;
}

/** One-line preview: {id: 1, text: 'Learn'} or (3) [1, 2, {…}] */
function preview(v: Val): HTMLElement {
  const out = h("span", { class: "v-preview" });
  if (v.t === "arr") {
    out.append(span("v-plain", `(${v.len}) [`));
    v.items.slice(0, 6).forEach((x, i) => {
      if (i) out.append(", ");
      out.append(brief(x));
    });
    if (v.len > 6) out.append(", …");
    out.append("]");
  } else if (v.t === "obj") {
    if (v.ctor !== "Object") out.append(span("v-plain", v.ctor + " "));
    out.append("{");
    v.entries.slice(0, 5).forEach(([k, x], i) => {
      if (i) out.append(", ");
      out.append(span("v-key-p", k), ": ", brief(x));
    });
    if (v.entries.length > 5 || v.more) out.append(", …");
    out.append("}");
  } else if (v.t === "map") {
    out.append(span("v-plain", `Map(${v.size}) {`));
    v.entries.slice(0, 4).forEach(([k, x], i) => {
      if (i) out.append(", ");
      out.append(brief(k), " => ", brief(x));
    });
    out.append("}");
  } else if (v.t === "set") {
    out.append(span("v-plain", `Set(${v.size}) {`));
    v.items.slice(0, 5).forEach((x, i) => {
      if (i) out.append(", ");
      out.append(brief(x));
    });
    out.append("}");
  } else if (v.t === "deep") {
    out.append(span("v-plain", v.ctor === "Object" ? "{…}" : v.ctor));
  }
  return out;
}

function children(v: Val, ctx: ValueCtx): HTMLElement {
  const list = h("div", { class: "v-children" });
  const row = (key: HTMLElement | null, val: Val, dim = false) =>
    list.append(property(key, val, ctx, dim));
  if (v.t === "arr") {
    v.items.forEach((x, i) => row(span("v-key", String(i)), x));
    if (v.more) list.append(h("div", { class: "v-row v-plain" }, "…"));
    row(span("v-key dim", "length"), { t: "num", v: String(v.len) }, true);
  } else if (v.t === "obj") {
    v.entries.forEach(([k, x]) => row(span("v-key", k), x));
    if (v.more) list.append(h("div", { class: "v-row v-plain" }, "…"));
  } else if (v.t === "map") {
    v.entries.forEach(([k, x], i) => {
      const r = h("div", { class: "v-row" }, span("v-key", String(i)), ": ", brief(k), " => ");
      r.append(isContainer(x) ? expandable(x, ctx) : primitive(x));
      list.append(r);
    });
  } else if (v.t === "set") {
    v.items.forEach((x, i) => row(span("v-key", String(i)), x));
  }
  return list;
}

function property(key: HTMLElement | null, val: Val, ctx: ValueCtx, dim = false): HTMLElement {
  const r = h("div", { class: "v-row" + (dim ? " dim" : "") });
  if (isContainer(val) && val.t !== "deep" && val.t !== "err") {
    const tree = expandable(val, ctx, key);
    r.append(tree);
    return r;
  }
  if (key) r.append(h("span", { class: "v-indent" }), key, span("v-plain", ": "));
  r.append(val.t === "node" ? nodeView(val, ctx) : val.t === "err" ? span("v-plain", val.name + ": " + val.message) : primitive(val));
  return r;
}

function expandable(v: Val, ctx: ValueCtx, key: HTMLElement | null = null): HTMLElement {
  const wrap = h("span", { class: "v-tree" });
  const tri = h("span", { class: "v-tri" });
  const head = h("span", { class: "v-head" }, tri);
  if (key) head.append(key, span("v-plain", ": "));
  head.append(preview(v));
  let body: HTMLElement | null = null;
  head.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = wrap.classList.toggle("open");
    if (open && !body) {
      body = children(v, ctx);
      wrap.append(body);
    }
  });
  wrap.append(head);
  return wrap;
}

function nodeView(v: Extract<Val, { t: "node" }>, ctx: ValueCtx): HTMLElement {
  const el = h(
    "span",
    {
      class: "v-nodeview",
      title: "Reveal in Elements",
      onmouseenter: () => ctx.hoverNode(v.id),
      onmouseleave: () => ctx.hoverNode(null),
      onclick: (e: Event) => {
        e.stopPropagation();
        ctx.revealNode(v.id);
      },
    },
    nodeTag(v),
  );
  return el;
}

const FRAME = /(?:\(|@|at\s)?\s*((?:src\/)[^\s:()]+):(\d+):(\d+)\)?/;

/** Error stack, cleaned to the project's frames, with clickable file links. */
export function stackView(name: string, message: string, stack: string, ctx: ValueCtx, prefix = ""): HTMLElement {
  const out = h("div", { class: "v-stack" });
  out.append(h("div", null, prefix + (name ? name + ": " : "") + message));
  for (const line of stack.split("\n").slice(1)) {
    const m = FRAME.exec(line);
    if (!m) continue;
    let fn = /at\s+([^\s(]+)\s+\(/.exec(line)?.[1] ?? /^([^@\s]+)@/.exec(line.trim())?.[1];
    // module top level shows up as "Object.src/main.tsx" / "Object.<anonymous>": hide it like Chrome
    if (fn && (fn.includes("src/") || fn.includes("<anonymous>"))) fn = undefined;
    if (fn?.startsWith("Object.")) fn = fn.slice(7);
    const [, file, ln, col] = m;
    out.append(
      h(
        "div",
        { class: "v-frame" },
        "    at ",
        fn ? fn + " (" : "",
        h(
          "a",
          { class: "src-link", href: "#", onclick: (e: Event) => (e.preventDefault(), ctx.openSource(file, +ln, +col)) },
          `${file.split("/").pop()}:${ln}`,
        ),
        fn ? ")" : "",
      ),
    );
  }
  return out;
}

/** A top-level console argument. */
export function valueView(v: Val, ctx: ValueCtx): HTMLElement {
  if (v.t === "str") return span("v-text", v.v);
  if (v.t === "err") return stackView(v.name, v.message, v.stack || "", ctx);
  if (v.t === "node") return nodeView(v, ctx);
  if (isContainer(v)) return expandable(v, ctx);
  return primitive(v);
}

const SAFE_CSS = /^(color|background(-color)?|font-(weight|style|size|family)|text-decoration|padding|margin|border(-radius)?|text-transform|letter-spacing|line-height)$/;

function applyCss(el: HTMLElement, css: string) {
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const val = decl.slice(i + 1).trim();
    if (SAFE_CSS.test(prop) && !/url\(/i.test(val)) el.style.setProperty(prop, val);
  }
}

/** console.log arguments, with %s %d %i %f %o %O %c format specifiers. */
export function argsView(args: Val[], ctx: ValueCtx): HTMLElement {
  const out = h("span", { class: "msg-args" });
  let rest = args;
  if (args[0]?.t === "str" && /%[sdifoOc]/.test(args[0].v)) {
    const fmt = args[0].v;
    rest = args.slice(1);
    let target: HTMLElement = out;
    let last = 0;
    const re = /%([sdifoOc%])/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(fmt))) {
      target.append(fmt.slice(last, m.index));
      last = re.lastIndex;
      const spec = m[1];
      if (spec === "%") {
        target.append("%");
        continue;
      }
      const a = rest.shift();
      if (spec === "c") {
        const styled = h("span");
        applyCss(styled, a?.t === "str" ? a.v : "");
        out.append(styled);
        target = styled;
      } else if (!a) {
        target.append("%" + spec);
      } else if (spec === "s") {
        target.append(a.t === "str" ? a.v : brief(a));
      } else if (spec === "d" || spec === "i") {
        target.append(span("v-num", a.t === "num" ? String(Math.trunc(+a.v)) : "NaN"));
      } else if (spec === "f") {
        target.append(span("v-num", a.t === "num" ? a.v : "NaN"));
      } else {
        target.append(valueView(a, ctx));
      }
    }
    target.append(fmt.slice(last));
  }
  rest.forEach((a, i) => {
    if (i || out.childNodes.length) out.append(" ");
    out.append(valueView(a, ctx));
  });
  return out;
}

/** Plain-text signature of args, for collapsing repeated messages. */
export function argsKey(args: Val[]): string {
  return JSON.stringify(args);
}
