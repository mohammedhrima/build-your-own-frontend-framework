import { project } from "./code";
import type { StepDef } from "./types";

// Steps 02..15: what each one teaches. The code of every step comes from code.ts.
const meta: Omit<StepDef, "changes">[] = [
  {
    id: "create-element",
    title: "createElement",
    goal: "JSX becomes plain objects: the virtual DOM.",
    try: "Open out/main.js: your JSX became createElement(...) calls.",
    focus: "src/mini/vdom.ts",
  },
  { id: "render", title: "render", goal: "Turn the object into real DOM.", try: "Edit the heading text in main.tsx.", focus: "src/mini/vdom.ts" },
  {
    id: "props",
    title: "Props & style objects",
    goal: "Copy props onto the element. style is an object.",
    try: 'In main.tsx, change background to "#3b5bdb" and color to "#fff".',
    focus: "src/mini/vdom.ts",
  },
  {
    id: "children",
    title: "Children & text",
    goal: "Nested elements and text nodes, rendered recursively.",
    try: "Add a fourth <li> in main.tsx.",
    focus: "src/mini/vdom.ts",
  },
  {
    id: "components",
    title: "Components",
    goal: "A component is a function that returns VNodes.",
    try: "Add a todo to initialTodos in data.ts.",
    focus: "src/mini/vdom.ts",
  },
  { id: "events", title: "Events", goal: "onClick becomes a real event listener.", try: "Click a checkbox or ×, then look at Console.", focus: "src/mini/vdom.ts" },
  {
    id: "state",
    title: "mount + useState",
    goal: "State that re-renders. Works, but rebuilds everything.",
    try: "Type in the box: focus drops after every key. Watch Elements flash.",
    focus: "src/mini/hooks.ts",
  },
  {
    id: "reconcile",
    title: "Reconcile",
    goal: "Diff old vs new VNodes. Patch only what changed.",
    try: "Type in the box: focus stays. Only changed nodes flash in Elements.",
    focus: "src/mini/vdom.ts",
  },
  {
    id: "keys",
    title: "Keys",
    goal: "Keyed children keep identity when the list changes.",
    try: "Add a todo: only one new row flashes. Remove key={todo.id} in components.tsx and add again.",
    focus: "src/mini/vdom.ts",
  },
  {
    id: "instances",
    title: "Component instances",
    goal: "Each component owns its hooks. Updates are batched.",
    try: "Open VDOM: every component shows its own hooks.",
    focus: "src/mini/hooks.ts",
  },
  {
    id: "effects",
    title: "useEffect, useRef, useMemo",
    goal: "Side effects after render, with cleanup. Plus refs and memo.",
    try: 'Click the preview, press "/". Watch the tab title as you toggle.',
    focus: "src/mini/hooks.ts",
  },
  {
    id: "data",
    title: "useQuery & useMutation",
    goal: "Server data: cache, loading, mutations, optimistic updates.",
    try: 'Toggle the last todo (rollback). Add "fail" (error).',
    focus: "src/mini/hooks.ts",
  },
  { id: "router", title: "Router", goal: "Pages from the URL hash. No reloads.", try: "Switch tabs: watch the URL bar, Elements and VDOM.", focus: "src/mini/router.ts" },
  {
    id: "ship",
    title: "Ship it",
    goal: "Filters, empty state, clear done. Download it and run it.",
    try: "Your framework is done. Take it with you.",
    focus: "src/pages.tsx",
  },
];

export const courseSteps: StepDef[] = meta.map((m, i) => ({ ...m, changes: project(i + 2) }));
