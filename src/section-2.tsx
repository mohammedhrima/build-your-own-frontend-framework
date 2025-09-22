
/*=========== SECTION 2: what is Virtual DOM ===========*/

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

// @ts-ignore
const elem: VDOM = <div className="container"></div>;
console.log(elem)

// {
//   type: "element",
//   tag: "div",
//   props: {
//     className: "container",
//     children: [],
//   },
// };