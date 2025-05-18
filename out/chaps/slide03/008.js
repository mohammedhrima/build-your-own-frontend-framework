const ELEMENT = "element";
function element(tag, props = {}, ...children) {
    return {
        type: ELEMENT,
        tag: tag,
        props: props,
        children: children,
    };
}
// set properties a straight forward function :')
function setProps(vdom) { }
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
    let comp = display(element("div", null));
    console.log(comp);
    const root = document.getElementById("root");
    root.appendChild(comp.dom);
}
catch (error) {
    console.error(error);
}
