import { steps, type Step } from "../steps/steps.js";
import { addedLineRanges } from "./diff.js";
import {
  createEditor,
  createViewer,
  type Editor,
  type Viewer,
} from "./editor.js";
import { mountRunner, type Runner } from "./runner.js";

function h(tag: string, attrs: Record<string, any> = {}, ...kids: any[]): any {
  const el: any = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, String(v));
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

function prevCode(index: number): string {
  for (let i = index - 1; i >= 0; i--) {
    if (steps[i].kind === "code" && steps[i].code) return steps[i].code!;
  }
  return "";
}

let current = 0;
let editor: Editor | null = null;
let runner: Runner | null = null;
let viewer: Viewer | null = null;
let runTimer: any = null;

function teardown() {
  if (runTimer) clearTimeout(runTimer);
  runner?.destroy();
  runner = null;
  editor?.destroy();
  editor = null;
  viewer?.destroy();
  viewer = null;
}

export function mount(root: HTMLElement) {
  const progressBar = h("div", { class: "progress-fill" });
  const rail = h("nav", { class: "rail" });
  const stage = h("main", { class: "stage" });
  const counter = h("span", { class: "counter" });
  const prevBtn = h(
    "button",
    { class: "navbtn", onclick: () => go(current - 1) },
    "‹ Prev",
  );
  const nextBtn = h(
    "button",
    { class: "navbtn primary", onclick: () => go(current + 1) },
    "Next ›",
  );

  root.append(
    h(
      "header",
      { class: "topbar" },
      h(
        "div",
        { class: "brand" },
        h("b", {}, "mini"),
        "React",
        h("span", { class: "brand-tag" }, "build it yourself"),
      ),
      h("div", { class: "progress" }, progressBar),
      h("div", { class: "navgroup" }, counter, prevBtn, nextBtn),
    ),
    h("div", { class: "layout" }, rail, stage),
  );

  steps.forEach((s, i) => {
    rail.append(
      h(
        "button",
        { class: "rail-item", "data-i": i, onclick: () => go(i) },
        h("span", { class: "rail-dot" }),
        h("span", { class: "rail-num" }, String(i + 1).padStart(2, "0")),
        h("span", { class: "rail-label" }, s.title),
      ),
    );
  });

  function go(i: number) {
    if (i < 0 || i >= steps.length || i === current) return;
    current = i;
    render();
  }
  (window as any).__go = go;
  (window as any).__rel = (d: number) => go(current + d);

  function render() {
    teardown();
    const step = steps[current];
    progressBar.style.width = ((current + 1) / steps.length) * 100 + "%";
    counter.textContent = `${current + 1} / ${steps.length}`;
    prevBtn.toggleAttribute("disabled", current === 0);
    nextBtn.toggleAttribute("disabled", current === steps.length - 1);
    for (const item of rail.querySelectorAll(".rail-item")) {
      item.classList.toggle(
        "active",
        Number((item as HTMLElement).dataset.i) === current,
      );
    }
    item_into_view();

    stage.innerHTML = "";
    stage.append(
      step.kind === "code"
        ? codeSlide(step)
        : step.kind === "reference"
          ? referenceSlide(step)
          : conceptSlide(step),
    );
  }

  function item_into_view() {
    const active = rail.querySelector(
      ".rail-item.active",
    ) as HTMLElement | null;
    active?.scrollIntoView({ block: "nearest" });
  }

  function conceptSlide(step: Step): HTMLElement {
    return h(
      "section",
      { class: "slide concept" },
      h(
        "div",
        { class: "slide-inner" },
        h("h1", { class: "slide-title" }, step.title),
        h("div", { class: "explain", html: step.explanation }),
      ),
    );
  }

  function codeSlide(step: Step): HTMLElement {
    const cmHost = h("div", { class: "cm-host" });
    const resultHost = h("div", { class: "result-host" });
    const consoleHost = h("div", { class: "console-host" });

    const slide = h(
      "section",
      { class: "slide code" },
      h(
        "div",
        { class: "slide-head" },
        h("h2", { class: "slide-title" }, step.title),
        h("div", { class: "explain", html: step.explanation }),
      ),
      h(
        "div",
        { class: "play" },
        pane("editor", "framework.tsx", cmHost, true),
        h(
          "div",
          { class: "play-col" },
          pane("result", "result", resultHost),
          pane(
            "console",
            "console",
            consoleHost,
            false,
            h(
              "button",
              {
                class: "mini-btn",
                onclick: () => (consoleHost.innerHTML = ""),
              },
              "clear",
            ),
          ),
        ),
      ),
    );

    const log = (level: string, text: string) => {
      consoleHost.append(h("div", { class: "logline " + level }, text));
      consoleHost.scrollTop = consoleHost.scrollHeight;
    };
    runner = mountRunner(resultHost, log);

    const runNow = (code: string) => {
      consoleHost.innerHTML = "";
      runner?.run(code);
    };
    editor = createEditor(cmHost, (code) => {
      if (runTimer) clearTimeout(runTimer);
      runTimer = setTimeout(() => runNow(code), 280);
    });

    const added = addedLineRanges(prevCode(current), step.code!);
    requestAnimationFrame(() => {
      editor!.setStep(step.code!, added);
      // setStep's doc change scheduled a debounced run via onChange; cancel it
      // and run once now (otherwise the demo runs twice and the iframe reloads).
      if (runTimer) clearTimeout(runTimer);
      runNow(step.code!);
    });
    return slide;
  }

  render();
}

function pane(
  kind: string,
  label: string,
  body: HTMLElement,
  dots = false,
  ...headExtra: any[]
): HTMLElement {
  return h(
    "div",
    { class: "pane " + kind },
    h(
      "div",
      { class: "pane-head" },
      dots
        ? h("span", { class: "dots" }, h("i", {}), h("i", {}), h("i", {}))
        : null,
      h("span", { class: "pane-label" }, label),
      ...headExtra,
    ),
    body,
  );
}

function referenceSlide(step: Step): HTMLElement {
  const files = step.files || [];
  const viewerHost = h("div", { class: "ref-code" });
  const pathLabel = h("span", { class: "pane-label" }, "");
  const copyBtn = h("button", { class: "mini-btn" }, "Copy");
  const fileList = h("div", { class: "ref-files" });
  let active = -1;

  const showFile = (i: number) => {
    if (i === active) return;
    active = i;
    viewer?.destroy();
    viewerHost.innerHTML = "";
    const f = files[i];
    pathLabel.textContent = f.path;
    viewer = createViewer(viewerHost, f.path, f.code);
    for (const b of fileList.querySelectorAll(".ref-file")) {
      b.classList.toggle("active", Number((b as HTMLElement).dataset.i) === i);
    }
  };

  copyBtn.addEventListener("click", async () => {
    const text = files[active]?.code ?? "";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea"); // fallback for no-clipboard
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {}
      ta.remove();
    }
    copyBtn.textContent = "Copied!";
    copyBtn.classList.add("ok");
    setTimeout(() => {
      copyBtn.textContent = "Copy";
      copyBtn.classList.remove("ok");
    }, 1300);
  });

  files.forEach((f, i) => {
    const slash = f.path.lastIndexOf("/");
    const dir = slash >= 0 ? f.path.slice(0, slash + 1) : "";
    const base = slash >= 0 ? f.path.slice(slash + 1) : f.path;
    const depth = (f.path.match(/\//g) || []).length;
    fileList.append(
      h(
        "button",
        {
          class: "ref-file",
          "data-i": i,
          style: depth ? `padding-left:${12 + depth * 14}px` : "",
          onclick: () => showFile(i),
        },
        dir ? h("span", { class: "ref-file-dir" }, dir) : null,
        h("span", { class: "ref-file-name" }, base),
      ),
    );
  });

  const slide = h(
    "section",
    { class: "slide reference" },
    h(
      "div",
      { class: "slide-head" },
      h("h2", { class: "slide-title" }, step.title),
      h("div", { class: "explain", html: step.explanation }),
    ),
    h(
      "div",
      { class: "reference-body" },
      h(
        "div",
        { class: "ref-tree" },
        h("div", { class: "ref-tree-head" }, "project files"),
        fileList,
      ),
      h(
        "div",
        { class: "pane ref-view" },
        h(
          "div",
          { class: "pane-head" },
          h("span", { class: "dots" }, h("i", {}), h("i", {}), h("i", {})),
          pathLabel,
          copyBtn,
        ),
        viewerHost,
      ),
    ),
  );

  if (files.length) requestAnimationFrame(() => showFile(0));
  return slide;
}

window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement)?.closest?.(".cm-host")) return; // don't hijack editor
  if (e.key === "ArrowRight") (window as any).__rel?.(1);
  else if (e.key === "ArrowLeft") (window as any).__rel?.(-1);
});
