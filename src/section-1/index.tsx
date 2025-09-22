/*=========== SECTION 1: how to write JSX inside a javascript file ===========*/
/*
+ Directory need to be listed like this
  ├── out
  ├── src
  │   └── main.tsx
  ├── index.html
  └── tsconfig.json
*/

// tsconfig.json
// {
//   "compilerOptions": {
//     "target": "ES2020",
//     "rootDir": "./src",
//     "outDir": "./out",
//     "jsx": "react",
//     "jsxFactory": "createElement",
//     "jsxFragmentFactory": "createFragment",
//     "allowJs": true,
//   },
//   "include": ["src/**/*"],
//   "exclude": ["node_modules", "out"]
// }

// index.tsx
// @ts-ignore
type Tag = string;
// @ts-ignore
type Props = { [key: string]: any };
// @ts-ignore
type VDOM = {
  type: any;
  tag?: Tag;
  props?: Props;
  dom?: HTMLElement;
  children?: VDOM[];
};

// @ts-ignore
function createElement(tag: Tag, props: Props = {}, ...children?: VDOM[]): VDOM {
  props.children = children;

  return {
    type: "element",
    tag: tag,
    props: props,
  };
}

<div className="container"></div>;

createElement("div", { className: "container" });
