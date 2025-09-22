
/*=========== SECTION 2: what is Virtual DOM ===========*/

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

// @ts-ignore
const elem: VDOM = <div className="container"></div>;
console.log(elem)

// the output will be something like this
// {
//   type: "element",
//   tag: "div",
//   props: {
//     className: "container",
//     children: [],
//   },
// };