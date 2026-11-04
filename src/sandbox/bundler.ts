import { transform } from "sucrase";
import { runtime } from "./runtime";

export type BuildError = {
  file: string;
  line: number;
  col: number;
  message: string;
};

const SCRIPT_EXT = /\.(tsx?|jsx?)$/;

export function isModule(path: string) {
  return SCRIPT_EXT.test(path) && !path.endsWith(".d.ts");
}

/** TS/TSX → CommonJS JS. Sucrase keeps line numbers, so stacks map 1:1. */
export function transpile(path: string, code: string): { code: string } | { error: BuildError } {
  try {
    const out = transform(code, {
      transforms: ["typescript", "jsx", "imports"],
      jsxPragma: "createElement",
      jsxFragmentPragma: "Fragment",
      filePath: path,
      production: true,
      disableESTransforms: true,
    });
    return { code: out.code };
  } catch (e) {
    const raw = String((e as Error)?.message ?? e);
    const m = /\((\d+):(\d+)\)\s*$/.exec(raw);
    const message = raw
      .replace(/^Error transforming [^:]+:\s*/, "")
      .replace(/\s*\(\d+:\d+\)\s*$/, "");
    return {
      error: {
        file: path,
        line: m ? +m[1] : 1,
        col: m ? +m[2] + 1 : 1,
        message,
      },
    };
  }
}

const escapeScript = (s: string) => s.replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--");
const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const DEFAULT_HTML = `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div></body></html>`;

const RUNTIME_TAG = `<script data-mini-runtime>(${runtime.toString()})()</script>`;

function inject(html: string, head: string, body: string) {
  let out = html;
  out = /<head[^>]*>/i.test(out) ? out.replace(/<head[^>]*>/i, (m) => m + head) : head + out;
  out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, body + "</body>") : out + body;
  return out;
}

export type BuildResult = {
  html: string;
  errors: BuildError[];
};

export function build(files: Record<string, string>): BuildResult {
  const errors: BuildError[] = [];
  let html = files["index.html"] ?? DEFAULT_HTML;

  // The entry is whatever index.html loads, like Vite.
  let entry: string | null = null;
  html = html.replace(
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (_m, src: string) => {
      entry ??= src.replace(/^\.?\//, "");
      return "";
    },
  );
  // index.html loads out/main.js, which server.js compiles from src/main.(tsx|ts|jsx|js)
  const loaded = entry as string | null; // assigned inside the replace callback
  if (loaded && !(loaded in files) && loaded.startsWith("out/")) {
    const base = "src/" + loaded.slice(4).replace(/\.js$/, "");
    entry = [".tsx", ".ts", ".jsx", ".js"].map((e) => base + e).find((p) => p in files) ?? null;
  }
  if (!entry || !(entry in files)) entry = ["src/main.tsx", "src/main.jsx"].find((p) => p in files) ?? null;

  const modules: string[] = [];
  for (const [path, code] of Object.entries(files)) {
    // only the app's code runs in the page: server.js is a Node script
    if (isModule(path) && path.startsWith("src/")) {
      const out = transpile(path, code);
      if ("error" in out) {
        errors.push(out.error);
        continue;
      }
      // Wrapper on the same line as the code: line N of the file is line N of the script.
      modules.push(
        `<script data-mini-runtime>__define(${JSON.stringify(path)}, function (require, module, exports) {${escapeScript(out.code)}\n});\n//# sourceURL=${path}</script>`,
      );
    } else if (path.endsWith(".css")) {
      modules.push(
        `<script data-mini-runtime>__define(${JSON.stringify(path)}, function () { __css(${JSON.stringify(path)}, ${escapeScript(JSON.stringify(code))}); });</script>`,
      );
    } else if (path.endsWith(".json") && path.startsWith("src/")) {
      modules.push(
        `<script data-mini-runtime>__define(${JSON.stringify(path)}, function (require, module) { module.exports = ${escapeScript(code.trim() || "null")}; });</script>`,
      );
    }
  }

  if (errors.length) return { html: overlay(files, errors[0]), errors };

  const start = entry ? `<script data-mini-runtime>__start(${JSON.stringify(entry)})</script>` : "";
  return { html: inject(html, RUNTIME_TAG, modules.join("") + start), errors };
}

/** Vite-style error overlay shown in the preview when the code doesn't parse. */
function overlay(files: Record<string, string>, err: BuildError): string {
  const lines = (files[err.file] ?? "").split("\n");
  const from = Math.max(1, err.line - 3);
  const to = Math.min(lines.length, err.line + 2);
  const width = String(to).length;
  let frame = "";
  for (let n = from; n <= to; n++) {
    const mark = n === err.line ? ">" : " ";
    frame += `${mark} ${String(n).padStart(width)} | ${lines[n - 1]}\n`;
    if (n === err.line) frame += `  ${" ".repeat(width)} | ${" ".repeat(Math.max(0, err.col - 1))}^\n`;
  }
  return `<!doctype html><html><head><meta charset="utf-8">${RUNTIME_TAG}<style>
    html,body{margin:0;height:100%;background:rgba(0,0,0,.66)}
    .w{position:fixed;inset:0;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:28px 16px}
    .b{width:100%;max-width:820px;background:#181818;color:#d8d8d8;border-top:8px solid #ff5555;border-radius:6px 6px 8px 8px;
       box-shadow:0 19px 38px rgba(0,0,0,.3),0 15px 12px rgba(0,0,0,.22);padding:24px 28px;
       font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
    .m{color:#ff5555;font-weight:600;white-space:pre-wrap;margin:0 0 1em;font-size:15px}
    .f{color:#cfa4ff;margin-bottom:12px;text-decoration:underline}
    pre{margin:0;padding:12px 14px;background:#111;border-radius:4px;overflow:auto;color:#ffbf66}
    .t{margin-top:14px;color:#888;font-size:12px}
    .t code{color:#ffbf66}
  </style></head><body><div class="w"><div class="b">
    <div class="m">[plugin:vite:esbuild] ${escapeHtml(err.message)}</div>
    <div class="f">/${escapeHtml(err.file)}:${err.line}:${err.col}</div>
    <pre>${escapeHtml(frame)}</pre>
    <div class="t">Fix the code to dismiss the overlay.</div>
  </div></div><script data-mini-runtime>console.error(${JSON.stringify(
    `[vite] Internal server error: ${err.message}\n  File: /${err.file}:${err.line}:${err.col}`,
  )})</script></body></html>`;
}
