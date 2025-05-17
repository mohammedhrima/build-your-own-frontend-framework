/*
+ Slide 3: What is JSX ?
   + extension: enables writing XML-like syntax in JS/TS
   + rely on a parser to transpile the XML syntax to javascript equivalent code
   + such as Babel, parcel, swrc, but in our case we will be using Typescript
   + in tsconfig.json:
      "compilerOptions": {
         ...
         "jsx": "react",
         "jsxFactory": "element",
         "jsxFragmentFactory": "fragment",
      }
   + example:
      <div id="main">Hello World</div>
      becomes
      element("div", { id: "main" }, "Hello World")
*/