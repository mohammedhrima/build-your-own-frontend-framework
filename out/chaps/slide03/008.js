const ELEMENT = "element";
function element(tag, props = {}, ...children) {
    return {
        type: ELEMENT,
        tag: tag,
        dom: null,
        props: props,
        children: children,
    };
}
function createDOM(vdom) {
    switch (vdom.type) {
        case ELEMENT: {
            vdom.dom = document.createElement(vdom.tag);
            break;
        }
        default: {
            console.error(vdom);
            throw "Unkonwn type";
        }
    }
}
function display(vdom) {
    createDOM(vdom);
    return vdom;
}
try {
    // let's add class to our div, see the console
    let comp = display(element("div", { class: "container" }));
    console.log(comp);
    const root = document.getElementById("root");
    root.appendChild(comp.dom);
}
catch (error) {
    console.error(error);
}
