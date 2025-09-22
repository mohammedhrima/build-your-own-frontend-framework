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

// index.tsx
// @ts-ignore
type Tag = string | Function;
// @ts-ignore
type Props = { [key: string]: any };
// @ts-ignore
type VDOM = {
  type: any;
  tag?: Tag;
  props?: Props;
  dom?: Node;
  children?: VDOM[];
};

// @ts-ignore
function check(children: VDOM[]): VDOM[] {
  const result = [];
  children.forEach((child) => {
    if (["text", "number"].includes(typeof child))
      return { type: "text", value: child };
    return child;
  });
  return result;
}
// @ts-ignore
function createElement(tag: Tag, props: Props = {}, ...children?: VDOM[]): VDOM {
  props.children = check(children);

  //@ts-ignore
  if (typeof tag == "function") return createElement(tag(props));
  return {
    type: "element",
    tag: tag,
    props: props,
  };
}

// @ts-ignore
function createDOM(vdom: VDOM) {
  switch (vdom.type) {
    case "element":
      vdom.dom = document.createElement(vdom.tag);
      break;
    case "text":
      // @ts-ignore
      vdom.dom = document.createTextNode(vdom.value);
      break;
  }
}

function render(vdom: VDOM): VDOM {
  createDOM(vdom);
  Object.keys(vdom.props).forEach((key) => {
    const curr = vdom.props[key];
    if (["className"].includes(key)) vdom.dom.setAttribute(key, curr);
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

// @ts-ignore
const elem = <App />;
// @ts-ignore
const res = render(elem);

document.getElementById("root").appendChild(res.dom);
