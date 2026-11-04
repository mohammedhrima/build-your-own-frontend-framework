import { course, steps, type Lang, type Step } from "../../steps";
import { jsPath } from "../../steps/js";
import { build, type BuildError } from "../../sandbox/bundler";
import { hasOut, isOut, outPath, toOutJs } from "../../sandbox/outjs";
import { addedLineRanges, changeHunks, fileBlocks } from "../../utils/diff";
import { basename, h, icon, safeStorage } from "../../_components/atoms/dom";
import { CodeEditor } from "../../_components/organisms/editor";
import { Explorer } from "../../_components/organisms/explorer";
import { Preview } from "../../_components/organisms/preview";
import { QuickOpen, type Command } from "../../_components/molecules/quickOpen";
import { zip } from "../../utils/zip";
import { ConsolePanel } from "../../_components/organisms/devtools/console";
import { ElementsPanel } from "../../_components/organisms/devtools/elements";
import { VdomPanel } from "../../_components/organisms/devtools/vdom";
import { SetupGuide } from "../../_components/molecules/setupGuide";
import type { ValueCtx } from "../../_components/organisms/devtools/valueView";
import type { DomNode } from "../../types/protocol";
import { uiDiff } from "../../utils/uidiff";

type DtTab = "console" | "elements" | "vdom";

const PROJECT = "mini-react-todo";
const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";
const num = (i: number) => String(i).padStart(2, "0");
const CANCEL = Symbol("cancel");
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Roadmap chapters for the intro, by step index. */
const CHAPTERS: [string, number, number][] = [
  ["Render", 1, 5],
  ["Components", 6, 7],
  ["State & speed", 8, 11],
  ["Real apps", 12, 15],
];

/**
 * The learning platform: a top bar with the current step (title, goal, step
 * menu, prev/next), then editor | result + devtools.
 */
export function mount(root: HTMLElement) {
  // ---------------------------------------------------------------- state
  const editsStore = safeStorage<Record<string, Record<string, string>>>("byof:edits", {});
  const uiStore = safeStorage<{ dt: DtTab; diff: boolean; files: boolean; js: boolean; lang: Lang }>("byof:ui3", {
    dt: "console",
    diff: false,
    files: true,
    js: false,
    lang: "ts",
  });
  const visitedStore = safeStorage<number[]>("byof:visited", []);
  const splitStore = safeStorage("byof:split", { left: 0.56, top: 0.55, tree: 184 });
  const split = splitStore.get();

  const edits = editsStore.get();
  const ui = uiStore.get();
  ui.lang ??= "ts";
  const visited = new Set(visitedStore.get());

  let step: Step = course(ui.lang)[0];
  let active: string | null = null;
  let errors: BuildError[] = [];
  let runTimer = 0;
  let saveTimer = 0;

  // edits are kept per mode: the TS and JS versions of a step are different files
  const editsKey = () => (ui.lang === "js" ? "js:" : "") + step.id;
  const stepEdits = () => (edits[editsKey()] ??= {});
  const files = (): Record<string, string> => ({ ...step.files, ...stepEdits() });
  const dirty = () => new Set(Object.keys(edits[editsKey()] ?? {}));
  const editorKey = (path: string) => editsKey() + ":" + path;
  /** out/… path → the src/ file it is generated from (like UraJS's out/ folder) */
  const outMap = (): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const p of Object.keys(files())) if (hasOut(p)) out[outPath(p)] = p;
    return out;
  };

  // demo mode (declared early: openFile reads it)
  let demo: { paused: boolean; speed: number } | null = null;
  let demoToken = 0;

  // DOM snapshots for "what changed in the UI" when moving to the next step
  let lastTree: DomNode | null = null;
  let baseTree: DomNode | null = null;
  let markTimer = 0;
  const saveEdits = () => {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => editsStore.set(edits), 400);
  };

  // ---------------------------------------------------------------- devtools
  const ctx: ValueCtx = {
    openSource: (file, line, col) => openFile(file, line, col),
    revealNode: (id) => {
      setDtTab("elements");
      elements.reveal(id);
    },
    hoverNode: (id) => preview.send({ kind: "highlight", id }),
  };
  const consolePanel = new ConsolePanel(ctx);
  const elements = new ElementsPanel();
  const vdom = new VdomPanel(ctx);
  const guide = new SetupGuide({
    folder: PROJECT,
    download: (kind) => download(kind),
    stepLabel: () => (step.index > 1 && step.index < steps.length - 1 ? `${num(step.index)} ${step.title}` : null),
  });

  const preview = new Preview({
    reset() {
      consolePanel.clear(false);
      elements.reset();
      vdom.reset();
    },
    reload: () => runNow(),
    message(msg) {
      switch (msg.kind) {
        case "console":
          consolePanel.add(msg);
          break;
        case "eval-result":
          consolePanel.evalResult(msg.ok, msg.value);
          break;
        case "dom":
          elements.update(msg.tree, msg.changed, msg.attrs);
          lastTree = msg.tree;
          if (baseTree) {
            // wait until the app settles (data steps render twice), then compare
            clearTimeout(markTimer);
            markTimer = window.setTimeout(() => {
              const marks = uiDiff(baseTree, lastTree);
              baseTree = null;
              if (marks.length) preview.send({ kind: "mark", marks });
            }, 650);
          }
          break;
        case "vdom":
          vdom.commit(msg.tree);
          break;
        case "ready":
          if (elements.flashUpdates) preview.send({ kind: "flash-updates", on: true });
          break;
      }
    },
  });
  consolePanel.onEval = (code) => preview.send({ kind: "eval", code });
  elements.onHover = (id) => preview.send({ kind: "highlight", id });
  elements.onSelect = (id) => preview.send({ kind: "select", id });
  elements.onFlashUpdates = (on) => preview.send({ kind: "flash-updates", on });
  vdom.onHover = (id) => preview.send({ kind: "highlight", id });

  const badges = h("span", { class: "dt-badges" });
  consolePanel.onCounts = (e, w) => {
    badges.replaceChildren();
    if (e) badges.append(h("span", { class: "dt-badge err" }, icon("error"), String(e)));
    if (w) badges.append(h("span", { class: "dt-badge warn" }, icon("warning"), String(w)));
  };

  const dtTabs: Record<DtTab, { label: string; panel: HTMLElement; btn?: HTMLElement }> = {
    console: { label: "console", panel: consolePanel.el },
    elements: { label: "elements", panel: elements.el },
    vdom: { label: "vdom", panel: vdom.el },
  };
  const dtHead = h("div", { class: "pane-head", role: "tablist" });
  for (const id of ["console", "elements", "vdom"] as DtTab[]) {
    const t = dtTabs[id];
    t.btn = h("button", { class: "pane-tab", role: "tab", onclick: () => setDtTab(id) }, t.label);
    dtHead.append(t.btn);
  }
  dtHead.append(h("span", { class: "grow" }), badges);
  const devtools = h(
    "div",
    { class: "pane devtools" },
    dtHead,
    h("div", { class: "dt-body" }, consolePanel.el, elements.el, vdom.el),
  );

  function setDtTab(id: DtTab) {
    ui.dt = id;
    uiStore.set(ui);
    for (const k in dtTabs) {
      const t = dtTabs[k as DtTab];
      t.btn!.classList.toggle("active", k === id);
      t.panel.hidden = k !== id;
    }
  }

  // ---------------------------------------------------------------- editor pane
  const tool = (name: string, title: string, onclick: (e: Event) => void, cls = "") =>
    h("button", { class: "icon-btn " + cls, title, "aria-label": title, onclick }, icon(name));
  const filesBtn = tool("sidebar", "Show files", () => toggleFiles(), "files-btn");
  const readOnlyTag = h("span", { class: "ro-tag", title: "Made from your src/ file by the TypeScript compiler. Edit the src/ file instead." }, "generated · read-only");
  const diffBtn = tool("diff", "Compare with previous step", () => toggleDiff());
  const revertBtn = tool("revert", "Undo your edits to this file", () => resetFile());
  const copyBtn = tool("copy", "Copy file", (e) => copyFile(e.currentTarget as HTMLElement));
  const ftabs = h("div", { class: "ftabs", role: "tablist" });
  const buildError = h("button", {
    class: "build-error",
    onclick: () => errors[0] && openFile(errors[0].file, errors[0].line, errors[0].col),
  });

  const explorer = new Explorer();
  explorer.onOpen = (p) => openFile(p);
  const editorHost = h("div", { class: "cm-host", onpointerdown: () => demo && setPaused(true) });
  const editor = new CodeEditor(editorHost, {
    change(path, text) {
      if (text === step.files[path]) delete stepEdits()[path];
      else stepEdits()[path] = text;
      saveEdits();
      scheduleRun();
      renderFileChrome();
    },
    cursor() {},
  });

  const editorPane = h(
    "div",
    { class: "pane editor" },
    h("div", { class: "pane-head" }, filesBtn, ftabs, buildError, readOnlyTag, diffBtn, revertBtn, copyBtn,
      tool("download", "Run this step on your computer", () => guide.open())),
    h("div", { class: "editor-body" }, explorer.el, editorHost),
  );
  const treeSash = h("div", { class: "sash v tree-sash", title: "Drag to resize, double-click to reset" });
  explorer.el.append(treeSash);

  // ---------------------------------------------------------------- top bar
  const progressFill = h("div", { class: "progress-fill" });
  const stepNum = h("span", { class: "step-num" });
  const stepTitle = h("span", { class: "step-title" });
  const stepBtn = h(
    "button",
    { class: "step-btn", title: "All steps", "aria-haspopup": "listbox", onclick: () => toggleStepMenu() },
    stepNum,
    stepTitle,
    icon("chevronDown"),
  );
  const stepGoal = h("span", { class: "step-goal" });
  // TypeScript / JavaScript mode switches (top bar + intro), kept in sync
  const langBtns: [Lang, HTMLElement][] = [];
  const makeLangSwitch = (long = false) => {
    const btn = (lang: Lang, label: string, title: string) => {
      const b = h("button", { class: "seg", title, onclick: () => setLang(lang) }, label);
      langBtns.push([lang, b]);
      return b;
    };
    return h(
      "div",
      { class: "segmented" + (long ? " long" : ""), role: "group", "aria-label": "Language" },
      btn("ts", long ? "TypeScript" : "TS", "Learn with TypeScript"),
      btn("js", long ? "JavaScript" : "JS", "Learn with plain JavaScript (no types)"),
    );
  };
  const langSwitch = makeLangSwitch();
  // Prev / Next: a floating bar over the bottom of the editor
  const prevLabel = h("span", null, "Previous");
  const nextLabel = h("span", null, "Next");
  const prevBtn = h(
    "button",
    { class: "navbtn", title: "Previous step (←)", onclick: () => goStep(step.index - 1) },
    icon("chevronLeft"),
    prevLabel,
  );
  const nextBtn = h(
    "button",
    { class: "navbtn primary", title: "Next step (→)", onclick: () => goStep(step.index + 1) },
    nextLabel,
    icon("chevronRight"),
  );
  const pager = h("nav", { class: "pager", "aria-label": "Steps" }, prevBtn, nextBtn);
  editorPane.append(pager);
  // dark by default; the choice is remembered
  const themeStore = safeStorage<"dark" | "light">("byof:theme", "dark");
  const themeBtn = h("button", { class: "icon-btn bordered", onclick: () => setTheme(themeStore.get() === "dark" ? "light" : "dark") });
  function setTheme(theme: "dark" | "light") {
    themeStore.set(theme);
    document.documentElement.dataset.theme = theme;
    themeBtn.replaceChildren(icon(theme === "dark" ? "sun" : "moon"));
    themeBtn.title = theme === "dark" ? "Light mode" : "Dark mode";
    themeBtn.setAttribute("aria-label", themeBtn.title);
  }
  setTheme(themeStore.get());
  const topbar = h(
    "header",
    { class: "topbar" },
    h("div", { class: "stepnav" }, stepBtn),
    stepGoal,
    h("span", { class: "grow-sm" }),
    h(
      "div",
      { class: "navgroup" },
      h("button", { class: "icon-btn search-btn", title: `Go to file (${MOD}+P)`, "aria-label": "Go to file", onclick: () => quick.show("") }, icon("search")),
      langSwitch,
      h("button", { class: "navbtn demo-btn", title: "Play every step automatically", onclick: () => startDemo() }, icon("play"), "Demo"),
      h(
        "button",
        { class: "navbtn run-btn", title: "Download the project and run it on your computer", onclick: () => guide.open() },
        icon("terminal"),
        h("span", { class: "run-label" }, "Run on your computer"),
      ),
      themeBtn,
    ),
    h("div", { class: "progress" }, progressFill),
  );

  // step menu (replaces the old side rail: it only takes space when open)
  let menu: HTMLElement | null = null;
  let menuCursor = 0;
  function toggleStepMenu(force?: boolean) {
    const open = force ?? !menu;
    menu?.remove();
    menu = null;
    stepBtn.classList.toggle("open", open);
    if (!open) return;
    menuCursor = step.index;
    menu = h("div", { class: "step-menu", role: "listbox" });
    steps.forEach((s, i) =>
      menu!.append(
        h(
          "button",
          {
            class: "sm-item" + (i === step.index ? " active" : ""),
            role: "option",
            onclick: () => {
              toggleStepMenu(false);
              goStep(i);
            },
          },
          h("span", { class: "sm-num" }, num(i)),
          h("span", { class: "sm-title" }, s.title),
          visited.has(i) && i !== step.index ? icon("check", "sm-check") : null,
          h("span", { class: "sm-goal" }, s.goal),
        ),
      ),
    );
    const r = stepBtn.getBoundingClientRect();
    menu.style.left = Math.max(12, Math.min(r.left, innerWidth - 472)) + "px";
    menu.style.top = r.bottom + 6 + "px";
    document.body.append(menu);
    (menu.children[step.index] as HTMLElement).scrollIntoView({ block: "nearest" });
    (menu.children[step.index] as HTMLElement).focus();
  }
  document.addEventListener("mousedown", (e) => {
    if (menu && !menu.contains(e.target as Node) && !stepBtn.contains(e.target as Node)) toggleStepMenu(false);
  });
  function menuKey(e: KeyboardEvent): boolean {
    if (!menu) return false;
    const items = [...menu.children] as HTMLElement[];
    if (e.key === "Escape") toggleStepMenu(false);
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      menuCursor = (menuCursor + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle("cursor", i === menuCursor));
      items[menuCursor].focus();
      items[menuCursor].scrollIntoView({ block: "nearest" });
    } else return false;
    return true;
  }

  // ---------------------------------------------------------------- stage
  const tryLine = h("p", { class: "try" });
  const sashV = h("div", { class: "sash v", title: "Drag to resize, double-click to reset" });
  const sashH = h("div", { class: "sash h", title: "Drag to resize, double-click to reset" });
  const playCol = h("div", { class: "play-col" }, preview.el, sashH, devtools);
  const play = h("div", { class: "play" }, editorPane, sashV, playCol);

  // ---- intro (step 00): no code, just the idea, the app, and the road
  const pipeline = h(
    "div",
    { class: "pipeline", "aria-hidden": "true" },
    h("div", { class: "pipe-card" }, h("span", { class: "pipe-k" }, "you write"),
      h("code", null, h("span", { class: "c-tag" }, "<h1>"), "Hello", h("span", { class: "c-tag" }, "</h1>"))),
    h("span", { class: "pipe-arrow" }, "→"),
    h("div", { class: "pipe-card" }, h("span", { class: "pipe-k" }, "createElement"),
      h("code", null, "{ ", h("span", { class: "c-key" }, "tag"), ": ", h("span", { class: "c-str" }, '"h1"'), ", ",
        h("span", { class: "c-key" }, "children"), ": [", h("span", { class: "c-str" }, '"Hello"'), "] }")),
    h("span", { class: "pipe-arrow" }, "→"),
    h("div", { class: "pipe-card" }, h("span", { class: "pipe-k" }, "render"), h("div", { class: "pipe-dom" }, "Hello")),
  );
  const roadmap = h("div", { class: "roadmap" });
  for (const [name, from, to] of CHAPTERS) {
    const list = h("div", { class: "rm-steps" });
    for (let i = from; i <= to && i < steps.length; i++) {
      list.append(h("button", { class: "rm-step", onclick: () => goStep(i) }, h("span", { class: "rm-num" }, num(i)), steps[i].title));
    }
    roadmap.append(h("div", { class: "rm-chapter" }, h("div", { class: "rm-name" }, name), list));
  }
  const introApp = h("div", { class: "intro-app" }, h("div", { class: "intro-app-label" }, "The app you'll build. Try it."));
  const intro = h(
    "section",
    { class: "intro" },
    h(
      "div",
      { class: "intro-text" },
      h("h1", null, "Build your own React."),
      h("div", { class: "intro-lang" }, h("span", null, "Learn with"), makeLangSwitch(true), h("span", { class: "dim" }, "Not sure? Pick JavaScript.")),
      pipeline,
      h(
        "div",
        { class: "intro-actions" },
        h("button", { class: "navbtn primary big", onclick: () => goStep(1) }, "Start building"),
        h("button", { class: "navbtn big", onclick: () => startDemo(1) }, icon("play"), "Watch the demo"),
      ),
      h(
        "div",
        { class: "run-panel" },
        icon("terminal", "run-panel-icon"),
        h(
          "div",
          { class: "run-panel-text" },
          h("b", null, "Run it on your computer"),
          h("span", null, "Download the starting point or the finished project and open it in your own editor. About 5 minutes."),
        ),
        h("button", { class: "navbtn", onclick: () => guide.open() }, "Open the guide"),
      ),
      roadmap,
    ),
    introApp,
  );

  // ---- demo bar
  const demoPause = h("button", { class: "icon-btn", title: "Pause (Space)", onclick: () => setPaused(!demo?.paused) }, icon("pause"));
  const demoStep = h("span", { class: "demo-step" });
  const demoWhere = h("span", { class: "demo-where" });
  const demoSpeed = h("button", { class: "text-btn", title: "Speed", onclick: () => setSpeed() }, "1×");
  const demoBar = h(
    "div",
    { class: "demo-bar", hidden: true },
    demoPause,
    h("button", { class: "icon-btn", title: "Previous step", onclick: () => playFrom(Math.max(1, step.index - 1)) }, icon("chevronLeft")),
    h("button", { class: "icon-btn", title: "Next step", onclick: () => step.index + 1 < steps.length && playFrom(step.index + 1) }, icon("chevronRight")),
    demoStep,
    demoWhere,
    h("span", { class: "grow" }),
    demoSpeed,
    h("button", { class: "icon-btn", title: "Stop (Esc)", onclick: () => stopDemo() }, icon("close")),
  );

  const stage = h("main", { class: "stage" }, tryLine, play, intro, demoBar);
  root.append(topbar, stage);

  // ---- resizing
  function applySplit() {
    play.style.setProperty("--left", (split.left * 100).toFixed(2) + "%");
    playCol.style.setProperty("--top", (split.top * 100).toFixed(2) + "%");
    editorPane.style.setProperty("--tree", split.tree + "px");
  }
  function dragSash(sash: HTMLElement, axis: "x" | "y", move: (e: PointerEvent) => void, reset: () => void) {
    sash.addEventListener("dblclick", () => {
      reset();
      applySplit();
      splitStore.set(split);
    });
    sash.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      sash.setPointerCapture(e.pointerId);
      document.body.classList.add("resizing", "resizing-" + axis);
      const onMove = (ev: PointerEvent) => {
        move(ev);
        applySplit();
      };
      const onUp = () => {
        sash.removeEventListener("pointermove", onMove);
        sash.removeEventListener("pointerup", onUp);
        document.body.classList.remove("resizing", "resizing-" + axis);
        splitStore.set(split);
      };
      sash.addEventListener("pointermove", onMove);
      sash.addEventListener("pointerup", onUp);
    });
  }
  dragSash(sashV, "x", (e) => {
    const r = play.getBoundingClientRect();
    split.left = clamp((e.clientX - r.left) / r.width, 0.25, 0.78);
  }, () => (split.left = 0.56));
  dragSash(sashH, "y", (e) => {
    const r = playCol.getBoundingClientRect();
    split.top = clamp((e.clientY - r.top) / r.height, 0.15, 0.85);
  }, () => (split.top = 0.55));
  dragSash(treeSash, "x", (e) => {
    const r = explorer.el.getBoundingClientRect();
    split.tree = Math.round(clamp(e.clientX - r.left, 120, 360));
  }, () => (split.tree = 184));
  applySplit();

  // ---------------------------------------------------------------- rendering
  function tabList(): string[] {
    const order = (a: [string, string | undefined], b: [string, string | undefined]) =>
      a[1] === b[1] ? a[0].localeCompare(b[0]) : a[1] === "added" ? -1 : 1;
    const list = (Object.entries(step.status).filter(([, s]) => s) as [string, string][]).sort(order).map(([p]) => p);
    if (!list.includes(step.focus)) list.unshift(step.focus);
    if (active && !list.includes(active)) list.push(active);
    return list;
  }

  function renderFileChrome() {
    const d = dirty();
    explorer.update({ files: [...Object.keys(files()), ...Object.keys(outMap())], status: step.status, dirty: d, active });
    ftabs.replaceChildren();
    for (const p of tabList()) {
      const st = step.index ? step.status[p] : undefined;
      const name = basename(p);
      ftabs.append(
        h(
          "button",
          {
            class: "ftab" + (st ? " " + st : "") + (p === active ? " active" : "") + (isOut(p) ? " compiled" : ""),
            role: "tab",
            title: p,
            onclick: () => openFile(p),
          },
          st ? h("span", { class: "ftab-mark" }, st === "added" ? "+" : "~") : null,
          name,
          d.has(p) ? h("span", { class: "ftab-dirty", title: "Edited by you" }) : null,
        ),
      );
    }
    ftabs.querySelector(".active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const viewingOut = !!active && isOut(active);
    revertBtn.hidden = !active || !d.has(active) || viewingOut;
    readOnlyTag.hidden = !viewingOut;
    buildError.hidden = !errors.length;
    buildError.textContent = errors.length ? `${errors.length} error` : "";
    buildError.title = errors[0]?.message ?? "";
  }

  function renderStep() {
    stepNum.textContent = num(step.index);
    stepTitle.textContent = step.title;
    stepGoal.textContent = step.goal;
    tryLine.replaceChildren();
    if (step.try) tryLine.append(h("b", null, "Try"), step.try);
    // the steps about running the project offer the setup guide right there
    if (step.id === "setup" || step.id === "ship")
      tryLine.append(h("button", { class: "navbtn try-run", onclick: () => guide.open() }, icon("terminal"), "Run it on your computer"));
    for (const [lang, b] of langBtns) b.classList.toggle("on", lang === ui.lang);
    const isIntro = step.index === 0;
    tryLine.hidden = !step.try || isIntro;
    stage.classList.toggle("is-intro", isIntro);
    // the result pane lives in the intro on step 00, next to the code otherwise
    const home = isIntro ? introApp : playCol;
    if (preview.el.parentElement !== home) {
      if (isIntro) introApp.append(preview.el);
      else playCol.prepend(preview.el);
    }
    tryLine.classList.remove("enter");
    void tryLine.offsetWidth;
    tryLine.classList.add("enter");
    progressFill.style.width = ((step.index + 1) / steps.length) * 100 + "%";
    const last = steps.length - 1;
    prevBtn.toggleAttribute("disabled", step.index <= 1);
    nextBtn.toggleAttribute("disabled", step.index === last);
    document.title = `${num(step.index)} ${step.title} · build your own frontend framework`;
  }

  // ---------------------------------------------------------------- actions
  function openFile(path: string, line?: number, col?: number) {
    const all = files();
    if (isOut(path)) return void openOut(path);
    if (!(path in all)) return;
    active = path;
    const st = step.status[path];
    const prev = step.prevFiles[path] ?? "";
    // highlight what this step added: changed lines, or the whole file if it is new
    const added =
      st === "modified"
        ? addedLineRanges(prev, step.files[path])
        : st === "added" && step.index > 0
          ? addedLineRanges("", step.files[path])
          : [];
    editor.open(editorKey(path), path, all[path], { added, original: prev });
    if (line) editor.goto(line, col);
    renderFileChrome();
    setUrl();
  }

  /**
   * An out/ file: the JS the TypeScript compiler makes from the src/ file, as
   * UraJS does. Read-only, rebuilt from the current source each time it opens.
   */
  async function openOut(path: string) {
    const src = outMap()[path];
    if (!src) return;
    active = path;
    const key = editorKey(path);
    editor.forget(key);
    editor.open(key, path, "// generating…", { added: [], original: "", readOnly: true });
    renderFileChrome();
    setUrl();
    const st = step.status[src];
    const prev = step.prevFiles[src];
    const [code, original, clean] = await Promise.all([
      toOutJs(src, files()[src]),
      prev ? toOutJs(src, prev) : Promise.resolve(""),
      toOutJs(src, step.files[src]),
    ]);
    if (active !== path) return; // the learner moved on while TypeScript loaded
    // highlights come from comparing the generated code of both steps
    const added = st === "modified" ? addedLineRanges(original, clean) : st === "added" && step.index > 0 ? addedLineRanges("", code) : [];
    editor.forget(key);
    editor.open(key, path, code, { added, original, readOnly: true });
  }

  function goStep(i: number, opts: { file?: string } = {}) {
    if (i < 0 || i >= steps.length) return;
    // moving one step forward: outline what changes in the app
    baseTree = i === step.index + 1 && step.index > 0 ? lastTree : null;
    lastTree = null;
    step = course(ui.lang)[i];
    visited.add(i);
    visitedStore.set([...visited]);
    const all = files();
    active = null;
    const keep = opts.file && (opts.file in all || opts.file in outMap());
    openFile(keep ? opts.file! : step.focus);
    renderStep();
    preview.resetRoute();
    runNow();
  }

  function scheduleRun() {
    clearTimeout(runTimer);
    runTimer = window.setTimeout(runNow, 300);
  }

  function runNow() {
    clearTimeout(runTimer);
    const result = build(files());
    errors = result.errors;
    preview.run(result.html);
    renderFileChrome();
  }

  function resetFile() {
    if (!active || !(active in stepEdits())) return;
    delete stepEdits()[active];
    saveEdits();
    editor.replace(step.files[active]);
  }

  function resetStep() {
    for (const p of Object.keys(stepEdits())) editor.forget(editorKey(p));
    delete edits[step.id];
    saveEdits();
    goStep(step.index, { file: active ?? undefined });
  }

  function toggleDiff() {
    ui.diff = !ui.diff;
    uiStore.set(ui);
    diffBtn.classList.toggle("on", ui.diff);
    editor.setDiff(ui.diff);
  }

  function setLang(lang: Lang) {
    if (lang === ui.lang) return;
    const keep = active;
    ui.lang = lang;
    uiStore.set(ui);
    // same file in the other language (main.tsx <-> main.jsx); falls back to the step's focus file
    const file = keep && (lang === "js" ? jsPath(keep) : keep.replace(/\.jsx$/, ".tsx").replace(/\.js$/, ".ts"));
    const all = course(lang)[step.index].files;
    const pick = file && file in all ? file : file && file.replace(/\.ts$/, ".tsx") in all ? file.replace(/\.ts$/, ".tsx") : undefined;
    goStep(step.index, { file: pick });
  }

  function toggleFiles(force?: boolean) {
    ui.files = force ?? !ui.files;
    uiStore.set(ui);
    filesBtn.classList.toggle("on", ui.files);
    editorPane.classList.toggle("no-files", !ui.files);
  }

  async function copyFile(btn: HTMLElement) {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(editor.view.state.doc.toString());
      btn.classList.add("ok");
      setTimeout(() => btn.classList.remove("ok"), 1000);
    } catch {
      // clipboard blocked: nothing else to do
    }
  }

  /** start = the empty project of step 01, end = the finished one, step = this step with your edits. */
  function download(kind: "start" | "step" | "end") {
    const all = course(ui.lang);
    const name = kind === "start" ? `${PROJECT}-start` : kind === "end" ? `${PROJECT}-final` : `${PROJECT}-step-${num(step.index)}`;
    const content = kind === "start" ? all[1].files : kind === "end" ? all[all.length - 1].files : files();
    const blob = zip(content, name);
    const a = h("a", { href: URL.createObjectURL(blob), download: `${name}.zip` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function setUrl() {
    const u = new URL(location.href);
    u.searchParams.set("step", step.id);
    if (active) u.searchParams.set("file", active);
    else u.searchParams.delete("file");
    history.replaceState(null, "", u);
  }

  // ---------------------------------------------------------------- demo mode
  // Plays the course: each step, each changed file, each change in it.
  function startDemo(from = Math.max(1, step.index)) {
    demo = { paused: false, speed: demo?.speed ?? 1 };
    demoBar.hidden = false;
    document.body.classList.add("demoing");
    setPaused(false);
    void playFrom(from);
  }

  function stopDemo() {
    demoToken++;
    demo = null;
    demoBar.hidden = true;
    document.body.classList.remove("demoing");
    editor.spotlight(null);
    editor.setDiff(ui.diff);
  }

  function setPaused(p: boolean) {
    if (!demo) return;
    demo.paused = p;
    demoPause.replaceChildren(icon(p ? "play" : "pause"));
    demoPause.title = p ? "Play (Space)" : "Pause (Space)";
    demoBar.classList.toggle("paused", p);
  }

  function setSpeed() {
    if (!demo) return;
    demo.speed = demo.speed === 1 ? 2 : demo.speed === 2 ? 0.5 : 1;
    demoSpeed.textContent = (demo.speed === 0.5 ? "½" : demo.speed) + "×";
  }

  async function sleep(ms: number, token: number) {
    let left = ms;
    while (left > 0) {
      await new Promise((r) => setTimeout(r, 100));
      if (token !== demoToken || !demo) throw CANCEL;
      if (!demo.paused) left -= 100 * demo.speed;
    }
  }

  async function playFrom(from: number) {
    const token = ++demoToken;
    if (!demo) return;
    try {
      for (let i = from; i < steps.length; i++) {
        goStep(i);
        demoStep.textContent = `${num(i)} ${steps[i].title}`;
        demoWhere.textContent = "";
        await sleep(1800, token);
        const changed = tabList().filter((p) => step.status[p]);
        for (const path of changed) {
          const st = step.status[path];
          openFile(path);
          editor.setDiff(st === "modified");
          const hunks = st === "modified" ? changeHunks(step.prevFiles[path] ?? "", step.files[path]) : fileBlocks(step.files[path]);
          for (let k = 0; k < hunks.length; k++) {
            const hk = hunks[k];
            editor.spotlight(hk);
            const what = hk.added && hk.removed ? "edited" : hk.added ? (st === "added" ? "new file" : "added") : "removed";
            demoWhere.textContent = `${basename(path)} · ${what} · ${k + 1}/${hunks.length}`;
            await sleep(clamp(900 + 110 * (hk.added + hk.removed), 1400, 4500), token);
          }
          editor.spotlight(null);
        }
        await sleep(1000, token);
      }
      stopDemo();
    } catch (e) {
      if (e !== CANCEL) throw e;
    }
  }

  // ---------------------------------------------------------------- quick open
  const commands = (): Command[] => [
    { id: "next", label: "Next step", keys: "→", run: () => goStep(step.index + 1) },
    { id: "prev", label: "Previous step", keys: "←", run: () => goStep(step.index - 1) },
    { id: "demo", label: "Play demo", run: () => startDemo() },
    { id: "lang-ts", label: "Mode: TypeScript", run: () => setLang("ts") },
    { id: "lang-js", label: "Mode: JavaScript", run: () => setLang("js") },
    { id: "guide", label: "Run it on your computer (setup guide)", run: () => guide.open() },
    { id: "diff", label: "Compare with previous step", run: () => toggleDiff() },
    { id: "files", label: "Show / hide files", run: () => toggleFiles() },
    { id: "console", label: "Show console", run: () => setDtTab("console") },
    { id: "elements", label: "Show elements", run: () => setDtTab("elements") },
    { id: "vdom", label: "Show virtual DOM", run: () => setDtTab("vdom") },
    { id: "clear", label: "Clear console", run: () => consolePanel.clear(true) },
    { id: "reload", label: "Reload result", keys: `${MOD} S`, run: () => runNow() },
    { id: "reset-file", label: "Undo my edits to this file", run: () => resetFile() },
    { id: "reset-step", label: "Undo all my edits in this step", run: () => resetStep() },
    { id: "download-start", label: "Download the starting point", run: () => download("start") },
    { id: "download-end", label: "Download the finished project", run: () => download("end") },
  ];
  const quick = new QuickOpen({
    files: () => Object.keys(files()),
    commands,
    steps: () => steps.map((s, i) => ({ label: `${num(i)}  ${s.title}`, detail: s.goal, run: () => goStep(i) })),
    openFile: (p) => {
      openFile(p);
      editor.focus();
    },
    gotoLine: (n) => editor.goto(n),
  });

  // ---------------------------------------------------------------- keyboard
  window.addEventListener(
    "keydown",
    (e) => {
      if (menuKey(e)) return stop(e, () => {});
      const inField = (e.target as HTMLElement).closest?.("input, textarea, [contenteditable], .cm-editor");
      if (demo && !inField) {
        if (e.key === "Escape") return stop(e, () => stopDemo());
        if (e.key === " ") return stop(e, () => setPaused(!demo!.paused));
        if (e.key === "ArrowRight") return stop(e, () => step.index + 1 < steps.length && playFrom(step.index + 1));
        if (e.key === "ArrowLeft") return stop(e, () => playFrom(Math.max(1, step.index - 1)));
      }
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && e.shiftKey && k === "p") return stop(e, () => quick.show(">"));
      if (mod && !e.shiftKey && k === "p") return stop(e, () => quick.show(""));
      if (mod && !e.shiftKey && k === "s") return stop(e, () => runNow());
      if (mod && !e.shiftKey && k === "g") return stop(e, () => quick.show(":"));
      if (e.altKey && e.key === "PageDown") return stop(e, () => goStep(step.index + 1));
      if (e.altKey && e.key === "PageUp") return stop(e, () => goStep(step.index - 1));
      const typing = (e.target as HTMLElement).closest?.("input, textarea, [contenteditable], .cm-editor, [role=tree]");
      if (!typing && !e.altKey && !mod && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        stop(e, () => goStep(step.index + (e.key === "ArrowRight" ? 1 : -1)));
      }
    },
    true,
  );
  function stop(e: KeyboardEvent, fn: () => void) {
    e.preventDefault();
    e.stopPropagation();
    fn();
  }

  // ---------------------------------------------------------------- boot
  setDtTab(ui.dt in dtTabs ? ui.dt : "console");
  toggleFiles(ui.files);
  diffBtn.classList.toggle("on", ui.diff);
  editor.setDiff(ui.diff);

  const params = new URLSearchParams(location.search);
  const startIdx = Math.max(0, steps.findIndex((s) => s.id === params.get("step")));
  goStep(startIdx, { file: params.get("file") ?? undefined });

  // handle for quick debugging in the console
  (window as any).__wb = { goStep, openFile, steps };
}
