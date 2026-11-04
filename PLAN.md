# Plan (open items only)

| # | Item | Why |
|---|---|---|
| 1 | Load the HTML/JSON languages and the diff view only when first used | main bundle is 929 KB (291 KB gzip), target ~600 KB; TypeScript (971 KB gzip) already loads only for out/ |
| 2 | `useContext` step after effects | the natural next hook; avoids passing props down 3 levels in the todo app |
| 3 | Fragments (`<>…</>`) | today a fragment gives a build error |
| 4 | Browser tests (Playwright) in the repo, run by `make check` | today only in a scratch folder: intro, demo, resize, both modes, all 16 steps, real `node server.js` runs |
| 5 | Live reload in `server.js` (UraJS has it) | today the learner refreshes the page after saving |
