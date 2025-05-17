const ELEMENT = "element";
function element(tag, props = {}, ...children) {
    return {
        type: ELEMENT,
        tag: tag,
        props: props,
        children: children
    };
}
function createDOM(vdom) {
    switch (vdom.type) {
        case ELEMENT: {
            vdom.dom = document.createElement(vdom.tag);
            break;
        }
        default:
            {
                console.log(vdom);
                throw "Unkonwn type";
            }
            break;
    }
}
function display(vdom) {
}
let comp = element("div", null);
console.log(comp);
const root = document.getElementById("root");
