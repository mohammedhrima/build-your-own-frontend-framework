const ELEMENT = "element";
const TEXT = "text";
// Remember, the VDOM that represents text doesn't exist yet.
// We have to create it and that's where the `check` function comes in.
function check(children) { }
function element(tag, props = {}, ...children) {
    return {
        type: ELEMENT,
        tag: tag,
        dom: null,
        props: props,
        children: children,
    };
}
function setProps(vdom) {
    const props = vdom.props || {};
    Object.keys(props).forEach((key) => {
        vdom.dom.setAttribute(key, props[key]);
    });
}
function createDOM(vdom) {
    switch (vdom.type) {
        case ELEMENT: {
            vdom.dom = document.createElement(vdom.tag);
            setProps(vdom);
            vdom.children.forEach((child) => {
                createDOM(child);
                vdom.dom.appendChild(child.dom);
            });
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
    let comp = display(element("div", { class: "container" },
        element("h1", null)));
    console.log(comp);
    const root = document.getElementById("root");
    root.appendChild(comp.dom);
}
catch (error) {
    console.error(error);
}
