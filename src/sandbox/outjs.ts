// The out/ folder: each src/ file turned into plain JavaScript exactly the way
// UraJS does it (scripts/core/transpile.ts): TypeScript's own transpileModule,
// one file at a time, src/x.tsx -> out/x.js, imports rewritten to .js.
// TypeScript is big, so it loads the first time an out/ file is opened.

type TS = typeof import("typescript5");
let ts: Promise<TS> | null = null;
const load = () => (ts ??= import("typescript5").then((m) => ((m as any).default ?? m) as TS));

export const OUT = "out/";
export const isOut = (p: string) => p.startsWith(OUT);
/** src/components/TodoItem.tsx -> out/components/TodoItem.js */
export const outPath = (src: string) => OUT + src.replace(/^src\//, "").replace(/\.(tsx?|jsx?)$/, ".js");
/** Files that get an out/ twin: the app's code under src/ (type declarations have no JS). */
export const hasOut = (p: string) => p.startsWith("src/") && /\.(tsx?|jsx?)$/.test(p) && !p.endsWith(".d.ts");

export async function toOutJs(path: string, code: string): Promise<string> {
  const t = await load();
  let out = t.transpileModule(code, {
    compilerOptions: {
      module: t.ModuleKind.ESNext,
      target: t.ScriptTarget.ES2020,
      jsx: t.JsxEmit.React,
      jsxFactory: "createElement",
      jsxFragmentFactory: "Fragment",
      esModuleInterop: true,
    },
    fileName: path,
  }).outputText;
  out = out.replace(/(from\s*["'])(\.[^"']+)\.(tsx?|jsx)(["'])/g, "$1$2.js$4");
  return out;
}
