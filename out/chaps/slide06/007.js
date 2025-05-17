const ELEMENT = "element";
const TEXT = "text";
function check(children) {
    let result = [];
    children.forEach(child => {
        if (["string", "number"].includes(typeof child)) {
            result.push({
                type: TEXT,
                value: child
            });
        }
        else if (Array.isArray(child))
            result.push(...check(child));
        else
            result.push(child);
    });
    return result;
}
function element(tag, props = {}, ...children) {
    return {
        type: ELEMENT,
        tag: tag,
        props: props,
        children: check(children)
    };
}
function setProps(vdom) {
    const props = vdom.props || {};
    Object.keys(props).forEach(key => {
        vdom.dom.setAttribute(key, props[key]);
    });
}
function createDOM(vdom) {
    switch (vdom.type) {
        case ELEMENT: {
            vdom.dom = document.createElement(vdom.tag);
            setProps(vdom);
            break;
        }
        default: {
            console.log(vdom);
            throw "Unkonwn type";
        }
    }
}
function display(vdom) {
    createDOM(vdom);
    return vdom;
}
let comp = display(element("div", { class: "container" }));
console.log(comp);
const root = document.getElementById("root");
root.appendChild(comp.dom);
