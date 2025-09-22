/*=========== SECTION 4: add attributes ===========*/
// index.jts

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
function render(vdom: VDOM): VDOM {
  vdom.dom = document.createElement(vdom.tag);
  Object.keys(vdom.props).forEach((key) => {
    if (["className"].includes(key)) vdom.dom.setAttribute(key, vdom.props[key]);
  });

  return vdom;
}

// @ts-ignore
const elem = <div className="container"></div>;
render(elem);
