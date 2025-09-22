/*=========== SECTION 5: append to the view ===========*/
//  index.html
<html>
  <div id="root"></div>
  <script src="index.js"> </script>
</html>;

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
function render(vdom): VDOM {
  vdom.dom = document.createElement(vdom.tag);
  Object.keys(vdom.props).forEach((key) => {
    if (key == "className") vdom.dom.setAttribute("className", vdom.props[key]);
  });

  return vdom;
}

// @ts-ignore
const elem = <div className="container"></div>;
// @ts-ignore
const res = render(elem);
document.getElementById("root").appendChild(res.dom);
