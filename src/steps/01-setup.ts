import type { StepDef } from "./types";

export const setup: StepDef = {
  id: "setup",
  title: "Project setup",
  goal: "TypeScript turns src/ into out/. The browser runs out/. No framework yet.",
  try: "Open index.html: it loads out/main.js. Then open out/main.js.",
  focus: "src/main.tsx",
  reset: true,
  changes: {
    "package.json": `{
  "name": "mini-react-todo",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node server.js",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.9.0"
  }
}
`,
    "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    //! lets you write import "./App.tsx" (server.js changes it to .js)
    "allowImportingTsExtensions": true,
    "jsx": "react",
    "jsxFactory": "createElement"
  },
  "include": ["src"]
}
`,
    "server.js": `//! The server, the UraJS way: compile src/ into out/ with the TypeScript
//! compiler, compile again on every save, and serve the folder.
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { watch } from "node:fs";
import { dirname, extname, join } from "node:path";
import ts from "typescript";

const options = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2020,
  //! <div /> becomes createElement("div", ...): OUR function.
  jsx: ts.JsxEmit.React,
  jsxFactory: "createElement",
  jsxFragmentFactory: "Fragment",
};

//! src/components/TodoItem.tsx -> out/components/TodoItem.js
async function compile(file) {
  if (!/\\.(tsx?|jsx?)$/.test(file) || file.endsWith(".d.ts")) return;
  const code = await readFile(file, "utf8");
  let js = ts.transpileModule(code, { compilerOptions: options, fileName: file }).outputText;
  //! import "./App.tsx" -> import "./App.js": the browser loads the compiled file
  js = js.replace(/(from\\s*["'])(\\.[^"']+)\\.(tsx?|jsx)(["'])/g, "$1$2.js$4");
  const out = file.replace(/^src/, "out").replace(/\\.(tsx?|jsx?)$/, ".js");
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, js);
  console.log("compiled", file);
}

async function compileAll(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await compileAll(path);
    else await compile(path);
  }
}

await compileAll("src");
watch("src", { recursive: true }, (_event, name) => {
  if (name) compile(join("src", name)).catch((error) => console.error(error.message));
});

const port = Number(process.env.PORT) || 5173;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  const file = path === "/" ? "index.html" : "." + path;
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "text/plain" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(port, () => console.log(\`➜  Local:   http://localhost:\${port}/\`));
`,
    "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Todos</title>
    <link rel="icon" href="data:," />
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        justify-content: center;
        background: #eef1f6;
        color: #1f2430;
        font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
      }
      #root { width: min(460px, 100% - 32px); margin: 40px 0; }
      /* hover and focus: things inline style objects can't do */
      input:focus { border-color: #3b5bdb !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(59, 91, 219, 0.15); }
      button:hover, a:hover { opacity: 0.85; }
      li:hover button { color: #e03131 !important; }
      @keyframes enter { from { opacity: 0; transform: translateY(-6px); } }
      @keyframes pulse { 50% { opacity: 0.4; } }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <!-- the browser runs plain JS: server.js makes out/main.js from src/main.tsx -->
    <script type="module" src="/out/main.js"></script>
  </body>
</html>
`,
    "src/main.tsx": `//! index.html loads out/main.js, which server.js makes from this file.
const root = document.getElementById("root")!;
root.textContent = "It works: the browser ran out/main.js.";

console.log("hello from main.tsx");
`,
  },
};
