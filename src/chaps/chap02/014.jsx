const ELEMENT = "element";

function element(tag, props = {}, ...children) {
    return {
        type: ELEMENT,
        tag: tag,
        props: props,
        children: children
    }
}

function setProps(vdom) {
    const props = vdom.props || {};
    Object.keys(props).forEach(key => {
        vdom.dom.setAttribute(key, props[key]);
    })
}

function createDOM(vdom) {
    switch (vdom.type) {
        case ELEMENT: {
            vdom.dom = document.createElement(vdom.tag);
            break;
        }
        default:
            throw "Unkonwn type"
            break;
    }
}

function display(vdom) {
    createDOM(vdom);
    return vdom
}

let comp = display(<div></div>)

console.log(comp)

const root = document.getElementById("root");
root.innerHTML = "";
root.appendChild(comp.dom);