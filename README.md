# build your own framework

# Get started

```bash
    npm i
    npm start
```
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

# Chapter 1
+ parsing JSX
+ understand what is Virtual DOM

# Chapter 2
+ create our first real dom from virtual dom, and set dom attributes

# Chapter 3
+ add execute function and its macros
+ add children doms
+ add text children

# Chapter 4
+ add onclick event
+ add style properties

# Chapter 5
+ add our first component

# Chapter 6
+ add our first State
+ update view when state change

# Chapter 7
+ add root tag
+ add reconciliation
+ add removeProps
+ add destroyDOM
+ save globalVDOM

# Chapter 8
+ add deep equal function
+ reconciliate functions Component 
+ encompsulate state for each component
+ add deepeqal to state setter

# Chapter 9
+ call component inside another

# Chapter 10
+ handle if chidrens are an array
+ add fragments

# Chapter 11
+ add routes
+ add navigate
+ add event listeners