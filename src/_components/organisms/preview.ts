import type { FromFrame, ToFrame } from "../../types/protocol";
import { h, icon } from "../atoms/dom";

export type PreviewEvents = {
  /** A message from the live (latest) frame. */
  message(msg: FromFrame): void;
  /** A new run started: devtools should reset. */
  reset(): void;
  reload(): void;
};

/**
 * The result pane: address bar (shows the hash route), page title, and a
 * double-buffered iframe (the next run loads hidden and swaps in when ready:
 * no white flash).
 */
export class Preview {
  el: HTMLElement;
  private stage: HTMLElement;
  private address: HTMLInputElement;
  private tabTitle: HTMLElement;
  private live: HTMLIFrameElement | null = null;
  private next: HTMLIFrameElement | null = null;
  private urls = new WeakMap<HTMLIFrameElement, string>();
  private hash = "";
  private swapTimer = 0;

  constructor(private events: PreviewEvents) {
    this.tabTitle = h("span", { class: "page-title" });
    this.address = h("input", {
      class: "addr-input",
      spellcheck: "false",
      "aria-label": "Address",
      onkeydown: (e: KeyboardEvent) => {
        if (e.key !== "Enter") return;
        const v = this.address.value;
        const i = v.indexOf("#");
        this.send({ kind: "nav", to: i >= 0 ? v.slice(i) : "#/" });
        this.address.blur();
      },
    }) as HTMLInputElement;

    const btn = (name: string, title: string, onclick: () => void) =>
      h("button", { class: "icon-btn", title, "aria-label": title, onclick }, icon(name));

    this.stage = h("div", { class: "preview-stage" });
    this.el = h(
      "div",
      { class: "pane result" },
      h(
        "div",
        { class: "pane-head" },
        h("span", { class: "pane-label" }, "result"),
        h(
          "label",
          { class: "addr" },
          btn("arrowLeft", "Back", () => this.send({ kind: "nav", to: "back" })),
          btn("arrowRight", "Forward", () => this.send({ kind: "nav", to: "forward" })),
          this.address,
        ),
        this.tabTitle,
        btn("refresh", "Reload", () => this.events.reload()),
      ),
      this.stage,
    );
    this.setLocation("");

    window.addEventListener("message", (e) => {
      const frame = this.next ?? this.live;
      if (!frame || e.source !== frame.contentWindow) return;
      const msg = e.data as FromFrame & { __mini?: boolean; title?: string };
      if (!msg || !msg.__mini) return;
      if (msg.kind === "ready") this.swap();
      if (msg.kind === "ready" || msg.kind === "location") this.setLocation(msg.hash);
      if ("title" in msg && typeof msg.title === "string") this.setTitle(msg.title);
      this.events.message(msg);
    });
  }

  /** Load a new build. Keeps the current route, like a dev-server reload. */
  run(html: string) {
    this.events.reset();
    if (this.next) this.drop(this.next);
    const frame = document.createElement("iframe");
    frame.className = "preview-frame loading";
    frame.title = "Preview";
    // Same-origin blob URL, not sandboxed: Chrome blocks fragment navigation
    // (hash routing) in an opaque-origin blob document, and srcdoc resolves
    // "#/x" links against the workbench URL. Only the learner's own code runs here.
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    this.urls.set(frame, url);
    frame.src = url + (this.hash || "");
    this.next = frame;
    this.stage.appendChild(frame);
    clearTimeout(this.swapTimer);
    this.swapTimer = window.setTimeout(() => this.swap(), 2500);
  }

  /** Start the next run at "/" (a new step is a new app). */
  resetRoute() {
    this.setLocation("");
  }

  send(msg: ToFrame) {
    (this.next ?? this.live)?.contentWindow?.postMessage(msg, "*");
  }

  private swap() {
    const frame = this.next;
    if (!frame) return;
    clearTimeout(this.swapTimer);
    this.next = null;
    frame.classList.remove("loading");
    if (this.live) this.drop(this.live);
    this.live = frame;
  }

  private drop(frame: HTMLIFrameElement) {
    const url = this.urls.get(frame);
    frame.remove();
    if (url) URL.revokeObjectURL(url);
  }

  private setLocation(hash: string) {
    this.hash = hash;
    this.address.value = "localhost:5173/" + hash;
  }

  private setTitle(title: string) {
    this.tabTitle.textContent = title;
  }
}
