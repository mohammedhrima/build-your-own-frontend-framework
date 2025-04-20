
function element(tag, props, children) {
  return {
    type: "element",
    tag: tag,
    props: props,
    children: children
  }
}


let tag = <div className="container"></div>


console.log(tag);
