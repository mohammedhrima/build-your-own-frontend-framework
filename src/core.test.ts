import { describe, expect, it } from "vitest";
import { composeSteps, course, resolveComments, steps, stripComments } from "./steps";
import { build, isModule, transpile } from "./sandbox/bundler";
import { outPath, toOutJs } from "./sandbox/outjs";
import { addedLineRanges } from "./utils/diff";
import { fuzzy } from "./_components/molecules/quickOpen";
import { crc32 } from "./utils/zip";

describe("curriculum", () => {
  it("every module of every step transpiles", () => {
    for (const s of steps) {
      for (const [path, code] of Object.entries(s.files)) {
        if (!isModule(path)) continue;
        const out = transpile(path, code);
        expect("error" in out ? `${s.id}/${path}: ${out.error.message}` : "ok").toBe("ok");
      }
    }
  });

  it("every step builds into a runnable page with an entry", () => {
    for (const s of steps) {
      const { html, errors } = build(s.files);
      expect(errors).toEqual([]);
      expect(html).toContain('__start("src/main.tsx")');
    }
  });

  it("step 0 previews the finished project without teaching comments", () => {
    const last = steps[steps.length - 1];
    expect(Object.keys(steps[0].files)).toEqual(Object.keys(last.files));
    for (const code of Object.values(steps[0].files)) expect(code).not.toMatch(/\/\/!/);
  });

  it("no //! marker leaks into displayed code", () => {
    for (const s of steps) for (const code of Object.values(s.files)) expect(code).not.toMatch(/^\s*\/\/!/m);
  });

  it("marks new and changed files", () => {
    const reconcile = steps.find((s) => s.id === "reconcile")!;
    expect(reconcile.status["src/mini/vdom.ts"]).toBe("modified");
    expect(reconcile.status["src/main.tsx"]).toBeUndefined();
    const router = steps.find((s) => s.id === "router")!;
    expect(router.status["src/mini/router.ts"]).toBe("added");
  });
});

describe("few files", () => {
  it("the finished project has at most 13 files", () => {
    expect(Object.keys(steps[steps.length - 1].files).length).toBeLessThanOrEqual(13);
  });
});

describe("project works like UraJS", () => {
  it("index.html loads out/main.js; server.js compiles src/ into out/", () => {
    for (const s of steps.slice(1)) {
      expect(s.files["index.html"]).toContain('src="/out/main.js"');
      expect(s.files["server.js"]).toContain("transpileModule");
      expect(s.files["vite.config.ts"]).toBeUndefined();
      // server.js is a Node script: it must not run in the preview
      expect(build(s.files).html).not.toContain('__define("server.js"');
    }
  });

  it("imports name the real file, so the browser can load them", () => {
    const last = steps[steps.length - 1];
    expect(last.files["src/App.tsx"]).toMatch(/from "\.\/mini\/vdom\.ts"/);
    for (const [p, c] of Object.entries(last.files))
      if (p.startsWith("src/")) expect(`${p}: ${/from "\.{1,2}\/[^"]*(?<!\.tsx?)"/.test(c)}`).toBe(`${p}: false`);
  });
});

describe("JavaScript mode", () => {
  const js = course("js");

  it("every step is plain JS that builds and runs from main.jsx", () => {
    for (const s of js) {
      const paths = Object.keys(s.files);
      expect(paths.filter((p) => /\.tsx?$/.test(p) || p === "tsconfig.json")).toEqual([]);
      const { html, errors } = build(s.files);
      expect(errors).toEqual([]);
      expect(html).toContain('__start("src/main.jsx")');
    }
  });

  it("removes types but keeps JSX", () => {
    const s = js.find((x) => x.id === "instances")!;
    const hooks = s.files["src/mini/hooks.js"];
    expect(hooks).toBeTruthy();
    expect(hooks).not.toMatch(/: (string|number|any|VNode)\b|<T>|import type/);
    expect(s.files["src/App.jsx"]).toContain("<");
    expect(js[1].files["package.json"]).not.toContain("typecheck");
    expect(s.files["src/App.jsx"]).toMatch(/from "\.\/mini\/vdom\.js"/);
  });

  it("keeps the createElement import in files that use JSX", () => {
    for (const s of js)
      for (const [p, c] of Object.entries(s.files))
        if (p.endsWith(".jsx") && /<[A-Za-z]/.test(c)) expect(`${s.id}/${p}: ${/import \{[^}]*\bcreateElement\b/.test(c)}`).toBe(`${s.id}/${p}: true`);
  });

  it("marks files by comparing the JS versions", () => {
    const s = js.find((x) => x.id === "router")!;
    expect(s.status["src/mini/router.js"]).toBe("added");
    expect(s.focus.endsWith(".js") || s.focus.endsWith(".jsx")).toBe(true);
  });
});

describe("teaching comments", () => {
  it("shows a //! comment only in the step that adds it", () => {
    const v1 = "//! explain\nconst a = 1;";
    expect(resolveComments(v1, undefined)).toBe("// explain\nconst a = 1;");
    expect(resolveComments(v1, v1)).toBe("const a = 1;");
    expect(stripComments("  //! x\ny")).toBe("y");
  });

  it("composes snapshots from deltas, with resets", () => {
    const { steps: out } = composeSteps([
      { id: "a", title: "", goal: "", focus: "x", changes: { x: "1", y: "1" } },
      { id: "b", title: "", goal: "", focus: "x", changes: { x: "2" }, deletes: ["y"] },
      { id: "c", title: "", goal: "", focus: "z", reset: true, changes: { z: "3" } },
    ]);
    expect(out[1].files).toEqual({ x: "2" });
    expect(out[1].status).toEqual({ x: "modified" });
    expect(out[2].files).toEqual({ z: "3" });
    expect(out[2].prevFiles).toEqual({});
  });
});

describe("bundler", () => {
  it("escapes </script> inside user code", () => {
    const { html } = build({ "src/main.tsx": 'console.log("</script><b>x</b>");' });
    expect(html).not.toContain('console.log("</script>');
    expect(html).toContain("<\\/script>");
  });

  it("keeps line numbers (stack traces map to editor lines)", () => {
    const src = 'import { a } from "./a";\n\n\nconsole.log(a);\n';
    const out = transpile("src/main.tsx", src);
    expect("code" in out && out.code.split("\n")[3]).toContain("console.log");
  });

  it("out/ files are made like UraJS: TypeScript transpileModule, src/x.tsx -> out/x.js", async () => {
    expect(outPath("src/components/TodoItem.tsx")).toBe("out/components/TodoItem.js");
    const src = 'import { createElement } from "./mini";\nimport type { T } from "./t";\nconst n: number = 1;\nconst a = <ul class="x"><li>a</li></ul>;\n';
    const out = await toOutJs("src/main.tsx", src);
    expect(out).toContain('import { createElement } from "./mini";');
    expect(out).not.toContain("import type");
    expect(out).not.toContain(": number");
    expect(out).toContain('createElement("ul", { class: "x" }');
  });

  it("reports syntax errors with a location and shows the overlay", () => {
    const { errors, html } = build({ "src/main.tsx": "const x = ;\n" });
    expect(errors[0]).toMatchObject({ file: "src/main.tsx", line: 1 });
    expect(html).toContain("[plugin:vite:esbuild]");
  });
});

describe("helpers", () => {
  it("line diff finds added ranges", () => {
    expect(addedLineRanges("a\nb\nc", "a\nx\ny\nb\nc\nz")).toEqual([
      { from: 2, to: 3 },
      { from: 6, to: 6 },
    ]);
  });

  it("crc32 matches the reference value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("fuzzy matches subsequences and rejects others", () => {
    expect(fuzzy("rcn", "reconcile.ts")).not.toBeNull();
    expect(fuzzy("zz", "hooks.ts")).toBeNull();
  });
});
