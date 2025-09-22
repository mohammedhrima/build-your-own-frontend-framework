/*=========== SECTION 6: first components ===========*/
// if we inspect the view we should get something like this
// [screenshot]

// Now let’s add more stuff
// Let’s have a simple html file like this

// index.html
<html>
  <div id="root"></div>
  <script src="index.js"> </script>
</html>;

// index.ts
// @ts-ignore
type Tag = string | Function;
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


function check(children: Array<VDOM>): Array<VDOM> {
  const result = [];
  children.forEach((child) => {
    if (["text", "number"].includes(typeof child))
      return { type: "text", value: child };
    return child;
  });
  return result;
}
// @ts-ignore
function createElement(tag: Tag, props: Props = {}, ...children: Array<VDOM>): VDOM {
  props.children = check(children);

  if (typeof tag == "function") return createElement(tag(props));
  return {
    type: "element",
    tag: tag,
    props: props,
  };
}

function createDOM(vdom) {
  switch (vdom.type) {
    case "element":
      vdom.dom = document.createElement(vdom.tag);
      break;
    case "text":
      vdom.dom = document.createTextNode(vdom.value);
      break;
  }
}

function render(vdom): VDOM {
  createDOM(vdom);
  Object.keys(vdom.props).forEach((key) => {
    const curr = vdom.props[key];
    if (key == "className") vdom.dom.setAttribute("className", curr);
    else if (key == "children") {
      curr.forEach((child) => {
        createDOM(child);
        vdom.dom.appendChild(child.dom);
      });
    }
  });

  return vdom;
}

function App() {
  return (
    <div className="container">
      <h1>Hello</h1>
    </div>
  );
}
//@ts-ignore
const res = render(<App />);

document.getElementById("root").appendChild(res.dom);
