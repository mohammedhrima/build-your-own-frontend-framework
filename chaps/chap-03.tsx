const ELEMENT = "element";
const TEXT = "text";

const CREATE = "create";
const REPLACE = "replace";
const REMOVE = "remove";

function check(children) {
    let result = [];
    children.forEach((child) => {
        if (typeof child === "string" || typeof child === "number") {
            result.push({
                type: TEXT,
                props: {
                    value: child,
                },
            });
        }
        else if (child != undefined && child) {
            result.push(child);
        }
    });
    return result;
}

function element(tag, props, ...children) {
    return {
        type: ELEMENT,
        tag: tag,
        props: props,
        children: check(children)
    }
}

function setProps(vdom) {
    if (vdom.type == TEXT) return;
    const props = vdom.props || {};
    Object.keys(props).forEach(key => {
        vdom.dom.setAttribute(key, props[key]);
    })
}

function createDOM(vdom) {
    console.log("createDOM", vdom);
    switch (vdom.type) {
        case ELEMENT: {
            vdom.dom = document.createElement(vdom.tag);
            break;
        }
        case TEXT: {
            vdom.dom = document.createTextNode(vdom.props.value);
            break;
        }
        default:
            break;
    }
    setProps(vdom);
    return vdom;
}

function execute(mode, vdom) {
    switch (mode) {
        case CREATE: {
            createDOM(vdom);
            vdom.children?.forEach(child => {
                execute(mode, child);
                vdom.dom.appendChild(child.dom);
            });
            break;
        }
        default:
            break;
    }
}

function display(vdom) {
    execute(CREATE, vdom);
    return vdom;
}

let tag = <div className="container"><h1>Hello World</h1></div>
const res = display(tag)

const root = document.getElementById("root")
root.appendChild(res.dom);