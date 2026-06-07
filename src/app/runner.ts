import * as ts from "typescript";

const COMPILE: ts.TranspileOptions = {
  reportDiagnostics: false,
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.None,
    jsx: ts.JsxEmit.React,
    jsxFactory: "createElement",
    jsxFragmentFactory: "createFragment",
  },
};

export function compile(code: string): { js?: string; error?: string } {
  try {
    return { js: ts.transpileModule(code, COMPILE).outputText };
  } catch (e) {
    return { error: (e as Error)?.message ?? String(e) };
  }
}

function pageHTML(js: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    :root{color-scheme:dark}
    html,body{margin:0}
    body{font:14px/1.55 Inter,system-ui,-apple-system,sans-serif;color:#e8edf6;padding:18px}
    *{box-sizing:border-box}
    button{font:inherit;cursor:pointer}
    input{font:inherit}
  </style></head><body><div id="root"></div><script>
  (function () {
    var send = function (level, args) {
      var text = Array.prototype.map.call(args, function (a) {
        try { return typeof a === "object" ? JSON.stringify(a, null, 2) : String(a); }
        catch (e) { return String(a); }
      }).join(" ");
      parent.postMessage({ __demo: true, level: level, text: text }, "*");
    };
    ["log", "info", "warn", "error"].forEach(function (l) {
      var orig = console[l];
      console[l] = function () { send(l, arguments); orig && orig.apply(console, arguments); };
    });
    window.addEventListener("error", function (e) { send("error", [e.message]); });
    window.addEventListener("unhandledrejection", function (e) {
      send("error", [(e.reason && e.reason.message) || e.reason]);
    });
    try {
${js}
    } catch (e) { send("error", [(e && e.message) || String(e)]); }
  })();
  <\/script></body></html>`;
}

export type Runner = { run(code: string): void; destroy(): void };

export function mountRunner(
  host: HTMLElement,
  onLog: (level: string, text: string) => void,
): Runner {
  const frame = document.createElement("iframe");
  frame.className = "demo-frame";
  frame.setAttribute("title", "live result");
  host.appendChild(frame);

  const onMessage = (e: MessageEvent) => {
    if (e.source === frame.contentWindow && e.data && e.data.__demo) {
      onLog(e.data.level, e.data.text);
    }
  };
  window.addEventListener("message", onMessage);

  // We load the iframe from a blob URL rather than srcdoc. A blob document has a
  // real (inherited) origin, so demos can use location.hash + hashchange (our
  // router) without the document being wiped — about:srcdoc resets on hash change.
  let lastUrl: string | null = null;

  return {
    run(code: string) {
      const { js, error } = compile(code);
      if (error) {
        onLog("error", "Compile error: " + error);
        return;
      }
      try {
        new Function(js ?? "");
      } catch (e) {
        onLog("error", "Syntax error: " + ((e as Error)?.message ?? String(e)));
        return;
      }
      const blob = new Blob([pageHTML(js ?? "")], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      frame.src = url;
      if (lastUrl) URL.revokeObjectURL(lastUrl); // free the previous run's blob
      lastUrl = url;
    },
    destroy() {
      window.removeEventListener("message", onMessage);
      if (lastUrl) URL.revokeObjectURL(lastUrl);
      frame.remove();
    },
  };
}
