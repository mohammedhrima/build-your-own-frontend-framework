const ELEMENT = "element";
const TEXT = "text";
function check(children) {
    const result = [];
    children.forEach((child) => {
        if (["string", "number"].includes(typeof child)) {
            result.push({
                type: TEXT,
                value: child,
                dom: null,
            });
        }
        else {
            result.push(child);
        }
    });
    return result;
}
function element(tag, props = {}, ...children) {
    if (typeof tag === "function") {
        return tag(props, children);
    }
    return {
        type: ELEMENT,
        tag: tag,
        dom: null,
        props: props,
        children: check(children),
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
            vdom.children.forEach((child) => {
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
            console.error(vdom);
            throw "Unkonwn type";
        }
    }
}
function display(vdom) {
    createDOM(vdom);
    return vdom;
}
let states = {};
let index = 1;
const State = (initValue) => {
    const stateIndex = index++;
    states[stateIndex] = initValue;
    const getter = () => states[stateIndex];
    const setter = (newValue) => {
        states[stateIndex] = newValue;
    };
    // return an array of setter, and getter, similar to React.useState
    return [getter, setter];
};
// create our first instance of State
const [count, setCount] = State(1);
// change the value on click
const HandleClick = () => setCount(count() + 1);
function Component() {
    return (element("div", { class: "container" },
        element("h1", null, "Hello World"),
        element("button", { onclick: HandleClick }, "click me")));
}
function updateView() {
    let comp = display(element(Component, null));
    console.log(comp);
    const root = document.getElementById("root");
    root.innerHTML = "";
    root.appendChild(comp.dom);
}
try {
    updateView();
}
catch (error) {
    console.error(error);
}
