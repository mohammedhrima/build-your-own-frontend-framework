+ add slider to explain reconciliation theory

+ Slide 1:
   + Building a Minimal Frontend Framework from Scratch
      + Subtitle: Using TypeScript transpiler, JSX, and Virtual DOM

   + What we’ll build: a minimal frontend framework with JSX, TS, VDOM, etc.
      + Show a screenshot or snippet of the final app result

   + how to write html inside js file ?
   + wrong question
   + this sytanx is not html is JSX
   + What is JSX ?
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
      becomes element("div", { id: "main" }, "Hello World")

      <Div id="main">Hello World</Div>
      becomes element(Div, { id: "main" }, "Hello World")
   
   
+ Slide 2: out first jsx component
   + show the js output
   + element will return an object (Virtual DOM)
   + show a shema vdom that has tag, props, children
      + show the deference between actual dom element, text, fragments

+ Slide 3: create real DOM from  vritual DOM
   + implement display function: will take vdom as argument
   + createDOM: create real dom from virtual DOM
   + creating div, and append it to the view
      + open browser console to see
   + add set props
      + open browser console to see div class name

+ Slide 4: add children, add text node
   + implment check function
      + that track Virtual dom of html components, and text
      + add check function in element
      + add createTextNode
      + add text to jsx

+ Slide 5: event listenners
   + add event listenners in setProps
   + add handleClick function
   + add onclick event

+ Slide 6: function that returns component
   + function Component that return JSX
   + display will be taken <Component/> as paramter
   + as we said before since first charactet of Component is upper it will be give to elemnt without Quotes
   + show javascript code
   + in element add the case where tag is a function


+ Slide 7: State management
   + add updateView function
   + add State function, and state hashmap
   + create our first state
   + handleClick will be changing the state
   + setter will update the view


+ Slide 8: reconciliation
   + show a shema that explain it
   + add CREATE, REPLACE, REMOVE macros
   + add execute function: handle CREATE
   + add globalVDOM
   + add removeProps, destroyDOM
   + add REMOVE, REPLACE in execute
   + implement reconciliate for text node
   + reconcilate children


+ Slide 09: add root tag
   + add root tag


+ Slide 13: final result
