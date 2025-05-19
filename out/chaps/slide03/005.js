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
            // create and save the DOM object inside dom
            // attribute
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
    let comp = element("div", null);
    console.log(comp);
}
catch (error) {
    console.error(error);
}
