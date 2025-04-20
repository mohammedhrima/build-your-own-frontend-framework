function element(tag, props, children) {
    return {
        type: "element",
        tag: tag,
        props: props,
        children: children
    }
}

// this will turn into element("div", {className = "container"}, null)
let tag = <div className="container"></div>

// you should get an output like this
// {
//     type: "element",
//     tag: "div", // tag name
//     props: {className: "container"}, // tag properties
//     children: [] // children, if there is any
// }
// and this is the Virtual DOM

console.log(tag);
