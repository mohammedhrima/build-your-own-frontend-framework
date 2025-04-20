# build your own framework

+ step by step to create a mini frontend framework using Typescript
+ check ./chaps directory for each step

# Get started

```bash
    npm i
    npm start
```
+ use live server in vscode or any alternative to open index.html in the browser

## typescript Config file
```json
    {
        "compilerOptions": {
            // Module system to use in the generated JS
            "module": "ESNext",
            // Specify ECMAScript target version: "ES2020"
            "target": "ES2020",
            // Enables JSX parsing; "react" means emit JSX as React.createElement by default
            "jsx": "react",
            "baseUrl": ".",
            "rootDir": "src",
            "outDir": "out",
            // Custom JSX factory function (instead of React.createElement); here it's `element`
            "jsxFactory": "element",
            // Custom JSX fragment factory (instead of React.Fragment); here it's `fragment`
            "jsxFragmentFactory": "fragment",
            // Allow JavaScript files to be compiled
            "allowJs": true,
            // Disable all strict type-checking options (like strictNullChecks, etc.)
            "strict": false
        },
        // Files or folders to include in transpilation (here all files under `src`)
        "include": ["src/**/*"],
        // Files or folders to exclude from transpilation
        "exclude": ["node_modules", "chaps"]
    }

```

# Chapters

Each chapter builds on the previous one. Explore them in the `./chaps` folder.

### Chapter 1: JSX & Virtual DOM
- Parse JSX syntax
- Understand the Virtual DOM concept

### Chapter 2: Real DOM Rendering
- Convert Virtual DOM to Real DOM
- Set DOM attributes

### Chapter 3: DOM Building
- Add `execute` function and macros
- Handle children and text nodes

### Chapter 4: Interactivity
- Add `onclick` events
- Support inline styles

### Chapter 5: Components
- Introduce basic components

### Chapter 6: State Management
- Add reactive `State`
- Update view on state change

### Chapter 7: DOM Reconciliation
- add root tag and global VDOM
- Add `removeProps` and `destroyDOM`

### Chapter 8: Deep Comparison
- Add `deepEqual` function
- Reconcile function components
- Encapsulate state per component

### Chapter 9: Nested Components
- Support component composition

### Chapter 10: Array Children & Fragments
- Handle children as arrays
- Add support for fragments (`<>...</>`)

### Chapter 11: Routing
- Add routes
- Implement `navigate()` and event listeners

