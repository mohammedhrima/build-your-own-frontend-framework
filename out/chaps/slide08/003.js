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
    if (typeof tag === "function") {
        try {
            return tag(props, children);
        }
        catch (error) {
            console.error("failed to execute functag", tag);
        }
        return [];
    }
    return {
        type: ELEMENT,
        tag: tag,
        props: props,
        children: check(children)
    };
}
function setProps(vdom) {
    const props = vdom.props || {};
    Object.keys(props).forEach((key) => {
        if (key.startsWith("on")) {
            const eventType = key.slice(2).toLowerCase();
            vdom.dom.addEventListener(eventType, props[key]);
        }
        else
            vdom.dom.setAttribute(key, props[key]);
    });
}
function createDOM(vdom) {
    switch (vdom.type) {
        case ELEMENT: {
            vdom.dom = document.createElement(vdom.tag);
            setProps(vdom);
            vdom.children.forEach(child => {
                createDOM(child);
                vdom.dom.appendChild(child.dom);
            });
            break;
        }
        case TEXT: {
            vdom.dom = document.createTextNode(vdom.value);
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
const HandleClick = () => alert("Hellooo");
function Component() {
    return (element("div", { class: "container" },
        element("h1", null, "Hello World"),
        element("button", { onclick: HandleClick }, "click me")));
}
let comp = display(element(Component, null));
console.log(comp);
const root = document.getElementById("root");
root.appendChild(comp.dom);
