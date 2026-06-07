export type RefFile = { path: string; code: string };

export type Step = {
  id: string;
  title: string;
  kind: "concept" | "code" | "reference";
  explanation: string; // HTML
  code?: string; // for kind: "code"
  files?: RefFile[]; // for kind: "reference"
};

// Each code step is a full snapshot of the evolving mini-framework. Snapshots are
// monotonic: a step only ADDS a small block, and the new lines carry short teaching
// comments that are removed again in the next step (older code stays clean).

const CREATE = `// JSX is just sugar. Our config points the JSX transform at this
// function with jsxFactory: "createElement", so writing <div/>
// compiles to createElement("div", ...). We decide what an element is.
type VDOM = {
  type: string;
  tag?: any;
  props?: { [key: string]: any };
  value?: string | number;
  dom?: any;
};

// createElement packs a tag + props + children into a plain object:
// a "virtual DOM" node that only DESCRIBES the UI. No real DOM yet.
function createElement(tag: any, props: any = {}, ...children: any[]): VDOM {
  props.children = children;
  return { type: "element", tag, props };
}

const tree = <div className="card">Hello</div>;
console.log(tree); // open the console pane to inspect the object
`;

const RENDER = `type VDOM = {
  type: string;
  tag?: any;
  props?: { [key: string]: any };
  value?: string | number;
  dom?: any;
};

function createElement(tag: any, props: any = {}, ...children: any[]): VDOM {
  props.children = children;
  return { type: "element", tag, props };
}

// createDOM builds ONE real DOM node from a vdom node...
function createDOM(vdom: VDOM) {
  vdom.dom = document.createElement(vdom.tag as string);
}

// ...and render walks the vdom, creating DOM as it goes.
function render(vdom: VDOM): VDOM {
  createDOM(vdom);
  return vdom;
}

const out = render(<div className="card">Hello</div>);

// "mount" = drop the real node into the page's #root.
document.getElementById("root")!.appendChild(out.dom);
console.log(document.getElementById("root")!.innerHTML);
`;

const ATTR = `type VDOM = {
  type: string;
  tag?: any;
  props?: { [key: string]: any };
  value?: string | number;
  dom?: any;
};

function createElement(tag: any, props: any = {}, ...children: any[]): VDOM {
  props.children = children;
  return { type: "element", tag, props };
}

function createDOM(vdom: VDOM) {
  const el = document.createElement(vdom.tag as string);
  // copy every prop onto the real node (skip "children" for now).
  for (const key in vdom.props) {
    if (key === "children") continue;
    // React uses className; the DOM attribute is "class".
    if (key === "className") el.setAttribute("class", vdom.props[key]);
    else el.setAttribute(key, vdom.props[key]);
  }
  vdom.dom = el;
}

function render(vdom: VDOM): VDOM {
  createDOM(vdom);
  return vdom;
}

const out = render(
  <div style="width:140px;height:80px;background:#1f6feb;border-radius:14px" />,
);
document.getElementById("root")!.appendChild(out.dom);
`;

const TEXT = `type VDOM = {
  type: string;
  tag?: any;
  props?: { [key: string]: any };
  value?: string | number;
  dom?: any;
};

// Raw strings/numbers aren't objects — wrap them as "text" vdom nodes.
function check(children: any[]): VDOM[] {
  return children.map((c) =>
    typeof c === "object" ? c : { type: "text", props: {}, value: c },
  );
}

function createElement(tag: any, props: any = {}, ...children: any[]): VDOM {
  props.children = check(children);
  return { type: "element", tag, props };
}

function createDOM(vdom: VDOM) {
  // text nodes are their own kind of DOM node.
  if (vdom.type === "text") {
    vdom.dom = document.createTextNode(String(vdom.value));
    return;
  }
  const el = document.createElement(vdom.tag as string);
  for (const key in vdom.props) {
    if (key === "children") continue;
    if (key === "className") el.setAttribute("class", vdom.props[key]);
    else el.setAttribute(key, vdom.props[key]);
  }
  vdom.dom = el;
}

function render(vdom: VDOM): VDOM {
  createDOM(vdom);
  // render each child, then append it to this node.
  for (const child of vdom.props?.children || []) {
    render(child);
    vdom.dom.appendChild(child.dom);
  }
  return vdom;
}

const tree = (
  <div style="font-size:24px">
    Hello <b style="color:#36b6ff">world</b>
  </div>
);
document.getElementById("root")!.appendChild(render(tree).dom);
`;

const COMP = `type VDOM = {
  type: string;
  tag?: any;
  props?: { [key: string]: any };
  value?: string | number;
  dom?: any;
};

function check(children: any[]): VDOM[] {
  // children can include arrays (a component's {props.children}, or
  // list.map(...)) and falsy values from conditionals — flatten the
  // arrays and drop the falsy ones before wrapping text nodes.
  return children
    .flat(Infinity)
    .filter((c) => c != null && typeof c !== "boolean")
    .map((c) => (typeof c === "object" ? c : { type: "text", props: {}, value: c }));
}

function createElement(tag: any, props: any = {}, ...children: any[]): VDOM {
  // JSX passes null for props when a tag has none — default it first.
  props = props || {};
  props.children = check(children);
  // a function tag is a Component — call it to get its vdom.
  if (typeof tag === "function") return tag(props);
  return { type: "element", tag, props };
}

function createDOM(vdom: VDOM) {
  if (vdom.type === "text") {
    vdom.dom = document.createTextNode(String(vdom.value));
    return;
  }
  const el = document.createElement(vdom.tag as string);
  for (const key in vdom.props) {
    if (key === "children") continue;
    if (key === "className") el.setAttribute("class", vdom.props[key]);
    else el.setAttribute(key, vdom.props[key]);
  }
  vdom.dom = el;
}

function render(vdom: VDOM): VDOM {
  createDOM(vdom);
  for (const child of vdom.props?.children || []) {
    render(child);
    vdom.dom.appendChild(child.dom);
  }
  return vdom;
}

// A component is just a function that returns vdom.
function Card(props: any) {
  return (
    <div style="padding:18px 22px;background:#15233b;border-radius:14px;display:inline-block">
      {props.children}
    </div>
  );
}

const tree = (
  <Card>
    <h2 style="margin:0;color:#36b6ff">Components!</h2>
  </Card>
);
document.getElementById("root")!.appendChild(render(tree).dom);
`;

const EVENTS = `type VDOM = {
  type: string;
  tag?: any;
  props?: { [key: string]: any };
  value?: string | number;
  dom?: any;
};

function check(children: any[]): VDOM[] {
  return children
    .flat(Infinity)
    .filter((c) => c != null && typeof c !== "boolean")
    .map((c) => (typeof c === "object" ? c : { type: "text", props: {}, value: c }));
}

function createElement(tag: any, props: any = {}, ...children: any[]): VDOM {
  props = props || {};
  props.children = check(children);
  if (typeof tag === "function") return tag(props);
  return { type: "element", tag, props };
}

function createDOM(vdom: VDOM) {
  if (vdom.type === "text") {
    vdom.dom = document.createTextNode(String(vdom.value));
    return;
  }
  const el = document.createElement(vdom.tag as string);
  for (const key in vdom.props) {
    if (key === "children") continue;
    // a prop named like an event ("onClick") becomes a real listener:
    // strip "on", lowercase the rest -> addEventListener("click", fn).
    if (key.startsWith("on") && typeof vdom.props[key] === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), vdom.props[key]);
    } else if (key === "className") el.setAttribute("class", vdom.props[key]);
    else el.setAttribute(key, vdom.props[key]);
  }
  vdom.dom = el;
}

function render(vdom: VDOM): VDOM {
  createDOM(vdom);
  for (const child of vdom.props?.children || []) {
    render(child);
    vdom.dom.appendChild(child.dom);
  }
  return vdom;
}

// "on*" props become DOM event listeners, so the UI can react to input.
let clicks = 0;
function App() {
  return (
    <button
      onClick={() => console.log("clicked " + ++clicks + " time(s)")}
      style="padding:10px 18px;background:#1f6feb;color:#fff;border:0;border-radius:10px;font-size:15px;cursor:pointer"
    >
      Click me — watch the console
    </button>
  );
}
document.getElementById("root")!.appendChild(render(<App />).dom);
`;

const MOUNT = `type VDOM = {
  type: string;
  tag?: any;
  props?: { [key: string]: any };
  value?: string | number;
  dom?: any;
};

function check(children: any[]): VDOM[] {
  return children
    .flat(Infinity)
    .filter((c) => c != null && typeof c !== "boolean")
    .map((c) => (typeof c === "object" ? c : { type: "text", props: {}, value: c }));
}

function createElement(tag: any, props: any = {}, ...children: any[]): VDOM {
  props = props || {};
  props.children = check(children);
  if (typeof tag === "function") return tag(props);
  return { type: "element", tag, props };
}

function createDOM(vdom: VDOM) {
  if (vdom.type === "text") {
    vdom.dom = document.createTextNode(String(vdom.value));
    return;
  }
  const el = document.createElement(vdom.tag as string);
  for (const key in vdom.props) {
    if (key === "children") continue;
    if (key.startsWith("on") && typeof vdom.props[key] === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), vdom.props[key]);
    } else if (key === "className") el.setAttribute("class", vdom.props[key]);
    else el.setAttribute(key, vdom.props[key]);
  }
  vdom.dom = el;
}

function render(vdom: VDOM): VDOM {
  createDOM(vdom);
  for (const child of vdom.props?.children || []) {
    render(child);
    vdom.dom.appendChild(child.dom);
  }
  return vdom;
}

// ---- app runtime ----
// To update the page later we must remember WHAT to render and WHERE.
// mount stores the root component + container, renders once, and keeps
// the resulting vdom tree so the next render has something to diff.
let rootComponent: any = null;
let rootContainer: any = null;
let currentTree: VDOM | null = null;

function mount(component: any, container: any) {
  rootComponent = component;
  rootContainer = container;
  const tree = render(component());
  container.appendChild(tree.dom);
  currentTree = tree;
}

function App() {
  return (
    <h1 style="font:600 26px Inter,sans-serif;color:#e8edf6">
      Mounted with mount() 🚀
    </h1>
  );
}
mount(App, document.getElementById("root")!);
console.log("mount() rendered the app and saved it for future updates.");
`;

const STATE = `type VDOM = {
  type: string;
  tag?: any;
  props?: { [key: string]: any };
  value?: string | number;
  dom?: any;
};

function check(children: any[]): VDOM[] {
  return children
    .flat(Infinity)
    .filter((c) => c != null && typeof c !== "boolean")
    .map((c) => (typeof c === "object" ? c : { type: "text", props: {}, value: c }));
}

function createElement(tag: any, props: any = {}, ...children: any[]): VDOM {
  props = props || {};
  props.children = check(children);
  if (typeof tag === "function") return tag(props);
  return { type: "element", tag, props };
}

function createDOM(vdom: VDOM) {
  if (vdom.type === "text") {
    vdom.dom = document.createTextNode(String(vdom.value));
    return;
  }
  const el = document.createElement(vdom.tag as string);
  for (const key in vdom.props) {
    if (key === "children") continue;
    if (key.startsWith("on") && typeof vdom.props[key] === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), vdom.props[key]);
    } else if (key === "className") el.setAttribute("class", vdom.props[key]);
    else el.setAttribute(key, vdom.props[key]);
  }
  vdom.dom = el;
}

function render(vdom: VDOM): VDOM {
  createDOM(vdom);
  for (const child of vdom.props?.children || []) {
    render(child);
    vdom.dom.appendChild(child.dom);
  }
  return vdom;
}

// ---- app runtime ----
let rootComponent: any = null;
let rootContainer: any = null;
let currentTree: VDOM | null = null;

// hooks holds the state for every useState call, in call order. The
// cursor is reset to 0 before each render so the calls line up again —
// so always call hooks unconditionally, in the same order every render.
let hooks: any[] = [];
let hookIndex = 0;

// useState returns [value, setter]. The setter saves the new value into
// this hook's slot and asks the whole app to re-render.
function useState(initial: any) {
  const i = hookIndex++;
  if (hooks.length <= i) hooks[i] = initial; // first render: seed the slot
  const setState = (next: any) => {
    hooks[i] = typeof next === "function" ? next(hooks[i]) : next;
    rerender();
  };
  return [hooks[i], setState];
}

function mount(component: any, container: any) {
  rootComponent = component;
  rootContainer = container;
  hookIndex = 0; // start hook order from the top
  const tree = render(component());
  container.appendChild(tree.dom);
  currentTree = tree;
}

// First attempt: wipe the container and rebuild the whole tree. It works,
// but it's wasteful — every node is thrown away and remade on each change.
function rerender() {
  hookIndex = 0;
  rootContainer.innerHTML = "";
  const tree = render(rootComponent());
  rootContainer.appendChild(tree.dom);
  currentTree = tree;
}

function App() {
  const [count, setCount] = useState(0);
  const btn =
    "width:42px;height:42px;border:0;border-radius:10px;background:#1f6feb;color:#fff;font-size:22px;cursor:pointer";
  return (
    <div style="display:flex;gap:14px;align-items:center;font:600 26px Inter,sans-serif;color:#e8edf6">
      <button onClick={() => setCount(count - 1)} style={btn}>-</button>
      <span style="min-width:46px;text-align:center">{count}</span>
      <button onClick={() => setCount(count + 1)} style={btn}>+</button>
    </div>
  );
}
mount(App, document.getElementById("root")!);
`;

const RECONCILE = `type VDOM = {
  type: string;
  tag?: any;
  props?: { [key: string]: any };
  value?: string | number;
  dom?: any;
};

function check(children: any[]): VDOM[] {
  return children
    .flat(Infinity)
    .filter((c) => c != null && typeof c !== "boolean")
    .map((c) => (typeof c === "object" ? c : { type: "text", props: {}, value: c }));
}

function createElement(tag: any, props: any = {}, ...children: any[]): VDOM {
  props = props || {};
  props.children = check(children);
  if (typeof tag === "function") return tag(props);
  return { type: "element", tag, props };
}

function createDOM(vdom: VDOM) {
  if (vdom.type === "text") {
    vdom.dom = document.createTextNode(String(vdom.value));
    return;
  }
  const el = document.createElement(vdom.tag as string);
  applyProps(el, {}, vdom.props || {}); // set props via the shared differ
  vdom.dom = el;
}

// applyProps diffs old vs new props on a node: unbind removed listeners
// and drop gone attributes, then bind + set the new ones. Form controls
// (value, checked) are set as PROPERTIES, not attributes, to stay live.
function applyProps(el: any, oldProps: any, newProps: any) {
  for (const key in oldProps) {
    if (key === "children" || key === "key") continue;
    if (key.startsWith("on"))
      el.removeEventListener(key.slice(2).toLowerCase(), oldProps[key]);
    else if (!(key in newProps))
      el.removeAttribute(key === "className" ? "class" : key);
  }
  for (const key in newProps) {
    if (key === "children" || key === "key") continue;
    const val = newProps[key];
    if (key.startsWith("on")) el.addEventListener(key.slice(2).toLowerCase(), val);
    else if (oldProps[key] === val) continue;
    else if (key === "value" || key === "checked") el[key] = val;
    else if (key === "className") el.setAttribute("class", val);
    else el.setAttribute(key, val);
  }
}

function render(vdom: VDOM): VDOM {
  createDOM(vdom);
  for (const child of vdom.props?.children || []) {
    render(child);
    vdom.dom.appendChild(child.dom);
  }
  return vdom;
}

// ---- app runtime ----
let rootComponent: any = null;
let rootContainer: any = null;
let currentTree: VDOM | null = null;

let hooks: any[] = [];
let hookIndex = 0;

function useState(initial: any) {
  const i = hookIndex++;
  if (hooks.length <= i) hooks[i] = initial;
  const setState = (next: any) => {
    hooks[i] = typeof next === "function" ? next(hooks[i]) : next;
    rerender();
  };
  return [hooks[i], setState];
}

function mount(component: any, container: any) {
  rootComponent = component;
  rootContainer = container;
  hookIndex = 0;
  const tree = render(component());
  container.appendChild(tree.dom);
  currentTree = tree;
}

// Now: diff the new tree against the saved one and patch the changes,
// instead of rebuilding everything. Inputs keep focus; the DOM barely moves.
function rerender() {
  hookIndex = 0;
  const next = rootComponent();
  reconcile(currentTree as VDOM, next);
  currentTree = next;
}

// reconcile walks the old + new vdom together and changes only what
// differs — the heart of the framework.
function reconcile(oldV: VDOM, newV: VDOM) {
  // different node kind or tag → can't patch; build the new one and swap.
  if (oldV.type !== newV.type || oldV.tag !== newV.tag) {
    render(newV);
    oldV.dom.replaceWith(newV.dom);
    return;
  }
  newV.dom = oldV.dom; // same kind → keep the existing DOM node
  if (newV.type === "text") {
    if (oldV.value !== newV.value) newV.dom.nodeValue = String(newV.value);
    return;
  }
  applyProps(newV.dom, oldV.props || {}, newV.props || {});
  // patch children by position (index for index) for now.
  const oldKids = oldV.props?.children || [];
  const newKids = newV.props?.children || [];
  for (let i = 0; i < newKids.length; i++) {
    if (oldKids[i]) reconcile(oldKids[i], newKids[i]);
    else newV.dom.appendChild(render(newKids[i]).dom);
  }
  for (let i = newKids.length; i < oldKids.length; i++) oldKids[i].dom?.remove();
}

function App() {
  const [count, setCount] = useState(0);
  const btn =
    "width:42px;height:42px;border:0;border-radius:10px;background:#1f6feb;color:#fff;font-size:22px;cursor:pointer";
  return (
    <div style="display:flex;gap:14px;align-items:center;font:600 26px Inter,sans-serif;color:#e8edf6">
      <button onClick={() => setCount(count - 1)} style={btn}>-</button>
      <span style="min-width:46px;text-align:center">{count}</span>
      <button onClick={() => setCount(count + 1)} style={btn}>+</button>
    </div>
  );
}
mount(App, document.getElementById("root")!);
`;

const KEYS = `type VDOM = {
  type: string;
  tag?: any;
  props?: { [key: string]: any };
  value?: string | number;
  dom?: any;
};

function check(children: any[]): VDOM[] {
  return children
    .flat(Infinity)
    .filter((c) => c != null && typeof c !== "boolean")
    .map((c) => (typeof c === "object" ? c : { type: "text", props: {}, value: c }));
}

function createElement(tag: any, props: any = {}, ...children: any[]): VDOM {
  props = props || {};
  props.children = check(children);
  if (typeof tag === "function") return tag(props);
  return { type: "element", tag, props };
}

function createDOM(vdom: VDOM) {
  if (vdom.type === "text") {
    vdom.dom = document.createTextNode(String(vdom.value));
    return;
  }
  const el = document.createElement(vdom.tag as string);
  applyProps(el, {}, vdom.props || {});
  vdom.dom = el;
}

function applyProps(el: any, oldProps: any, newProps: any) {
  for (const key in oldProps) {
    if (key === "children" || key === "key") continue;
    if (key.startsWith("on"))
      el.removeEventListener(key.slice(2).toLowerCase(), oldProps[key]);
    else if (!(key in newProps))
      el.removeAttribute(key === "className" ? "class" : key);
  }
  for (const key in newProps) {
    if (key === "children" || key === "key") continue;
    const val = newProps[key];
    if (key.startsWith("on")) el.addEventListener(key.slice(2).toLowerCase(), val);
    else if (oldProps[key] === val) continue;
    else if (key === "value" || key === "checked") el[key] = val;
    else if (key === "className") el.setAttribute("class", val);
    else el.setAttribute(key, val);
  }
}

function render(vdom: VDOM): VDOM {
  createDOM(vdom);
  for (const child of vdom.props?.children || []) {
    render(child);
    vdom.dom.appendChild(child.dom);
  }
  return vdom;
}

// ---- app runtime ----
let rootComponent: any = null;
let rootContainer: any = null;
let currentTree: VDOM | null = null;

let hooks: any[] = [];
let hookIndex = 0;

function useState(initial: any) {
  const i = hookIndex++;
  if (hooks.length <= i) hooks[i] = initial;
  const setState = (next: any) => {
    hooks[i] = typeof next === "function" ? next(hooks[i]) : next;
    rerender();
  };
  return [hooks[i], setState];
}

function mount(component: any, container: any) {
  rootComponent = component;
  rootContainer = container;
  hookIndex = 0;
  const tree = render(component());
  container.appendChild(tree.dom);
  currentTree = tree;
}

function rerender() {
  hookIndex = 0;
  const next = rootComponent();
  reconcile(currentTree as VDOM, next);
  currentTree = next;
}

function reconcile(oldV: VDOM, newV: VDOM) {
  if (oldV.type !== newV.type || oldV.tag !== newV.tag) {
    render(newV);
    oldV.dom.replaceWith(newV.dom);
    return;
  }
  newV.dom = oldV.dom;
  if (newV.type === "text") {
    if (oldV.value !== newV.value) newV.dom.nodeValue = String(newV.value);
    return;
  }
  applyProps(newV.dom, oldV.props || {}, newV.props || {});
  reconcileChildren(
    newV.dom,
    oldV.props?.children || [],
    newV.props?.children || [],
  );
}

// Match children by their key (not their position), so inserting,
// removing, or reordering keeps each item's real DOM node — which
// preserves focus, text typed into inputs, scroll position, and more.
function reconcileChildren(parentDom: any, oldKids: VDOM[], newKids: VDOM[]) {
  const oldByKey = new Map<any, VDOM>();
  oldKids.forEach((c, i) => oldByKey.set(c.props?.key ?? i, c));
  for (let i = 0; i < newKids.length; i++) {
    const c = newKids[i];
    const k = c.props?.key ?? i;
    const old = oldByKey.get(k);
    if (old) {
      reconcile(old, c); // matched key → patch it in place
      oldByKey.delete(k);
    } else {
      render(c); // brand-new key → build it
    }
  }
  oldByKey.forEach((c) => c.dom?.remove()); // leftover keys → remove
  // place children in order, but MOVE only the ones not already in place:
  // re-inserting a node detaches it, which would blur a focused <input>.
  let prev: any = null;
  for (let i = 0; i < newKids.length; i++) {
    const node = newKids[i].dom;
    const ref = prev ? prev.nextSibling : parentDom.firstChild;
    if (node !== ref) parentDom.insertBefore(node, ref);
    prev = node;
  }
}

let nextRow = 4;
function App() {
  const [rows, setRows] = useState([1, 2, 3]);
  const row = "display:flex;gap:8px;align-items:center;margin:4px 0";
  const inp =
    "padding:5px 8px;border-radius:6px;border:1px solid #2a3550;background:#0b0f17;color:#e8edf6";
  return (
    <div style="font:14px Inter,sans-serif;color:#e8edf6">
      <button
        onClick={() => setRows([nextRow++, ...rows])}
        style="margin-bottom:12px;padding:7px 13px;border:0;border-radius:8px;background:#1f6feb;color:#fff;cursor:pointer"
      >
        + prepend a row
      </button>
      <ul style="list-style:none;padding:0;margin:0">
        {rows.map((n) => (
          <li key={n} style={row}>
            <span style="width:56px">row {n}</span>
            <input placeholder="type, then prepend ↑" style={inp} />
          </li>
        ))}
      </ul>
    </div>
  );
}
mount(App, document.getElementById("root")!);
`;

const ROUTER = `type VDOM = {
  type: string;
  tag?: any;
  props?: { [key: string]: any };
  value?: string | number;
  dom?: any;
};

function check(children: any[]): VDOM[] {
  return children
    .flat(Infinity)
    .filter((c) => c != null && typeof c !== "boolean")
    .map((c) => (typeof c === "object" ? c : { type: "text", props: {}, value: c }));
}

function createElement(tag: any, props: any = {}, ...children: any[]): VDOM {
  props = props || {};
  props.children = check(children);
  if (typeof tag === "function") return tag(props);
  return { type: "element", tag, props };
}

function createDOM(vdom: VDOM) {
  if (vdom.type === "text") {
    vdom.dom = document.createTextNode(String(vdom.value));
    return;
  }
  const el = document.createElement(vdom.tag as string);
  applyProps(el, {}, vdom.props || {});
  vdom.dom = el;
}

function applyProps(el: any, oldProps: any, newProps: any) {
  for (const key in oldProps) {
    if (key === "children" || key === "key") continue;
    if (key.startsWith("on"))
      el.removeEventListener(key.slice(2).toLowerCase(), oldProps[key]);
    else if (!(key in newProps))
      el.removeAttribute(key === "className" ? "class" : key);
  }
  for (const key in newProps) {
    if (key === "children" || key === "key") continue;
    const val = newProps[key];
    if (key.startsWith("on")) el.addEventListener(key.slice(2).toLowerCase(), val);
    else if (oldProps[key] === val) continue;
    else if (key === "value" || key === "checked") el[key] = val;
    else if (key === "className") el.setAttribute("class", val);
    else el.setAttribute(key, val);
  }
}

function render(vdom: VDOM): VDOM {
  createDOM(vdom);
  for (const child of vdom.props?.children || []) {
    render(child);
    vdom.dom.appendChild(child.dom);
  }
  return vdom;
}

// ---- app runtime ----
let rootComponent: any = null;
let rootContainer: any = null;
let currentTree: VDOM | null = null;

let hooks: any[] = [];
let hookIndex = 0;

function useState(initial: any) {
  const i = hookIndex++;
  if (hooks.length <= i) hooks[i] = initial;
  const setState = (next: any) => {
    hooks[i] = typeof next === "function" ? next(hooks[i]) : next;
    rerender();
  };
  return [hooks[i], setState];
}

function mount(component: any, container: any) {
  rootComponent = component;
  rootContainer = container;
  hookIndex = 0;
  const tree = render(component());
  container.appendChild(tree.dom);
  currentTree = tree;
}

function rerender() {
  hookIndex = 0;
  const next = rootComponent();
  reconcile(currentTree as VDOM, next);
  currentTree = next;
}

function reconcile(oldV: VDOM, newV: VDOM) {
  if (oldV.type !== newV.type || oldV.tag !== newV.tag) {
    render(newV);
    oldV.dom.replaceWith(newV.dom);
    return;
  }
  newV.dom = oldV.dom;
  if (newV.type === "text") {
    if (oldV.value !== newV.value) newV.dom.nodeValue = String(newV.value);
    return;
  }
  applyProps(newV.dom, oldV.props || {}, newV.props || {});
  reconcileChildren(
    newV.dom,
    oldV.props?.children || [],
    newV.props?.children || [],
  );
}

function reconcileChildren(parentDom: any, oldKids: VDOM[], newKids: VDOM[]) {
  const oldByKey = new Map<any, VDOM>();
  oldKids.forEach((c, i) => oldByKey.set(c.props?.key ?? i, c));
  for (let i = 0; i < newKids.length; i++) {
    const c = newKids[i];
    const k = c.props?.key ?? i;
    const old = oldByKey.get(k);
    if (old) {
      reconcile(old, c);
      oldByKey.delete(k);
    } else {
      render(c);
    }
  }
  oldByKey.forEach((c) => c.dom?.remove());
  let prev: any = null;
  for (let i = 0; i < newKids.length; i++) {
    const node = newKids[i].dom;
    const ref = prev ? prev.nextSibling : parentDom.firstChild;
    if (node !== ref) parentDom.insertBefore(node, ref);
    prev = node;
  }
}

// ---- a tiny hash router ----
// The current route is just the URL hash. When it changes we re-render,
// and <Router> shows the page whose path matches.
function currentPath() {
  return location.hash.slice(1) || "/";
}
function navigate(to: string) {
  location.hash = to;
}
window.addEventListener("hashchange", rerender);

// <Link to="/x"> is an <a href="#/x">. Clicking it changes the hash,
// which fires hashchange, which re-renders. No full page reload.
function Link(props: any) {
  return createElement(
    "a",
    { href: "#" + props.to, style: props.style },
    props.children,
  );
}

// <Router routes={{ "/": Home, "/about": About }} /> renders the page
// for the current path, falling back to routes["*"] when nothing matches.
function Router(props: any) {
  const routes = props.routes || {};
  const Page = routes[currentPath()] || routes["*"];
  return Page ? createElement(Page, {}) : createElement("p", {}, "Not found");
}

function Home() {
  return (
    <div style="font:15px Inter,sans-serif;color:#e8edf6">
      <h2 style="margin:0 0 8px">Home</h2>
      <p style="color:#9fb3d6">Welcome to the tiny SPA.</p>
      <Link to="/about" style="color:#36b6ff">Go to About →</Link>
    </div>
  );
}
function About() {
  return (
    <div style="font:15px Inter,sans-serif;color:#e8edf6">
      <h2 style="margin:0 0 8px">About</h2>
      <p style="color:#9fb3d6">Routing with nothing but the URL hash.</p>
      <Link to="/" style="color:#36b6ff">← Back home</Link>
    </div>
  );
}
function App() {
  return <Router routes={{ "/": Home, "/about": About }} />;
}
mount(App, document.getElementById("root")!);
`;

const SPA = `type VDOM = {
  type: string;
  tag?: any;
  props?: { [key: string]: any };
  value?: string | number;
  dom?: any;
};

function check(children: any[]): VDOM[] {
  return children
    .flat(Infinity)
    .filter((c) => c != null && typeof c !== "boolean")
    .map((c) => (typeof c === "object" ? c : { type: "text", props: {}, value: c }));
}

function createElement(tag: any, props: any = {}, ...children: any[]): VDOM {
  props = props || {};
  props.children = check(children);
  if (typeof tag === "function") return tag(props);
  return { type: "element", tag, props };
}

function createDOM(vdom: VDOM) {
  if (vdom.type === "text") {
    vdom.dom = document.createTextNode(String(vdom.value));
    return;
  }
  const el = document.createElement(vdom.tag as string);
  applyProps(el, {}, vdom.props || {});
  vdom.dom = el;
}

function applyProps(el: any, oldProps: any, newProps: any) {
  for (const key in oldProps) {
    if (key === "children" || key === "key") continue;
    if (key.startsWith("on"))
      el.removeEventListener(key.slice(2).toLowerCase(), oldProps[key]);
    else if (!(key in newProps))
      el.removeAttribute(key === "className" ? "class" : key);
  }
  for (const key in newProps) {
    if (key === "children" || key === "key") continue;
    const val = newProps[key];
    if (key.startsWith("on")) el.addEventListener(key.slice(2).toLowerCase(), val);
    else if (oldProps[key] === val) continue;
    else if (key === "value" || key === "checked") el[key] = val;
    else if (key === "className") el.setAttribute("class", val);
    else el.setAttribute(key, val);
  }
}

function render(vdom: VDOM): VDOM {
  createDOM(vdom);
  for (const child of vdom.props?.children || []) {
    render(child);
    vdom.dom.appendChild(child.dom);
  }
  return vdom;
}

let rootComponent: any = null;
let rootContainer: any = null;
let currentTree: VDOM | null = null;
let hooks: any[] = [];
let hookIndex = 0;

function useState(initial: any) {
  const i = hookIndex++;
  if (hooks.length <= i) hooks[i] = initial;
  const setState = (next: any) => {
    hooks[i] = typeof next === "function" ? next(hooks[i]) : next;
    rerender();
  };
  return [hooks[i], setState];
}

function mount(component: any, container: any) {
  rootComponent = component;
  rootContainer = container;
  hookIndex = 0;
  const tree = render(component());
  container.appendChild(tree.dom);
  currentTree = tree;
}

function rerender() {
  hookIndex = 0;
  const next = rootComponent();
  reconcile(currentTree as VDOM, next);
  currentTree = next;
}

function reconcile(oldV: VDOM, newV: VDOM) {
  if (oldV.type !== newV.type || oldV.tag !== newV.tag) {
    render(newV);
    oldV.dom.replaceWith(newV.dom);
    return;
  }
  newV.dom = oldV.dom;
  if (newV.type === "text") {
    if (oldV.value !== newV.value) newV.dom.nodeValue = String(newV.value);
    return;
  }
  applyProps(newV.dom, oldV.props || {}, newV.props || {});
  reconcileChildren(
    newV.dom,
    oldV.props?.children || [],
    newV.props?.children || [],
  );
}

function reconcileChildren(parentDom: any, oldKids: VDOM[], newKids: VDOM[]) {
  const oldByKey = new Map<any, VDOM>();
  oldKids.forEach((c, i) => oldByKey.set(c.props?.key ?? i, c));
  for (let i = 0; i < newKids.length; i++) {
    const c = newKids[i];
    const k = c.props?.key ?? i;
    const old = oldByKey.get(k);
    if (old) {
      reconcile(old, c);
      oldByKey.delete(k);
    } else {
      render(c);
    }
  }
  oldByKey.forEach((c) => c.dom?.remove());
  let prev: any = null;
  for (let i = 0; i < newKids.length; i++) {
    const node = newKids[i].dom;
    const ref = prev ? prev.nextSibling : parentDom.firstChild;
    if (node !== ref) parentDom.insertBefore(node, ref);
    prev = node;
  }
}

function currentPath() {
  return location.hash.slice(1) || "/";
}
function navigate(to: string) {
  location.hash = to;
}
window.addEventListener("hashchange", rerender);

function Link(props: any) {
  return createElement(
    "a",
    { href: "#" + props.to, style: props.style },
    props.children,
  );
}
function Router(props: any) {
  const routes = props.routes || {};
  const Page = routes[currentPath()] || routes["*"];
  return Page ? createElement(Page, {}) : createElement("p", {}, "Not found");
}

// ---- the app: everything we built, working together ----
function Nav() {
  const link =
    "color:#9fb3d6;text-decoration:none;padding:6px 10px;border-radius:8px";
  return (
    <nav style="display:flex;gap:6px;margin-bottom:18px;border-bottom:1px solid #20283c;padding-bottom:12px">
      <Link to="/" style={link}>Home</Link>
      <Link to="/todos" style={link}>Todos</Link>
      <Link to="/about" style={link}>About</Link>
    </nav>
  );
}

function Home() {
  return (
    <div>
      <h2 style="margin:0 0 8px">Mini React SPA</h2>
      <p style="color:#9fb3d6">
        Components + state + a keyed reconciler + routing — all on a
        framework you just built. Try the Todos tab.
      </p>
    </div>
  );
}

function About() {
  return (
    <div>
      <h2 style="margin:0 0 8px">About</h2>
      <p style="color:#9fb3d6">~150 lines of framework. Zero dependencies.</p>
    </div>
  );
}

let seq = 4;
function Todos() {
  const [todos, setTodos] = useState([
    { id: 1, text: "Learn the virtual DOM", done: true },
    { id: 2, text: "Build createElement + render", done: true },
    { id: 3, text: "Ship a tiny framework", done: false },
  ]);
  const [draft, setDraft] = useState("");

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setTodos([...todos, { id: seq++, text, done: false }]);
    setDraft("");
  };
  const toggle = (id: number) =>
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id: number) => setTodos(todos.filter((t) => t.id !== id));

  const left = todos.filter((t) => !t.done).length;
  return (
    <div style="max-width:440px;color:#e8edf6">
      <h2 style="margin:0 0 12px">
        Todos <span style="color:#7d8aab;font-size:15px">({left} left)</span>
      </h2>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <input
          value={draft}
          placeholder="What needs doing?"
          onInput={(e: any) => setDraft(e.target.value)}
          style="flex:1;padding:9px 12px;border-radius:10px;border:1px solid #2a3550;background:#0b0f17;color:#e8edf6"
        />
        <button onClick={add} style="padding:9px 16px;border:0;border-radius:10px;background:#1f6feb;color:#fff;font-weight:600;cursor:pointer">
          Add
        </button>
      </div>
      <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px">
        {todos.map((t) => (
          <li key={t.id} style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#121a2b;border:1px solid #20283c;border-radius:10px">
            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
            <span style={"flex:1" + (t.done ? ";opacity:.5;text-decoration:line-through" : "")}>
              {t.text}
            </span>
            <button onClick={() => remove(t.id)} style="border:0;background:transparent;color:#ff8499;cursor:pointer;font-size:17px">
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  return (
    <div style="font:15px Inter,sans-serif;padding:4px">
      <Nav />
      <Router routes={{ "/": Home, "/todos": Todos, "/about": About }} />
    </div>
  );
}
mount(App, document.getElementById("root")!);
`;

// ---- reference file sets (shown read-only with a Copy button) ----

const PKG_JSON = `{
  "name": "mini-react-spa",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
`;

const TSCONFIG_JSON = `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,

    // This is the part that makes JSX work with OUR framework:
    // every <tag/> compiles to a createElement(...) call, so each
    // .tsx file must import { createElement } from the framework.
    "jsx": "react",
    "jsxFactory": "createElement"
  },
  "include": ["src"]
}
`;

const VITE_CONFIG = `import { defineConfig } from "vite";

// Vite transpiles with esbuild, so we point its JSX factory at our
// createElement here too (this mirrors tsconfig for the actual build).
export default defineConfig({
  esbuild: {
    jsxFactory: "createElement",
  },
});
`;

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mini React SPA</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;

const MINI_CREATEELEMENT = `export type VDOM = {
  type: string;
  tag?: any;
  props?: { [key: string]: any };
  value?: string | number;
  dom?: any;
};

function check(children: any[]): VDOM[] {
  return children
    .flat(Infinity)
    .filter((c) => c != null && typeof c !== "boolean")
    .map((c) =>
      typeof c === "object" ? c : { type: "text", props: {}, value: c },
    );
}

export function createElement(
  tag: any,
  props: any = {},
  ...children: any[]
): VDOM {
  props = props || {};
  props.children = check(children);
  if (typeof tag === "function") return tag(props);
  return { type: "element", tag, props };
}
`;

const MINI_RENDER = `import type { VDOM } from "./createElement";

export function createDOM(vdom: VDOM) {
  if (vdom.type === "text") {
    vdom.dom = document.createTextNode(String(vdom.value));
    return;
  }
  const el = document.createElement(vdom.tag as string);
  applyProps(el, {}, vdom.props || {});
  vdom.dom = el;
}

export function applyProps(el: any, oldProps: any, newProps: any) {
  for (const key in oldProps) {
    if (key === "children" || key === "key") continue;
    if (key.startsWith("on"))
      el.removeEventListener(key.slice(2).toLowerCase(), oldProps[key]);
    else if (!(key in newProps))
      el.removeAttribute(key === "className" ? "class" : key);
  }
  for (const key in newProps) {
    if (key === "children" || key === "key") continue;
    const val = newProps[key];
    if (key.startsWith("on"))
      el.addEventListener(key.slice(2).toLowerCase(), val);
    else if (oldProps[key] === val) continue;
    else if (key === "value" || key === "checked") el[key] = val;
    else if (key === "className") el.setAttribute("class", val);
    else el.setAttribute(key, val);
  }
}

export function render(vdom: VDOM): VDOM {
  createDOM(vdom);
  for (const child of vdom.props?.children || []) {
    render(child);
    vdom.dom.appendChild(child.dom);
  }
  return vdom;
}
`;

const MINI_RECONCILE = `import type { VDOM } from "./createElement";
import { render, applyProps } from "./render";

export function reconcile(oldV: VDOM, newV: VDOM) {
  if (oldV.type !== newV.type || oldV.tag !== newV.tag) {
    render(newV);
    oldV.dom.replaceWith(newV.dom);
    return;
  }
  newV.dom = oldV.dom;
  if (newV.type === "text") {
    if (oldV.value !== newV.value) newV.dom.nodeValue = String(newV.value);
    return;
  }
  applyProps(newV.dom, oldV.props || {}, newV.props || {});
  reconcileChildren(
    newV.dom,
    oldV.props?.children || [],
    newV.props?.children || [],
  );
}

function reconcileChildren(parentDom: any, oldKids: VDOM[], newKids: VDOM[]) {
  const oldByKey = new Map<any, VDOM>();
  oldKids.forEach((c, i) => oldByKey.set(c.props?.key ?? i, c));
  for (let i = 0; i < newKids.length; i++) {
    const c = newKids[i];
    const k = c.props?.key ?? i;
    const old = oldByKey.get(k);
    if (old) {
      reconcile(old, c);
      oldByKey.delete(k);
    } else {
      render(c);
    }
  }
  oldByKey.forEach((c) => c.dom?.remove());
  // move only nodes that aren't already in place, so a focused input keeps focus
  let prev: any = null;
  for (let i = 0; i < newKids.length; i++) {
    const node = newKids[i].dom;
    const ref = prev ? prev.nextSibling : parentDom.firstChild;
    if (node !== ref) parentDom.insertBefore(node, ref);
    prev = node;
  }
}
`;

const MINI_HOOKS = `import type { VDOM } from "./createElement";
import { render } from "./render";
import { reconcile } from "./reconcile";

let rootComponent: any = null;
let rootContainer: any = null;
let currentTree: VDOM | null = null;

let hooks: any[] = [];
let hookIndex = 0;

// Call hooks unconditionally and in the same order every render —
// they are matched to their state by call order ("rules of hooks").
export function useState<T>(
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const i = hookIndex++;
  if (hooks.length <= i) hooks[i] = initial;
  const setState = (next: T | ((prev: T) => T)) => {
    hooks[i] =
      typeof next === "function" ? (next as (prev: T) => T)(hooks[i]) : next;
    rerender();
  };
  return [hooks[i] as T, setState];
}

export function mount(component: any, container: any) {
  rootComponent = component;
  rootContainer = container;
  hookIndex = 0;
  const tree = render(component());
  container.appendChild(tree.dom);
  currentTree = tree;
}

export function rerender() {
  hookIndex = 0;
  const next = rootComponent();
  reconcile(currentTree as VDOM, next);
  currentTree = next;
}
`;

const MINI_ROUTER = `import { createElement } from "./createElement";
import { rerender } from "./hooks";

export function currentPath() {
  return location.hash.slice(1) || "/";
}
export function navigate(to: string) {
  location.hash = to;
}
window.addEventListener("hashchange", rerender);

export function Link(props: any) {
  return createElement(
    "a",
    { href: "#" + props.to, style: props.style },
    props.children,
  );
}

export function Router(props: any) {
  const routes = props.routes || {};
  const Page = routes[currentPath()] || routes["*"];
  return Page ? createElement(Page, {}) : createElement("p", {}, "Not found");
}
`;

const MINI_INDEX = `export { createElement, type VDOM } from "./createElement";
export { render } from "./render";
export { mount, useState, rerender } from "./hooks";
export { navigate, Link, Router, currentPath } from "./router";
`;

const MINI_JSX_DTS = `// Ambient JSX types for our custom "createElement" pragma. The open
// [tag: string]: any index keeps it permissive — any tag/prop is allowed.
import type { VDOM } from "./createElement";

declare global {
  namespace JSX {
    type Element = VDOM;
    interface IntrinsicElements {
      [tag: string]: any;
    }
  }
}
`;

const APP_MAIN = `import { mount } from "./mini";
import { App } from "./App";

mount(App, document.getElementById("root")!);
`;

const APP_TSX = `import { createElement, Link, Router } from "./mini";
import { Home } from "./pages/Home";
import { Todos } from "./pages/Todos";
import { About } from "./pages/About";

function Nav() {
  const link =
    "color:#9fb3d6;text-decoration:none;padding:6px 10px;border-radius:8px";
  return (
    <nav style="display:flex;gap:6px;margin-bottom:18px">
      <Link to="/" style={link}>Home</Link>
      <Link to="/todos" style={link}>Todos</Link>
      <Link to="/about" style={link}>About</Link>
    </nav>
  );
}

export function App() {
  return (
    <div style="font:15px Inter,system-ui,sans-serif;max-width:560px;margin:40px auto;color:#e8edf6">
      <Nav />
      <Router routes={{ "/": Home, "/todos": Todos, "/about": About }} />
    </div>
  );
}
`;

const PAGE_HOME = `import { createElement } from "../mini";

export function Home() {
  return (
    <div>
      <h2 style="margin:0 0 8px">Mini React SPA</h2>
      <p style="color:#9fb3d6">
        Components, state, keyed lists, and routing — all running on a
        framework you built yourself, with no dependencies.
      </p>
    </div>
  );
}
`;

const PAGE_ABOUT = `import { createElement } from "../mini";

export function About() {
  return (
    <div>
      <h2 style="margin:0 0 8px">About</h2>
      <p style="color:#9fb3d6">
        A tiny React-like framework: createElement, render, a keyed
        reconciler, useState, and a hash router. That's the whole thing.
      </p>
    </div>
  );
}
`;

const PAGE_TODOS = `import { createElement, useState } from "../mini";

let seq = 4;

export function Todos() {
  const [todos, setTodos] = useState([
    { id: 1, text: "Learn the virtual DOM", done: true },
    { id: 2, text: "Build createElement + render", done: true },
    { id: 3, text: "Ship a tiny framework", done: false },
  ]);
  const [draft, setDraft] = useState("");

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setTodos([...todos, { id: seq++, text, done: false }]);
    setDraft("");
  };
  const toggle = (id: number) =>
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id: number) => setTodos(todos.filter((t) => t.id !== id));

  const left = todos.filter((t) => !t.done).length;
  return (
    <div>
      <h2 style="margin:0 0 12px">
        Todos <span style="color:#7d8aab;font-size:15px">({left} left)</span>
      </h2>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <input
          value={draft}
          placeholder="What needs doing?"
          onInput={(e: any) => setDraft(e.target.value)}
          style="flex:1;padding:9px 12px;border-radius:10px;border:1px solid #2a3550;background:#0b0f17;color:#e8edf6"
        />
        <button
          onClick={add}
          style="padding:9px 16px;border:0;border-radius:10px;background:#1f6feb;color:#fff;font-weight:600;cursor:pointer"
        >
          Add
        </button>
      </div>
      <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px">
        {todos.map((t) => (
          <li
            key={t.id}
            style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#121a2b;border:1px solid #20283c;border-radius:10px"
          >
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => toggle(t.id)}
            />
            <span
              style={"flex:1" + (t.done ? ";opacity:.5;text-decoration:line-through" : "")}
            >
              {t.text}
            </span>
            <button
              onClick={() => remove(t.id)}
              style="border:0;background:transparent;color:#ff8499;cursor:pointer;font-size:17px"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
`;

const SETUP_FILES: RefFile[] = [
  { path: "package.json", code: PKG_JSON },
  { path: "tsconfig.json", code: TSCONFIG_JSON },
  { path: "vite.config.ts", code: VITE_CONFIG },
  { path: "index.html", code: INDEX_HTML },
];

const SHIP_FILES: RefFile[] = [
  { path: "package.json", code: PKG_JSON },
  { path: "tsconfig.json", code: TSCONFIG_JSON },
  { path: "vite.config.ts", code: VITE_CONFIG },
  { path: "index.html", code: INDEX_HTML },
  { path: "src/mini/createElement.ts", code: MINI_CREATEELEMENT },
  { path: "src/mini/jsx.d.ts", code: MINI_JSX_DTS },
  { path: "src/mini/render.ts", code: MINI_RENDER },
  { path: "src/mini/reconcile.ts", code: MINI_RECONCILE },
  { path: "src/mini/hooks.ts", code: MINI_HOOKS },
  { path: "src/mini/router.ts", code: MINI_ROUTER },
  { path: "src/mini/index.ts", code: MINI_INDEX },
  { path: "src/main.ts", code: APP_MAIN },
  { path: "src/App.tsx", code: APP_TSX },
  { path: "src/pages/Home.tsx", code: PAGE_HOME },
  { path: "src/pages/Todos.tsx", code: PAGE_TODOS },
  { path: "src/pages/About.tsx", code: PAGE_ABOUT },
];

export const steps: Step[] = [
  {
    id: "intro",
    title: "Build a mini React",
    kind: "concept",
    explanation: `
      <p class="lead">A hands-on walkthrough of building your own tiny
      React — a <strong>minimal frontend framework</strong> — from scratch,
      one small step at a time, ending in a real <strong>multi-page SPA</strong>.</p>
      <p>Every code step is live and editable: change the code on the left and
      watch the <strong>result</strong> and <strong>console</strong> update
      instantly. Each step highlights the lines it adds.</p>
      <p class="muted">Use the arrows (or ← →) to move through the steps.</p>`,
  },
  {
    id: "old-vs-modern",
    title: "Old vs modern frontend",
    kind: "concept",
    explanation: `
      <div class="cols">
        <div class="col">
          <h3>Multi-page (classic)</h3>
          <ul>
            <li>The server returns a full HTML page per route.</li>
            <li>Every click = a full reload, white flash, lost state.</li>
            <li>The DOM is built on the server.</li>
          </ul>
        </div>
        <div class="col">
          <h3>Single-page (modern)</h3>
          <ul>
            <li>The server returns one shell + JavaScript.</li>
            <li>JS builds and updates the DOM on the client.</li>
            <li>Navigation and updates feel instant; state persists.</li>
          </ul>
        </div>
      </div>
      <p>To build a SPA library we need: a way to <strong>describe</strong> UI
      (JSX → objects), a way to turn that into <strong>real DOM</strong>, and a
      way to <strong>update</strong> it when state changes. Let's build them.</p>`,
  },
  {
    id: "setup",
    title: "Project setup",
    kind: "reference",
    files: SETUP_FILES,
    explanation: `
      <p>First, the project. It's just <strong>Vite</strong> + <strong>TypeScript</strong>
      — no framework dependency, because we're writing the framework.
      Create these four files (use the <strong>Copy</strong> button), then
      <code>npm install</code>.</p>
      <p>The one piece that makes JSX work is in <code>tsconfig.json</code> and
      <code>vite.config.ts</code>: <code>jsxFactory: "createElement"</code>. That
      tells the compiler to turn every <code>&lt;div/&gt;</code> into a
      <code>createElement("div", …)</code> call to <em>our</em> function — which
      is exactly what we build next. (So each <code>.tsx</code> file will
      <code>import { createElement }</code> from the framework.)</p>`,
  },
  {
    id: "create-element",
    title: "JSX → createElement",
    kind: "code",
    code: CREATE,
    explanation: `<p>Thanks to the <code>jsxFactory</code> config from the last step,
      JSX compiles to function calls. <code>createElement</code> returns a plain
      object describing the UI: a <strong>virtual DOM</strong> node. Nothing is on
      the page yet — we've only <em>described</em> it. Check the console.</p>`,
  },
  {
    id: "render-mount",
    title: "Virtual DOM → real DOM",
    kind: "code",
    code: RENDER,
    explanation: `<p><code>render</code> turns a vdom node into a real DOM node with
      <code>document.createElement</code>, and we <strong>mount</strong> it by
      appending to <code>#root</code>. The element is now in the page.</p>`,
  },
  {
    id: "attributes",
    title: "Attributes",
    kind: "code",
    code: ATTR,
    explanation: `<p>An element needs its props. We copy each prop onto the real node
      with <code>setAttribute</code> — mapping React's <code>className</code> to the
      DOM's <code>class</code>. Now a <code>style</code> prop renders a visible box.</p>`,
  },
  {
    id: "text-children",
    title: "Text & children",
    kind: "code",
    code: TEXT,
    explanation: `<p>Children can be strings or nested elements. <code>check</code> wraps
      raw strings/numbers as <strong>text</strong> nodes, and <code>render</code>
      recurses into children, appending each. Now we get real content and nesting.</p>`,
  },
  {
    id: "components",
    title: "Components",
    kind: "code",
    code: COMP,
    explanation: `<p>A <strong>component</strong> is just a function that returns vdom.
      When <code>createElement</code> sees a function tag, it calls it with its props
      (including <code>children</code>) and uses what it returns. We also flatten child
      arrays (from <code>{props.children}</code> and <code>.map</code>) and default
      <code>null</code> props. Reusable UI, unlocked.</p>`,
  },
  {
    id: "events",
    title: "Events",
    kind: "code",
    code: EVENTS,
    explanation: `<p>A prop named like an event — <code>onClick</code>, <code>onInput</code>
      — becomes a real listener: drop the <code>on</code>, lowercase the rest, and call
      <code>addEventListener</code>. Click the button and watch the console. Now the UI
      can respond to the user.</p>`,
  },
  {
    id: "mount",
    title: "A single mount()",
    kind: "code",
    code: MOUNT,
    explanation: `<p>So far each demo manually appended to <code>#root</code>. To
      <em>update</em> the UI later, the framework must remember what to render and where.
      <code>mount(App, container)</code> renders once and stores the root component,
      container, and resulting tree — the groundwork for re-rendering.</p>`,
  },
  {
    id: "usestate",
    title: "useState",
    kind: "code",
    code: STATE,
    explanation: `<p><code>useState</code> stores each piece of state in a <code>hooks</code>
      array, by call order, with a cursor reset before every render. The setter saves the
      new value and triggers a re-render. This first <code>rerender</code> just rebuilds the
      whole tree — simple, but wasteful. The counter works; next we make updates surgical.</p>
      <p class="muted">Because hooks are matched by call order, call them unconditionally and
      in the same order each render (React's "rules of hooks").</p>`,
  },
  {
    id: "reconcile",
    title: "Reconciliation (diff + patch)",
    kind: "code",
    code: RECONCILE,
    explanation: `<p>The heart of the framework. <code>reconcile</code> walks the old and new
      vdom together and changes only what differs: swap on a tag change, update a text node's
      value, diff props via <code>applyProps</code>, and recurse into children. <code>rerender</code>
      now patches instead of rebuilding — the counter updates in place, no nodes thrown away.</p>`,
  },
  {
    id: "keys",
    title: "Keys for lists",
    kind: "code",
    code: KEYS,
    explanation: `<p>Matching children by position breaks when a list reorders. With a
      <code>key</code>, <code>reconcileChildren</code> matches each child by identity instead —
      so inserting or removing an item keeps the right DOM nodes. <strong>Try it:</strong> type
      into a row's input, then prepend a row — your text stays with its row.</p>`,
  },
  {
    id: "routing",
    title: "Routing",
    kind: "code",
    code: ROUTER,
    explanation: `<p>A SPA needs pages. Our router reads the URL hash as the current path,
      re-renders on <code>hashchange</code>, and <code>&lt;Router&gt;</code> shows the matching
      page. <code>&lt;Link&gt;</code> is just an <code>&lt;a href="#/..."&gt;</code>. Click the
      link in the result — the view changes with no reload.</p>`,
  },
  {
    id: "spa",
    title: "Multi-page SPA",
    kind: "code",
    code: SPA,
    explanation: `<p>The capstone: a real app on the framework you built. A nav bar of
      <code>&lt;Link&gt;</code>s, three routed pages, and a <strong>Todos</strong> page using
      <code>useState</code>, events, and a keyed list (add, toggle, delete). The framework code
      is unchanged — only the app is new. Click around and add some todos.</p>`,
  },
  {
    id: "ship",
    title: "Ship it — the complete project",
    kind: "reference",
    files: SHIP_FILES,
    explanation: `
      <p>That's the whole framework. Here it is as a clean, organized project —
      the same code split into focused modules under <code>src/mini/</code>, with
      the app in <code>src/App.tsx</code> + <code>src/pages/</code>. Copy each file,
      then <code>npm install &amp;&amp; npm run dev</code>.</p>
      <p class="muted">Module flow: createElement ← render ← reconcile ← hooks;
      router uses createElement + hooks; <code>index.ts</code> re-exports the public API
      (<code>createElement</code>, <code>render</code>, <code>mount</code>,
      <code>useState</code>, <code>Link</code>, <code>Router</code>, <code>navigate</code>).</p>`,
  },
];
