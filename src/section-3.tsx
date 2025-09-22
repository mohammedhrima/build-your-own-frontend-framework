/*=========== SECTION 3: from Virtual DOM to real DOM ===========*/

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
function render(vdom: VDOM): VDOM {
  vdom.dom = document.createElement(vdom.tag);
  return vdom;
}

// @ts-ignore
const elem = <div className="container"></div>;
render(elem);