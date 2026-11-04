// Every file of the learner's project, as it is at step n (2..15).
// One builder per file: a feature appears from the step that teaches it.
// `//!` lines are teaching comments: shown only in the step that adds them.

const lines = (...parts: (string | false)[]) => parts.filter((p): p is string => p !== false).join("");

// ---------------------------------------------------------------- src/mini/vdom.ts

function vnodeType(n: number) {
  if (n < 5)
    return `export type VNode = {
  tag: string;
  props: { [key: string]: any };
};
`;
  if (n < 11)
    return lines(
      `export type VNode = {
  type: "element" | "text";
  tag?: string;
  value?: string;
  props: { [key: string]: any; children: VNode[] };
`,
      n >= 9 && `  //! The real DOM node this VNode became.
  dom?: Node;
`,
      `};
`,
    );
  return `export type Component = (props: any) => VNode;

export type VNode = {
  type: "element" | "text" | "component";
  tag?: string | Component;
  value?: string;
  props: { [key: string]: any; children: VNode[] };
  dom?: Node;
  //! Components only: what it rendered, and its hook slots.
  child?: VNode;
  hooks?: any[];
};
`;
}

const JSX_TYPES = `
//! Lets TypeScript accept any tag and any prop in our JSX.
declare global {
  namespace JSX {
    type Element = VNode;
    interface IntrinsicElements {
      [tag: string]: any;
    }
    interface IntrinsicAttributes {
      key?: string | number;
    }
  }
}
`;

function createElementCode(n: number) {
  if (n < 5)
    return `
//! <h1 className="title">Hi</h1>   compiles to
//! createElement("h1", { className: "title" }, "Hi")
export function createElement(tag: string, props: any, ...children: any[]): VNode {
  return { tag, props: { ...props, children } };
}
`;
  const toVNodes = lines(
    `
//! Strings and numbers become text nodes; null/false render nothing.
function toVNodes(children: any[]): VNode[] {
  return children
`,
    n >= 6 && `    //! todos.map(...) gives an array inside children: flatten it.
    .flat(Infinity)
`,
    `    .filter((c) => c != null && c !== false && c !== true)
    .map((c) =>
      typeof c === "object"
        ? c
        : { type: "text", value: String(c), props: { children: [] } },
    );
}
`,
  );
  if (n === 5)
    return (
      toVNodes +
      `
export function createElement(tag: string, props: any, ...children: any[]): VNode {
  return { type: "element", tag, props: { ...props, children: toVNodes(children) } };
}
`
    );
  if (n < 11)
    return (
      toVNodes +
      `
export function createElement(
  tag: string | ((props: any) => VNode),
  props: any,
  ...children: any[]
): VNode {
  props = { ...props, children: toVNodes(children) };
  //! <Header left={2} />  →  Header({ left: 2, children: [] })
  if (typeof tag === "function") return tag(props);
  return { type: "element", tag, props };
}
`
    );
  return (
    toVNodes +
    `
export function createElement(tag: string | Component, props: any, ...children: any[]): VNode {
  props = { ...props, children: toVNodes(children) };
  //! Don't call the component yet: keep it in the tree, so each instance owns its state.
  if (typeof tag === "function") return { type: "component", tag, props };
  return { type: "element", tag, props };
}
`
  );
}

function createDomCode(n: number) {
  if (n < 5)
    return lines(
      `
//! VNode in, real DOM node out.
export function createDom(vnode: VNode): Node {
  const el = document.createElement(vnode.tag);
`,
      n >= 4 && `  applyProps(el, vnode.props);
`,
      `  for (const child of vnode.props.children) el.append(String(child));
  return el;
}
`,
    );
  if (n < 9)
    return `
export function createDom(vnode: VNode): Node {
  if (vnode.type === "text") return document.createTextNode(vnode.value!);

  const el = document.createElement(vnode.tag!);
  applyProps(el, vnode.props);
  //! Recurse: every child becomes a DOM node inside this one.
  for (const child of vnode.props.children) el.appendChild(createDom(child));
  return el;
}
`;
  return lines(
    `
export function createDom(vnode: VNode): Node {
`,
    n >= 11 &&
      `  if (vnode.type === "component") {
    //! New instance: empty hook slots, then render it.
    vnode.hooks = [];
    vnode.child = renderComponent(vnode);
    return (vnode.dom = createDom(vnode.child));
  }
`,
    `  //! Remember the DOM node: next render we patch it instead of rebuilding.
  if (vnode.type === "text") {
    return (vnode.dom = document.createTextNode(vnode.value!));
  }
  const el = document.createElement(vnode.tag${n >= 11 ? " as string" : "!"});
  applyProps(el, {}, vnode.props);
  for (const child of vnode.props.children) el.appendChild(createDom(child));
  return (vnode.dom = el);
}
`,
  );
}

function applyPropsCode(n: number) {
  if (n < 4) return "";
  if (n < 9)
    return lines(
      `
export function applyProps(el: ${n >= 6 ? "any" : "HTMLElement"}, props: any) {
  for (const key in props) {
    const value = props[key];
    if (key === "children") continue;
`,
      n >= 7 && `    //! onClick → addEventListener("click", fn)
    if (key.startsWith("on")) el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === "style") Object.assign(el.style, value);
`,
      n < 7 && `    //! style={{ fontSize: "22px" }}  →  el.style.fontSize = "22px"
    if (key === "style") Object.assign(el.style, value);
`,
      `    //! JSX says className, the DOM attribute is class.
    else if (key === "className") el.setAttribute("class", value);
`,
      n >= 6 && `    //! checked={false} must be a property: the attribute "false" would still check it.
    else if (key === "checked" || key === "value") el[key] = value;
`,
      `    else el.setAttribute(key, value);
  }
}
`,
    );
  return lines(
    `
//! Compare old and new props; touch the DOM only where they differ.
export function applyProps(el: any, oldProps: any, newProps: any) {
  for (const key in { ...oldProps, ...newProps }) {
`,
    n >= 10
      ? `    //! key is for the reconciler, not the DOM.
    if (key === "children" || key === "key") continue;
`
      : `    if (key === "children") continue;
`,
    `    const prev = oldProps[key];
    const next = newProps[key];
    if (prev === next) continue;

    if (key.startsWith("on")) {
      const type = key.slice(2).toLowerCase();
      if (prev) el.removeEventListener(type, prev);
      if (next) el.addEventListener(type, next);
`,
    n >= 12 &&
      `    } else if (key === "ref") {
      //! ref={myRef}  →  myRef.current is this DOM node.
      if (next) next.current = el;
`,
    `    } else if (key === "style") {
      const a = prev || {};
      const b = next || {};
      for (const k in a) if (!(k in b)) el.style[k] = "";
      for (const k in b) if (a[k] !== b[k]) el.style[k] = b[k];
    } else if (key === "checked" || key === "value") {
      el[key] = next ?? "";
    } else {
      const name = key === "className" ? "class" : key;
      if (next == null || next === false) el.removeAttribute(name);
      else el.setAttribute(name, next);
    }
  }
}
`,
  );
}

const RENDER = `
export function render(vnode: VNode, container: Element) {
  container.replaceChildren(createDom(vnode));
}
`;

function reconcileCode(n: number) {
  if (n < 9) return "";
  const head = lines(
    `
export function reconcile(oldV: VNode, newV: VNode) {
  //! Different kind of node: replace it.
  if (oldV.type !== newV.type || oldV.tag !== newV.tag) {
`,
    n >= 12 && `    unmount(oldV);
`,
    `    (oldV.dom as ChildNode).replaceWith(createDom(newV));
    return;
  }
`,
    n >= 11 &&
      `  if (newV.type === "component") {
    //! Same component: keep its hooks, render it again, diff what it returns.
    newV.hooks = oldV.hooks;
    newV.child = renderComponent(newV);
    reconcile(oldV.child!, newV.child);
    newV.dom = newV.child.dom;
    return;
  }
`,
    `  //! Same kind: keep the DOM node, patch what changed.
  const dom = (newV.dom = oldV.dom!);
  if (newV.type === "text") {
    if (oldV.value !== newV.value) dom.nodeValue = newV.value!;
    return;
  }
  applyProps(dom, oldV.props, newV.props);
  reconcileChildren(dom, oldV.props.children, newV.props.children);
}
`,
  );
  if (n === 9)
    return (
      head +
      `
function reconcileChildren(parent: Node, oldKids: VNode[], newKids: VNode[]) {
  //! Match children by position.
  newKids.forEach((kid, i) => {
    if (oldKids[i]) reconcile(oldKids[i], kid);
    else parent.appendChild(createDom(kid));
  });
  oldKids.slice(newKids.length).forEach((kid) => (kid.dom as ChildNode).remove());
}
`
    );
  return lines(
    head,
    `
function reconcileChildren(parent: Node, oldKids: VNode[], newKids: VNode[]) {
  //! Match children by key (fallback: position), so an item keeps its DOM node.
  const keyOf = (v: VNode, i: number) => v.props.key ?? "#" + i;
  const old = new Map(oldKids.map((v, i) => [keyOf(v, i), v]));

  newKids.forEach((kid, i) => {
    const match = old.get(keyOf(kid, i));
    if (match) {
      reconcile(match, kid);
      old.delete(keyOf(kid, i));
    } else {
      createDom(kid);
    }
  });
  old.forEach((v) => {
`,
    n >= 12 && `    unmount(v);
`,
    `    (v.dom as ChildNode).remove();
  });

  //! Put nodes in order, moving only the ones out of place.
  newKids.forEach((kid, i) => {
    const at = parent.childNodes[i] ?? null;
    if (kid.dom !== at) parent.insertBefore(kid.dom!, at);
  });
}
`,
  );
}

function mountCode(n: number) {
  if (n < 8) return "";
  const devtools = `
//! Lets the VDOM panel see each committed tree (React DevTools does the same).
function devtools(tree: VNode) {
  (window as any).__MINI_DEVTOOLS__?.commit(tree);
}
`;
  if (n < 11)
    return (
      `
export function mount(App: () => VNode, container: Element) {
  const draw = () => {
    resetHooks();
    return App();
  };
  let tree = draw();
  container.replaceChildren(createDom(tree));
  devtools(tree);

` +
      (n === 8
        ? `  //! Every setState: throw the DOM away and build it again. Simple, but wasteful.
  onUpdate(() => {
    tree = draw();
    container.replaceChildren(createDom(tree));
    devtools(tree);
  });
}
`
        : `  onUpdate(() => {
    const next = draw();
    //! Patch the page from the old tree to the new one.
    reconcile(tree, next);
    tree = next;
    devtools(tree);
  });
}
`) +
      devtools
    );
  return lines(
    `
export function mount(App: Component, container: Element) {
  let tree = createElement(App, null);
  container.replaceChildren(createDom(tree));
  commit(tree);

  //! Any setState re-renders from the root; reconcile keeps it cheap.
  onUpdate(() => {
    const next = createElement(App, null);
    reconcile(tree, next);
    tree = next;
    commit(tree);
  });
}

function commit(tree: VNode) {
`,
    n >= 12 && `  flushEffects();
`,
    `  devtools(tree);
}
`,
    devtools,
  );
}

export function vdom(n: number): string {
  const imports =
    n >= 12
      ? `import { flushEffects, onUpdate, renderComponent, unmount } from "./hooks";

`
      : n >= 11
        ? `import { onUpdate, renderComponent } from "./hooks";

`
        : n >= 8
          ? `import { onUpdate, resetHooks } from "./hooks";

`
          : "";
  return lines(
    imports,
    vnodeType(n),
    JSX_TYPES,
    createElementCode(n),
    n >= 3 && createDomCode(n),
    applyPropsCode(n),
    n >= 3 && RENDER,
    reconcileCode(n),
    mountCode(n),
  );
}

// ---------------------------------------------------------------- src/mini/hooks.ts

const HOOKS_GLOBAL = `//! Every useState call gets the next slot, matched by call order.
//! (So: never call hooks inside if / loops.)
const slots: any[] = [];
let cursor = 0;
let update = () => {};

//! mount() tells us how to re-render.
export function onUpdate(fn: () => void) {
  update = fn;
}

export function resetHooks() {
  cursor = 0;
}

export function useState<T>(initial: T) {
  const i = cursor++;
  if (!(i in slots)) slots[i] = initial;
  const set = (next: T | ((prev: T) => T)) => {
    slots[i] = typeof next === "function" ? (next as any)(slots[i]) : next;
    update();
  };
  return [slots[i] as T, set] as const;
}
`;

const HOOKS_INSTANCES = `import type { Component, VNode } from "./vdom";

//! The component rendering right now, and its next hook index.
let current: VNode | null = null;
let cursor = 0;

export function renderComponent(vnode: VNode): VNode {
  current = vnode;
  cursor = 0;
  try {
    return (vnode.tag as Component)(vnode.props);
  } finally {
    current = null;
  }
}

//! Hook slot #i of the current component, created on its first render.
export function useSlot<T>(create: () => T): T {
  if (!current) throw new Error("Hooks must be called inside a component");
  const hooks = current.hooks!;
  const i = cursor++;
  if (!(i in hooks)) hooks[i] = create();
  return hooks[i];
}

//! Many setState calls in one event → one render, on the next microtask.
let scheduled = false;
let update = () => {};

export function onUpdate(fn: () => void) {
  update = fn;
}

export function scheduleUpdate() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    update();
  });
}
`;

const HOOKS_EFFECT_QUEUE = `
//! Effects wait until the DOM is up to date.
const effects: (() => void)[] = [];

export function queueEffect(fn: () => void) {
  effects.push(fn);
}

export function flushEffects() {
  for (const fn of effects.splice(0)) fn();
}

//! A subtree leaves the page: run every effect cleanup inside it.
export function unmount(vnode: VNode) {
  if (vnode.type === "component") {
    for (const slot of vnode.hooks ?? []) if (slot?.kind === "effect") slot.cleanup?.();
    unmount(vnode.child!);
  } else {
    vnode.props.children.forEach(unmount);
  }
}
`;

const HOOKS_STATE = `
type SetState<T> = (next: T | ((prev: T) => T)) => void;

export function useState<T>(initial: T | (() => T)): [T, SetState<T>] {
  //! The slot lives on THIS component instance. The setter never changes.
  const slot = useSlot(() => {
    const s = {
      value: typeof initial === "function" ? (initial as () => T)() : initial,
      set: ((next) => {
        const value =
          typeof next === "function" ? (next as (prev: T) => T)(s.value) : next;
        //! Same value: skip the render.
        if (Object.is(value, s.value)) return;
        s.value = value;
        scheduleUpdate();
      }) as SetState<T>,
    };
    return s;
  });
  return [slot.value, slot.set];
}

export function useReducer<S, A>(reducer: (state: S, action: A) => S, initial: S) {
  const [state, setState] = useState(initial);
  const dispatch = (action: A) => setState((s) => reducer(s, action));
  return [state, dispatch] as const;
}
`;

const HOOKS_EFFECTS = `
//! Runs after the DOM updates. deps: none = every render, [] = once, [a] = when a changes.
export function useEffect(effect: () => void | (() => void), deps?: unknown[]) {
  const slot = useSlot(() => ({
    kind: "effect",
    deps: undefined as unknown[] | undefined,
    cleanup: undefined as void | (() => void),
  }));
  if (deps && slot.deps && !changed(slot.deps, deps)) return;
  slot.deps = deps;
  queueEffect(() => {
    slot.cleanup?.();
    slot.cleanup = effect();
  });
}

//! A box that survives renders. Changing .current does not re-render.
export function useRef<T>(initial: T) {
  return useSlot(() => ({ current: initial }));
}

//! Recompute only when deps change.
export function useMemo<T>(compute: () => T, deps: unknown[]): T {
  const slot = useSlot(() => ({ deps: undefined as unknown[] | undefined, value: undefined as T }));
  if (!slot.deps || changed(slot.deps, deps)) {
    slot.value = compute();
    slot.deps = deps;
  }
  return slot.value;
}

export function useCallback<F extends (...args: any[]) => any>(fn: F, deps: unknown[]): F {
  return useMemo(() => fn, deps);
}

function changed(a: unknown[], b: unknown[]) {
  return a.length !== b.length || a.some((x, i) => !Object.is(x, b[i]));
}
`;

const HOOKS_QUERY = `
type Entry = {
  status: "pending" | "success" | "error";
  data?: any;
  error?: Error;
  fetching?: Promise<void>;
  fetcher: () => Promise<any>;
};

//! One cache for the whole app: every component asking for "todos" shares it.
const cache = new Map<string, Entry>();

function fetchQuery(key: string, fetcher: () => Promise<any>) {
  let entry = cache.get(key);
  if (!entry) cache.set(key, (entry = { status: "pending", fetcher }));
  entry.fetcher = fetcher;
  //! Already in flight? Don't fetch twice.
  if (entry.fetching) return;
  const e = entry;
  e.fetching = fetcher()
    .then(
      (data) => void Object.assign(e, { status: "success", data, error: undefined }),
      (error) => void Object.assign(e, { status: "error", error }),
    )
    .finally(() => {
      e.fetching = undefined;
      scheduleUpdate();
    });
  scheduleUpdate();
}

export function useQuery<T>(key: string, fetcher: () => Promise<T>) {
  //! Fetch on mount (and when key changes). Cached data shows meanwhile.
  useEffect(() => fetchQuery(key, fetcher), [key]);
  const entry = cache.get(key);
  return {
    data: entry?.data as T | undefined,
    error: entry?.error,
    isLoading: !entry || entry.status === "pending",
    isFetching: !!entry?.fetching,
    refetch: () => fetchQuery(key, fetcher),
  };
}

export function setQueryData<T>(key: string, update: (old: T) => T) {
  const entry = cache.get(key);
  if (!entry) return;
  entry.data = update(entry.data);
  scheduleUpdate();
}

export function invalidateQuery(key: string) {
  const entry = cache.get(key);
  if (entry) fetchQuery(key, entry.fetcher);
}

type MutationOptions<V, R> = {
  //! May return an undo function: used to roll back optimistic updates.
  onMutate?: (vars: V) => (() => void) | void;
  onSuccess?: (data: R, vars: V) => void;
  onError?: (error: Error, vars: V) => void;
  onSettled?: () => void;
};

type MutationState<R> = {
  status: "idle" | "pending" | "success" | "error";
  data?: R;
  error?: Error;
};

export function useMutation<V, R>(
  mutationFn: (vars: V) => Promise<R>,
  options: MutationOptions<V, R> = {},
) {
  const [state, setState] = useState<MutationState<R>>({ status: "idle" });

  const mutate = async (vars: V) => {
    setState({ status: "pending" });
    const undo = options.onMutate?.(vars);
    try {
      const data = await mutationFn(vars);
      setState({ status: "success", data });
      options.onSuccess?.(data, vars);
    } catch (e) {
      undo?.();
      setState({ status: "error", error: e as Error });
      options.onError?.(e as Error, vars);
    } finally {
      options.onSettled?.();
    }
  };

  return { ...state, mutate, isPending: state.status === "pending" };
}
`;

export function hooks(n: number): string {
  if (n < 11) return HOOKS_GLOBAL;
  return lines(HOOKS_INSTANCES, n >= 12 && HOOKS_EFFECT_QUEUE, HOOKS_STATE, n >= 12 && HOOKS_EFFECTS, n >= 13 && HOOKS_QUERY);
}

// ---------------------------------------------------------------- src/mini/router.ts

export const ROUTER = `import { createElement, type Component, type VNode } from "./vdom";
import { scheduleUpdate } from "./hooks";

//! The URL hash is the route: #/stats → "/stats".
export const currentPath = () => location.hash.slice(1) || "/";

export function navigate(to: string) {
  location.hash = to;
}

window.addEventListener("hashchange", scheduleUpdate);

export function Link(props: any): VNode {
  const active = currentPath() === props.to;
  const style = active ? { ...props.style, ...props.activeStyle } : props.style;
  return createElement("a", { href: "#" + props.to, style }, props.children);
}

//! Pages are components: switching routes unmounts one, mounts the other.
export function Router({ routes }: { routes: Record<string, Component> }) {
  const Page = routes[currentPath()] ?? routes["*"];
  return Page ? createElement(Page, null) : createElement("p", null, "Not found");
}
`;

// ---------------------------------------------------------------- src/styles.ts

const STYLES_V1 = `// Style objects, shared by the app.
export const card = {
  background: "#fff",
  borderRadius: "16px",
  boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04), 0 12px 32px -8px rgba(16, 24, 40, 0.14)",
  overflow: "hidden",
};

export const header = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  padding: "24px 24px 18px",
};

export const title = {
  margin: "0",
  fontSize: "24px",
  fontWeight: "700",
  letterSpacing: "-0.02em",
};

export const subtitle = {
  margin: "4px 0 0",
  color: "#8a93a6",
  fontSize: "13px",
};

export const badge = {
  padding: "4px 10px",
  borderRadius: "8px",
  background: "#eef2ff",
  color: "#3b5bdb",
  fontSize: "13px",
  fontWeight: "600",
  whiteSpace: "nowrap",
};

export const list = { listStyle: "none", margin: "0", padding: "0" };

export const item = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  padding: "14px 24px",
  borderTop: "1px solid #f1f3f6",
  fontSize: "15px",
  animation: "enter 0.2s ease-out",
};
`;
const STYLES_V2 = `
const tick =
  "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 12%22%3E%3Cpath d=%22M2.5 6.2l2.3 2.3 4.7-5%22 fill=%22none%22 stroke=%22white%22 stroke-width=%221.8%22 stroke-linecap=%22round%22/%3E%3C/svg%3E')";

// A round checkbox: a function, because it looks different when done.
export const check = (done: boolean) => ({
  appearance: "none",
  flex: "none",
  width: "20px",
  height: "20px",
  margin: "0",
  border: "1.5px solid " + (done ? "#3b5bdb" : "#c7cdd8"),
  borderRadius: "50%",
  backgroundColor: done ? "#3b5bdb" : "#fff",
  backgroundImage: done ? tick : "none",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "12px",
  cursor: "pointer",
  transition: "background-color 0.15s, border-color 0.15s",
});

export const text = (done: boolean) => ({
  flex: "1",
  color: done ? "#a3aab8" : "#1c2230",
  textDecoration: done ? "line-through" : "none",
  textDecorationColor: "#c7cdd8",
  transition: "color 0.15s",
});

export const remove = {
  padding: "2px 6px",
  border: "0",
  borderRadius: "6px",
  background: "transparent",
  color: "#c3c9d4",
  fontSize: "18px",
  lineHeight: "1",
  cursor: "pointer",
};
`;
const STYLES_V3 = `
export const form = { display: "flex", gap: "8px", padding: "0 24px 18px" };

export const input = {
  flex: "1",
  padding: "11px 14px",
  border: "1px solid #e1e5ec",
  borderRadius: "10px",
  background: "#f8f9fb",
  font: "inherit",
  outline: "none",
};

export const button = {
  padding: "11px 18px",
  border: "0",
  borderRadius: "10px",
  background: "#3b5bdb",
  color: "#fff",
  font: "inherit",
  fontWeight: "600",
  cursor: "pointer",
};
`;
const STYLES_V4 = `
export const bone = {
  display: "block",
  height: "12px",
  borderRadius: "6px",
  background: "#e9edf3",
  animation: "pulse 1.2s ease-in-out infinite",
};

export const error = {
  margin: "0 22px 14px",
  padding: "10px 12px",
  borderRadius: "10px",
  background: "#fff1f0",
  color: "#c92a2a",
  fontSize: "14px",
};
`;
const STYLES_V5 = `
export const nav = {
  display: "flex",
  gap: "4px",
  width: "fit-content",
  padding: "4px",
  marginBottom: "14px",
  borderRadius: "12px",
  background: "#e2e6ee",
};

export const link = {
  padding: "7px 16px",
  borderRadius: "9px",
  color: "#5b6477",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
};

export const linkActive = {
  background: "#fff",
  color: "#1f2430",
  boxShadow: "0 1px 2px rgba(16, 24, 40, 0.1)",
};

export const big = {
  margin: "14px 0 12px",
  fontSize: "52px",
  fontWeight: "800",
  letterSpacing: "-0.03em",
  color: "#3b5bdb",
};

export const track = {
  height: "10px",
  borderRadius: "999px",
  background: "#edf0f5",
  overflow: "hidden",
};

export const bar = {
  height: "100%",
  borderRadius: "999px",
  background: "#3b5bdb",
  transition: "width 0.3s ease",
};

export const row = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "12px",
  color: "#6b7385",
  fontSize: "14px",
};
`;
const STYLES_FINAL = `
export const footer = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "10px 16px",
  borderTop: "1px solid #f0f2f5",
  background: "#fafbfc",
};

export const chip = (active: boolean) => ({
  padding: "4px 10px",
  border: "1px solid " + (active ? "#c5d0fa" : "transparent"),
  borderRadius: "8px",
  background: active ? "#edf2ff" : "transparent",
  color: active ? "#3b5bdb" : "#6b7385",
  font: "inherit",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
});

export const clear = {
  marginLeft: "auto",
  border: "0",
  background: "transparent",
  color: "#9aa3b2",
  font: "inherit",
  fontSize: "13px",
  cursor: "pointer",
};

export const empty = {
  padding: "28px 22px",
  borderTop: "1px solid #f0f2f5",
  color: "#9aa3b2",
  textAlign: "center",
};
`;

export function styles(n: number): string {
  return lines(STYLES_V1, n >= 6 && STYLES_V2, n >= 8 && STYLES_V3, n >= 13 && STYLES_V4, n >= 14 && STYLES_V5, n >= 15 && STYLES_FINAL);
}

// ---------------------------------------------------------------- src/data.ts

const TODO = `export type Todo = { id: number; text: string; done: boolean };
`;

const INITIAL = `
export const initialTodos: Todo[] = [
  { id: 1, text: "Learn the virtual DOM", done: true },
  { id: 2, text: "Write createElement", done: true },
  { id: 3, text: "Ship a tiny framework", done: false },
];
`;

const REDUCER = `
export type Action =
  | { type: "add"; text: string }
  | { type: "toggle"; id: number }
  | { type: "remove"; id: number };

export function todosReducer(todos: Todo[], action: Action): Todo[] {
  switch (action.type) {
    case "add":
      return [{ id: Date.now(), text: action.text, done: false }, ...todos];
    case "toggle":
      return todos.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t));
    case "remove":
      return todos.filter((t) => t.id !== action.id);
  }
}
`;

const API = `
//! A pretend server: data lives here and every call takes a moment.
let db: Todo[] = [
  { id: 1, text: "Learn the virtual DOM", done: true },
  { id: 2, text: "Write a reconciler", done: true },
  { id: 3, text: "Fetch data with useQuery", done: false },
  { id: 4, text: "Toggle me: the server says no", done: false },
];
let nextId = 5;

const delay = () => new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
const copy = () => db.map((t) => ({ ...t }));

export const api = {
  async list(): Promise<Todo[]> {
    await delay();
    console.log("GET /todos");
    return copy();
  },
  async add(text: string): Promise<Todo> {
    await delay();
    console.log("POST /todos", { text });
    if (/fail/i.test(text)) throw new Error("Server rejected: " + text);
    const todo = { id: nextId++, text, done: false };
    db = [todo, ...db];
    return todo;
  },
  async toggle(id: number): Promise<void> {
    await delay();
    console.log("PATCH /todos/" + id);
    if (id === 4) throw new Error("Todo #4 is locked");
    db = db.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
  },
  async remove(id: number): Promise<void> {
    await delay();
    console.log("DELETE /todos/" + id);
    db = db.filter((t) => t.id !== id);
  },
  async clearDone(): Promise<void> {
    await delay();
    console.log("DELETE /todos?done=true");
    db = db.filter((t) => !t.done);
  },
};
`;

export function data(n: number): string {
  if (n >= 13) return TODO + API;
  return lines(TODO, INITIAL, n >= 11 && REDUCER);
}

// ---------------------------------------------------------------- src/components.tsx

const CUSTOM_HOOKS = `
//! A custom hook is just a function that calls hooks.
export function useHotkey(key: string, handler: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== key || document.activeElement?.tagName === "INPUT") return;
      e.preventDefault();
      handler();
    };
    window.addEventListener("keydown", onKey);
    //! Cleanup runs before the next effect, and when the component unmounts.
    return () => window.removeEventListener("keydown", onKey);
  }, [key, handler]);
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
`;

function headerCode(n: number) {
  if (n < 13)
    return `
const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

export function Header({ left }: { left: number }) {
  return (
    <header style={s.header}>
      <div>
        <h1 style={s.title}>My todos</h1>
        <p style={s.subtitle}>{today}</p>
      </div>
      <span style={s.badge}>{left} left</span>
    </header>
  );
}
`;
  return `
const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

export function Header({ left, busy }: { left: number; busy?: boolean }) {
  return (
    <header style={s.header}>
      <div>
        <h1 style={s.title}>My todos</h1>
        <p style={s.subtitle}>{today}</p>
      </div>
      <span style={{ ...s.badge, animation: busy ? "pulse 1s infinite" : "none" }}>
        {left} left
      </span>
    </header>
  );
}
`;
}

function newTodoCode(n: number) {
  if (n < 11) return "";
  if (n === 11)
    return `
export function NewTodo({ onAdd }: { onAdd: (text: string) => void }) {
  //! This state belongs to NewTodo alone.
  const [draft, setDraft] = useState("");

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    //! Two state updates, one render: they are batched.
    onAdd(text);
    setDraft("");
  };

  return (
    <div style={s.form}>
      <input
        style={s.input}
        placeholder="What needs doing?"
        value={draft}
        onInput={(e: any) => setDraft(e.target.value)}
        onKeyDown={(e: KeyboardEvent) => e.key === "Enter" && submit()}
      />
      <button style={s.button} onClick={submit}>
        Add
      </button>
    </div>
  );
}
`;
  const busy = n >= 13;
  return `
type NewTodoProps = { onAdd: (text: string) => void${busy ? "; busy?: boolean" : ""} };

export function NewTodo({ onAdd${busy ? ", busy" : ""} }: NewTodoProps) {
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement | null>(null);

  //! Stable function, so useHotkey's effect does not re-subscribe every render.
  const focus = useCallback(() => input.current?.focus(), []);
  useHotkey("/", focus);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft("");
  };

  return (
    <div style={s.form}>
      <input
        ref={input}
        style={s.input}
        placeholder="What needs doing?  (press /)"
        value={draft}
        onInput={(e: any) => setDraft(e.target.value)}
        onKeyDown={(e: KeyboardEvent) => e.key === "Enter" && submit()}
      />
      <button style={${busy ? '{ ...s.button, opacity: busy ? "0.6" : "1" }' : "s.button"}} onClick={submit}>
        Add
      </button>
    </div>
  );
}
`;
}

function todoItemCode(n: number) {
  if (n === 6)
    return `
export function TodoItem({ todo }: { todo: Todo }) {
  return (
    <li style={s.item}>
      <input type="checkbox" checked={todo.done} style={s.check(todo.done)} />
      <span style={s.text(todo.done)}>{todo.text}</span>
      <button style={s.remove}>×</button>
    </li>
  );
}
`;
  return lines(
    `
type TodoItemProps = {
  todo: Todo;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
};

export function TodoItem({ todo, onToggle, onRemove }: TodoItemProps) {
  return (
`,
    n === 10
      ? `    //! The key goes on the element our component returns.
    <li key={todo.id} style={s.item}>
`
      : `    <li style={s.item}>
`,
    `      <input
        type="checkbox"
        checked={todo.done}
        style={s.check(todo.done)}
        onChange={() => onToggle(todo.id)}
      />
      <span style={s.text(todo.done)}>{todo.text}</span>
      <button style={s.remove} onClick={() => onRemove(todo.id)}>
        ×
      </button>
    </li>
  );
}
`,
  );
}

const SKELETON = `
export function Skeleton() {
  return (
    <ul style={s.list}>
      {["70%", "52%", "80%"].map((width) => (
        <li style={s.item}>
          <span style={{ ...s.bone, width }} />
        </li>
      ))}
    </ul>
  );
}
`;

export function components(n: number): string {
  const hookNames = n >= 12 ? "useCallback, useEffect, useRef, useState" : n >= 11 ? "useState" : "";
  return lines(
    `import { createElement } from "./mini/vdom";
`,
    !!hookNames && `import { ${hookNames} } from "./mini/hooks";
`,
    `import type { Todo } from "./data";
import * as s from "./styles";
`,
    n >= 12 && CUSTOM_HOOKS,
    headerCode(n),
    newTodoCode(n),
    todoItemCode(n),
    n >= 13 && SKELETON,
  );
}

// ---------------------------------------------------------------- the todos screen (App at 13, TodosPage from 14)

const FILTERS = `
type Filter = "all" | "active" | "done";

const show: Record<Filter, (t: Todo) => boolean> = {
  all: () => true,
  active: (t) => !t.done,
  done: (t) => t.done,
};
`;

function todosScreen(name: string, ship: boolean) {
  return `
export function ${name}() {
  const todos = useQuery("todos", api.list);
  const list = todos.data ?? [];
  const left = useMemo(() => list.filter((t) => !t.done).length, [list]);${
    ship
      ? `
  const [filter, setFilter] = useState<Filter>("all");
  const visible = list.filter(show[filter]);`
      : ""
  }
  useDocumentTitle(left ? left + " left · Todos" : "All done · Todos");

  //! Change the cached list now; return how to undo it.
  const optimistic = (update: (list: Todo[]) => Todo[]) => {
    const before = todos.data;
    setQueryData<Todo[]>("todos", update);
    return () => setQueryData<Todo[]>("todos", () => before!);
  };
  const refresh = () => invalidateQuery("todos");

  const add = useMutation(api.add, { onSuccess: refresh });
  const toggle = useMutation(api.toggle, {
    onMutate: (id) =>
      optimistic((l) => l.map((t) => (t.id === id ? { ...t, done: !t.done } : t))),
    onSettled: refresh,
  });
  const remove = useMutation(api.remove, {
    onMutate: (id) => optimistic((l) => l.filter((t) => t.id !== id)),
    onSettled: refresh,
  });
${
  ship
    ? `  const clearDone = useMutation(api.clearDone, {
    onMutate: () => optimistic((l) => l.filter((t) => !t.done)),
    onSettled: refresh,
  });
  const failed = add.error ?? toggle.error ?? remove.error ?? clearDone.error;
`
    : `  const failed = add.error ?? toggle.error ?? remove.error;
`
}
  return (
    <div style={s.card}>
      <Header left={left} busy={todos.isFetching} />
      <NewTodo onAdd={(text) => add.mutate(text)} busy={add.isPending} />
      {failed && <div style={s.error}>{failed.message}</div>}
      {todos.isLoading ? (
        <Skeleton />
      ) : ${ship ? "!visible.length ? (\n        <div style={s.empty}>Nothing here.</div>\n      ) : " : ""}(
        <ul style={s.list}>
          {${ship ? "visible" : "list"}.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={(id) => toggle.mutate(id)}
              onRemove={(id) => remove.mutate(id)}
            />
          ))}
        </ul>
      )}${
        ship
          ? `
      <div style={s.footer}>
        {(["all", "active", "done"] as Filter[]).map((f) => (
          <button style={s.chip(f === filter)} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button style={s.clear} onClick={() => clearDone.mutate(undefined)}>
          Clear done
        </button>
      </div>`
          : ""
      }
    </div>
  );
}
`;
}

const screenImports = (ship: boolean) => `import { createElement } from "./mini/vdom";
import { invalidateQuery, setQueryData, useMemo, useMutation, useQuery${ship ? ", useState" : ""} } from "./mini/hooks";
import { api, type Todo } from "./data";
import { Header, NewTodo, Skeleton, TodoItem, useDocumentTitle } from "./components";
import * as s from "./styles";
`;

// ---------------------------------------------------------------- src/pages.tsx

const STATS_PAGE = `
export function StatsPage() {
  //! Same key as the Todos page: cached data shows instantly, then refreshes.
  const todos = useQuery("todos", api.list);
  const list = todos.data ?? [];
  const done = list.filter((t) => t.done).length;
  const pct = list.length ? Math.round((done / list.length) * 100) : 0;

  return (
    <div style={{ ...s.card, padding: "22px" }}>
      <h1 style={s.title}>Progress</h1>
      <div style={{ ...s.big, opacity: todos.isFetching ? "0.5" : "1" }}>{pct}%</div>
      <div style={s.track}>
        <div style={{ ...s.bar, width: pct + "%" }} />
      </div>
      <div style={s.row}>
        <span>{done} done</span>
        <span>{list.length - done} left</span>
      </div>
    </div>
  );
}
`;

export function pages(n: number): string {
  const ship = n >= 15;
  return lines(screenImports(ship), ship && FILTERS, todosScreen("TodosPage", ship), STATS_PAGE);
}

// ---------------------------------------------------------------- src/App.tsx

const LIST_SIMPLE = `      <ul style={s.list}>
        {todos.map((todo) => (
          <TodoItem todo={todo} onToggle={toggle} onRemove={remove} />
        ))}
      </ul>
`;

export function app(n: number): string {
  if (n === 6)
    return `import { createElement } from "./mini/vdom";
import { Header, TodoItem } from "./components";
import { initialTodos } from "./data";
import * as s from "./styles";

export function App() {
  const todos = initialTodos;
  const left = todos.filter((t) => !t.done).length;

  return (
    <div style={s.card}>
      <Header left={left} />
      <ul style={s.list}>
        {todos.map((todo) => (
          <TodoItem todo={todo} />
        ))}
      </ul>
    </div>
  );
}
`;
  if (n === 7)
    return (
      `import { createElement } from "./mini/vdom";
import { Header, TodoItem } from "./components";
import { initialTodos } from "./data";
import * as s from "./styles";

export function App() {
  const todos = initialTodos;
  const left = todos.filter((t) => !t.done).length;

  const toggle = (id: number) => console.log("toggle", id);
  const remove = (id: number) => console.log("remove", id);

  return (
    <div style={s.card}>
      <Header left={left} />
` +
      LIST_SIMPLE +
      `    </div>
  );
}
`
    );
  if (n <= 10)
    return (
      `import { createElement } from "./mini/vdom";
import { useState } from "./mini/hooks";
import { Header, TodoItem } from "./components";
import { initialTodos, type Todo } from "./data";
import * as s from "./styles";

export function App() {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [draft, setDraft] = useState("");
  const left = todos.filter((t) => !t.done).length;

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setTodos([{ id: Date.now(), text, done: false }, ...todos]);
    setDraft("");
  };
  const toggle = (id: number) =>
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id: number) => setTodos(todos.filter((t) => t.id !== id));

  return (
    <div style={s.card}>
      <Header left={left} />
      <div style={s.form}>
        <input
          style={s.input}
          placeholder="What needs doing?"
          value={draft}
          onInput={(e: any) => setDraft(e.target.value)}
          onKeyDown={(e: KeyboardEvent) => e.key === "Enter" && add()}
        />
        <button style={s.button} onClick={add}>
          Add
        </button>
      </div>
` +
      LIST_SIMPLE +
      `    </div>
  );
}
`
    );
  if (n <= 12)
    return lines(
      `import { createElement } from "./mini/vdom";
import { ${n >= 12 ? "useMemo, useReducer" : "useReducer"} } from "./mini/hooks";
import { Header, NewTodo, TodoItem${n >= 12 ? ", useDocumentTitle" : ""} } from "./components";
import { initialTodos, todosReducer } from "./data";
import * as s from "./styles";

export function App() {
  const [todos, dispatch] = useReducer(todosReducer, initialTodos);
`,
      n >= 12
        ? `  const left = useMemo(() => todos.filter((t) => !t.done).length, [todos]);
  useDocumentTitle(left ? left + " left · Todos" : "All done · Todos");
`
        : `  const left = todos.filter((t) => !t.done).length;
`,
      `
  return (
    <div style={s.card}>
      <Header left={left} />
      <NewTodo onAdd={(text) => dispatch({ type: "add", text })} />
      <ul style={s.list}>
        {todos.map((todo) => (
          //! Components are real tree nodes now: the key goes right here.
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={(id) => dispatch({ type: "toggle", id })}
            onRemove={(id) => dispatch({ type: "remove", id })}
          />
        ))}
      </ul>
    </div>
  );
}
`,
    );
  if (n === 13) return screenImports(false) + todosScreen("App", false);
  return `import { createElement } from "./mini/vdom";
import { Link, Router } from "./mini/router";
import { StatsPage, TodosPage } from "./pages";
import * as s from "./styles";

export function App() {
  return (
    <div>
      <nav style={s.nav}>
        <Link to="/" style={s.link} activeStyle={s.linkActive}>
          Todos
        </Link>
        <Link to="/stats" style={s.link} activeStyle={s.linkActive}>
          Stats
        </Link>
      </nav>
      <Router routes={{ "/": TodosPage, "/stats": StatsPage }} />
    </div>
  );
}
`;
}

// ---------------------------------------------------------------- src/main.tsx

export function main(n: number): string {
  if (n === 2)
    return `import { createElement } from "./mini/vdom";

const app = <h1 className="title">My todos</h1>;

console.log(app);
`;
  if (n === 3)
    return `import { createElement, render } from "./mini/vdom";

const app = <h1 className="title">My todos</h1>;

render(app, document.getElementById("root")!);
`;
  if (n === 4)
    return `import { createElement, render } from "./mini/vdom";

const app = (
  <h1
    className="title"
    style={{
      margin: "0",
      padding: "20px 22px",
      background: "#fff",
      borderRadius: "14px",
      boxShadow: "0 8px 24px rgba(16, 24, 40, 0.08)",
      fontSize: "22px",
      letterSpacing: "-0.01em",
    }}
  >
    My todos
  </h1>
);

render(app, document.getElementById("root")!);
`;
  if (n === 5)
    return `import { createElement, render } from "./mini/vdom";
import * as s from "./styles";

const app = (
  <div style={s.card}>
    <header style={s.header}>
      <h1 style={s.title}>My todos</h1>
      <span style={s.badge}>2 left</span>
    </header>
    <ul style={s.list}>
      <li style={s.item}>Learn the virtual DOM</li>
      <li style={s.item}>Write createElement</li>
      <li style={s.item}>Ship a tiny framework</li>
    </ul>
  </div>
);

render(app, document.getElementById("root")!);
`;
  if (n < 8)
    return `import { createElement, render } from "./mini/vdom";
import { App } from "./App";

render(<App />, document.getElementById("root")!);
`;
  return `import { mount } from "./mini/vdom";
import { App } from "./App";

mount(App, document.getElementById("root")!);
`;
}

// ---------------------------------------------------------------- the whole src/ at step n

export function project(n: number): Record<string, string> {
  const files: Record<string, string> = {
    "src/mini/vdom.ts": vdom(n),
    "src/main.tsx": main(n),
  };
  if (n >= 5) files["src/styles.ts"] = styles(n);
  if (n >= 6) {
    files["src/data.ts"] = data(n);
    files["src/components.tsx"] = components(n);
    files["src/App.tsx"] = app(n);
  }
  if (n >= 8) files["src/mini/hooks.ts"] = hooks(n);
  if (n >= 14) {
    files["src/mini/router.ts"] = ROUTER;
    files["src/pages.tsx"] = pages(n);
  }
  return files;
}
