import { transform } from "sucrase";
import type { FileStatus, Step } from "./types";
import { tidy } from "../utils/pretty";

// JavaScript mode: the same course with the types removed. Generated from the
// TypeScript steps, so both modes always teach the same code.

export const jsPath = (p: string) => p.replace(/\.tsx$/, ".jsx").replace(/\.ts$/, ".js");

/** One file in its JavaScript form, or null when JS projects don't need it. */
export function toJsFile(path: string, code: string): [string, string] | null {
  if (path.endsWith(".d.ts") || path === "tsconfig.json") return null;
  if (path === "package.json") {
    try {
      const pkg = JSON.parse(code);
      // no tsconfig, so nothing to type-check; TypeScript still compiles the JSX in server.js
      if (pkg.scripts) delete pkg.scripts.typecheck;
      return [path, JSON.stringify(pkg, null, 2) + "\n"];
    } catch {
      return [path, code];
    }
  }
  if (path === "index.html") return [path, code.replace(/(src="[^"]+)\.tsx"/g, '$1.jsx"').replace(/(src="[^"]+)\.ts"/g, '$1.js"')];
  if (!/\.tsx?$/.test(path)) return [path, code.replace(/\bsrc\/main\.tsx\b/g, "src/main.jsx")];
  let out: string;
  try {
    out = transform(code, {
      transforms: ["typescript", "jsx"],
      jsxRuntime: "preserve",
      // without this, imports used only by JSX (createElement) get dropped
      jsxPragma: "createElement",
      jsxFragmentPragma: "Fragment",
      disableESTransforms: true,
      filePath: path,
    }).code;
  } catch {
    out = code;
  }
  out = tidy(out)
    // imports point at the JS files: "./App.tsx" -> "./App.jsx", "./mini/index.ts" -> "./mini/index.js"
    .replace(/(from\s*["'][^"']+)\.tsx(["'])/g, "$1.jsx$2")
    .replace(/(from\s*["'][^"']+)\.ts(["'])/g, "$1.js$2")
    .replace(/Vite \+ TypeScript/g, "Vite + JavaScript")
    .replace(/\b([\w-]+)\.tsx\b/g, "$1.jsx");
  return [jsPath(path), out];
}

export function toJsFiles(files: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [p, c] of Object.entries(files)) {
    const r = toJsFile(p, c);
    if (r) out[r[0]] = r[1];
  }
  return out;
}

export function toJsSteps(steps: Step[]): Step[] {
  return steps.map((s) => {
    const files = toJsFiles(s.files);
    const prevFiles = toJsFiles(s.prevFiles);
    const status: Record<string, FileStatus> = {};
    if (s.index > 0)
      for (const [p, c] of Object.entries(files)) {
        if (!(p in prevFiles)) status[p] = "added";
        else if (prevFiles[p] !== c) status[p] = "modified";
      }
    return {
      ...s,
      files,
      prevFiles,
      status,
      focus: jsPath(s.focus),
      goal: s.goal,
      try: s.try,
    };
  });
}
