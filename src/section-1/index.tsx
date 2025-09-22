/*=========== SECTION 1: how to write JSX inside a javascript file ===========*/
/*
+ Directory need to be listed like this
  ├── out
  ├── src
  │   └── index.tsx
  ├── index.html
  └── tsconfig.json
*/

// tsconfig.ts
// {
//   "compilerOptions": {
//     "module": "ESNext",
//     "target": "ES2020",
//     "jsx": "react",
//     "rootDir": "src",
//     "jsxFactory": "createElement",
//     "jsxFragmentFactory": "createFragment",
//     "skipLibCheck": false,
//     "allowJs": true
//   },
//   "exclude": ["node_modules"]
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
