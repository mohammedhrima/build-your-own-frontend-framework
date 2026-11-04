import { h, icon } from "../atoms/dom";

type Block = { title: string; text?: string; cmd?: string; out?: string; download?: boolean };
export type DownloadKind = "start" | "step" | "end";

/**
 * "Run it on your computer": the few commands a beginner needs, in order,
 * in plain words. Opened from the intro, step 01, the last step and the
 * download button. Nothing in the course requires it: the page runs everything.
 */
export class SetupGuide {
  private el: HTMLElement | null = null;
  private restore: HTMLElement | null = null;

  constructor(
    private opts: {
      folder: string;
      download: (kind: DownloadKind) => void;
      /** "07 Events" when the learner is in the middle of the course, else null */
      stepLabel: () => string | null;
    },
  ) {}

  private blocks(): Block[] {

    return [
      {
        title: "Install Node.js",
        text: "Get the LTS version from nodejs.org and install it like any app. You do this once. To check, open a terminal (Windows: PowerShell, Mac: Terminal) and type:",
        cmd: "node -v",
        out: "v22.11.0   ← any number means it worked",
      },
      {
        title: "Download the project",
        text: "The starting point is the empty project of step 01: build the framework yourself. The finished project is the end of the course. Unzip it.",
        download: true,
      },
      {
        title: "Open a terminal in that folder",
        text: "cd moves the terminal into a folder. Use the name of the folder you unzipped:",
        cmd: `cd ${this.opts.folder}-start`,
        out: `or: cd ${this.opts.folder}-final`,
      },
      {
        title: "Install the project's tools",
        text: "This reads package.json and downloads TypeScript (it turns your files into plain JavaScript). Once per project.",
        cmd: "npm install",
      },
      {
        title: "Start it",
        text: "server.js turns src/ into out/ and serves the project. Open http://localhost:5173 in your browser. Change a file, save, refresh the page. Ctrl+C stops it.",
        cmd: "npm run dev",
        out: "➜  Local:   http://localhost:5173/",
      },
    ];
  }

  open() {
    if (this.el) return;
    this.restore = document.activeElement as HTMLElement | null;
    const list = h("ol", { class: "guide-steps" });
    for (const b of this.blocks()) {
      const li = h("li", null, h("div", { class: "guide-title" }, b.title));
      if (b.text) li.append(h("p", { class: "guide-text" }, b.text));
      if (b.cmd) li.append(this.command(b.cmd));
      if (b.out) li.append(h("div", { class: "guide-out" }, b.out));
      if (b.download) {
        const here = this.opts.stepLabel();
        li.append(
          h(
            "div",
            { class: "guide-dls" },
            h("button", { class: "navbtn primary guide-dl", onclick: () => this.opts.download("start") }, icon("download"), "Starting point"),
            h("button", { class: "navbtn guide-dl", onclick: () => this.opts.download("end") }, icon("download"), "Finished project"),
            here ? h("button", { class: "navbtn guide-dl", onclick: () => this.opts.download("step") }, icon("download"), `This step (${here})`) : null,
          ),
        );
      }
      list.append(li);
    }
    const close = h("button", { class: "icon-btn", title: "Close (Esc)", "aria-label": "Close", onclick: () => this.close() }, icon("close"));
    this.el = h(
      "div",
      {
        class: "guide-backdrop",
        onmousedown: (e: MouseEvent) => e.target === e.currentTarget && this.close(),
      },
      h(
        "div",
        { class: "setup-dialog", role: "dialog", "aria-modal": "true", "aria-label": "Run it on your computer", tabindex: "-1" },
        h("div", { class: "guide-head" }, h("h2", null, "Run it on your computer"), close),
        h("p", { class: "guide-intro" }, "Optional. The course runs in this page. About 5 minutes."),
        list,
      ),
    );
    document.body.append(this.el);
    document.addEventListener("keydown", this.onKey, true);
    (this.el.querySelector(".setup-dialog") as HTMLElement).focus();
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    this.close();
  };

  close() {
    document.removeEventListener("keydown", this.onKey, true);
    this.el?.remove();
    this.el = null;
    this.restore?.focus?.();
  }

  private command(cmd: string): HTMLElement {
    const copy = h(
      "button",
      {
        class: "navbtn guide-copy",
        onclick: async () => {
          try {
            await navigator.clipboard.writeText(cmd);
            copy.textContent = "Copied";
            setTimeout(() => (copy.textContent = "Copy"), 1200);
          } catch {
            // clipboard blocked: the command is on screen to type
          }
        },
      },
      "Copy",
    );
    return h("div", { class: "guide-cmd" }, h("code", null, cmd), copy);
  }
}
