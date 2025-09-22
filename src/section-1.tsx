/*=========== SECTION 1: how to write JSX inside a javascript file ===========*/
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

// index.ts
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
  children?: Array<VDOM>;
};

// @ts-ignore
function createElement(tag: Tag, props: Props = {}, ...children: Array<VDOM>): VDOM {
  props.children = children;

  return {
    type: "element",
    tag: tag,
    props: props,
  };
}

<div className="container"></div>;

createElement("div", { className: "container" });
