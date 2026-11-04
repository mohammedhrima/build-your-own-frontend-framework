import { toJsSteps } from "./js";
import type { FileStatus, Step, StepDef } from "./types";
import { setup } from "./01-setup";
import { courseSteps } from "./course";

export type { Step, FileStatus } from "./types";

const defs: StepDef[] = [setup, ...courseSteps];

const TEACH = /^(\s*)\/\/!\s?(.*)$/;

/**
 * Resolve `//!` teaching comments. A `//!` line shows (as `//`) only if it is
 * new in this step, i.e. absent from every file of the previous step (so code
 * that merely moves to another file doesn't repeat its comments).
 */
export function resolveComments(raw: string, prevRaw: string | undefined): string {
  const seen = new Set((prevRaw ?? "").split("\n").map((l) => l.trim()));
  const out: string[] = [];
  for (const line of raw.split("\n")) {
    const m = TEACH.exec(line);
    if (!m) out.push(line);
    else if (!seen.has(line.trim())) out.push(`${m[1]}// ${m[2]}`);
  }
  return out.join("\n");
}

/** Strip every `//!` line (used for "clean" code: diffs, downloads). */
export function stripComments(raw: string): string {
  return raw
    .split("\n")
    .filter((l) => !TEACH.test(l))
    .join("\n");
}

function sortPaths(files: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
}

const SPEC = /(from\s+|import\s+)(["'])(\.{1,2}\/[^"']*)\2/g;

/**
 * Write imports with the real file extension ("./mini" -> "./mini/index.ts").
 * The browser loads out/*.js as plain ES modules, so every path must be
 * complete; server.js turns .ts/.tsx into .js, like UraJS.
 */
export function withExtensions(files: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, code] of Object.entries(files)) {
    if (!path.startsWith("src/") || !/\.(tsx?|jsx?)$/.test(path)) {
      out[path] = code;
      continue;
    }
    const dir = path.split("/").slice(0, -1);
    out[path] = code.replace(SPEC, (m, kw: string, q: string, spec: string) => {
      if (/\.(tsx?|jsx?|css|json)$/.test(spec)) return m;
      const parts: string[] = [...dir];
      for (const seg of spec.split("/")) {
        if (seg === "..") parts.pop();
        else if (seg !== ".") parts.push(seg);
      }
      const base = parts.join("/");
      for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) if (base + ext in files) return kw + q + spec + ext + q;
      return m;
    });
  }
  return out;
}

export function composeSteps(list: StepDef[]): { steps: Step[]; raw: Record<string, string> } {
  const out: Step[] = [];
  let raw: Record<string, string> = {};

  list.forEach((def, i) => {
    const prevRaw = def.reset ? {} : raw;
    let nextRaw = { ...prevRaw, ...def.changes };
    for (const p of def.deletes ?? []) delete nextRaw[p];
    nextRaw = withExtensions(nextRaw);

    const prevAll = Object.values(prevRaw).join("\n");
    const files: Record<string, string> = {};
    const status: Record<string, FileStatus> = {};
    for (const p in nextRaw) {
      files[p] = resolveComments(nextRaw[p], prevAll);
      if (!(p in prevRaw)) status[p] = "added";
      else if (stripComments(nextRaw[p]) !== stripComments(prevRaw[p])) status[p] = "modified";
    }

    const { changes: _c, deletes: _d, ...meta } = def;
    out.push({
      ...meta,
      index: i,
      files: sortPaths(files),
      prevFiles: Object.fromEntries(
        Object.entries(prevRaw).map(([p, c]) => [p, stripComments(c)]),
      ),
      status,
    });
    raw = nextRaw;
  });
  return { steps: out, raw };
}

const { steps: built, raw: finalRaw } = composeSteps(defs);

/** Step 0: the finished app, so the learner sees the goal first. */
const preview: Step = {
  id: "preview",
  title: "Welcome",
  goal: "Build a tiny React, one runnable step at a time.",
  focus: "src/pages.tsx",
  index: 0,
  files: sortPaths(
    Object.fromEntries(Object.entries(finalRaw).map(([p, c]) => [p, stripComments(c)])),
  ),
  prevFiles: {},
  status: {},
};

export const steps: Step[] = [preview, ...built.map((s) => ({ ...s, index: s.index + 1 }))];

/** Clean copy of the final project for "Download project". */
export function finalProject(): Record<string, string> {
  return preview.files;
}

export type Lang = "ts" | "js";
let jsCourse: Step[] | null = null;

/** The course in TypeScript, or the same course with the types removed. */
export function course(lang: Lang): Step[] {
  if (lang === "ts") return steps;
  return (jsCourse ??= toJsSteps(steps));
}
